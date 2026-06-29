import { Flame } from "lucide-react";
import { AppSidebar } from "@/components/AppSidebar";
import { useStudyPlanner } from "@/context/StudyPlannerContext";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { streakCount, plan, agentBackendStatus } = useStudyPlanner();
  const hasPlan = plan.days.length > 0;
  const statusLabel =
    agentBackendStatus === "configured"
      ? "DeepSeek live"
      : agentBackendStatus === "checking"
        ? "Checking DeepSeek"
        : "Built-in planner";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border/50 bg-background/80 px-4 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <h1 className="hidden text-lg font-semibold gradient-text sm:block">StudyFlow</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="glass-card px-3 py-1.5 text-xs font-medium text-muted-foreground">{statusLabel}</div>
              <div className="glass-card flex items-center gap-2 px-3 py-1.5">
                <Flame className="h-4 w-4 text-warning" />
                <span className="text-sm font-medium">{hasPlan ? `${streakCount} day streak` : "No active plan"}</span>
              </div>
            </div>
          </header>
          <main className="scrollbar-thin flex-1 overflow-auto p-4 md:p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
