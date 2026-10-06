import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, FileText, Sparkles, ArrowRight, ArrowUpRight } from "lucide-react";
import logoFull from "@/assets/logo-dinamico-transparente.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dinâmico — Escolhe a plataforma" },
      { name: "description", content: "Acesso às plataformas Condomínio Dinâmico, Ata Fácil IA e Contas Limpas." },
      { property: "og:title", content: "Dinâmico — Escolhe a plataforma" },
      { property: "og:description", content: "Acesso às plataformas Condomínio Dinâmico, Ata Fácil IA e Contas Limpas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Inicio,
});

type Plataforma = {
  to?: string;
  href?: string;
  icon: typeof Building2;
  title: string;
  desc: string;
  iconeCls: string;
  acaoCls: string;
  botao: boolean;
};

const plataformas: Plataforma[] = [
  {
    to: "/auth",
    icon: Building2,
    title: "Condomínio Dinâmico",
    desc: "Edifícios, documentos, declarações, assembleias, agenda, vistorias, emails e propostas.",
    iconeCls: "bg-primary/10 text-primary",
    acaoCls: "text-primary",
    botao: true,
  },
  {
    href: "https://ata-ia.lovable.app",
    icon: FileText,
    title: "Ata Fácil IA",
    desc: "Geração de atas de assembleia com inteligência artificial.",
    iconeCls: "bg-ata/10 text-ata",
    acaoCls: "text-ata",
    botao: false,
  },
  {
    href: "https://limpezasdinamico.lovable.app",
    icon: Sparkles,
    title: "Contas Limpas",
    desc: "Gestão dos pagamentos de limpeza por prédio.",
    iconeCls: "bg-limpas/10 text-limpas",
    acaoCls: "text-limpas",
    botao: false,
  },
];

function Cartao({ p }: { p: Plataforma }) {
  const cls =
    "group relative flex flex-col rounded-3xl border bg-card/80 p-8 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-black/5";
  const inner = (
    <>
      <div className="flex items-start justify-between mb-6">
        <div className={`rounded-2xl p-3 ${p.iconeCls}`}>
          <p.icon className="h-8 w-8" strokeWidth={1.5} />
        </div>
        <span className="text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100">
          {p.botao ? (
            <ArrowRight className="h-5 w-5" />
          ) : (
            <ArrowUpRight className="h-5 w-5" />
          )}
        </span>
      </div>
      <h2 className="text-xl font-bold mb-3">{p.title}</h2>
      <p className="text-muted-foreground text-sm leading-relaxed mb-8 flex-grow">{p.desc}</p>
      {p.botao ? (
        <span className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-primary-foreground font-semibold shadow-lg shadow-primary/20 transition-all group-hover:brightness-110 group-active:scale-95">
          Entrar
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </span>
      ) : (
        <span className={`inline-flex items-center gap-2 font-semibold ${p.acaoCls}`}>
          Abrir noutro separador
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </span>
      )}
    </>
  );
  return p.to ? (
    <Link to={p.to} className={cls}>
      {inner}
    </Link>
  ) : (
    <a href={p.href} target="_blank" rel="noreferrer" className={cls}>
      {inner}
    </a>
  );
}

function Inicio() {
  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden p-6">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="absolute -top-1/4 -left-1/4 h-[40%] w-[40%] rounded-full bg-primary/15 blur-[120px]" />
        <div className="absolute -bottom-1/4 -right-1/4 h-[40%] w-[40%] rounded-full bg-ata/20 blur-[120px]" />
        <div className="absolute top-1/3 left-1/2 h-[30%] w-[30%] -translate-x-1/2 rounded-full bg-limpas/10 blur-[120px]" />
      </div>
      <div className="flex w-full max-w-6xl flex-col items-center gap-12">
        <div className="flex flex-col items-center text-center">
          <img src={logoFull} alt="DINÂMICO — Gestão de Condomínios" className="h-24 object-contain" />
          <p className="mt-6 text-lg font-medium italic text-muted-foreground">Escolhe a plataforma</p>
        </div>
        <div className="grid w-full gap-8 md:grid-cols-3">
          {plataformas.map((p) => (
            <Cartao key={p.title} p={p} />
          ))}
        </div>
      </div>
    </div>
  );
}
