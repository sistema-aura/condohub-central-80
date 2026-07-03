import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Building2, LayoutDashboard, Upload, LogOut } from "lucide-react";
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
import { lockSite } from "@/lib/gate.functions";
import { toast } from "sonner";

export function AppSidebar() {
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const router = useRouter();
  const lock = useServerFn(lockSite);
  const isActive = (p: string) =>
    currentPath === p || currentPath.startsWith(p + "/");

  const items = [
    { title: "Condomínios", url: "/dashboard", icon: LayoutDashboard },
    { title: "Importar", url: "/importar", icon: Upload },
  ] as const;

  async function signOut() {
    await lock();
    toast.success("Sessão terminada");
    await router.navigate({ to: "/unlock" });
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
