import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { gatewayCall, appUrl, webhookSecret } from "./telegram-gateway.server";
import {
  actionButtons,
  canAccess,
  CATEGORIES,
  cb,
  isPending,
  menu,
  parseCallback,
  TABLES,
  UUID,
} from "./telegram-interactions";
import type { Button, Kind } from "./telegram-interactions";
import type { SupabaseClient } from "@supabase/supabase-js";

// New interaction tables are server-only and do not enter the generated browser schema.
const db = supabaseAdmin as SupabaseClient<any>;
const date = (value: string) =>
  new Date(value.length === 10 ? value + "T12:00:00Z" : value).toLocaleString("pt-PT", {
    timeZone: "Europe/Lisbon",
    dateStyle: "short",
    ...(value.length === 10 ? {} : { timeStyle: "short" as const }),
  });
function check(error: { message: string } | null) {
  if (error) throw new Error("Não foi possível guardar ou consultar os dados.");
}
export async function activateTelegram() {
  // Fail before modifying Telegram if the schema hasn't been installed.
  const ready = await db.from("telegram_confirmations").select("id").limit(1);
  check(ready.error);
  await gatewayCall("/setWebhook", {
    url: `${appUrl()}/api/public/telegram/webhook`,
    secret_token: await webhookSecret(),
    allowed_updates: ["message", "callback_query"],
    max_connections: 1,
    drop_pending_updates: false,
  });
  const scheduled = await db.rpc("telegram_schedule_reminders");
  check(scheduled.error);
  return { ok: true };
}
async function chatConfig(id: number) {
  const r = await db.from("telegram_config").select("chat_title").eq("chat_id", id).maybeSingle();
  check(r.error);
  return r.data;
}
async function item(kind: Kind, id: string, title: string) {
  const r = await db.from(TABLES[kind]).select("*").eq("id", id).maybeSingle();
  check(r.error);
  if (!r.data || !canAccess(kind, r.data, title)) return null;
  return r.data as Record<string, any>;
}
async function building(id: string | null) {
  if (!id) return "Sem condomínio associado";
  const r = await db
    .from("edificios")
    .select("nome,identificacao_interna")
    .eq("id", id)
    .maybeSingle();
  check(r.error);
  return r.data
    ? `${r.data.identificacao_interna ? r.data.identificacao_interna + " · " : ""}${r.data.nome}`.slice(
        0,
        400,
      )
    : "Condomínio";
}
async function description(kind: Kind, row: Record<string, any>) {
  const head = `${CATEGORIES[kind]}\n\n🏢 ${await building(row.edificio_id)}`;
  if (kind === "a")
    return `${head}\n\n📅 Assembleia: ${date(row.data_hora)}\n🟠 Convocatória por enviar`;
  if (kind === "d")
    return `${head}\n\n🚪 Fração: ${row.fracao || "—"}${row.urgente ? "\n⚡ Urgente" : ""}\n🟠 Por elaborar`;
  if (kind === "t")
    return `${head}\n\n${String(row.titulo).slice(0, 500)}\n👤 ${row.para_pessoa}${row.prazo ? "\n📅 Prazo: " + date(row.prazo) : ""}`;
  return `${head}\n\n📅 Vistoria: ${date(row.data)}\n${String(row.notas || "").slice(0, 500)}`;
}
async function display(chatId: number, text: string, keyboard: Button[][], messageId?: number) {
  await gatewayCall(messageId ? "/editMessageText" : "/sendMessage", {
    chat_id: chatId,
    ...(messageId ? { message_id: messageId } : {}),
    text,
    entities: [{ type: "bold", offset: 0, length: text.split("\n")[0].length }],
    reply_markup: { inline_keyboard: keyboard },
    link_preview_options: { is_disabled: true },
  });
}
async function showList(
  chatId: number,
  title: string,
  kind: Kind,
  page: number,
  messageId?: number,
) {
  let q = db.from(TABLES[kind]).select("*");
  if (kind === "a")
    q = q
      .eq("convocatoria_enviada", false)
      .eq("cancelada", false)
      .gt("data_hora", new Date().toISOString())
      .order("data_hora");
  if (kind === "d")
    q = q.eq("feita", false).order("urgente", { ascending: false }).order("created_at");
  if (kind === "t")
    q = q.neq("estado", "concluida").order("prazo", { nullsFirst: false }).order("created_at");
  if (kind === "v") q = q.eq("concluida", false).order("data");
  const r = await q.limit(1000);
  check(r.error);
  const rows = (r.data ?? []).filter((row: Record<string, any>) => canAccess(kind, row, title));
  const pages = Math.max(1, Math.ceil(rows.length / 8));
  page = Math.min(page, pages - 1);
  const slice = rows.slice(page * 8, page * 8 + 8);
  const names = await Promise.all(
    slice.map(async (row: Record<string, any>) => {
      const ed = await building(row.edificio_id);
      return kind === "t"
        ? `${row.titulo} · ${ed}`
        : kind === "d"
          ? `${ed} · ${row.fracao || "—"}`
          : `${ed} · ${date(kind === "a" ? row.data_hora : row.data)}`;
    }),
  );
  const keyboard: Button[][] = slice.map((row: Record<string, any>, i: number) => [
    cb(`${i + 1}. ${names[i].slice(0, 50)}`, `open:${kind}:${row.id}`),
  ]);
  const nav: Button[] = [];
  if (page > 0) nav.push(cb("⬅️ Anteriores", `list:${kind}:${page - 1}`));
  if (page < pages - 1) nav.push(cb("Seguintes ➡️", `list:${kind}:${page + 1}`));
  if (nav.length) keyboard.push(nav);
  keyboard.push([cb("🏠 Menu", "menu")]);
  const text = `${CATEGORIES[kind]} · ${rows.length} pendentes\n\n${names.length ? names.map((n, i) => `${i + 1}. ${n.slice(0, 300)}`).join("\n\n") : "✅ Sem assuntos pendentes."}\n\nPágina ${page + 1}/${pages}${r.data?.length === 1000 ? "\nMostrados os primeiros 1000 registos; consulte os restantes no site." : ""}`;
  await display(chatId, text, keyboard, messageId);
}
export type TelegramUpdate = {
  message?: {
    text?: string;
    from?: { id: number };
    chat: { id: number; type: string; first_name?: string };
  };
  callback_query?: {
    id: string;
    data?: string;
    from: { id: number };
    message?: { message_id: number; chat: { id: number; type: string } };
  };
};
export async function handleTelegramUpdate(update: TelegramUpdate) {
  const query = update.callback_query;
  const message = query?.message ?? update.message;
  if (!message || message.chat.type !== "private") return;
  const chatId = message.chat.id;
  if ((query?.from.id ?? update.message?.from?.id) !== chatId) return;
  // Pairing links are random, short-lived, and issued only to logged-in users.
  const pairing = update.message?.text?.match(/^\/start ([0-9a-f-]{36})$/i)?.[1];
  if (pairing && UUID.test(pairing)) {
    const r = await db
      .from("telegram_pairings")
      .delete()
      .eq("id", pairing)
      .gt("expires_at", new Date().toISOString())
      .select("user_id");
    check(r.error);
    if (r.data?.length) {
      const linked = await db
        .from("telegram_config")
        .upsert(
          { chat_id: chatId, chat_title: update.message?.chat.first_name || null },
          { onConflict: "chat_id" },
        );
      check(linked.error);
    }
  }
  const config = await chatConfig(chatId);
  if (!config) {
    if (query)
      await gatewayCall("/answerCallbackQuery", {
        callback_query_id: query.id,
        text: "Este chat não está autorizado.",
        show_alert: true,
      });
    return;
  }
  const title = config.chat_title || "";
  if (!query) {
    if (/^\/(start|menu)(\s|$)/.test(update.message?.text || ""))
      await display(
        chatId,
        "🏠 CONDOMÍNIO DINÂMICO\n\nEscolha o assunto que quer consultar ou tratar.",
        menu(),
      );
    return;
  }
  await gatewayCall("/answerCallbackQuery", { callback_query_id: query.id });
  const action = parseCallback(query.data || "");
  const messageId = query.message!.message_id;
  if (!action) return;
  if (action.action === "menu") {
    await display(chatId, "🏠 CONDOMÍNIO DINÂMICO\n\nEscolha uma categoria:", menu(), messageId);
    return;
  }
  if ("token" in action && action.token) {
    const r = await db
      .from("telegram_confirmations")
      .select("*")
      .eq("id", action.token)
      .eq("chat_id", chatId)
      .maybeSingle();
    check(r.error);
    const c = r.data;
    if (!c || !(await item(c.kind, c.entity_id, title))) {
      await display(
        chatId,
        "⚠️ Ação indisponível\n\nEste pedido expirou ou já não está acessível.",
        [[cb("🏠 Menu", "menu")]],
        messageId,
      );
      return;
    }
    const result = await db.rpc("telegram_confirm", {
      _chat: chatId,
      _id: action.token,
      _undo: action.action === "undo",
    });
    check(result.error);
    if (result.data !== "ok") {
      await display(
        chatId,
        "⚠️ O registo mudou ou a confirmação expirou\n\nAbra o assunto novamente para consultar o estado atual.",
        [[cb("↩️ Voltar", `open:${c.kind}:${c.entity_id}`)]],
        messageId,
      );
      return;
    }
    const keys: Button[][] =
      action.action === "confirm" ? [[cb("↩️ Desfazer (10 min)", `undo:${action.token}`)]] : [];
    keys.push([cb("📋 Voltar à lista", `list:${c.kind}:0`), cb("🏠 Menu", "menu")]);
    await display(
      chatId,
      action.action === "undo"
        ? "↩️ Alteração desfeita\n\nO estado anterior foi reposto no CondoHub."
        : `✅ ${c.kind === "a" ? "Convocatória marcada como enviada" : "Assunto marcado como concluído"}\n\nO estado foi atualizado no CondoHub.`,
      keys,
      messageId,
    );
    return;
  }
  if (!("kind" in action) || !action.kind) return;
  const kind = action.kind;
  if (action.action === "list") {
    await showList(chatId, title, kind, action.page!, messageId);
    return;
  }
  if (!("id" in action) || !action.id) return;
  const row = await item(kind, action.id, title);
  if (!row || !isPending(kind, row)) {
    await display(
      chatId,
      "✅ Assunto já tratado ou indisponível\n\nA lista mostra os registos ainda pendentes.",
      [[cb("📋 Atualizar lista", `list:${kind}:0`)]],
      messageId,
    );
    return;
  }
  const text = await description(kind, row);
  if (action.action === "open") {
    await display(chatId, text, actionButtons(kind, row.id, row.edificio_id, appUrl()), messageId);
    return;
  }
  if (action.action === "done") {
    const r = await db
      .from("telegram_confirmations")
      .insert({ chat_id: chatId, kind, entity_id: row.id, before_row: row })
      .select("id")
      .single();
    check(r.error);
    await display(
      chatId,
      `${text}\n\n❓ Confirmar ${kind === "a" ? "que já enviou a convocatória? Este botão não envia documentos." : "que este assunto está concluído?"}`,
      [[cb("✅ Confirmar", `confirm:${r.data!.id}`)], [cb("Cancelar", `open:${kind}:${row.id}`)]],
      messageId,
    );
    return;
  }
  if (action.action === "later") {
    await display(
      chatId,
      `${text}\n\n⏰ Quando quer receber outro lembrete?`,
      [
        [
          cb("Daqui a 1 hora", `h1:${kind}:${row.id}`),
          cb("Daqui a 24 horas", `h24:${kind}:${row.id}`),
        ],
        [cb("Cancelar", `open:${kind}:${row.id}`)],
      ],
      messageId,
    );
    return;
  }
  if (action.action === "h1" || action.action === "h24") {
    const due = new Date(Date.now() + (action.action === "h1" ? 1 : 24) * 3600000).toISOString();
    const r = await db
      .from("telegram_reminders")
      .upsert(
        { chat_id: chatId, kind, entity_id: row.id, due_at: due, lease_until: null },
        { onConflict: "chat_id,kind,entity_id" },
      );
    check(r.error);
    await display(
      chatId,
      `⏰ Lembrete agendado\n\n${date(due)} (hora de Lisboa)\n\nEste lembrete é só para si. Os resumos gerais mantêm os horários habituais.`,
      [[cb("📋 Voltar à lista", `list:${kind}:0`), cb("🏠 Menu", "menu")]],
      messageId,
    );
  }
}
export async function sendDueReminders() {
  const r = await db.rpc("telegram_claim_reminders");
  check(r.error);
  let sent = 0,
    failed = 0;
  for (const reminder of r.data ?? []) {
    try {
      const cfg = await chatConfig(reminder.chat_id);
      const row = cfg ? await item(reminder.kind, reminder.entity_id, cfg.chat_title || "") : null;
      if (row && isPending(reminder.kind, row)) {
        await display(
          reminder.chat_id,
          `⏰ LEMBRETE PEDIDO\n\n${await description(reminder.kind, row)}`,
          actionButtons(reminder.kind, row.id, row.edificio_id, appUrl()),
        );
        sent++;
      }
      const deleted = await db
        .from("telegram_reminders")
        .delete()
        .eq("chat_id", reminder.chat_id)
        .eq("kind", reminder.kind)
        .eq("entity_id", reminder.entity_id)
        .eq("due_at", reminder.due_at);
      check(deleted.error);
    } catch {
      failed++;
    } // Lease expires; next pass retries instead of losing a reminder.
  }
  return { ok: failed === 0, enviadas: sent, falhas: failed };
}
