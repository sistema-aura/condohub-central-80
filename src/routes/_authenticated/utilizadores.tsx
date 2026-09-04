import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { listAppUsers, createAppUser, deleteAppUser } from "@/lib/users.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/utilizadores")({
  head: () => ({
    meta: [
      { title: "Utilizadores — Condomínio Dinâmico" },
      { name: "description", content: "Gerir quem tem acesso à aplicação interna." },
      { property: "og:title", content: "Utilizadores — Condomínio Dinâmico" },
      { property: "og:description", content: "Gerir quem tem acesso à aplicação interna." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Utilizadores,
});

function Utilizadores() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAppUsers);
  const createFn = useServerFn(createAppUser);
  const deleteFn = useServerFn(deleteAppUser);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const users = useQuery({ queryKey: ["app-users"], queryFn: () => listFn({}) });

  const criar = useMutation({
    mutationFn: () => createFn({ data: { email, password } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["app-users"] });
      toast.success("Conta criada. Partilhe a password com a pessoa.");
      setEmail("");
      setPassword("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remover = useMutation({
    mutationFn: (userId: string) => deleteFn({ data: { userId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["app-users"] });
      toast.success("Acesso removido.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Utilizadores</h1>
        <p className="text-sm text-muted-foreground">Quem pode aceder à aplicação.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Criar acesso</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              criar.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                maxLength={255}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw">Password inicial</Label>
              <Input
                id="pw"
                type="text"
                required
                minLength={6}
                maxLength={72}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={criar.isPending}>
              {criar.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              Criar
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contas ativas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {users.isLoading ? (
            <>
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </>
          ) : (
            (users.data ?? []).map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{u.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Último acesso:{" "}
                    {u.lastSignInAt
                      ? new Date(u.lastSignInAt).toLocaleDateString("pt-PT")
                      : "nunca"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => remover.mutate(u.id)}
                  disabled={remover.isPending}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
