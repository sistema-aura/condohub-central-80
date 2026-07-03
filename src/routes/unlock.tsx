import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { unlockSite } from "@/lib/gate.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/unlock")({
  component: Unlock,
  head: () => ({
    meta: [{ title: "Entrar — GestCond" }],
  }),
});

function Unlock() {
  const router = useRouter();
  const unlock = useServerFn(unlockSite);
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!pwd) return;
    setLoading(true);
    try {
      const res = await unlock({ data: { password: pwd } });
      if (res.ok) {
        await router.navigate({ to: "/dashboard" });
      } else if (res.error === "config") {
        toast.error(
          "A password de acesso ainda não foi definida no backend (SITE_PASSWORD).",
        );
      } else {
        toast.error("Password incorreta");
        setPwd("");
      }
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível entrar. Tenta novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm p-6 space-y-6">
        <div className="flex flex-col items-center text-center gap-2">
          <div className="rounded-lg bg-primary p-2 text-primary-foreground">
            <Building2 className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-semibold">GestCond</h1>
          <p className="text-sm text-muted-foreground">
            Introduz a password de acesso da equipa.
          </p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="pwd">Password</Label>
            <Input
              id="pwd"
              type="password"
              autoComplete="current-password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              autoFocus
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading || !pwd}>
            {loading ? "A entrar…" : "Entrar"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
