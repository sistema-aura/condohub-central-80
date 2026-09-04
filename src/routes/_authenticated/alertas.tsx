import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { diasAte, estadoValidade, formatDate, tipoInfo, type TipoDocumento } from "@/lib/documentos";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/alertas")({
  head: () => ({
    meta: [
      { title: "Alertas de validade — Condomínio Dinâmico" },
      { name: "description", content: "Documentos e contratos expirados ou a expirar em breve." },
      { property: "og:title", content: "Alertas de validade — Condomínio Dinâmico" },
      { property: "og:description", content: "Documentos e contratos expirados ou a expirar em breve." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Alertas,
});

type Row = {
  id: string;
  titulo: string;
  tipo: TipoDocumento;
  data_validade: string | null;
  edificio_id: string;
  edificios: { nome: string } | null;
};

function Alertas() {
  const documentos = useQuery({
    queryKey: ["documentos", "alertas"],
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase
        .from("documentos")
        .select("id, titulo, tipo, data_validade, edificio_id, edificios(nome)")
        .not("data_validade", "is", null)
        .order("data_validade", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const { expirados, aExpirar } = useMemo(() => {
    const all = documentos.data ?? [];
    return {
      expirados: all.filter((d) => estadoValidade(d.data_validade) === "expirado"),
      aExpirar: all.filter((d) => estadoValidade(d.data_validade) === "a-expirar"),
    };
  }, [documentos.data]);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Alertas de validade</h1>
        <p className="text-sm text-muted-foreground">
          Documentos expirados ou a expirar nos próximos 30 dias.
        </p>
      </div>

      {documentos.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : expirados.length + aExpirar.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            <p className="font-medium">Está tudo em dia</p>
            <p className="text-sm text-muted-foreground">Nenhum documento a expirar.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {[
            { titulo: "Expirados", rows: expirados, tone: "destructive" as const },
            { titulo: "A expirar em breve", rows: aExpirar, tone: "warning" as const },
          ]
            .filter((s) => s.rows.length > 0)
            .map((s) => (
              <section key={s.titulo} className="space-y-2">
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <AlertTriangle
                    className={`h-4 w-4 ${s.tone === "destructive" ? "text-destructive" : "text-amber-600"}`}
                  />
                  {s.titulo} ({s.rows.length})
                </h2>
                {s.rows.map((d) => {
                  const dias = diasAte(d.data_validade) ?? 0;
                  return (
                    <Link key={d.id} to="/edificios/$id" params={{ id: d.edificio_id }}>
                      <Card
                        className={`transition-shadow hover:shadow-md ${
                          s.tone === "destructive" ? "border-destructive/40" : "border-amber-300"
                        }`}
                      >
                        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                          <div className="min-w-0">
                            <p className="truncate font-medium">{d.titulo}</p>
                            <p className="truncate text-sm text-muted-foreground">
                              {d.edificios?.nome ?? "Edifício"} · {tipoInfo(d.tipo).label}
                            </p>
                          </div>
                          <Badge
                            className={
                              s.tone === "destructive"
                                ? "bg-destructive text-destructive-foreground"
                                : "bg-amber-500 text-white"
                            }
                          >
                            {dias < 0
                              ? `Expirou há ${Math.abs(dias)} dia${Math.abs(dias) === 1 ? "" : "s"}`
                              : `Faltam ${dias} dia${dias === 1 ? "" : "s"}`}{" "}
                            · {formatDate(d.data_validade)}
                          </Badge>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </section>
            ))}
        </div>
      )}
    </div>
  );
}
