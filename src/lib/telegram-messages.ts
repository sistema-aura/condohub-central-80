import { cb } from "./telegram-interactions.ts";

/** Pure message formatting. Never accept Telegram markup from database fields. */
export function telegramMessages(text: string, baseUrl: string, buildingId?: string) {
  const root = new URL(baseUrl);
  if (root.protocol !== "https:") throw new Error("O endereço do CondoHub deve usar HTTPS");
  const button = (label: string, path: string) => ({ text: label, url: new URL(path, root).href });
  const buttons: { text: string; url: string }[] = [];
  if (buildingId)
    buttons.push(button("🏢 Abrir condomínio", `/edificios/${encodeURIComponent(buildingId)}`));
  if (/assembleia|reunião|convocatória/i.test(text))
    buttons.push(button("📅 Ver assembleias", "/assembleias"));
  if (/declaraç/i.test(text)) buttons.push(button("📝 Ver declarações", "/declaracoes"));
  if (/agenda|tarefa/i.test(text)) buttons.push(button("📋 Abrir agenda", "/agenda"));
  if (/vistoria/i.test(text)) buttons.push(button("🔧 Ver vistorias", "/vistorias"));
  if (/email/i.test(text)) buttons.push(button("✉️ Ver emails", "/emails"));
  if (!buttons.length) buttons.push(button("🏠 Abrir CondoHub", "/dashboard"));

  // Split on paragraph/line boundaries, without dropping tasks or splitting emoji.
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 3500) {
    let at = remaining.lastIndexOf("\n\n", 3500);
    if (at < 1000) at = remaining.lastIndexOf("\n", 3500);
    if (at < 1000) at = 3500;
    else at += remaining[at + 1] === "\n" ? 2 : 1;
    if (/[\uD800-\uDBFF]/.test(remaining[at - 1])) at--;
    chunks.push(remaining.slice(0, at));
    remaining = remaining.slice(at);
  }
  if (remaining) chunks.push(remaining);
  return chunks.map((chunk, i) => {
    const prefix = chunks.length > 1 ? `📄 ${i + 1}/${chunks.length}\n\n` : "";
    const body = prefix + chunk;
    const entities: { type: "bold"; offset: number; length: number }[] = [];
    let offset = 0;
    for (const line of body.split("\n")) {
      if (line && (offset === 0 || /^(📌|📋|📝|📅|✉️|📨|🔧|🚨|⚠️|✅) /.test(line))) {
        entities.push({ type: "bold", offset, length: line.length });
      }
      offset += line.length + 1;
    }
    return {
      text: body,
      entities,
      link_preview_options: { is_disabled: true },
      reply_markup: { inline_keyboard: [...buttons.map((b) => [b]), [cb("✅ Gerir pendências", "menu")]] },
    };
  });
}
