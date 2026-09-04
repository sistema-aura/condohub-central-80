import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, Plus, Search, FileText, AlertTriangle } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { estadoValidade } from "@/lib/documentos";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Edifícios — Condomínio Dinâmico" },
      { name: "description", content: "Lista de edifícios geridos e respetiva documentação." },
      { property: "og:title", content: "Edifícios — Condomínio Dinâmico" },
      { property: "og:description", content: "Lista de edifícios geridos e respetiva documentação." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

type Edificio = {
  id: string;
  nome: string;
  identificacao_interna: string | null;
  morada: string | null;
  codigo_postal: string | null;
  localidade: string | null;
};

function Dashboard() {
  const [q, setQ] = useState("");

  const edificios = useQuery({
    queryKey: ["edificios"],
    queryFn: async (): Promise<Edificio[]> => {
      const { data, error } = await supabase
        .from("edificios")
        .select("id, nome, identificacao_interna, morada, codigo_postal, localidade")
        .order("identificacao_interna", { ascending: true, nullsFirst: false })
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const docs = useQuery({
    queryKey: ["documentos-resumo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documentos")
        .select("id, edificio_id, data_validade");
      if (error) throw error;
      return data ?? [];
    },
  });

  const porEdificio = useMemo(() => {
    const map = new Map<string, { total: number; alertas: number }>();
    for (const d of docs.data ?? []) {
      const cur = map.get(d.edificio_id) ?? { total: 0, alertas: 0 };
      cur.total += 1;
      const est = estadoValidade(d.data_validade);
      if (est === "expirado" || est === "a-expirar") cur.alertas += 1;
      map.set(d.edificio_id, cur);
    }
    return map;
  }, [docs.data]);

  const lista = useMemo(() => {
    const term = q.trim().toLowerCase();
    const all = edificios.data ?? [];
    if (!term) return all;
    return all.filter((e) =>
      [e.nome, e.identificacao_interna, e.morada, e.localidade]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term)),
    );
  }, [edificios.data, q]);

  const totalAlertas = useMemo(
    () => (docs.data ?? []).filter((d) => ["expirado", "a-expirar"].includes(estadoValidade(d.data_validade))).length,
    [docs.data],
  );

  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Edifícios</h1>
          <p className="text-sm text-muted-foreground">
            {edificios.data?.length ?? 0} edifícios · {docs.data?.length ?? 0} documentos
          </p>
        </div>
        <div className="flex gap-2">
          {totalAlertas > 0 && (
            <Button variant="outline" asChild>
              <Link to="/alertas">
                <AlertTriangle className="mr-2 h-4 w-4 text-amber-600" />
                {totalAlertas} alerta{totalAlertas > 1 ? "s" : ""}
              </Link>
            </Button>
          )}
          <Button asChild>
            <Link to="/edificios/novo">
              <Plus className="mr-2 h-4 w-4" />
              Novo edifício
            </Link>
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9 bg-background"
          placeholder="Procurar por nome, morada ou identificação..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {edificios.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : lista.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <Building2 className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">
                {q ? "Nenhum edifício encontrado" : "Ainda não há edifícios"}
              </p>
              <p className="text-sm text-muted-foreground">
                {q ? "Tente outra pesquisa." : "Comece por criar o primeiro edifício."}
              </p>
            </div>
            {!q && (
              <Button asChild>
                <Link to="/edificios/novo">
                  <Plus className="mr-2 h-4 w-4" />
                  Novo edifício
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lista.map((e) => {
            const stats = porEdificio.get(e.id) ?? { total: 0, alertas: 0 };
            return (
              <Link key={e.id} to="/edificios/$id" params={{ id: e.id }} className="group">
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardContent className="space-y-3 p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h2 className="truncate font-semibold group-hover:text-primary">{e.nome}</h2>
                        <p className="truncate text-sm text-muted-foreground">
                          {e.morada || "Sem morada"}
                          {e.localidade ? ` · ${e.localidade}` : ""}
                        </p>
                      </div>
                      {e.identificacao_interna && (
                        <Badge variant="secondary" className="shrink-0">
                          {e.identificacao_interna}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5" />
                        {stats.total} documento{stats.total === 1 ? "" : "s"}
                      </span>
                      {stats.alertas > 0 && (
                        <span className="inline-flex items-center gap-1 font-medium text-amber-700">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {stats.alertas} a expirar
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
