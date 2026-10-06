import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, FileText, Sparkles, ArrowUpRight } from "lucide-react";
import logoFull from "@/assets/logo-dinamico.png.asset.json";

export const Route = createFileRoute("/_authenticated/inicio")({
  head: () => ({
    meta: [
      { title: "Início — Condomínio Dinâmico" },
      { name: "description", content: "Acesso às plataformas Condomínio Dinâmico, Ata Fácil IA e Contas Limpas." },
      { property: "og:title", content: "Início — Condomínio Dinâmico" },
      { property: "og:description", content: "Acesso às plataformas Condomínio Dinâmico, Ata Fácil IA e Contas Limpas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Inicio,
});

const cardCls =
  "group relative flex flex-col gap-4 rounded-2xl border bg-card p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg hover:border-primary/50";

function CardBody({ icon: Icon, title, desc, ext }: { icon: typeof Building2; title: string; desc: string; ext?: boolean }) {
  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-6 w-6" />
        </div>
        <ArrowUpRight className="h-5 w-5 text-muted-foreground transition group-hover:text-primary" />
      </div>
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      </div>
      <span className="mt-auto text-sm font-medium text-primary">{ext ? "Abrir noutro separador" : "Entrar"}</span>
    </>
  );
}

function Inicio() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-10 flex flex-col items-center text-center">
        <img src={logoFull.url} alt="Dinâmico" className="h-24 object-contain" />
        <p className="mt-3 text-muted-foreground">Escolhe a plataforma</p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <Link to="/dashboard" className={cardCls}>
          <CardBody icon={Building2} title="Condomínio Dinâmico" desc="Edifícios, documentos, declarações, assembleias, agenda, vistorias, emails e propostas." />
        </Link>
        <a href="https://ata-ia.lovable.app" target="_blank" rel="noreferrer" className={cardCls}>
          <CardBody icon={FileText} title="Ata Fácil IA" desc="Geração de atas de assembleia com inteligência artificial." ext />
        </a>
        <a href="https://limpezasdinamico.lovable.app" target="_blank" rel="noreferrer" className={cardCls}>
          <CardBody icon={Sparkles} title="Contas Limpas" desc="Gestão dos pagamentos de limpeza por prédio." ext />
        </a>
      </div>
    </div>
  );
}
