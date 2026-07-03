import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/utilizadores")({
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    if (!isAdmin) throw redirect({ to: "/dashboard" });
  },
  component: Utilizadores,
});

type UserRow = {
  id: string;
  email: string | null;
  nome: string | null;
  created_at: string;
  role: "admin" | "colaborador";
};

function Utilizadores() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["utilizadores"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase.from("profiles").select("id, email, nome, created_at").order("created_at");
      if (error) throw error;
      const { data: roles, error: e2 } = await supabase.from("user_roles").select("user_id, role");
      if (e2) throw e2;
      const roleMap = new Map(roles?.map((r) => [r.user_id, r.role]) ?? []);
      return (profiles ?? []).map((p) => ({
        ...p,
        role: (roleMap.get(p.id) ?? "colaborador") as "admin" | "colaborador",
      })) as UserRow[];
    },
  });

  async function setRole(userId: string, newRole: "admin" | "colaborador") {
    const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (delErr) return toast.error(delErr.message);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole });
    if (error) return toast.error(error.message);
    toast.success("Papel atualizado");
    qc.invalidateQueries({ queryKey: ["utilizadores"] });
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader><CardTitle>Utilizadores</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-muted-foreground text-center py-6">A carregar...</TableCell></TableRow>
              ) : data.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.nome || "—"}</TableCell>
                  <TableCell className="text-sm">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                      {u.role === "admin" ? "Administrador" : "Colaborador"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {u.role === "admin" ? (
                      <Button size="sm" variant="outline" onClick={() => setRole(u.id, "colaborador")}>Tornar colaborador</Button>
                    ) : (
                      <Button size="sm" onClick={() => setRole(u.id, "admin")}>Tornar administrador</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
