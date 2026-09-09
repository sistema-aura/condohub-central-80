import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Download,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Building2,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { TIPOS, estadoValidade, formatDate, tipoInfo, type TipoDocumento } from "@/lib/documentos";
import { DocumentoDialog, type DocumentoRow } from "@/components/documento-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/edificios/$id")({
  head: () => ({
    meta: [
      { title: "Ficha do edifício — Condomínio Dinâmico" },
      { name: "description", content: "Documentos e informação administrativa do edifício." },
      { property: "og:title", content: "Ficha do edifício — Condomínio Dinâmico" },
      { property: "og:description", content: "Documentos e informação administrativa do edifício." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EdificioPage,
});

function EdificioPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState<"todos" | TipoDocumento>("todos");
  const [ordem, setOrdem] = useState<"recentes" | "antigos" | "validade" | "titulo">("recentes");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DocumentoRow | null>(null);
  const [apagar, setApagar] = useState<DocumentoRow | null>(null);
  const [apagarEdificio, setApagarEdificio] = useState(false);

  const edificio = useQuery({
    queryKey: ["edificio", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("edificios").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const documentos = useQuery({
    queryKey: ["documentos", id],
    queryFn: async (): Promise<DocumentoRow[]> => {
      const { data, error } = await supabase
        .from("documentos")
        .select("*")
        .eq("edificio_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DocumentoRow[];
    },
  });

  const lista = useMemo(() => {
    const term = q.trim().toLowerCase();
    let arr = (documentos.data ?? []).filter((d) => {
      if (tipo !== "todos" && d.tipo !== tipo) return false;
      if (!term) return true;
      return [d.titulo, d.informacao, d.ficheiro_nome]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });
    arr = [...arr].sort((a, b) => {
      if (ordem === "titulo") return a.titulo.localeCompare(b.titulo, "pt");
      if (ordem === "validade") {
        const av = a.data_validade ?? "9999-12-31";
        const bv = b.data_validade ?? "9999-12-31";
        return av.localeCompare(bv);
      }
      const ad = a.data_documento ?? a.created_at.slice(0, 10);
      const bd = b.data_documento ?? b.created_at.slice(0, 10);
      return ordem === "recentes" ? bd.localeCompare(ad) : ad.localeCompare(bd);
    });
    return arr;
  }, [documentos.data, q, tipo, ordem]);

  const guardarDados = useMutation({
    mutationFn: async (values: {
      nome: string;
      identificacao_interna: string | null;
      morada: string | null;
      codigo_postal: string | null;
      localidade: string | null;
      observacoes: string | null;
    }) => {
      const { error } = await supabase.from("edificios").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["edificio", id] });
      qc.invalidateQueries({ queryKey: ["edificios"] });
      toast.success("Dados guardados.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const eliminarDoc = useMutation({
    mutationFn: async (doc: DocumentoRow) => {
      if (doc.ficheiro_path) {
        await supabase.storage.from("condominio-docs").remove([doc.ficheiro_path]);
      }
      const { error } = await supabase.from("documentos").delete().eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documentos"] });
      qc.invalidateQueries({ queryKey: ["documentos-resumo"] });
      toast.success("Documento eliminado.");
      setApagar(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const eliminarEdificio = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("edificios").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["edificios"] });
      toast.success("Edifício eliminado.");
      navigate({ to: "/dashboard" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function abrirFicheiro(doc: DocumentoRow) {
    if (!doc.ficheiro_path) return;
    const { data, error } = await supabase.storage
      .from("condominio-docs")
      .createSignedUrl(doc.ficheiro_path, 60);
    if (error || !data) {
      toast.error("Não foi possível abrir o ficheiro.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  if (edificio.isLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4 p-4 md:p-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (edificio.isError || !edificio.data) {
    return (
      <div className="mx-auto w-full max-w-5xl p-8 text-center">
        <p className="text-muted-foreground">Edifício não encontrado.</p>
        <Button asChild className="mt-4">
          <Link to="/dashboard">Voltar aos edifícios</Link>
        </Button>
      </div>
    );
  }

  const ed = edificio.data;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-8">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/dashboard">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Edifícios
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{ed.nome}</h1>
            <p className="text-sm text-muted-foreground">
              {[ed.morada, ed.codigo_postal, ed.localidade].filter(Boolean).join(" · ") ||
                "Sem morada registada"}
            </p>
          </div>
          {ed.identificacao_interna && (
            <Badge variant="secondary">{ed.identificacao_interna}</Badge>
          )}
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo documento
        </Button>
      </div>

      <Tabs defaultValue="documentos">
        <TabsList>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
          <TabsTrigger value="dados">Dados do edifício</TabsTrigger>
        </TabsList>

        <TabsContent value="documentos" className="space-y-4 pt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Landmark className="h-4 w-4 text-primary" />
                Acesso ao banco
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]"
                onSubmit={(e) => {
                  e.preventDefault();
                  guardarBanco.mutate({
                    banco_codigo_acesso: codigoAcesso.trim() || null,
                    banco_pin: pin.trim() || null,
                  });
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="banco-codigo">Código de acesso</Label>
                  <Input
                    id="banco-codigo"
                    value={codigoAcesso}
                    onChange={(e) => setCodigoAcesso(e.target.value)}
                    maxLength={50}
                    autoComplete="off"
                    placeholder="Ex.: 123456789"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="banco-pin">PIN</Label>
                  <div className="flex gap-2">
                    <Input
                      id="banco-pin"
                      type={verPin ? "text" : "password"}
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      maxLength={20}
                      autoComplete="off"
                      placeholder="••••"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      title={verPin ? "Ocultar PIN" : "Mostrar PIN"}
                      onClick={() => setVerPin((v) => !v)}
                    >
                      {verPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <Button type="submit" disabled={guardarBanco.isPending}>
                  {guardarBanco.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Guardar
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9 bg-background"
                placeholder="Procurar documento..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
              <SelectTrigger className="sm:w-40 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                {TIPOS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={ordem} onValueChange={(v) => setOrdem(v as typeof ordem)}>
              <SelectTrigger className="sm:w-44 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recentes">Data (mais recente)</SelectItem>
                <SelectItem value="antigos">Data (mais antigo)</SelectItem>
                <SelectItem value="validade">Validade próxima</SelectItem>
                <SelectItem value="titulo">Título (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {documentos.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : lista.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
                <FileText className="h-10 w-10 text-muted-foreground" />
                <p className="font-medium">Sem documentos</p>
                <p className="text-sm text-muted-foreground">
                  Adicione contratos de luz, água, seguros, elevadores e mais.
                </p>
                <Button
                  onClick={() => {
                    setEditing(null);
                    setDialogOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Novo documento
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {lista.map((d) => {
                const info = tipoInfo(d.tipo);
                const estado = estadoValidade(d.data_validade);
                const Icon = info.icon;
                return (
                  <Card key={d.id}>
                    <CardContent className="flex flex-wrap items-start gap-4 p-4">
                      <div className={`rounded-md border p-2 ${info.className}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium">{d.titulo}</h3>
                          <Badge variant="outline">{info.label}</Badge>
                          {estado === "expirado" && (
                            <Badge className="bg-destructive text-destructive-foreground">
                              Expirado em {formatDate(d.data_validade)}
                            </Badge>
                          )}
                          {estado === "a-expirar" && (
                            <Badge className="bg-amber-500 text-white">
                              Expira a {formatDate(d.data_validade)}
                            </Badge>
                          )}
                        </div>
                        {d.informacao && (
                          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                            {d.informacao}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Data: {formatDate(d.data_documento)}
                          {d.data_validade && estado === "valido"
                            ? ` · Válido até ${formatDate(d.data_validade)}`
                            : ""}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {d.ficheiro_path && (
                          <Button
                            variant="outline"
                            size="icon"
                            title={d.ficheiro_nome ?? "Abrir ficheiro"}
                            onClick={() => abrirFicheiro(d)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditing(d);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setApagar(d)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="dados" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dados do edifício</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget as HTMLFormElement);
                  const val = (k: string) => (String(fd.get(k) ?? "").trim() || null);
                  const nome = String(fd.get("nome") ?? "").trim();
                  if (!nome) {
                    toast.error("O nome é obrigatório.");
                    return;
                  }
                  guardarDados.mutate({
                    nome,
                    identificacao_interna: val("identificacao_interna"),
                    morada: val("morada"),
                    codigo_postal: val("codigo_postal"),
                    localidade: val("localidade"),
                    observacoes: val("observacoes"),
                  });
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome</Label>
                  <Input id="nome" name="nome" defaultValue={ed.nome} maxLength={200} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ident">Identificação interna</Label>
                  <Input
                    id="ident"
                    name="identificacao_interna"
                    defaultValue={ed.identificacao_interna ?? ""}
                    maxLength={50}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="morada">Morada</Label>
                  <Input id="morada" name="morada" defaultValue={ed.morada ?? ""} maxLength={300} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="cp">Código postal</Label>
                    <Input id="cp" name="codigo_postal" defaultValue={ed.codigo_postal ?? ""} maxLength={20} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="loc">Localidade</Label>
                    <Input id="loc" name="localidade" defaultValue={ed.localidade ?? ""} maxLength={100} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="obs">Notas</Label>
                  <Textarea id="obs" name="observacoes" rows={3} defaultValue={ed.observacoes ?? ""} maxLength={2000} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={guardarDados.isPending}>
                    {guardarDados.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Guardar alterações
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setApagarEdificio(true)}>
                    <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                    Eliminar edifício
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DocumentoDialog
        edificioId={id}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        documento={editing}
      />

      <AlertDialog open={!!apagar} onOpenChange={(v) => !v && setApagar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar documento?</AlertDialogTitle>
            <AlertDialogDescription>
              "{apagar?.titulo}" e o respetivo ficheiro serão apagados definitivamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => apagar && eliminarDoc.mutate(apagar)}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={apagarEdificio} onOpenChange={setApagarEdificio}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar edifício?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os documentos deste edifício serão eliminados. Esta ação não pode ser anulada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => eliminarEdificio.mutate()}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
