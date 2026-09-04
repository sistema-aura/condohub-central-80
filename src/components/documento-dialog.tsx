import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Paperclip, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { TIPOS, type TipoDocumento } from "@/lib/documentos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type DocumentoRow = {
  id: string;
  edificio_id: string;
  titulo: string;
  tipo: TipoDocumento;
  informacao: string | null;
  ficheiro_path: string | null;
  ficheiro_nome: string | null;
  mime_type: string | null;
  tamanho: number | null;
  data_documento: string | null;
  data_validade: string | null;
  created_at: string;
};

const MAX_MB = 25;
const ACEITES = ["application/pdf", "image/png", "image/jpeg", "image/webp", "image/heic"];

export function DocumentoDialog({
  edificioId,
  open,
  onOpenChange,
  documento,
}: {
  edificioId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  documento?: DocumentoRow | null;
}) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    titulo: "",
    tipo: "outros" as TipoDocumento,
    informacao: "",
    data_documento: "",
    data_validade: "",
  });

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setForm({
      titulo: documento?.titulo ?? "",
      tipo: documento?.tipo ?? "outros",
      informacao: documento?.informacao ?? "",
      data_documento: documento?.data_documento ?? "",
      data_validade: documento?.data_validade ?? "",
    });
  }, [open, documento]);

  function pickFile(f: File | null) {
    if (!f) return;
    if (f.size > MAX_MB * 1024 * 1024) {
      toast.error(`O ficheiro excede ${MAX_MB} MB.`);
      return;
    }
    if (f.type && !ACEITES.includes(f.type)) {
      toast.error("Apenas PDF ou imagens.");
      return;
    }
    setFile(f);
  }

  const guardar = useMutation({
    mutationFn: async () => {
      const titulo = form.titulo.trim();
      if (!titulo) throw new Error("O título é obrigatório.");

      let ficheiro: {
        ficheiro_path: string;
        ficheiro_nome: string;
        mime_type: string | null;
        tamanho: number;
      } | null = null;

      if (file) {
        const ext = file.name.split(".").pop() ?? "bin";
        const path = `${edificioId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("condominio-docs")
          .upload(path, file, { contentType: file.type || undefined });
        if (upErr) throw upErr;
        ficheiro = {
          ficheiro_path: path,
          ficheiro_nome: file.name.slice(0, 200),
          mime_type: file.type || null,
          tamanho: file.size,
        };
      }

      const payload = {
        edificio_id: edificioId,
        titulo: titulo.slice(0, 200),
        tipo: form.tipo,
        informacao: form.informacao.trim().slice(0, 5000) || null,
        data_documento: form.data_documento || null,
        data_validade: form.data_validade || null,
        ...(ficheiro ?? {}),
      };

      if (documento) {
        const { error } = await supabase.from("documentos").update(payload).eq("id", documento.id);
        if (error) throw error;
        if (ficheiro && documento.ficheiro_path) {
          await supabase.storage.from("condominio-docs").remove([documento.ficheiro_path]);
        }
      } else {
        const { error } = await supabase.from("documentos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documentos"] });
      qc.invalidateQueries({ queryKey: ["documentos-resumo"] });
      toast.success(documento ? "Documento atualizado." : "Documento guardado.");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{documento ? "Editar documento" : "Novo documento"}</DialogTitle>
          <DialogDescription>
            Guarde informação escrita, um ficheiro, ou ambos.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            guardar.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              required
              maxLength={200}
              placeholder="Ex.: Contrato EDP 2026"
              value={form.titulo}
              onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select
              value={form.tipo}
              onValueChange={(v) => setForm((f) => ({ ...f, tipo: v as TipoDocumento }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dd">Data do documento</Label>
              <Input
                id="dd"
                type="date"
                value={form.data_documento}
                onChange={(e) => setForm((f) => ({ ...f, data_documento: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dv">Validade</Label>
              <Input
                id="dv"
                type="date"
                value={form.data_validade}
                onChange={(e) => setForm((f) => ({ ...f, data_validade: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="info">Informação</Label>
            <Textarea
              id="info"
              rows={4}
              maxLength={5000}
              placeholder="Notas, números de contrato, contactos, IBAN..."
              value={form.informacao}
              onChange={(e) => setForm((f) => ({ ...f, informacao: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Ficheiro (PDF ou imagem)</Label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                pickFile(e.dataTransfer.files?.[0] ?? null);
              }}
              onClick={() => inputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center text-sm transition-colors ${
                dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:bg-muted/50"
              }`}
            >
              <UploadCloud className="h-6 w-6 text-muted-foreground" />
              <span className="text-muted-foreground">
                Arraste aqui o ficheiro ou clique para escolher (máx. {MAX_MB} MB)
              </span>
            </div>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept=".pdf,image/*"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <Paperclip className="h-4 w-4 shrink-0" />
                  <span className="truncate">{file.name}</span>
                </span>
                <Button type="button" variant="ghost" size="icon" onClick={() => setFile(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : documento?.ficheiro_nome ? (
              <p className="text-xs text-muted-foreground">
                Ficheiro atual: {documento.ficheiro_nome} (escolha outro para substituir)
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardar.isPending}>
              {guardar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
