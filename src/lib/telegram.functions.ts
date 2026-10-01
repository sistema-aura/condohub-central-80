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
      .select("chat_id,chat_title")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { chat: data ? { chatId: data.chat_id as number, title: (data.chat_title as string | null) ?? null } : null };
  });

export const ligarTelegram = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    type Update = { message?: { chat: { id: number; type: string; first_name?: string; title?: string } } };
    const updates = await gatewayCall<Update[]>("/getUpdates?limit=100");
    const chat = [...updates]
      .reverse()
      .map((u) => u.message?.chat)
      .find((c) => c?.type === "private");
    if (!chat) {
      throw new Error("Ainda não recebi nenhuma mensagem. Envia /start ao bot no Telegram e tenta outra vez.");
    }
    const { error } = await supabaseAdmin
      .from("telegram_config")
      .upsert({ id: 1, chat_id: chat.id, chat_title: chat.first_name ?? null });
    if (error) throw new Error(error.message);
    await gatewayCall("/sendMessage", {
      chat_id: chat.id,
      text: "✅ Avisos do Condomínio Dinâmico ligados!\nVais receber aqui os avisos das assembleias (convocatória por enviar e reunião em breve).",
    });
    return { ok: true, title: chat.first_name ?? null };
  });
