import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { FileSignature, Download, Building2, Minus, Plus, Sparkles, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PRECOS, descarregarProposta, eur, linhas, totais, type Proposta } from "@/lib/proposta-word";

export const Route = createFileRoute("/_authenticated/propostas")({
  head: () => ({
    meta: [
      { title: "Propostas — Condomínio Dinâmico" },
      { name: "description", content: "Criar propostas de gestão para prédios e descarregar em Word." },
      { property: "og:title", content: "Propostas — Condomínio Dinâmico" },
      { property: "og:description", content: "Criar propostas de gestão para prédios e descarregar em Word." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Propostas,
});

const INICIAL: Proposta = { nome: "", morada: "", numero: "", fracoes: 0, lojas: 0, elevadores: 0, garagens: 0, estacionamentos: 0, manutencao: false, limpeza: false, limpezaValor: 0, limpezaFreq: "1 vez por semana" };

function Contador({ label, preco, value, onChange }: { label: string; preco: number; value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl border bg-card p-3">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{eur(preco)} / unid.</div>
      </div>
      <div className="flex items-center gap-1">
        <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => onChange(Math.max(0, value - 1))}><Minus className="h-3 w-3" /></Button>
        <Input type="number" min={0} value={value} onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))} className="h-8 w-14 text-center" />
        <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => onChange(value + 1)}><Plus className="h-3 w-3" /></Button>
      </div>
    </div>
  );
}

function Propostas() {
  const [p, setP] = useState<Proposta>(INICIAL);
  const [aGerar, setAGerar] = useState(false);
  const set = <K extends keyof Proposta>(k: K, v: Proposta[K]) => setP((o) => ({ ...o, [k]: v }));
  const t = totais(p);

  async function gerar() {
    setAGerar(true);
    try { await descarregarProposta(p); toast.success("Proposta descarregada"); }
    catch (e) { toast.error("Erro ao gerar: " + (e as Error).message); }
    finally { setAGerar(false); }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary"><FileSignature className="h-6 w-6" /></div>
        <div>
          <h1 className="text-2xl font-semibold">Propostas</h1>
          <p className="text-sm text-muted-foreground">Preenche os dados do prédio e descarrega a proposta em Word.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="bg-gradient-to-r from-primary to-primary/70 px-6 py-5 text-primary-foreground">
            <div className="text-lg font-semibold">Nova proposta</div>
            <div className="text-sm opacity-90">Proposta de administração e gestão do edifício</div>
          </div>
          <div className="space-y-6 p-6">
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground"><Building2 className="h-4 w-4" /> Prédio</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2"><Label>Nome do prédio / condomínio</Label><Input value={p.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Condomínio do prédio sito na…" /></div>
                <div className="space-y-1.5"><Label>Morada</Label><Input value={p.morada} onChange={(e) => set("morada", e.target.value)} placeholder="Av. …, n.º …, 2800-… Almada" /></div>
                <div className="space-y-1.5"><Label>N.º da proposta</Label><Input value={p.numero} onChange={(e) => set("numero", e.target.value)} placeholder="ex.: 34/2026" /></div>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Composição</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <Contador label="Frações" preco={PRECOS.fracao} value={p.fracoes} onChange={(n) => set("fracoes", n)} />
                <Contador label="Lojas" preco={PRECOS.loja} value={p.lojas} onChange={(n) => set("lojas", n)} />
                <Contador label="Elevadores" preco={PRECOS.elevador} value={p.elevadores} onChange={(n) => set("elevadores", n)} />
                <Contador label="Garagens (box com portão)" preco={PRECOS.garagem} value={p.garagens} onChange={(n) => set("garagens", n)} />
                <Contador label="Estacionamentos (só lugar)" preco={PRECOS.estacionamento} value={p.estacionamentos} onChange={(n) => set("estacionamentos", n)} />
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Serviços extra</h2>
              <label className="flex cursor-pointer items-center justify-between rounded-xl border p-4">
                <div className="flex items-center gap-3"><Wrench className="h-5 w-5 text-primary" /><div><div className="font-medium">Manutenção</div><div className="text-xs text-muted-foreground">1 visita mensal · {eur(PRECOS.manutencao)}</div></div></div>
                <Switch checked={p.manutencao} onCheckedChange={(v) => set("manutencao", v)} />
              </label>
              <div className="rounded-xl border p-4">
                <label className="flex cursor-pointer items-center justify-between">
                  <div className="flex items-center gap-3"><Sparkles className="h-5 w-5 text-primary" /><div><div className="font-medium">Orçamento com limpeza</div><div className="text-xs text-muted-foreground">Valor mensal sem IVA</div></div></div>
                  <Switch checked={p.limpeza} onCheckedChange={(v) => set("limpeza", v)} />
                </label>
                {p.limpeza && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5"><Label>Valor (€ sem IVA)</Label><Input type="number" min={0} step="0.01" value={p.limpezaValor || ""} onChange={(e) => set("limpezaValor", Number(e.target.value) || 0)} /></div>
                    <div className="space-y-1.5"><Label>Frequência</Label><Input value={p.limpezaFreq} onChange={(e) => set("limpezaFreq", e.target.value)} /></div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>

        <aside className="h-fit space-y-4 rounded-2xl border bg-card p-6 shadow-sm lg:sticky lg:top-4">
          <h2 className="font-semibold">Resumo mensal</h2>
          <div className="space-y-2 text-sm">
            {linhas(p).map((l) => (
              <div key={l.d} className="flex justify-between gap-2"><span className="text-muted-foreground">{l.q} × {l.d}</span><span>{eur(l.q * l.u)}</span></div>
            ))}
            {p.limpeza && <div className="flex justify-between"><span className="text-muted-foreground">Limpeza</span><span>{eur(t.limpeza)}</span></div>}
            {linhas(p).length === 0 && !p.limpeza && <p className="text-muted-foreground">Ainda sem valores.</p>}
          </div>
          <div className="space-y-1 border-t pt-3 text-sm">
            <div className="flex justify-between"><span>Sem IVA</span><span className="font-medium">{eur(t.sem)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>IVA 23%</span><span>{eur(t.iva)}</span></div>
          </div>
          <div className="flex items-end justify-between rounded-xl bg-primary/10 p-4">
            <span className="text-sm font-medium">Total com IVA</span>
            <span className="text-2xl font-bold text-primary">{eur(t.com)}</span>
          </div>
          <Button className="w-full" size="lg" onClick={gerar} disabled={aGerar}><Download className="mr-2 h-4 w-4" />{aGerar ? "A gerar…" : "Descarregar em Word"}</Button>
          <Button variant="ghost" className="w-full" onClick={() => setP(INICIAL)}>Limpar</Button>
        </aside>
      </div>
    </div>
  );
}
