import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, LayoutDashboard, AlertTriangle, Users, LogOut, FileCheck, CalendarDays, Mail, ListTodo, ListChecks, Wrench, FileSignature } from "lucide-react";

import logoMark from "@/assets/logo-mark.png.asset.json";
import { PESSOAS_EQUIPA, usePessoaAtual } from "@/lib/pessoa-atual";

import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [pessoa, setPessoa] = usePessoaAtual();

  const isActive = (p: string) => currentPath === p || currentPath.startsWith(p + "/");

  const items = [
    { title: "Início", url: "/inicio", icon: LayoutDashboard },
    { title: "Edifícios", url: "/dashboard", icon: Building2 },
    { title: "Alertas", url: "/alertas", icon: AlertTriangle },
    { title: "Agenda", url: "/agenda", icon: ListTodo },
    { title: "Check do dia", url: "/check", icon: ListChecks },
    { title: "Vistorias", url: "/vistorias", icon: Wrench },
    { title: "Declarações", url: "/declaracoes", icon: FileCheck },
    { title: "Assembleias", url: "/assembleias", icon: CalendarDays },
    { title: "Propostas", url: "/propostas", icon: FileSignature },
    { title: "Emails", url: "/emails", icon: Mail },
    { title: "Utilizadores", url: "/utilizadores", icon: Users },
  ] as const;

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <img src={logoMark.url} alt="Dinâmico" className="h-8 w-8 object-contain" />
          <div className="text-sm font-semibold leading-tight">Condomínio Dinâmico</div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem className="group-data-[collapsible=icon]:hidden">
            <div className="px-2 pb-1 text-[11px] text-muted-foreground">Quem está a usar</div>
            <div className="grid grid-cols-3 gap-1 px-1">
              {PESSOAS_EQUIPA.map((p) => (
                <button
                  key={p}
                  onClick={() => setPessoa(p)}
                  className={`rounded-md px-1 py-1.5 text-xs transition ${pessoa === p ? "bg-primary text-primary-foreground font-medium" : "bg-muted text-muted-foreground hover:bg-accent"}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
