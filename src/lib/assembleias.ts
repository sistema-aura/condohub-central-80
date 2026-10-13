export type FracaoAta = { fracao: string; email: boolean; carta: boolean };
export type Assembleia = {
  id: string; edificio_id: string; data_hora: string; local: string | null;
  observacoes: string | null; convocatoria_enviada: boolean;
  ata_feita: boolean; ata_numero: string | null; ata_data: string | null;
  ata_fracoes: unknown; ata_pdf_path: string | null; ata_pdf_nome: string | null;
  cancelada?: boolean; cancelamento_motivo?: string | null;
};
export type EdificioAssembleia = { id: string; nome: string; identificacao_interna: string | null; fracoes_ata: unknown; quantidade_fracoes: number | null };
export const pad = (n: number) => String(n).padStart(2, "0");
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export function lerFracoes(value: unknown): FracaoAta[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || typeof item.fracao !== "string") return [];
    return [{ fracao: item.fracao, email: item.email === true, carta: item.carta === true }];
  });
}
export function fracoesEdificio(value: unknown): FracaoAta[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string").map((fracao) => ({ fracao, email: false, carta: false })) : [];
}
export function estadoAssembleia(a: Pick<Assembleia, "ata_feita" | "ata_fracoes" | "convocatoria_enviada" | "cancelada">) {
  if (a.cancelada) return { label: "Cancelada", classe: "bg-destructive/10 text-destructive border-destructive/30 line-through", dot: "bg-destructive", etapa: 0 };
  const fracoes = lerFracoes(a.ata_fracoes);
  if (a.ata_feita && fracoes.length > 0 && fracoes.every((f) => f.fracao.trim() && (f.email || f.carta)))
    return { label: "Ata enviada", classe: "bg-meeting-sent/10 text-meeting-sent border-meeting-sent/30", dot: "bg-meeting-sent", etapa: 4 };
  if (a.ata_feita) return { label: "Ata feita", classe: "bg-meeting-minutes/15 text-meeting-minutes-foreground border-meeting-minutes/40", dot: "bg-meeting-minutes", etapa: 3 };
  if (a.convocatoria_enviada) return { label: "Convocatória enviada", classe: "bg-primary/10 text-primary border-primary/25", dot: "bg-primary", etapa: 2 };
  return { label: "Convocatória por enviar", classe: "bg-meeting-pending/10 text-meeting-pending border-meeting-pending/30", dot: "bg-meeting-pending", etapa: 1 };
}