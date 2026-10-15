import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Receipt, Check, Trash2, Building2, Wallet, CircleDollarSign, ChevronDown, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DespesaDialog } from "@/components/despesa-dialog";
import { eur, lerItens } from "@/lib/despesas";

export const Route = createFileRoute("/_authenticated/despesas")({
  head: () => ({ meta: [{ title: "Despesas administrativas — Condomínio Dinâmico" }, { name: "description", content: "Impressões, envelopes e selos por prédio, com controlo de pagamento." }, { property: "og:title", content: "Despesas administrativas — Condomínio Dinâmico" }, { property: "og:description", content: "Despesas administrativas por prédio." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Page,
});

type Desp = { id: string; edificio_id: string; data: string; descricao: string | null; itens: unknown; total: number; pago: boolean; pago_em: string | null };
type Ed = { id: string; nome: string; identificacao_interna: string | null };

function Page() {
  const qc = useQueryClient();
  const [filtro, setFiltro] = useState<"todas" | "por_pagar" | "pagas">("por_pagar");
  const [q, setQ] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);
  const [novo, setNovo] = useState<string | null>(null);
  const [escolher, setEscolher] = useState(false);
  const [edSel, setEdSel] = useState("");
  const eds = useQuery({ queryKey: ["eds-desp"], queryFn: async () => { const { data, error } = await supabase.from("edificios").select("id,nome,identificacao_interna").order("identificacao_interna"); if (error) throw error; return data as Ed[]; } });
  const ds = useQuery({ queryKey: ["despesas"], queryFn: async () => { const { data, error } = await supabase.from("despesas_admin").select("*").order("data", { ascending: false }); if (error) throw error; return data as Desp[]; } });
  const refresh = () => qc.invalidateQueries({ queryKey: ["despesas"] });
  const lista = ds.data ?? [];
  const edMap = new Map((eds.data ?? []).map((e) => [e.id, e]));
  const totalPorPagar = lista.filter((d) => !d.pago).reduce((s, d) => s + Number(d.total), 0);
  const totalPago = lista.filter((d) => d.pago).reduce((s, d) => s + Number(d.total), 0);

  const visiveis = lista.filter((d) => filtro === "todas" || (filtro === "pagas" ? d.pago : !d.pago));
  const grupos = [...new Set(visiveis.map((d) => d.edificio_id))].map((id) => ({ id, ed: edMap.get(id), itens: visiveis.filter((d) => d.edificio_id === id) }))
    .filter((g) => !q.trim() || `${g.ed?.identificacao_interna ?? ""} ${g.ed?.nome ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => (a.ed?.identificacao_interna ?? "").localeCompare(b.ed?.identificacao_interna ?? "", "pt", { numeric: true }));

  const pagar = async (ids: string[], pago: boolean) => {
    const { error } = await supabase.from("despesas_admin").update({ pago, pago_em: pago ? new Date().toISOString().slice(0, 10) : null }).in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(pago ? "Marcado como pago." : "Voltou a por pagar."); refresh();
  };
  const apagar = async (id: string) => {
    if (!confirm("Apagar esta despesa?")) return;
    const { error } = await supabase.from("despesas_admin").delete().eq("id", id);
    if (error) return toast.error(error.message); refresh();
  };

  const imprimir = (g: { id: string; ed?: Ed; itens: Desp[] }) => {
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const soma = g.itens.reduce((s, d) => s + Number(d.total), 0);
    const linhas = g.itens.map((d) => {
      const itens = lerItens(d.itens).map((i) => `${i.qtd} × ${esc(i.label)} (${eur(i.qtd * i.preco)})`).join(" · ");
      return `<tr><td class="dt">${new Date(d.data + "T00:00:00").toLocaleDateString("pt-PT")}</td><td>${esc(d.descricao ?? "Despesa administrativas")}${itens ? `<span class="it">${itens}</span>` : ""}</td><td class="pg ${d.pago ? "ok" : "pen"}">${d.pago ? "Pago" : "Por pagar"}</td><td class="vl">${eur(Number(d.total))}</td></tr>`;
    }).join("");
    const w = window.open("", "_blank", "width=920,height=720");
    if (!w) { toast.error("Permite janelas novas (pop-ups) no navegador para imprimir."); return; }
    w.document.write(`<!doctype html><html lang="pt"><head><meta charset="utf-8"><title>Despesas ${esc(g.ed?.identificacao_interna ?? "")} ${esc(g.ed?.nome ?? "")}</title><style>
      *{box-sizing:border-box} body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;margin:32px}
      .top{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #1a4d8f;padding-bottom:10px;margin-bottom:6px}
      .brand{font-size:13px;font-weight:700;color:#1a4d8f;text-transform:uppercase;letter-spacing:.08em}
      h1{font-size:19px;margin:8px 0 2px}
      .sub{font-size:12px;color:#666;margin-bottom:18px}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th{text-align:left;background:#eef4fb;color:#1a4d8f;padding:7px 9px;border-bottom:1px solid #c9d9ec;font-size:11px;text-transform:uppercase;letter-spacing:.05em}
      td{padding:8px 9px;border-bottom:1px solid #e6ebf2;vertical-align:top}
      .dt{white-space:nowrap;color:#555;width:72px}
      .it{display:block;font-size:11px;color:#888;margin-top:3px}
      .pg{white-space:nowrap;font-weight:600}
      .ok{color:#177a4b}.pen{color:#b45309}
      .vl{white-space:nowrap;text-align:right;font-weight:600;font-variant-numeric:tabular-nums}
      .tot td{border-top:2px solid #1a4d8f;border-bottom:none;font-weight:700;font-size:13px;padding-top:10px}
      .foot{margin-top:26px;font-size:10.5px;color:#999;border-top:1px solid #e6ebf2;padding-top:8px}
      @media print{body{margin:12mm}}
    </style></head><body>
      <div class="top"><div><div class="brand">Condomínio Dinâmico</div><h1>Despesas administrativas</h1></div><div style="text-align:right;font-size:12px;color:#666">${new Date().toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" })}</div></div>
      <div class="sub">Prédio ${esc(g.ed?.identificacao_interna ? g.ed.identificacao_interna + " · " : "")}${esc(g.ed?.nome ?? "")}</div>
      <table><thead><tr><th>Data</th><th>Descrição / itens</th><th>Estado</th><th style="text-align:right">Total</th></tr></thead><tbody>${linhas}
      <tr class="tot"><td colspan="3">Total do prédio</td><td class="vl" style="text-align:right">${eur(soma)}</td></tr></tbody></table>
      <div class="foot">Documento de apoio ao lançamento no programa de faturação — Condomínio Dinâmico</div>
      <script>window.onload=()=>{window.print()}</script>
    </body></html>`);
    w.document.close();
  };


  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl">
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto"><div className="text-xs font-semibold uppercase tracking-wider text-primary">Gestão</div><h1 className="text-2xl font-semibold">Despesas administrativas</h1><p className="text-sm text-muted-foreground">Impressões, envelopes e selos lançados por prédio.</p></div>
        <Button onClick={() => setEscolher(true)}><Plus className="size-4 mr-1" />Nova despesa</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[{ l: "Por pagar", v: eur(totalPorPagar), i: Wallet, c: "text-meeting-pending" }, { l: "Já pago", v: eur(totalPago), i: CircleDollarSign, c: "text-meeting-sent" }, { l: "Lançamentos", v: String(lista.length), i: Receipt, c: "text-primary" }].map((k) => (
          <div key={k.l} className="rounded-2xl border bg-card p-4 shadow-sm"><div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground">{k.l}<k.i className={`size-4 ${k.c}`} /></div><div className={`mt-2 text-2xl font-semibold tabular-nums ${k.c}`}>{k.v}</div></div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-full border bg-muted/50 p-1">
          {([["por_pagar", "Por pagar"], ["pagas", "Pagas"], ["todas", "Todas"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setFiltro(k)} className={`rounded-full px-4 py-1.5 text-sm transition ${filtro === k ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}>{l}</button>
          ))}
        </div>
        <Input placeholder="Pesquisar prédio…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
      </div>

      {grupos.length === 0 && <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground"><Receipt className="mx-auto mb-2 size-8 opacity-50" />Sem despesas {filtro === "por_pagar" ? "por pagar" : ""}.</div>}

      <div className="space-y-3">
        {grupos.map((g) => {
          const soma = g.itens.reduce((s, d) => s + Number(d.total), 0);
          const porPagar = g.itens.filter((d) => !d.pago);
          const open = aberto === g.id;
          return (
            <div key={g.id} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
              <button onClick={() => setAberto(open ? null : g.id)} className="flex w-full items-center gap-4 p-4 text-left hover:bg-muted/30">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-semibold text-primary">{g.ed?.identificacao_interna ?? <Building2 className="size-5" />}</div>
                <div className="min-w-0 flex-1"><div className="truncate font-medium">{g.ed?.nome ?? "Prédio"}</div><div className="text-xs text-muted-foreground">{g.itens.length} lançamento(s){porPagar.length ? ` · ${porPagar.length} por pagar` : " · tudo pago"}</div></div>
                <div className="text-right text-lg font-semibold tabular-nums">{eur(soma)}</div>
                <ChevronDown className={`size-4 text-muted-foreground transition ${open ? "rotate-180" : ""}`} />
              </button>
              {open && <div className="border-t bg-muted/20 p-4 space-y-3">
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => setNovo(g.id)}><Plus className="size-4 mr-1" />Lançar</Button>
                  {porPagar.length > 1 && <Button size="sm" onClick={() => pagar(porPagar.map((d) => d.id), true)}><Check className="size-4 mr-1" />Marcar tudo pago</Button>}
                </div>
                {g.itens.map((d) => (
                  <div key={d.id} className={`rounded-xl border-l-4 bg-background p-3 shadow-sm ${d.pago ? "border-l-meeting-sent" : "border-l-meeting-pending"}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="mr-auto"><div className="font-medium text-sm">{d.descricao ?? "Despesa"}</div><div className="text-xs text-muted-foreground">{new Date(d.data + "T00:00:00").toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" })}{d.pago && d.pago_em ? ` · pago a ${new Date(d.pago_em + "T00:00:00").toLocaleDateString("pt-PT")}` : ""}</div></div>
                      <span className="text-base font-semibold tabular-nums">{eur(Number(d.total))}</span>
                      <button onClick={() => pagar([d.id], !d.pago)} className={`rounded-full border px-3 py-1 text-xs font-medium ${d.pago ? "bg-meeting-sent/10 text-meeting-sent border-meeting-sent/30" : "bg-meeting-pending/10 text-meeting-pending border-meeting-pending/30"}`}>{d.pago ? "Pago" : "Por pagar"}</button>
                      <Button size="icon" variant="ghost" aria-label="Apagar" onClick={() => apagar(d.id)}><Trash2 className="size-4" /></Button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">{lerItens(d.itens).map((i) => <span key={i.tipo} className="rounded-md bg-muted px-2 py-0.5 text-xs">{i.qtd} × {i.label} <span className="text-muted-foreground">({eur(i.qtd * i.preco)})</span></span>)}</div>
                  </div>
                ))}
              </div>}
            </div>
          );
        })}
      </div>

      <Dialog open={escolher} onOpenChange={setEscolher}>
        <DialogContent aria-describedby={undefined}><DialogHeader><DialogTitle>Escolher prédio</DialogTitle></DialogHeader>
          <Select value={edSel} onValueChange={setEdSel}><SelectTrigger><SelectValue placeholder="Prédio…" /></SelectTrigger><SelectContent>{(eds.data ?? []).map((e) => <SelectItem key={e.id} value={e.id}>{e.identificacao_interna ? e.identificacao_interna + " · " : ""}{e.nome}</SelectItem>)}</SelectContent></Select>
          <div className="flex justify-end"><Button disabled={!edSel} onClick={() => { setEscolher(false); setNovo(edSel); }}>Continuar</Button></div>
        </DialogContent>
      </Dialog>
      {novo && <DespesaDialog edificioId={novo} titulo="Nova despesa" descricao="Despesas administrativas" onDone={() => { setNovo(null); refresh(); }} />}
    </div>
  );
}
