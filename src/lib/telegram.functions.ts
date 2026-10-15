import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { telegramMessages } from "@/lib/telegram-messages";

async function gatewayCall<T>(path: string, body?: unknown): Promise<T> {
  const { gatewayCall } = await import("@/lib/telegram-gateway.server");
  return gatewayCall<T>(path, body);
}

export const ativarBotoesTelegram = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { activateTelegram } = await import("@/lib/telegram-bot.server");
    return activateTelegram();
  });

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
  .handler(async ({ context }) => {
    const { activateTelegram } = await import("@/lib/telegram-bot.server");
    await activateTelegram();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as import("@supabase/supabase-js").SupabaseClient<any>)
      .from("telegram_pairings").insert({ user_id: context.userId }).select("id").single();
    if (error) throw new Error("Não foi possível criar a ligação ao Telegram.");
    return { url: `https://t.me/CDinamico_avisosbot?start=${data.id}` };
  });

export const testarTelegram = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: all } = await supabaseAdmin.from("telegram_config").select("chat_id,chat_title");
    const data = all?.[0];
    if (!data) throw new Error("O Telegram ainda não está ligado. Carrega em «Ligar avisos» primeiro.");
    const hora = new Date().toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" });
    for (const c of all!) {
      for (const message of telegramMessages(
        `📌 CONDOMÍNIO DINÂMICO\n${hora}\n\n✅ Teste de ligação concluído\n\nOs avisos passam a ter títulos destacados e botões de acesso.\nAs convocatórias são agrupadas por data e as pendências da agenda aparecem num resumo.\n\n📅 Assembleias · 📝 Declarações · 📋 Agenda`,
        process.env.TELEGRAM_APP_URL || "https://condohub-central-80.lovable.app",
      )) await gatewayCall("/sendMessage", { chat_id: c.chat_id, ...message });
    }
    return { ok: true, title: all!.map((c) => c.chat_title ?? "?").join(", ") };
  });

const NOME_CHAT: Record<string, string> = { Leonor: "leo", Dina: "dina", Eduardo: "eduardo" };

export const notificarPessoas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { pessoas: string[]; texto: string }) => {
    if (!Array.isArray(d.pessoas) || !d.pessoas.length) throw new Error("Escolhe pelo menos uma pessoa");
    return { pessoas: d.pessoas.filter((p) => p in NOME_CHAT), texto: String(d.texto).slice(0, 3500) };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cfgs, error } = await supabaseAdmin.from("telegram_config").select("chat_id,chat_title");
    if (error) throw new Error(error.message);
    const enviados: string[] = [];
    const falhas: string[] = [];
    for (const p of data.pessoas) {
      const c = (cfgs ?? []).find((x) => (x.chat_title ?? "").toLowerCase() === NOME_CHAT[p]);
      if (!c) { falhas.push(p); continue; }
      try { await gatewayCall("/sendMessage", { chat_id: c.chat_id, text: data.texto }); enviados.push(p); }
      catch { falhas.push(p); }
    }
    return { enviados, falhas };
  });
