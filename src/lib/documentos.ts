import { Zap, Droplets, Landmark, ArrowUpDown, ShieldCheck, FileText } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

export type TipoDocumento = Database["public"]["Enums"]["tipo_documento"];

export const TIPOS: {
  value: TipoDocumento;
  label: string;
  icon: typeof Zap;
  className: string;
}[] = [
  { value: "luz", label: "Luz", icon: Zap, className: "bg-amber-100 text-amber-800 border-amber-200" },
  { value: "agua", label: "Água", icon: Droplets, className: "bg-sky-100 text-sky-800 border-sky-200" },
  { value: "banco", label: "Banco", icon: Landmark, className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  { value: "elevador", label: "Elevador", icon: ArrowUpDown, className: "bg-violet-100 text-violet-800 border-violet-200" },
  { value: "seguro", label: "Seguro", icon: ShieldCheck, className: "bg-rose-100 text-rose-800 border-rose-200" },
  { value: "outros", label: "Outros", icon: FileText, className: "bg-slate-100 text-slate-800 border-slate-200" },
];

export function tipoInfo(t: TipoDocumento) {
  return TIPOS.find((x) => x.value === t) ?? TIPOS[TIPOS.length - 1]!;
}

export function diasAte(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + "T00:00:00");
  return Math.round((d.getTime() - hoje.getTime()) / 86400000);
}

export type EstadoValidade = "expirado" | "a-expirar" | "valido" | "sem-data";

export function estadoValidade(dateStr: string | null, limiteDias = 30): EstadoValidade {
  const d = diasAte(dateStr);
  if (d === null) return "sem-data";
  if (d < 0) return "expirado";
  if (d <= limiteDias) return "a-expirar";
  return "valido";
}

export function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("pt-PT");
}
