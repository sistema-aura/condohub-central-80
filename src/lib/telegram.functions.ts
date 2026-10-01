import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

async function gatewayCall<T>(path: string, body?: unknown): Promise<T> {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const TELEGRAM_API_KEY = process.env.TELEGRAM_API_KEY;
  if (!LOVABLE_API_KEY || !TELEGRAM_API_KEY) {
    throw new Error("O bot do Telegram não está configurado");
  }
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": TELEGRAM_API_KEY,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Telegram devolveu erro [${res.status}]: ${text}`);
  }
  const json = JSON.parse(text) as { ok: boolean; result?: T; description?: string };
  if (!json.ok) throw new Error(json.description ?? "Erro desconhecido do Telegram");
  return json.result as T;
}

export const getTelegramStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("telegram_config")
      .select("chat_id,chat_title");
    if (error) throw new Error(error.message);
    const d = data ?? [];
    return { chat: d.length ? { chatId: d[0].chat_id as number, title: d.map((c) => c.chat_title ?? "?").join(", ") } : null };
  });

export const ligarTelegram = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    type Update = { message?: { chat: { id: number; type: string; first_name?: string; title?: string } } };
    const updates = await gatewayCall<Update[]>("/getUpdates?limit=100");
    const map = new Map<number, { id: number; first_name?: string }>();
    for (const u of updates) { const c = u.message?.chat; if (c?.type === "private") map.set(c.id, c); }
    const chats = [...map.values()];
    if (!chats.length) {
      throw new Error("Ainda não recebi nenhuma mensagem. Envia /start ao bot no Telegram e tenta outra vez.");
    }
    const { error } = await supabaseAdmin
      .from("telegram_config")
      .upsert(chats.map((c) => ({ chat_id: c.id, chat_title: c.first_name ?? null })), { onConflict: "chat_id" });
    if (error) throw new Error(error.message);
    for (const chat of chats) await gatewayCall("/sendMessage", {
      chat_id: chat.id,
      text: "✅ Avisos do Condomínio Dinâmico ligados!\nVais receber aqui os avisos das assembleias (convocatória por enviar e reunião em breve).",
    });
    return { ok: true, title: chats.map((c) => c.first_name ?? "?").join(", ") };
  });

export const testarTelegram = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: all } = await supabaseAdmin.from("telegram_config").select("chat_id,chat_title");
    const data = all?.[0];
    if (!data) throw new Error("O Telegram ainda não está ligado. Carrega em «Ligar avisos» primeiro.");
    const hora = new Date().toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" });
    for (const c of all!) await gatewayCall("/sendMessage", { chat_id: c.chat_id, text: `🔔 Aviso de teste do Condomínio Dinâmico (${hora}).\nSe estás a ler isto, os avisos chegam ao chat certo.` });
    return { ok: true, title: all!.map((c) => c.chat_title ?? "?").join(", ") };
  });
