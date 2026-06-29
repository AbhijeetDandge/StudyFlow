import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, ListChecks, Target } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { useStudyPlanner } from "@/context/StudyPlannerContext";

const containerV = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemV = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

function getStatus(completion: number) {
  if (completion >= 80) {
    return { label: "On Track", cls: "status-on-track" };
  }
  if (completion >= 50) {
    return { label: "Recoverable", cls: "status-ahead" };
  }
  return { label: "Needs Attention", cls: "status-behind" };
}

export default function ProgressPage() {
  const { overallCompletion, progress, subjectSummaries, updateSubjectProgress, isAgentWorking } = useStudyPlanner();
  const [selectedDay, setSelectedDay] = useState(progress[0]?.day ?? 1);
  const [selectedSubject, setSelectedSubject] = useState(progress[0]?.subjects[0]?.name ?? "");
  const [draftCompletion, setDraftCompletion] = useState(progress[0]?.subjects[0]?.completed ?? 0);
  const [draftTopics, setDraftTopics] = useState<string[]>(progress[0]?.subjects[0]?.completedTopics ?? []);
  const hasProgress = progress.length > 0;

  useEffect(() => {
    if (!hasProgress) {
      setSelectedSubject("");
      setDraftCompletion(0);
      setDraftTopics([]);
      return;
    }

    const dayExists = progress.some((entry) => entry.day === selectedDay);
    if (!dayExists) {
      setSelectedDay(progress[0].day);
    }
  }, [hasProgress, progress, selectedDay]);

  const activeDay = useMemo(
    () => progress.find((entry) => entry.day === selectedDay) ?? progress[0],
    [progress, selectedDay],
  );

  useEffect(() => {
    if (!activeDay) {
      setSelectedSubject("");
      setDraftCompletion(0);
      setDraftTopics([]);
      return;
    }

    const subjectExists = activeDay.subjects.some((subject) => subject.name === selectedSubject);
    const nextSubject = subjectExists ? selectedSubject : activeDay.subjects[0]?.name ?? "";
    setSelectedSubject(nextSubject);
  }, [activeDay, selectedSubject]);

  const activeSubject = useMemo(
    () => activeDay?.subjects.find((subject) => subject.name === selectedSubject) ?? activeDay?.subjects[0],
    [activeDay, selectedSubject],
  );

  useEffect(() => {
    setDraftCompletion(activeSubject?.completed ?? 0);
    setDraftTopics(activeSubject?.completedTopics ?? []);
  }, [activeSubject]);

  const status = getStatus(overallCompletion);

  const completedTopicsCount = draftTopics.length;
  const totalTopicsCount = activeSubject?.targetTopics.length ?? 0;

  const toggleTopic = (topic: string, checked: boolean) => {
    setDraftTopics((current) => {
      const next = checked ? [...current, topic] : current.filter((item) => item !== topic);
      return [...new Set(next)];
    });
  };

  const handleSave = async () => {
    if (!activeDay || !activeSubject) {
      return;
    }

    await updateSubjectProgress(activeDay.day, activeSubject.name, draftCompletion, draftTopics);
  };

  return (
    <motion.div variants={containerV} initial="hidden" animate="show" className="mx-auto max-w-6xl space-y-6">
      <motion.div variants={itemV} className="flex flex-wrap items-center gap-3">
        <h2 className="gradient-text text-2xl font-bold">Progress Tracker</h2>
        <Badge className={`${status.cls} rounded-full text-xs`}>{status.label}</Badge>
      </motion.div>

      <motion.section variants={itemV} className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <div className="glass-card space-y-5 p-6">
          <div>
            <h3 className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-5 w-5 text-success" />
              Subject check-in
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Track each subject separately so the plan can adapt to what is actually finished.
            </p>
          </div>

          {hasProgress ? (
            <>
              <div className="flex flex-wrap gap-2">
                {progress.map((day) => (
                  <Button
                    key={day.day}
                    variant={selectedDay === day.day ? "default" : "outline"}
                    className={selectedDay === day.day ? "bg-gradient-to-r from-primary to-accent text-primary-foreground" : ""}
                    onClick={() => setSelectedDay(day.day)}
                  >
                    Day {day.day}
                  </Button>
                ))}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {activeDay?.subjects.map((subject) => (
                  <button
                    key={`${activeDay.day}-${subject.name}`}
                    type="button"
                    onClick={() => setSelectedSubject(subject.name)}
                    className={`rounded-xl border p-4 text-left transition ${
                      activeSubject?.name === subject.name
                        ? "border-primary/50 bg-primary/10 shadow-sm"
                        : "border-border/60 bg-secondary/25 hover:bg-secondary/45"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{subject.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {subject.completedTopics.length} of {subject.targetTopics.length} topics finished
                        </p>
                      </div>
                      <Badge variant="outline">{subject.completed}%</Badge>
                    </div>
                    <Progress
                      value={subject.completed}
                      className="mt-4 h-2 bg-secondary [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-accent"
                    />
                  </button>
                ))}
              </div>

              {activeDay && activeSubject ? (
                <div className="space-y-5 rounded-2xl border border-border/60 bg-secondary/20 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-muted-foreground">{activeDay.date}</p>
                      <h4 className="text-xl font-semibold">{activeSubject.name}</h4>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Current completion</p>
                      <p className="gradient-text text-2xl font-bold">{draftCompletion}%</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Session progress</span>
                      <span>{draftCompletion}%</span>
                    </div>
                    <Slider
                      value={[draftCompletion]}
                      onValueChange={(value) => setDraftCompletion(value[0])}
                      max={100}
                      step={5}
                      className="flex-1 [&_[role=slider]]:border-0 [&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-primary [&_[role=slider]]:to-accent [&_[role=slider]]:glow-sm [&_[data-orientation=horizontal]>[data-orientation=horizontal]]:bg-gradient-to-r [&_[data-orientation=horizontal]>[data-orientation=horizontal]]:from-primary [&_[data-orientation=horizontal]>[data-orientation=horizontal]]:to-accent"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="flex items-center gap-2 font-medium">
                          <ListChecks className="h-4 w-4 text-accent" />
                          Topic checklist
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {completedTopicsCount} of {totalTopicsCount} topics completed
                        </p>
                      </div>
                      <Badge variant="secondary">{totalTopicsCount === 0 ? "No topics" : `${completedTopicsCount}/${totalTopicsCount}`}</Badge>
                    </div>

                    {totalTopicsCount > 0 ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {activeSubject.targetTopics.map((topic) => {
                          const checked = draftTopics.includes(topic);
                          return (
                            <label
                              key={topic}
                              className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/70 px-3 py-3 text-sm"
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(value) => toggleTopic(topic, value === true)}
                              />
                              <span>{topic}</span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-border/60 bg-background/60 p-4 text-sm text-muted-foreground">
                        This subject does not have custom topics yet. You can still track its completion with the progress slider.
                      </div>
                    )}
                  </div>

                  <Button
                    className="bg-gradient-to-r from-primary to-accent text-primary-foreground glow-sm hover:opacity-90"
                    disabled={isAgentWorking}
                    onClick={handleSave}
                  >
                    <Target className="mr-2 h-4 w-4" />
                    {isAgentWorking ? "Updating progress..." : "Save subject progress"}
                  </Button>
                </div>
              ) : null}
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-border/60 bg-secondary/20 p-6 text-sm text-muted-foreground">
              Create a study plan first. Progress tracking becomes available after your plan is generated.
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Overall momentum</h3>
              <span className="gradient-text text-lg font-bold">{overallCompletion}%</span>
            </div>
            <Progress
              value={overallCompletion}
              className="h-2 bg-secondary [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-accent"
            />
            <p className="mt-4 text-sm text-muted-foreground">
              This combines the completion of each subject across all planned study days.
            </p>
          </div>

          <div className="glass-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Subject performance</h3>
              <span className="text-sm text-muted-foreground">{subjectSummaries.length} tracked</span>
            </div>
            {subjectSummaries.length > 0 ? (
              <div className="space-y-4">
                {subjectSummaries.map((subject) => (
                  <div key={subject.name} className="rounded-xl border border-border/60 bg-secondary/25 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{subject.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {subject.studiedHours}h studied of {subject.plannedHours}h planned
                        </p>
                      </div>
                      <Badge variant="outline">{subject.priority} priority</Badge>
                    </div>
                    <Progress
                      value={subject.completion}
                      className="mt-4 h-2 bg-secondary [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-accent"
                    />
                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{subject.completion}% complete</span>
                      <span>{subject.remainingHours}h remaining</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Your subject breakdown will appear after the first plan is created.</p>
            )}
          </div>
        </div>
      </motion.section>

      <motion.section variants={itemV} className="glass-card space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Daily completion overview</h3>
          <span className="text-sm text-muted-foreground">Each bar shows finished work for that day</span>
        </div>
        {hasProgress ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={progress} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={{ stroke: "hsl(var(--border))" }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={{ stroke: "hsl(var(--border))" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.75rem",
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Bar dataKey="completed" radius={[8, 8, 0, 0]}>
                  {progress.map((entry) => (
                    <Cell
                      key={entry.day}
                      fill={
                        entry.completed >= 80
                          ? "hsl(145 52% 44%)"
                          : entry.completed >= 50
                            ? "hsl(35 88% 57%)"
                            : "hsl(6 76% 59%)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Daily progress visuals will appear after your first study plan is created.</p>
        )}
      </motion.section>
    </motion.div>
  );
}
