import { Link, useRouterState } from "@tanstack/react-router";
import { Building2, LayoutDashboard, Upload, Users, LogOut } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-auth";
import { toast } from "sonner";

export function AppSidebar() {
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const isAdmin = useIsAdmin();
  const isActive = (p: string) => currentPath === p || currentPath.startsWith(p + "/");

  const items = [
    { title: "Condomínios", url: "/dashboard", icon: LayoutDashboard },
    { title: "Importar", url: "/importar", icon: Upload },
    ...(isAdmin ? [{ title: "Utilizadores", url: "/utilizadores", icon: Users }] : []),
  ];

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Sessão terminada");
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="rounded-md bg-primary p-1.5 text-primary-foreground">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="font-semibold text-sm">GestCond</div>
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
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut}>
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
