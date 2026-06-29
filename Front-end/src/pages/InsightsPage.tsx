import { motion } from "framer-motion";
import { AlertTriangle, BrainCircuit, Flame, GitBranch, Info, MessagesSquare, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useStudyPlanner } from "@/context/StudyPlannerContext";

const containerV = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemV = {
  hidden: { opacity: 0, x: -16 },
  show: { opacity: 1, x: 0 },
};

const typeConfig = {
  motivator: { icon: Flame, accent: "border-l-success", bg: "bg-success/5", color: "text-success", label: "Motivator" },
  alert: { icon: AlertTriangle, accent: "border-l-destructive", bg: "bg-destructive/5", color: "text-destructive", label: "Alert" },
  info: { icon: Info, accent: "border-l-accent", bg: "bg-accent/5", color: "text-accent", label: "Insight" },
};

const activityStageConfig = {
  planning: { icon: Sparkles, tone: "border-primary/30 bg-primary/10 text-primary" },
  analysis: { icon: BrainCircuit, tone: "border-accent/30 bg-accent/10 text-accent" },
  adaptation: { icon: GitBranch, tone: "border-success/30 bg-success/10 text-success" },
  memory: { icon: MessagesSquare, tone: "border-warning/30 bg-warning/10 text-warning" },
};

export default function InsightsPage() {
  const {
    insights,
    agentActivities,
    overallCompletion,
    weakSubjects,
    streakCount,
    refreshAgentAnalysis,
    isAgentWorking,
    agentBackendStatus,
  } = useStudyPlanner();
  const hasInsights = insights.length > 0;

  return (
    <motion.div variants={containerV} initial="hidden" animate="show" className="mx-auto max-w-3xl space-y-6">
      <motion.div variants={itemV}>
        <h2 className="gradient-text flex items-center gap-2 text-2xl font-bold">
          <BrainCircuit className="h-6 w-6" />
          Insights
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Guidance, analysis, and coaching based on your study workflow.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="outline">
            {agentBackendStatus === "configured" ? "DeepSeek live" : "Built-in guidance"}
          </Badge>
          <Badge variant="outline">{agentActivities.length} agent steps tracked</Badge>
        </div>
      </motion.div>

      <motion.div variants={itemV} className="grid gap-4 sm:grid-cols-3">
        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Completion</p>
          <p className="mt-3 text-2xl font-semibold">{overallCompletion}%</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Streak</p>
          <p className="mt-3 text-2xl font-semibold">{streakCount} days</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Weak areas</p>
          <p className="mt-3 text-lg font-semibold">{weakSubjects.length > 0 ? weakSubjects.join(", ") : "None yet"}</p>
        </div>
      </motion.div>

      <motion.div variants={itemV} className="glass-card flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Updates</p>
          <p className="mt-2 text-sm">Refresh to pull the latest recommendations and progress notes.</p>
        </div>
        <button
          type="button"
          disabled={isAgentWorking}
          onClick={() => void refreshAgentAnalysis()}
          className="rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary disabled:opacity-60"
        >
          {isAgentWorking ? "Refreshing..." : "Refresh"}
        </button>
      </motion.div>

      <motion.div variants={itemV} className="glass-card p-4">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Agent timeline</p>
        <div className="relative mt-4 space-y-3 before:absolute before:bottom-3 before:left-[19px] before:top-3 before:w-px before:bg-border/70 before:content-['']">
          {agentActivities.map((activity) => {
            const config = activityStageConfig[activity.stage];
            const Icon = config.icon;

            return (
              <div key={activity.id} className="relative flex gap-3">
                <div className={`relative z-10 mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${config.tone}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex flex-1 items-start justify-between gap-4 rounded-2xl border border-border/60 bg-secondary/20 p-3">
                  <div>
                    <p className="font-medium">{activity.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{activity.detail}</p>
                  </div>
                  <span className="shrink-0 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{activity.timestamp}</span>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      <motion.div variants={containerV} className="space-y-3">
        {!hasInsights && (
          <motion.div variants={itemV} className="glass-card p-6 text-sm text-muted-foreground">
            No insights yet. Once your first plan is generated, recommendations and study notes will appear here.
          </motion.div>
        )}
        {insights.map((message) => {
          const cfg = typeConfig[message.type];
          const Icon = cfg.icon;

          return (
            <motion.div key={message.id} variants={itemV} className={`glass-card-hover flex gap-3 border-l-4 p-4 ${cfg.accent} ${cfg.bg}`}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                <Icon className={`h-4 w-4 ${cfg.color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {cfg.label}
                    </Badge>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{message.timestamp}</span>
                </div>
                <p className="mt-2 text-sm leading-6">{message.message}</p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
