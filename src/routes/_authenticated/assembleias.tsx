import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus, Bell, Send, Clock3, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getTelegramStatus, ligarTelegram, testarTelegram } from "@/lib/telegram.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { AssembleiaDialog } from "@/components/assembleia-dialog";
import { estadoAssembleia, lerFracoes, ymd, type Assembleia as Ass, type EdificioAssembleia as Ed } from "@/lib/assembleias";

export const Route = createFileRoute("/_authenticated/assembleias")({
  head: () => ({ meta: [{ title: "Assembleias e atas — Condomínio Dinâmico" }, { name: "description", content: "Calendário de assembleias, convocatórias e registo de atas e envio por fração." }, { property: "og:title", content: "Assembleias e atas — Condomínio Dinâmico" }, { property: "og:description", content: "Reuniões e acompanhamento de atas por condomínio." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Page,
});

const DIA = 86400000;

function Page() {
  const qc = useQueryClient();
  const [mes, setMes] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [form, setForm] = useState<{ dia: string; assembleia?: Ass } | null>(null);
  const eds = useQuery({ queryKey: ["eds-assembleias"], queryFn: async () => { const { data, error } = await supabase.from("edificios").select("id,nome,identificacao_interna,fracoes_ata,quantidade_fracoes").order("identificacao_interna"); if (error) throw error; return data as Ed[]; } });
  const ass = useQuery({ queryKey: ["assembleias"], queryFn: async () => { const { data, error } = await supabase.from("assembleias").select("*").order("data_hora"); if (error) throw error; return data as Ass[]; } });
  const edMap = new Map((eds.data ?? []).map((e) => [e.id, e]));
  const nomeEd = (id: string) => { const e = edMap.get(id); return e ? `${e.identificacao_interna ? e.identificacao_interna + " · " : ""}${e.nome}` : "—"; };
  const refresh = () => qc.invalidateQueries({ queryKey: ["assembleias"] });

  const [tgOpen, setTgOpen] = useState(false);
  const [tgBusy, setTgBusy] = useState(false);
  const tgStatus = useQuery({ queryKey: ["telegram-status"], queryFn: getTelegramStatus });
  const ligarTg = async () => {
    setTgBusy(true);
    try {
      await ligarTelegram();
      await qc.invalidateQueries({ queryKey: ["telegram-status"] });
      toast.success("Avisos ligados! Enviámos uma mensagem de teste ao Telegram.");
      setTgOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao ligar o Telegram");
    } finally {
      setTgBusy(false);
    }
  };

  const testarTg = async () => {
    setTgBusy(true);
    try { const r = await testarTelegram(); toast.success(`Aviso de teste enviado${r.title ? " para " + r.title : ""}. Confirma no Telegram.`); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erro ao enviar teste"); }
    finally { setTgBusy(false); }
  };
  const [q, setQ] = useState("");
  const abrir = (dia: string, assembleia?: Ass) => setForm({ dia, assembleia });
  const agora = Date.now();
  const lista = ass.data ?? [];
  const convocar = lista.filter((a) => !a.cancelada && !a.convocatoria_enviada && new Date(a.data_hora).getTime() > agora && new Date(a.data_hora).getTime() - agora <= 15 * DIA);
  const proximas = lista.filter((a) => { if (a.cancelada) return false; const t = new Date(a.data_hora).getTime() - agora; return t > 0 && t <= 2 * DIA; });

  const inicio = new Date(mes); inicio.setDate(1 - ((mes.getDay() + 6) % 7));
  const dias = Array.from({ length: 42 }, (_, i) => new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i));
  const hoje = ymd(new Date());

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <h1 className="text-2xl font-semibold mr-auto">Assembleias</h1>
        
        <Button variant="outline" onClick={() => setTgOpen(true)}><Send className="h-4 w-4 mr-1" />Telegram</Button>
        <Button onClick={() => abrir(hoje)}><Plus className="h-4 w-4 mr-1" />Marcar reunião</Button>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs">{[{label: "Convocatória por enviar", dot: "bg-meeting-pending"}, {label: "Convocatória enviada", dot: "bg-primary"}, {label: "Ata feita", dot: "bg-meeting-minutes"}, {label: "Ata enviada", dot: "bg-meeting-sent"}, {label: "Cancelada", dot: "bg-destructive"}].map((estado) => <span key={estado.label} className="flex items-center gap-2"><span className={`size-2.5 rounded-full ${estado.dot}`} />{estado.label}</span>)}</div>
      {(ass.isError || eds.isError) && <div className="text-destructive text-sm">Não foi possível carregar as assembleias. <Button variant="outline" size="sm" onClick={() => { ass.refetch(); eds.refetch(); }}>Tentar novamente</Button></div>}
      <div className="space-y-2">
        <Input placeholder="Pesquisar prédio (nome ou nº)…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
        {q.trim() && (() => {
          const t = q.trim().toLowerCase();
          const res = lista.filter((a) => nomeEd(a.edificio_id).toLowerCase().includes(t));
          return <div className="rounded-lg border p-2 text-sm space-y-1">
            {res.length === 0 ? <div className="text-muted-foreground">Sem reuniões para esse prédio.</div> : res.map((a) => (
              <div key={"q" + a.id} className="cursor-pointer hover:underline flex items-center gap-2" onClick={() => abrir("", a)}>
                <span className={`h-2.5 w-2.5 rounded ${estadoAssembleia(a).dot}`} />
                {nomeEd(a.edificio_id)} — {new Date(a.data_hora).toLocaleString("pt-PT", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}{new Date(a.data_hora).getTime() < agora ? " (passada)" : ""}
              </div>))}
          </div>;
        })()}
      </div>

      {(convocar.length > 0 || proximas.length > 0) && (
        <div className="rounded-lg border border-meeting-pending/30 bg-meeting-pending/5 p-3 text-sm space-y-1">
          <div className="font-medium flex items-center gap-1"><Bell className="h-4 w-4" />Avisos</div>
          {convocar.map((a) => <div key={a.id} className="cursor-pointer hover:underline" onClick={() => abrir("", a)}>📨 Enviar convocatória — {nomeEd(a.edificio_id)} (reunião {new Date(a.data_hora).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })})</div>)}
          {proximas.map((a) => <div key={"p" + a.id}>📅 Reunião em breve — {nomeEd(a.edificio_id)} ({new Date(a.data_hora).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })})</div>)}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" aria-label="Mês anterior" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
        <div className="font-medium w-44 text-center capitalize">{mes.toLocaleDateString("pt-PT", { month: "long", year: "numeric" })}</div>
        <Button variant="outline" size="icon" aria-label="Mês seguinte" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
      </div>

      <div className="overflow-x-auto"><div className="grid grid-cols-7 min-w-[760px] border rounded-lg overflow-hidden bg-background text-sm">
        {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => <div key={d} className="p-2 text-center font-medium border-b bg-muted/50">{d}</div>)}
        {dias.map((d) => {
          const k = ymd(d);
          const doDia = lista.filter((a) => ymd(new Date(a.data_hora)) === k);
          return (
            <div key={k} onClick={() => abrir(k)} className={`min-h-32 border-b border-r p-2 cursor-pointer hover:bg-muted/40 ${d.getMonth() !== mes.getMonth() ? "opacity-40" : ""}`}>
              <div className={`text-xs mb-1 ${k === hoje ? "font-bold text-primary" : ""}`}>{d.getDate()}</div>
              {doDia.map((a) => { const estado = estadoAssembleia(a); const e = edMap.get(a.edificio_id); const fracoes = lerFracoes(a.ata_fracoes); return (
                <Button variant="ghost" key={a.id} onClick={(event) => { event.stopPropagation(); abrir(k, a); }} title={`${nomeEd(a.edificio_id)} — ${estado.label}`} className={`mb-2 h-auto w-full min-w-0 items-start justify-start whitespace-normal rounded-md border border-l-[3px] px-2 py-2 text-left hover:opacity-80 ${estado.classe}`}>
                  <div className="min-w-0 space-y-1 w-full"><div className="flex items-center justify-between gap-1"><span className="font-semibold text-xs">{e?.identificacao_interna ?? "Prédio"}</span><span className="flex items-center gap-1 text-[10px]"><Clock3 className="size-3" />{new Date(a.data_hora).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}</span></div><div className="text-[11px] leading-snug line-clamp-2 break-words">{e?.nome ?? "—"}</div><div className="text-[10px] leading-snug flex items-center gap-1"><span className={`size-1.5 rounded-full shrink-0 ${estado.dot}`} />{estado.label}</div>{a.ata_feita && <div className="text-[10px] flex gap-1 items-center"><FileText className="size-3" />{a.ata_numero ? `Ata n.º ${a.ata_numero}` : "Ata"}{fracoes.length > 0 ? ` · ${fracoes.filter((f) => f.email || f.carta).length}/${fracoes.length}` : ""}</div>}</div>
                </Button>
              ); })}
            </div>
          );
        })}
      </div></div>

      {form && <AssembleiaDialog initial={form} edificios={eds.data ?? []} onClose={() => setForm(null)} onSaved={async () => { await Promise.all([refresh(), qc.invalidateQueries({ queryKey: ["eds-assembleias"] })]); }} />}

      <Dialog open={tgOpen} onOpenChange={setTgOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Avisos no Telegram</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <ol className="list-decimal pl-5 space-y-1">
              <li>Abre o bot <b>@CDinamico_avisosbot</b> no Telegram e envia <b>/start</b>.</li>
              <li>Volta aqui e carrega em «Ligar avisos».</li>
            </ol>
            {tgStatus.data?.chat && (
              <p>Ligado a: <b>{tgStatus.data.chat.title ?? `chat ${tgStatus.data.chat.chatId}`}</b></p>
            )}
            <p className="text-muted-foreground">
              Recebes no Telegram: convocatórias por enviar para reuniões nos próximos 15 dias e reuniões em breve (2 dias antes). Horários: 10:30 e 15:30.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setTgOpen(false)}>Fechar</Button>
              {tgStatus.data?.chat && <Button variant="outline" disabled={tgBusy} onClick={testarTg}>Enviar aviso de teste</Button>}
              <Button disabled={tgBusy} onClick={ligarTg}>{tgBusy ? "A ligar…" : "Ligar avisos"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
