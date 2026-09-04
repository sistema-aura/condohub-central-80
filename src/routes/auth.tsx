import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { getSetupStatus, createFirstUser } from "@/lib/users.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar — Condomínio Dinâmico" },
      { name: "description", content: "Acesso reservado à equipa do Condomínio Dinâmico." },
      { property: "og:title", content: "Entrar — Condomínio Dinâmico" },
      { property: "og:description", content: "Acesso reservado à equipa do Condomínio Dinâmico." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const setupFn = useServerFn(getSetupStatus);
  const firstUserFn = useServerFn(createFirstUser);
  const setup = useQuery({ queryKey: ["setup-status"], queryFn: () => setupFn({}) });
  const isSetup = setup.data?.hasUsers === false;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  const bootstrap = useMutation({
    mutationFn: (v: { email: string; password: string }) => firstUserFn({ data: v }),
    onSuccess: async () => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Conta criada. Bem-vindo!");
      navigate({ to: "/dashboard", replace: true });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSetup) {
      bootstrap.mutate({ email: email.trim().toLowerCase(), password });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);
    if (error) {
      toast.error("Email ou password incorretos.");
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  }

  const busy = loading || bootstrap.isPending;

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-muted/30">
      <div className="hidden lg:flex flex-col justify-between bg-primary p-12 text-primary-foreground">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary-foreground/15 p-2">
            <Building2 className="h-6 w-6" />
          </div>
          <span className="text-lg font-semibold">Condomínio Dinâmico</span>
        </div>
        <div className="max-w-md space-y-4">
          <h1 className="text-3xl font-semibold leading-tight">
            Toda a informação dos seus edifícios, sem papel.
          </h1>
          <p className="text-primary-foreground/80">
            Contratos de luz e água, dados bancários, elevadores, seguros e documentos —
            organizados por edifício, com alertas de validade.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/60">Sistema interno · acesso reservado</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>{isSetup ? "Criar conta de administrador" : "Entrar"}</CardTitle>
            <CardDescription>
              {isSetup
                ? "Esta é a primeira conta da aplicação."
                : "Introduza os dados da sua conta."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={255}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={isSetup ? "new-password" : "current-password"}
                  required
                  minLength={isSetup ? 8 : undefined}
                  maxLength={72}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy || setup.isLoading}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSetup ? "Criar conta e entrar" : "Entrar"}
              </Button>
              {!isSetup && (
                <p className="text-center text-xs text-muted-foreground">
                  As contas são criadas por um administrador da empresa.
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
