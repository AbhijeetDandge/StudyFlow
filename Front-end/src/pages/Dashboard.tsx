import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, BrainCircuit, Clock, GitBranch, MessagesSquare, Plus, Sparkles, Target, TrendingUp, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useStudyPlanner } from "@/context/StudyPlannerContext";
import type { SubjectInput } from "@/data/types";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const subjectColors: Record<string, string> = {
  Mathematics: "from-primary to-accent",
  Physics: "from-accent to-[hsl(195,80%,50%)]",
  Chemistry: "from-warning to-destructive",
  "Computer Science": "from-success to-accent",
  Biology: "from-success to-primary",
  English: "from-warning to-accent",
};

const activityStageConfig = {
  planning: { icon: Sparkles, tone: "border-primary/30 bg-primary/10 text-primary" },
  analysis: { icon: BrainCircuit, tone: "border-accent/30 bg-accent/10 text-accent" },
  adaptation: { icon: GitBranch, tone: "border-success/30 bg-success/10 text-success" },
  memory: { icon: MessagesSquare, tone: "border-warning/30 bg-warning/10 text-warning" },
};

export default function Dashboard() {
  const {
    plan,
    generatePlan,
    overallCompletion,
    subjectSummaries,
    weakSubjects,
    insights,
    agentActivities,
    isAgentWorking,
    agentError,
    agentBackendStatus,
    resetPlanner,
  } = useStudyPlanner();
  const [subjects, setSubjects] = useState<SubjectInput[]>([]);
  const [subjectInput, setSubjectInput] = useState("");
  const [topicInput, setTopicInput] = useState("");
  const [pendingTopics, setPendingTopics] = useState<string[]>([]);
  const [days, setDays] = useState<number | "">(plan.totalDays || "");
  const [hours, setHours] = useState<number | "">(plan.dailyHours || "");
  const [goal, setGoal] = useState(plan.goal ?? "");
  const hasPlan = plan.days.length > 0;
  const liveModeLabel =
    agentBackendStatus === "configured"
      ? `DeepSeek live`
      : agentBackendStatus === "checking"
        ? "Checking DeepSeek"
        : "Built-in planning mode";
  const roadmapLabel = hasPlan
    ? `${plan.totalDays} day roadmap`
    : days !== ""
      ? `${days} day target`
      : "Set your study window";
  const onboardingSteps = [
    { label: "Add your subjects", done: subjects.length > 0 || plan.subjects.length > 0 },
    { label: "Set time and goal", done: days !== "" && hours !== "" && goal.trim().length > 0 },
    { label: "Generate roadmap", done: hasPlan },
    { label: "Track progress by subject", done: overallCompletion > 0 },
  ];

  useEffect(() => {
    if (!hasPlan) {
      return;
    }

    const uniquePlanSubjects = plan.days.reduce<SubjectInput[]>((collection, day) => {
      day.subjects.forEach((subject) => {
        const existing = collection.find((entry) => entry.name === subject.name);
        if (existing) {
          existing.topics = [...new Set([...existing.topics, ...subject.topics])];
          return;
        }

        collection.push({
          name: subject.name,
          topics: [...subject.topics],
        });
      });
      return collection;
    }, []);

    setSubjects(uniquePlanSubjects);
    setDays(plan.totalDays || "");
    setHours(plan.dailyHours || "");
    setGoal(plan.goal ?? "");
  }, [hasPlan, plan.days, plan.dailyHours, plan.goal, plan.totalDays]);

  const nextFocus = useMemo(
    () => plan.days.find((day) => day.day >= 1)?.subjects.map((subject) => subject.name).join(", ") ?? "Create a plan first",
    [plan.days],
  );

  const addSubject = () => {
    const name = subjectInput.trim();
    if (!name) {
      return;
    }

    const nextTopics = [...new Set(pendingTopics)];
    setSubjects((current) => {
      const existing = current.find((subject) => subject.name.toLowerCase() === name.toLowerCase());
      if (!existing) {
        return [...current, { name, topics: nextTopics }];
      }

      return current.map((subject) =>
        subject.name.toLowerCase() === name.toLowerCase()
          ? { ...subject, topics: [...new Set([...subject.topics, ...nextTopics])] }
          : subject,
      );
    });
    setSubjectInput("");
    setTopicInput("");
    setPendingTopics([]);
  };

  const addTopic = () => {
    const nextTopic = topicInput.trim();
    if (!nextTopic) {
      return;
    }

    setPendingTopics((current) =>
      current.some((topic) => topic.toLowerCase() === nextTopic.toLowerCase()) ? current : [...current, nextTopic],
    );
    setTopicInput("");
  };

  const handleGeneratePlan = async () => {
    const pendingSubject = subjectInput.trim();
    const finalSubjects = pendingSubject
      ? [
          ...subjects.filter((subject) => subject.name.toLowerCase() !== pendingSubject.toLowerCase()),
          { name: pendingSubject, topics: pendingTopics },
        ]
      : subjects;

    if (finalSubjects.length === 0 || days === "" || hours === "") {
      return;
    }

    if (pendingSubject) {
      setSubjects(finalSubjects);
      setSubjectInput("");
      setTopicInput("");
      setPendingTopics([]);
    }

    await generatePlan({
      subjects: finalSubjects,
      totalDays: Math.min(Math.max(days, 1), 30),
      dailyHours: Math.min(Math.max(hours, 1), 16),
      goal,
    });
  };

  const handleStartNewWorkspace = () => {
    const confirmed = window.confirm("Start a new workspace? This will clear your current plan and saved progress on this browser.");
    if (!confirmed) {
      return;
    }

    resetPlanner();
    setSubjects([]);
    setSubjectInput("");
    setTopicInput("");
    setPendingTopics([]);
    setDays("");
    setHours("");
    setGoal("");
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="mx-auto max-w-6xl space-y-6">
      <motion.div variants={itemVariants} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { icon: BookOpen, label: "Subjects", value: plan.subjects.length || subjects.length || "-", color: "text-primary" },
          { icon: Clock, label: "Daily Hours", value: plan.dailyHours ? `${plan.dailyHours}h` : hours !== "" ? `${hours}h` : "-", color: "text-accent" },
          { icon: TrendingUp, label: "Completion", value: `${overallCompletion}%`, color: "text-success" },
          { icon: Target, label: "Next Focus", value: nextFocus, color: "text-warning" },
        ].map((stat) => (
          <div key={stat.label} className="glass-card-hover flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </motion.div>

      <motion.section variants={itemVariants} className="glass-card grid gap-6 p-6 lg:grid-cols-[1.2fr,0.8fr]">
        <div className="space-y-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Sparkles className="h-5 w-5 text-primary" />
              Build your study plan
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Add subjects with topics, choose your study window, and generate a structured plan.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-[0.9fr,1.1fr]">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Subject</label>
              <Input
                value={subjectInput}
                onChange={(event) => setSubjectInput(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && (event.preventDefault(), addSubject())}
                placeholder="e.g. Mathematics"
                className="border-border bg-secondary"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Topics</label>
              <div className="flex gap-2">
                <Input
                  value={topicInput}
                  onChange={(event) => setTopicInput(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && (event.preventDefault(), addTopic())}
                  placeholder="Add one topic at a time"
                  className="border-border bg-secondary"
                />
                <Button size="icon" variant="outline" onClick={addTopic}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {pendingTopics.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {pendingTopics.map((topic) => (
                    <Badge key={topic} variant="secondary" className="gap-1 pr-1">
                      {topic}
                      <button
                        type="button"
                        aria-label={`Remove ${topic}`}
                        onClick={() => setPendingTopics((current) => current.filter((item) => item !== topic))}
                        className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {subjects.length > 0 ? (
              subjects.map((subject) => (
                <div key={subject.name} className="rounded-xl border border-border/60 bg-secondary/30 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{subject.name}</p>
                      <p className="text-xs text-muted-foreground">{subject.topics.length > 0 ? `${subject.topics.length} topics added` : "No topics added yet"}</p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${subject.name}`}
                      onClick={() => setSubjects((current) => current.filter((item) => item.name !== subject.name))}
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {subject.topics.map((topic) => (
                      <Badge key={topic} variant="secondary">{topic}</Badge>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-border/60 bg-secondary/20 p-6 text-sm text-muted-foreground">
                Add at least one subject. Topics are optional but make the plan much more useful.
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Number of days</label>
              <Input
                type="number"
                min={1}
                max={30}
                value={days}
                onChange={(event) => setDays(event.target.value === "" ? "" : Number(event.target.value))}
                placeholder="e.g. 10"
                className="border-border bg-secondary"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Daily study hours</label>
              <Input
                type="number"
                min={1}
                max={16}
                value={hours}
                onChange={(event) => setHours(event.target.value === "" ? "" : Number(event.target.value))}
                placeholder="e.g. 3"
                className="border-border bg-secondary"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Goal</label>
            <Input
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              placeholder="e.g. Finish revision before mock exams"
              className="border-border bg-secondary"
            />
          </div>

          <Button
            onClick={handleGeneratePlan}
            disabled={isAgentWorking || (subjects.length === 0 && subjectInput.trim() === "") || days === "" || hours === ""}
            className="bg-gradient-to-r from-primary to-accent text-primary-foreground glow-sm hover:opacity-90"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {isAgentWorking ? "Creating your plan..." : "Create plan"}
          </Button>
          <Button variant="outline" onClick={handleStartNewWorkspace} className="border-border bg-background/70">
            Start new workspace
          </Button>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-accent/10 to-transparent p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Mission</p>
            <h3 className="mt-3 text-xl font-semibold">{plan.goal || goal || "No active study goal yet"}</h3>
            <p className="mt-3 text-sm text-muted-foreground">
              Create a personalized study roadmap from your own subjects, custom topics, and schedule.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="outline" className="border-primary/30 text-foreground">
                {liveModeLabel}
              </Badge>
              <Badge variant="outline" className="border-border">
                {roadmapLabel}
              </Badge>
            </div>
            {agentError && (
              <div className="mt-4 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
                Live plan generation was unavailable, so the app used the built-in planner instead.
                <p className="mt-2 text-xs text-foreground/80">{agentError}</p>
              </div>
            )}
          </div>

          <div className="glass-card p-5">
            <h3 className="mb-4 font-semibold">Getting started</h3>
            <div className="space-y-3">
              {onboardingSteps.map((step) => (
                <div key={step.label} className="flex items-center justify-between rounded-xl border border-border/60 bg-secondary/25 px-3 py-3">
                  <span className="text-sm">{step.label}</span>
                  <Badge variant={step.done ? "default" : "outline"} className={step.done ? "bg-primary text-primary-foreground" : ""}>
                    {step.done ? "Done" : "Pending"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium">Overall completion</p>
              <span className="gradient-text text-sm font-bold">{overallCompletion}%</span>
            </div>
            <Progress value={overallCompletion} className="h-2 bg-secondary [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-accent" />
            <div className="mt-4 flex flex-wrap gap-2">
              {hasPlan && weakSubjects.length > 0 ? (
                weakSubjects.map((subject) => (
                  <Badge key={subject} variant="outline" className="border-destructive/40 text-destructive">
                    {subject}
                  </Badge>
                ))
              ) : (
                <Badge variant="outline" className="border-success/40 text-success">
                  {hasPlan ? "Balanced workload" : "Waiting for first plan"}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section variants={itemVariants} className="grid gap-4 lg:grid-cols-[1.15fr,0.85fr]">
        <div className="glass-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Upcoming plan</h3>
            <span className="text-xs text-muted-foreground">{plan.totalDays} days</span>
          </div>
          {hasPlan ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {plan.days.map((day) => (
                <div key={day.day} className="rounded-xl border border-border/60 bg-secondary/30 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="font-medium">Day {day.day}</h4>
                    <span className="text-xs text-muted-foreground">{day.date}</span>
                  </div>
                  <div className="space-y-3">
                    {day.subjects.map((subject) => (
                      <div key={`${day.day}-${subject.name}`} className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`bg-gradient-to-r ${subjectColors[subject.name] || "from-primary to-accent"} bg-clip-text text-sm font-medium text-transparent`}>
                            {subject.name}
                          </span>
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
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/60 bg-secondary/20 p-8 text-sm text-muted-foreground">
              Your study roadmap will appear here after you create a plan.
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="glass-card p-5">
            <h3 className="mb-4 font-semibold">Subject health</h3>
            {subjectSummaries.length > 0 ? (
              <div className="space-y-4">
                {subjectSummaries.map((subject) => (
                  <div key={subject.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{subject.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {subject.studiedHours}h of {subject.plannedHours}h covered
                        </p>
                      </div>
                      <Badge variant="outline">{subject.priority} priority</Badge>
                    </div>
                    <Progress value={subject.completion} className="h-2 bg-secondary [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-accent" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Subject analytics will appear once the first plan is created.</p>
            )}
          </div>

          <div className="glass-card p-5">
            <h3 className="mb-4 font-semibold">Latest insight</h3>
            <p className="mt-2 text-sm leading-6">
              {insights[0]?.message ?? "Helpful recommendations will appear here after your first successful plan creation."}
            </p>
          </div>

          <div className="glass-card p-5">
            <h3 className="mb-4 font-semibold">Agent activity</h3>
            <div className="relative space-y-3 before:absolute before:bottom-3 before:left-[19px] before:top-3 before:w-px before:bg-border/70 before:content-['']">
              {agentActivities.map((activity) => {
                const config = activityStageConfig[activity.stage];
                const Icon = config.icon;

                return (
                  <div key={activity.id} className="relative flex gap-3">
                    <div className={`relative z-10 mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${config.tone}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1 rounded-2xl border border-border/60 bg-secondary/25 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{activity.title}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{activity.detail}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            activity.status === "live"
                              ? "border-success/40 text-success"
                              : activity.status === "local"
                                ? "border-warning/40 text-warning"
                                : "border-border text-muted-foreground"
                          }
                        >
                          {activity.status}
                        </Badge>
                      </div>
                      <p className="mt-3 text-[11px] uppercase tracking-[0.25em] text-muted-foreground">{activity.timestamp}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}

