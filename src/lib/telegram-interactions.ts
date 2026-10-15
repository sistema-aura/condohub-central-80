export type Kind = "a" | "d" | "t" | "v";
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const CATEGORIES = {
  a: "✉️ Convocatórias",
  d: "📝 Declarações",
  t: "📋 Tarefas",
  v: "🔧 Vistorias",
} as const;
export const TABLES = { a: "assembleias", d: "declaracoes", t: "tarefas", v: "vistorias" } as const;
export type Button = { text: string; callback_data: string } | { text: string; url: string };
export const cb = (text: string, data: string): Button => ({ text, callback_data: data });
export const menu = () =>
  Object.entries(CATEGORIES).map(([kind, label]) => [cb(label, `list:${kind}:0`)]);
export function parseCallback(data: string) {
  if (data === "menu") return { action: "menu" } as const;
  const [action, kind, id] = data.split(":");
  if (["confirm", "undo"].includes(action) && UUID.test(kind) && data.split(":").length === 2)
    return { action, token: kind };
  if (!Object.hasOwn(CATEGORIES, kind)) return null;
  if (action === "list" && data.split(":").length === 3 && /^\d{1,4}$/.test(id ?? ""))
    return { action, kind: kind as Kind, page: Number(id) };
  if (
    ["open", "done", "later", "h1", "h24"].includes(action) &&
    UUID.test(id ?? "") &&
    data.split(":").length === 3
  )
    return { action, kind: kind as Kind, id };
  return null;
}
export function canAccess(kind: Kind, row: Record<string, any>, title: string) {
  const person = ({ dina: "Dina", leo: "Leonor", eduardo: "Eduardo" } as Record<string, string>)[
    title.trim().toLowerCase()
  ];
  // Existing chats without a personal mapping retain the shared office view.
  if (!person) return true;
  if (kind === "t")
    return (row.avisar_pessoas?.length ? row.avisar_pessoas : [row.para_pessoa]).includes(person);
  if (kind === "v") return (row.avisar_pessoas ?? []).includes(person);
  return true;
}
export function isPending(kind: Kind, row: Record<string, any>) {
  if (kind === "a")
    return !row.cancelada && !row.convocatoria_enviada && Date.parse(row.data_hora) > Date.now();
  if (kind === "d") return !row.feita;
  if (kind === "t") return row.estado !== "concluida";
  return !row.concluida;
}
export function actionButtons(
  kind: Kind,
  id: string,
  buildingId?: string,
  baseUrl = "https://condohub-central-80.lovable.app",
) {
  const rows: Button[][] = [
    [
      cb(
        kind === "a" ? "✅ Marcar como enviada" : "✅ Marcar como concluída",
        `done:${kind}:${id}`,
      ),
    ],
    [cb("⏰ Lembrar mais tarde", `later:${kind}:${id}`)],
  ];
  if (buildingId)
    rows.push([
      {
        text: "🏢 Abrir condomínio",
        url: new URL(`/edificios/${encodeURIComponent(buildingId)}`, baseUrl).href,
      },
    ]);
  rows.push([cb("↩️ Voltar à lista", `list:${kind}:0`), cb("🏠 Menu", "menu")]);
  return rows;
}
