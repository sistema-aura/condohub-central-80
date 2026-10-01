import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function Notificacoes() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    let me: string | undefined;
    supabase.auth.getUser().then(({ data }) => (me = data.user?.id));
    const avisar = (msg: string, irPara: string) => {
      toast.info(msg, { action: { label: "Ver", onClick: () => navigate({ to: irPara }) } });
      if ("Notification" in window && Notification.permission === "granted") new Notification("Condomínio Dinâmico", { body: msg, icon: "/favicon.png" });
    };
    const ch = supabase
      .channel("avisos-notif")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "declaracoes" }, (p) => {
        qc.invalidateQueries({ queryKey: ["declaracoes"] });
        const r = p.new as { created_by: string | null; urgente: boolean; fracao: string | null };
        if (r.created_by && r.created_by === me) return;
        avisar(`Nova declaração de não dívida${r.urgente ? " (URGENTE)" : ""}${r.fracao ? ` — fração ${r.fracao}` : ""}`, "/declaracoes");
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "documentos" }, (p) => {
        qc.invalidateQueries({ queryKey: ["documentos"] });
        const r = p.new as { created_by: string | null; titulo: string | null; edificio_id: string };
        if (r.created_by && r.created_by === me) return;
        avisar(`Novo documento${r.titulo ? `: ${r.titulo}` : ""}`, `/edificios/${r.edificio_id}`);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "assembleias" }, (p) => {
        qc.invalidateQueries({ queryKey: ["assembleias"] });
        const r = p.new as { created_by: string | null; data_hora: string };
        if (r.created_by && r.created_by === me) return;
        avisar(`Nova assembleia marcada para ${new Date(r.data_hora).toLocaleDateString("pt-PT")}`, "/assembleias");
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc, navigate]);

  const pedir = async () => {
    if (!("Notification" in window)) return toast.error("Este navegador não suporta notificações");
    const r = await Notification.requestPermission();
    toast[r === "granted" ? "success" : "error"](r === "granted" ? "Notificações ativadas" : "Notificações bloqueadas no navegador");
  };

  return (
    <Button variant="ghost" size="icon" className="ml-auto" title="Ativar notificações" onClick={pedir}>
      <Bell className="h-4 w-4" />
    </Button>
  );
}
