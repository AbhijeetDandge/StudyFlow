import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, Minus, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useStudyPlanner } from "@/context/StudyPlannerContext";

const containerV = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemV = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

const statusConfig = {
  increased: { icon: ArrowUp, color: "text-destructive", bg: "bg-destructive/10 border-destructive/30", label: "Increased" },
  decreased: { icon: ArrowDown, color: "text-success", bg: "bg-success/10 border-success/30", label: "Decreased" },
  adjusted: { icon: Minus, color: "text-warning", bg: "bg-warning/10 border-warning/30", label: "Adjusted" },
};

export default function AdaptivePlanPage() {
  const { adaptivePlan, subjectSummaries, weakSubjects } = useStudyPlanner();
  const hasAdaptivePlan = adaptivePlan.length > 0;

  return (
    <motion.div variants={containerV} initial="hidden" animate="show" className="mx-auto max-w-4xl space-y-6">
      <motion.div variants={itemV} className="space-y-2">
        <h2 className="gradient-text flex items-center gap-2 text-2xl font-bold">
          <RefreshCw className="h-6 w-6" />
          Plan Adjustments
        </h2>
        <p className="text-sm text-muted-foreground">
          Upcoming sessions update automatically based on your latest progress.
        </p>
      </motion.div>

      <motion.div variants={itemV} className="grid gap-4 md:grid-cols-3">
        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Recovery targets</p>
          <p className="mt-3 text-lg font-semibold">
            {weakSubjects.length > 0 ? weakSubjects.join(", ") : "No urgent gaps"}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Recommended updates</p>
          <p className="mt-3 text-lg font-semibold">{adaptivePlan.length} changes queued</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Highest priority</p>
          <p className="mt-3 text-lg font-semibold">{subjectSummaries[0]?.name ?? "All balanced"}</p>
        </div>
      </motion.div>

      {!hasAdaptivePlan && (
        <motion.div variants={itemV} className="glass-card p-6 text-sm text-muted-foreground">
          No schedule changes yet. Create a plan and log progress to unlock personalized adjustments.
        </motion.div>
      )}

      {adaptivePlan.map((entry) => {
        const cfg = statusConfig[entry.status];
        const Icon = cfg.icon;

        return (
          <motion.div key={entry.day} variants={itemV} className="glass-card-hover space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${cfg.bg}`}>
                  <Icon className={`h-4 w-4 ${cfg.color}`} />
                </div>
                <div>
                  <h3 className="font-semibold">Day {entry.day}</h3>
                  <p className="text-xs text-muted-foreground">{entry.date}</p>
                </div>
              </div>
              <Badge className={`${cfg.bg} ${cfg.color} rounded-full border text-xs`}>{cfg.label}</Badge>
            </div>

            <p className="pl-11 text-sm text-muted-foreground">{entry.change}</p>

            <div className="grid gap-3 pl-11 sm:grid-cols-2">
              {entry.subjects.map((subject) => (
                <div key={subject.name} className="rounded-lg bg-secondary/50 p-3 space-y-1">
                  <div className="flex justify-between gap-3">
                    <span className="text-sm font-medium">{subject.name}</span>
                    <span className="text-xs text-muted-foreground">{subject.hours}h</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {subject.topics.map((topic) => (
                      <span key={topic} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
