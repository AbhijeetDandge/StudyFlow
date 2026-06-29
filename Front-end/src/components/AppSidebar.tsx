import { BrainCircuit, Flame, LayoutDashboard, RefreshCw, TrendingUp } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useStudyPlanner } from "@/context/StudyPlannerContext";
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
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Progress", url: "/progress", icon: TrendingUp },
  { title: "Adaptive Plan", url: "/adaptive", icon: RefreshCw },
  { title: "Insights", url: "/insights", icon: BrainCircuit },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { streakCount, weakSubjects, plan, agentBackendStatus } = useStudyPlanner();
  const collapsed = state === "collapsed";
  const hasPlan = plan.days.length > 0;
  const systemLabel =
    agentBackendStatus === "configured"
      ? "DeepSeek live"
      : agentBackendStatus === "checking"
        ? "Checking DeepSeek"
        : "Built-in planner active";

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="glow-sm flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
            <BrainCircuit className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && <span className="gradient-text text-lg font-bold">StudyFlow</span>}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-widest text-muted-foreground/60">
            {!collapsed && "Navigation"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="rounded-lg transition-all duration-200 hover:bg-sidebar-accent"
                      activeClassName="glow-sm bg-primary/15 font-medium text-primary"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        {!collapsed ? (
          <div className="glass-card space-y-3 p-3">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-warning" />
              <div>
                <p className="text-sm font-semibold text-foreground">{streakCount} day streak</p>
                <p className="text-xs text-muted-foreground">{hasPlan ? "Keep the momentum alive." : "Start by creating your first plan."}</p>
              </div>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70">Needs attention</p>
              <p className="mt-1 text-sm">
                {hasPlan ? (weakSubjects.length > 0 ? weakSubjects.join(", ") : "No urgent gaps right now") : "No study data yet"}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70">System mode</p>
              <p className="mt-1 text-sm">{systemLabel}</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <Flame className="h-5 w-5 text-warning" />
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
