import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getEmails, guardarEmail } from "@/lib/emails.functions";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Emails</h1>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </div>
      <Input placeholder="Pesquisar por assunto, remetente ou prédio…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="flex flex-wrap gap-2">
        {[["Todas", emails.length] as [string, number], ...cats].map(([c, n]) => (
          <Button key={c} size="sm" variant={cat === c ? "default" : "outline"} onClick={() => setCat(c)}>
            {c} ({n})
          </Button>
        ))}
      </div>
      {data?.erro && <p className="text-sm text-destructive">{data.erro}</p>}
      {isLoading && <p className="text-muted-foreground">A ler emails…</p>}
      <div className="space-y-2">
        {lista.map((e) => (
          <Card key={e.id} className={e.urgente ? "border-destructive" : ""}>
            <CardContent className="space-y-1 p-3">
              <div className="flex flex-wrap items-center gap-2">
                {e.urgente && <Badge variant="destructive">URGENTE</Badge>}
                <Badge variant="secondary">{e.categoria}</Badge>
                {e.edificioId && (
                  <Link to="/edificios/$id" params={{ id: e.edificioId }}>
                    <Badge variant="outline">{e.edificioNome}</Badge>
                  </Link>
                )}
                <span className="ml-auto text-xs text-muted-foreground">
                  {e.data ? new Date(e.data).toLocaleString("pt-PT") : ""}
                </span>
              </div>
              <a
                href={`https://mail.google.com/mail/u/0/#inbox/${e.id}`}
                target="_blank"
                rel="noreferrer"
                className="block font-medium hover:underline"
              >
                {e.assunto || "(sem assunto)"}
              </a>
              <p className="text-xs text-muted-foreground">{e.de}</p>
              <p className="line-clamp-2 text-sm">{e.resumo}</p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <select
                  className="h-8 max-w-xs rounded-md border bg-background px-2 text-sm"
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
                  variant="outline"
                  disabled={!(escolha[e.id] ?? e.edificioId) || aGuardar === e.id || guardados.has(e.id)}
                  onClick={() => onGuardar(e.id, (escolha[e.id] ?? e.edificioId)!, e.categoria)}
                >
                  <Save className="mr-1 h-4 w-4" />
                  {guardados.has(e.id) ? "Guardado" : aGuardar === e.id ? "A guardar…" : "Guardar nos documentos"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {!isLoading && !lista.length && <p className="text-muted-foreground">Sem emails.</p>}
      </div>
    </div>
  );
}
