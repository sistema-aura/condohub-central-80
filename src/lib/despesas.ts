// Preços unitários (sem IVA) retirados do Excel de despesas administrativas. Ajustar aqui.
export const TIPOS_DESPESA = [
  { id: "impressoes", label: "Impressões", preco: 0.18 },
  { id: "fotocopias", label: "Fotocópias", preco: 0.15 },
  { id: "envelopes", label: "Envelopes", preco: 0.15 },
  { id: "envelopes_a5", label: "Envelopes A5", preco: 0.25 },
  { id: "selos", label: "Selos", preco: 0 },
  { id: "avisos", label: "Avisos de cobrança", preco: 0.2 },
  { id: "recibos", label: "Recibos", preco: 0.1 },
  { id: "notas_credito", label: "Notas de crédito", preco: 0.1 },
  { id: "abertura", label: "Abertura de processo", preco: 15 },
] as const;
export type ItemDespesa = { tipo: string; label: string; qtd: number; preco: number };
export const eur = (n: number) => n.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
export function lerItens(v: unknown): ItemDespesa[] {
  if (!Array.isArray(v)) return [];
  return v.filter((i) => i && typeof i === "object" && typeof i.label === "string").map((i) => ({ tipo: String(i.tipo ?? ""), label: i.label, qtd: Number(i.qtd) || 0, preco: Number(i.preco) || 0 }));
}
