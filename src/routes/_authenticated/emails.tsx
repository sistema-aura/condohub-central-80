import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { RefreshCw, Save, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getEmails, guardarEmail, resumirEmail } from "@/lib/emails.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/emails")({
  head: () => ({
    meta: [
      { title: "Emails — Condomínio Dinâmico" },
      { name: "description", content: "Emails recebidos separados por categoria e prédio." },
      { property: "og:title", content: "Emails — Condomínio Dinâmico" },
      { property: "og:description", content: "Emails recebidos separados por categoria e prédio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EmailsPage,
});

function EmailsPage() {
  const fn = useServerFn(getEmails);
  const { data, isLoading, refetch, isFetching } = useQuery({ queryKey: ["emails"], queryFn: () => fn() });
  const guardar = useServerFn(guardarEmail);
  const { data: eds } = useQuery({
    queryKey: ["edificios-min"],
    queryFn: async () =>
      (await supabase.from("edificios").select("id,nome,identificacao_interna").order("identificacao_interna")).data ?? [],
  });
  const [escolha, setEscolha] = useState<Record<string, string>>({});
  const [aGuardar, setAGuardar] = useState<string | null>(null);
  const [guardados, setGuardados] = useState<Set<string>>(new Set());
  const resumir = useServerFn(resumirEmail);
  const [resumos, setResumos] = useState<Record<string, string>>({});
  const [aResumir, setAResumir] = useState<string | null>(null);
  async function onResumir(id: string) {
    setAResumir(id);
    try {
      const r = await resumir({ data: { emailId: id } });
      setResumos((s) => ({ ...s, [id]: r.resumo }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao resumir");
    } finally {
      setAResumir(null);
    }
  }
  async function onGuardar(id: string, edificioId: string, categoria: string) {
    setAGuardar(id);
    try {
      const r = await guardar({ data: { emailId: id, edificioId, categoria } });
      setGuardados((g) => new Set(g).add(id));
      toast.success(r.anexos ? `${r.anexos} anexo(s) guardado(s) nos documentos do prédio` : "Email guardado nos documentos do prédio");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao guardar");
    } finally {
      setAGuardar(null);
    }
  }
  const [cat, setCat] = useState("Todas");
  const [q, setQ] = useState("");
  const emails = data?.emails ?? [];
  const cats = useMemo(() => {
    const m = new Map<string, number>();
    emails.forEach((e) => m.set(e.categoria, (m.get(e.categoria) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [emails]);
  const lista = emails.filter(
    (e) =>
      (cat === "Todas" || e.categoria === cat) &&
      (!q || `${e.assunto} ${e.de} ${e.resumo} ${e.edificioNome ?? ""}`.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Emails</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-sm text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
            geral.dinamico@gmail.com
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Atualizar
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            className="rounded-xl bg-card pl-9"
            placeholder="Pesquisar por assunto, remetente ou prédio…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[["Todas", emails.length] as [string, number], ...cats].map(([c, n]) => (
            <Button
              key={c}
              size="sm"
              variant={cat === c ? "default" : "outline"}
              className="shrink-0 rounded-xl"
              onClick={() => setCat(c)}
            >
              {c} ({n})
            </Button>
          ))}
        </div>
      </div>

      {data?.erro && <p className="text-sm text-destructive">{data.erro}</p>}
      {isLoading && <p className="text-muted-foreground">A ler emails…</p>}

      <div className="space-y-3">
        {lista.map((e) => {
          const guardado = guardados.has(e.id) || e.guardado;
          return (
            <div
              key={e.id}
              className={`rounded-2xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md ${
                e.urgente ? "border-destructive/60" : ""
              }`}
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
                <div className="min-w-0 flex-grow space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {e.urgente && <Badge variant="destructive">URGENTE</Badge>}
                    <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                      {e.categoria}
                    </Badge>
                    {e.marcadores.map((m) => (
                      <Badge key={m} variant="outline">
                        🏷 {m}
                      </Badge>
                    ))}
                    {e.edificioId && (
                      <Link to="/edificios/$id" params={{ id: e.edificioId }}>
                        <Badge variant="outline">{e.edificioNome}</Badge>
                      </Link>
                    )}
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                      {e.data ? new Date(e.data).toLocaleString("pt-PT") : ""}
                    </span>
                  </div>
                  <a
                    href={`https://mail.google.com/mail/u/0/#inbox/${e.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-base font-semibold leading-tight hover:underline"
                  >
                    {e.assunto || "(sem assunto)"}
                  </a>
                  <p className="truncate text-sm">
                    <span className="font-medium">{e.de}</span>
                    <span className="text-muted-foreground"> — {e.resumo}</span>
                  </p>
                  {resumos[e.id] ? (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">
                      <span className="mb-1 flex items-center gap-1 text-xs font-semibold text-primary">
                        <Sparkles className="h-3 w-3" /> Resumo do email

                      </span>
                      {resumos[e.id]}
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-fit text-primary"
                      disabled={aResumir === e.id}
                      onClick={() => onResumir(e.id)}
                    >
                      <Sparkles className="mr-1 h-4 w-4" />
                      {aResumir === e.id ? "A resumir…" : "Resumo do email"}

                    </Button>
                  )}
                </div>

                <div className="flex shrink-0 flex-col gap-2 border-t pt-4 sm:flex-row lg:w-64 lg:flex-col lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                  <select
                    className="h-9 w-full rounded-lg border bg-muted/40 px-2 text-xs font-medium outline-none focus:border-primary"
                    value={escolha[e.id] ?? e.edificioId ?? ""}
                    onChange={(ev) => setEscolha((s) => ({ ...s, [e.id]: ev.target.value }))}
                  >
                    <option value="">Associar a prédio…</option>
                    {(eds ?? []).map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.identificacao_interna ? `${d.identificacao_interna} — ` : ""}{d.nome}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant={guardado ? "secondary" : "default"}
                    disabled={!escolha[e.id] && !e.edificioId || aGuardar === e.id || guardado}
                    onClick={() => onGuardar(e.id, (escolha[e.id] ?? e.edificioId)!, e.categoria)}
                  >
                    <Save className="mr-1 h-4 w-4" />
                    {guardado ? "Guardado" : aGuardar === e.id ? "A guardar…" : "Guardar nos documentos"}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
        {!isLoading && !lista.length && <p className="text-muted-foreground">Sem emails.</p>}
      </div>

      {!!lista.length && (
        <p className="pb-2 text-xs text-muted-foreground">
          {lista.length} de {emails.length} emails
        </p>
      )}
    </div>
  );
}
