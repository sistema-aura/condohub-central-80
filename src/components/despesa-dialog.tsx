import { useState } from "react";
import { Printer, Mail, Receipt, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TIPOS_DESPESA, eur } from "@/lib/despesas";

type Props = { edificioId: string; assembleiaId?: string | null; titulo?: string; descricao?: string; onDone: () => void };

export function DespesaDialog({ edificioId, assembleiaId, titulo = "Despesas da convocatória", descricao = "Convocatória de assembleia", onDone }: Props) {
  const [qtd, setQtd] = useState<Record<string, string>>({});
  const [precos, setPrecos] = useState<Record<string, string>>(() => Object.fromEntries(TIPOS_DESPESA.map((t) => [t.id, String(t.preco).replace(".", ",")])));
  const [desc, setDesc] = useState(descricao);
  const [busy, setBusy] = useState(false);
  const num = (s?: string) => Number((s ?? "").replace(",", ".")) || 0;
  const itens = TIPOS_DESPESA.map((t) => ({ tipo: t.id, label: t.label, qtd: num(qtd[t.id]), preco: num(precos[t.id]) })).filter((i) => i.qtd > 0);
  const total = itens.reduce((s, i) => s + i.qtd * i.preco, 0);

  const guardar = async () => {
    if (itens.length === 0) return onDone();
    setBusy(true);
    const { error } = await supabase.from("despesas_admin").insert({ edificio_id: edificioId, assembleia_id: assembleiaId ?? null, descricao: desc.trim() || null, itens, total: Math.round(total * 100) / 100 });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Despesa de ${eur(total)} registada no prédio.`);
    onDone();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onDone()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden gap-0">
        <div className="despesa-hero px-6 py-5">
          <DialogHeader className="space-y-1 text-left">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider opacity-80"><Receipt className="size-4" />Despesas administrativas</div>
            <DialogTitle className="text-xl">{titulo}</DialogTitle>
            <DialogDescription className="despesa-hero-sub">Quantas folhas, envelopes e selos foram usados? Fica lançado nas despesas do prédio.</DialogDescription>
          </DialogHeader>
        </div>
        <div className="max-h-[55vh] overflow-y-auto px-6 py-4 space-y-4">
          <div className="space-y-1.5"><Label htmlFor="desp-desc">Descrição</Label><Input id="desp-desc" value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
          <div className="divide-y rounded-xl border">
            {TIPOS_DESPESA.map((t, i) => {
              const sub = num(qtd[t.id]) * num(precos[t.id]);
              const Icon = i < 2 ? Printer : i < 5 ? Mail : Receipt;
              return (
                <div key={t.id} className={`grid grid-cols-[1fr_4.5rem_5rem_4.5rem] items-center gap-2 px-3 py-2 ${sub > 0 ? "bg-primary/5" : ""}`}>
                  <span className="flex items-center gap-2 text-sm"><Icon className="size-3.5 text-muted-foreground" />{t.label}</span>
                  <Input aria-label={`Quantidade ${t.label}`} inputMode="numeric" placeholder="0" className="h-8 text-center" value={qtd[t.id] ?? ""} onChange={(e) => setQtd({ ...qtd, [t.id]: e.target.value })} />
                  <div className="relative"><Input aria-label={`Preço ${t.label}`} inputMode="decimal" className="h-8 pr-5 text-right text-xs" value={precos[t.id]} onChange={(e) => setPrecos({ ...precos, [t.id]: e.target.value })} /><span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">€</span></div>
                  <span className={`text-right text-sm tabular-nums ${sub > 0 ? "font-semibold" : "text-muted-foreground"}`}>{eur(sub)}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 border-t bg-muted/40 px-6 py-4">
          <div><div className="text-xs text-muted-foreground">Total</div><div className="text-2xl font-semibold tabular-nums">{eur(total)}</div></div>
          <div className="flex gap-2"><Button variant="ghost" onClick={onDone}>Saltar</Button><Button disabled={busy} onClick={guardar}>{busy && <Loader2 className="size-4 mr-1 animate-spin" />}Lançar despesa</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
