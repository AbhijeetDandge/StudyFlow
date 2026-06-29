import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { addDays, format } from "date-fns";
import type {
  AgentActivity,
  AdaptivePlan,
  DailyProgress,
  InsightMessage,
  PlannerInput,
  StudyDay,
  StudyPlan,
  SubjectDayProgress,
  SubjectInput,
  SubjectSummary,
} from "@/data/types";
import {
  fetchAgentHealth,
  requestGeneratedPlan,
  requestProgressAnalysis,
} from "@/lib/studyAgentApi";

const STORAGE_KEY = "study-planner-state-v3";

const topicCatalog: Record<string, string[]> = {
  Mathematics: ["Algebra", "Calculus", "Probability", "Statistics", "Revision"],
  Physics: ["Kinematics", "Thermodynamics", "Optics", "Waves", "Problem Solving"],
  Chemistry: ["Organic Chemistry", "Bonding", "Electrochemistry", "Reactions", "Revision"],
  "Computer Science": ["Arrays", "Algorithms", "Graphs", "Databases", "Revision"],
  Biology: ["Genetics", "Cell Biology", "Ecology", "Human Physiology", "Revision"],
  English: ["Reading", "Writing", "Grammar", "Vocabulary", "Revision"],
};

type PersistedState = {
  plan: StudyPlan;
  progress: DailyProgress[];
};

type AgentBackendStatus = "checking" | "configured" | "fallback" | "offline";

type StudyPlannerContextValue = {
  plan: StudyPlan;
  progress: DailyProgress[];
  adaptivePlan: AdaptivePlan[];
  agentActivities: AgentActivity[];
  insights: InsightMessage[];
  subjectSummaries: SubjectSummary[];
  weakSubjects: string[];
  overallCompletion: number;
  streakCount: number;
  isAgentWorking: boolean;
  agentBackendStatus: AgentBackendStatus;
  agentMode: "openai" | "fallback";
  agentError: string | null;
  agentProvider: string | null;
  generatePlan: (input: PlannerInput) => Promise<void>;
  updateDayProgress: (day: number, completed: number) => Promise<void>;
  updateSubjectProgress: (day: number, subjectName: string, completed: number, completedTopics: string[]) => Promise<void>;
  refreshAgentAnalysis: () => Promise<void>;
  checkAgentConnection: () => Promise<void>;
  resetPlanner: () => void;
};

const StudyPlannerContext = createContext<StudyPlannerContextValue | null>(null);

function uniqueSubjects(subjects: SubjectInput[]) {
  const map = new Map<string, SubjectInput>();

  for (const subject of subjects) {
    const name = subject.name.trim();
    if (!name) {
      continue;
    }

    const existing = map.get(name);
    const mergedTopics = [...new Set([...(existing?.topics ?? []), ...subject.topics.map((topic) => topic.trim()).filter(Boolean)])];
    map.set(name, { name, topics: mergedTopics });
  }

  return [...map.values()];
}

function getTopicsForSubject(subject: SubjectInput) {
  return subject.topics.length > 0 ? subject.topics : topicCatalog[subject.name.trim()] ?? ["Core Concepts", "Practice Set", "Revision"];
}

function distributeHours(totalHours: number, subjectCount: number) {
  if (subjectCount === 0) {
    return [];
  }

  const base = Number((totalHours / subjectCount).toFixed(1));
  const result = Array.from({ length: subjectCount }, () => base);
  const allocated = result.reduce((sum, hours) => sum + hours, 0);
  const diff = Number((totalHours - allocated).toFixed(1));

  if (diff !== 0) {
    result[0] = Number((result[0] + diff).toFixed(1));
  }

  return result;
}

function buildPlan(input: PlannerInput): StudyPlan {
  const subjects = uniqueSubjects(input.subjects);
  const safeSubjects = subjects.length > 0 ? subjects : [{ name: "General Study", topics: ["Core Concepts", "Practice Set"] }];
  const safeDays = Math.min(Math.max(input.totalDays, 1), 30);
  const safeHours = Math.min(Math.max(input.dailyHours, 1), 16);
  const startDate = new Date();

  const days: StudyDay[] = Array.from({ length: safeDays }, (_, index) => {
    const date = addDays(startDate, index);
    const rotatedSubjects = safeSubjects
      .slice(index % safeSubjects.length)
      .concat(safeSubjects.slice(0, index % safeSubjects.length))
      .slice(0, Math.min(safeSubjects.length, 3));
    const hoursBySubject = distributeHours(safeHours, Math.max(rotatedSubjects.length, 1));

    return {
      day: index + 1,
      date: format(date, "EEE, MMM d"),
      subjects: rotatedSubjects.map((subject, subjectIndex) => {
        const topics = getTopicsForSubject(subject);
        const pivot = (index + subjectIndex) % topics.length;
        const dailyTopics = topics.length <= 2 ? topics : [topics[pivot], topics[(pivot + 1) % topics.length]];

        return {
          name: subject.name,
          topics: dailyTopics,
          hours: hoursBySubject[subjectIndex] ?? safeHours,
        };
      }),
    };
  });

  return {
    totalDays: safeDays,
    dailyHours: safeHours,
    subjects: safeSubjects.map((subject) => subject.name),
    days,
    goal: input.goal?.trim() || "Stay exam-ready with consistent revision and practice.",
    generatedAt: new Date().toISOString(),
  };
}

function createEmptyProgress(plan: StudyPlan): DailyProgress[] {
  return plan.days.map((day) => ({
    day: day.day,
    date: day.date.split(",")[0],
    completed: 0,
    target: 100,
    subjects: day.subjects.map((subject) => ({
      name: subject.name,
      completed: 0,
      targetTopics: subject.topics,
      completedTopics: [],
    })),
  }));
}

function buildDefaultState(): PersistedState {
  return {
    plan: {
      totalDays: 0,
      dailyHours: 0,
      subjects: [],
      days: [],
      goal: "",
      generatedAt: undefined,
    },
    progress: [],
  };
}

function normalizeProgress(plan: StudyPlan, progress: DailyProgress[]): DailyProgress[] {
  return plan.days.map((day) => {
    const savedDay = progress.find((entry) => entry.day === day.day);
    const savedSubjects = Array.isArray(savedDay?.subjects) ? savedDay.subjects : [];

    const subjects = day.subjects.map((subject) => {
      const savedSubject = savedSubjects.find((entry) => entry.name === subject.name);
      const targetTopics = subject.topics;
      const completedTopics = Array.isArray(savedSubject?.completedTopics)
        ? savedSubject.completedTopics.filter((topic) => targetTopics.includes(topic))
        : [];

      return {
        name: subject.name,
        completed: typeof savedSubject?.completed === "number" ? savedSubject.completed : 0,
        targetTopics,
        completedTopics,
      };
    });

    return {
      day: day.day,
      date: typeof savedDay?.date === "string" ? savedDay.date : day.date.split(",")[0],
      completed: typeof savedDay?.completed === "number" ? savedDay.completed : calculateDayCompletion(subjects),
      target: typeof savedDay?.target === "number" ? savedDay.target : 100,
      subjects,
    };
  });
}

function readPersistedState(): PersistedState {
  if (typeof window === "undefined") {
    return buildDefaultState();
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return buildDefaultState();
  }

  try {
    const parsed = JSON.parse(raw) as PersistedState;
    if (!parsed.plan || !parsed.progress) {
      return buildDefaultState();
    }
    return {
      plan: parsed.plan,
      progress: normalizeProgress(parsed.plan, parsed.progress),
    };
  } catch {
    return buildDefaultState();
  }
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function calculateDayCompletion(subjects: SubjectDayProgress[]) {
  if (subjects.length === 0) {
    return 0;
  }

  return Math.round(subjects.reduce((sum, subject) => sum + subject.completed, 0) / subjects.length);
}

function deriveSubjectSummaries(plan: StudyPlan, progress: DailyProgress[]): SubjectSummary[] {
  return plan.subjects
    .map((subject) => {
      const allocations = plan.days.flatMap((day) => day.subjects.filter((entry) => entry.name === subject));
      const plannedHours = allocations.reduce((sum, entry) => sum + entry.hours, 0);

      const studiedHours = round(
        progress.reduce((sum, day) => {
          const progressEntry = day.subjects.find((entry) => entry.name === subject);
          const allocation = plan.days.find((planDay) => planDay.day === day.day)?.subjects.find((entry) => entry.name === subject);
          if (!progressEntry || !allocation) {
            return sum;
          }
          return sum + allocation.hours * (progressEntry.completed / 100);
        }, 0),
      );

      const completion = plannedHours === 0 ? 0 : Math.round((studiedHours / plannedHours) * 100);

      return {
        name: subject,
        priority: completion < 55 ? "high" : completion < 80 ? "medium" : "low",
        completion,
        plannedHours: round(plannedHours),
        studiedHours,
        remainingHours: round(Math.max(plannedHours - studiedHours, 0)),
      };
    })
    .sort((a, b) => a.completion - b.completion || plan.subjects.indexOf(a.name) - plan.subjects.indexOf(b.name));
}

function deriveAdaptivePlan(plan: StudyPlan, progress: DailyProgress[], weakSubjects: string[]): AdaptivePlan[] {
  const underperformingDays = progress.filter((day) => day.completed < 80).slice(0, 3);

  return underperformingDays.map((progressDay, index) => {
    const sourceDay = plan.days[Math.min(Math.max(progressDay.day - 1, 0), plan.days.length - 1)] ?? plan.days[plan.days.length - 1];
    const focusSubject = weakSubjects[index] ?? sourceDay.subjects[0]?.name ?? plan.subjects[0] ?? "Revision";
    const sourceTopics = sourceDay.subjects.find((entry) => entry.name === focusSubject)?.topics ?? ["Revision"];
    const nextTopic = sourceTopics[sourceTopics.length - 1] ?? "Revision";
    const status = progressDay.completed < 50 ? "increased" : progressDay.completed < 70 ? "adjusted" : "decreased";

    return {
      day: sourceDay.day,
      date: sourceDay.date,
      status,
      change:
        status === "increased"
          ? `Add a catch-up block for ${focusSubject} and protect it from interruptions.`
          : status === "adjusted"
            ? `Rebalance the session with a focused revision sprint for ${focusSubject}.`
            : "Keep momentum while trimming overload and preserving review time.",
      subjects: sourceDay.subjects.map((entry) =>
        entry.name === focusSubject
          ? {
              ...entry,
              hours: round(entry.hours + 0.5),
              topics: [...new Set([...entry.topics, nextTopic])].slice(0, 3),
            }
          : entry,
      ),
    };
  });
}

function formatRelativeTimestamp(offset: number) {
  if (offset === 0) {
    return "Just now";
  }
  if (offset === 1) {
    return "15 min ago";
  }
  return `${offset} hr ago`;
}

function deriveInsights(
  plan: StudyPlan,
  progress: DailyProgress[],
  subjectSummaries: SubjectSummary[],
  overallCompletion: number,
  streakCount: number,
): InsightMessage[] {
  const weakest = subjectSummaries[0];
  const strongest = subjectSummaries[subjectSummaries.length - 1];
  const nextDay =
    plan.days.find((day) => (progress.find((entry) => entry.day === day.day)?.completed ?? 0) < 100) ??
    plan.days[plan.days.length - 1];
  const lowDays = progress.filter((day) => day.completed < 60).length;

  return [
    {
      id: "coach-streak",
      type: "motivator",
      agent: "Coach AI",
      message: `You have a ${streakCount}-day consistency streak. Protect it with one focused session today.`,
      timestamp: formatRelativeTimestamp(0),
    },
    {
      id: "planner-next",
      type: "info",
      agent: "Planner AI",
      message: `Next up is Day ${nextDay?.day ?? 1}. Prioritize ${nextDay?.subjects.map((subject) => subject.name).join(" and ") ?? plan.subjects.join(", ")}.`,
      timestamp: formatRelativeTimestamp(1),
    },
    {
      id: "analyst-overall",
      type: overallCompletion >= 75 ? "motivator" : "info",
      agent: "Analytics AI",
      message: `Overall completion is ${overallCompletion}%. At this pace, you are on track to finish the plan with time for revision.`,
      timestamp: formatRelativeTimestamp(2),
    },
    {
      id: "planner-weakest",
      type: weakest && weakest.completion < 70 ? "alert" : "info",
      agent: "Planner AI",
      message: weakest
        ? `${weakest.name} is your current weak spot with ${weakest.remainingHours}h remaining. Add a short recovery block this week.`
        : "Your plan is balanced right now.",
      timestamp: formatRelativeTimestamp(3),
    },
    {
      id: "coach-strongest",
      type: "motivator",
      agent: "Coach AI",
      message: strongest
        ? `${strongest.name} is leading at ${strongest.completion}% completion. Use that momentum to support a weaker subject.`
        : "Small consistent wins will compound quickly.",
      timestamp: formatRelativeTimestamp(4),
    },
    {
      id: "analyst-risk",
      type: lowDays > 1 ? "alert" : "info",
      agent: "Analytics AI",
      message:
        lowDays > 1
          ? `${lowDays} low-completion days suggest fatigue. Shorten the next session and focus on one outcome only.`
          : "Your recent progress pattern looks stable and recoverable.",
      timestamp: formatRelativeTimestamp(5),
    },
  ];
}

function deriveAgentActivities(
  plan: StudyPlan,
  progress: DailyProgress[],
  subjectSummaries: SubjectSummary[],
  backendStatus: AgentBackendStatus,
  agentProvider: string | null,
  agentError: string | null,
): AgentActivity[] {
  const weakest = subjectSummaries[0];
  const nextDay = plan.days.find((day) => (progress.find((entry) => entry.day === day.day)?.completed ?? 0) < 100) ?? plan.days[0];
  const completedDays = progress.filter((day) => day.completed > 0).length;
  const planTimestamp = plan.generatedAt ? new Date(plan.generatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "Not started";
  const liveStatus = backendStatus === "configured" ? "live" : backendStatus === "offline" ? "local" : "waiting";

  return [
    {
      id: "activity-planning",
      stage: "planning",
      title: backendStatus === "configured" ? "DeepSeek Planner mapped the roadmap" : "Built-in Planner mapped the roadmap",
      detail: plan.days.length
        ? `${plan.totalDays} days mapped across ${plan.subjects.length} subjects with topic rotation and balanced study blocks.`
        : "Waiting for your first study goal and subject list.",
      status: plan.days.length ? liveStatus : "waiting",
      timestamp: plan.days.length ? planTimestamp : "Pending",
    },
    {
      id: "activity-analysis",
      stage: "analysis",
      title: backendStatus === "configured" ? "DeepSeek Analyst reviewed weak areas" : "Study Analyst reviewed weak areas",
      detail: plan.days.length
        ? weakest
          ? `${completedDays} days logged. ${weakest.name} currently needs the most attention at ${weakest.completion}% completion.`
          : "Once progress is logged, the analyzer will surface weak areas and momentum changes."
        : "Start with a plan to unlock subject-level analysis.",
      status: plan.days.length ? liveStatus : "waiting",
      timestamp: completedDays > 0 ? "Just updated" : "Pending",
    },
    {
      id: "activity-adaptation",
      stage: "adaptation",
      title: backendStatus === "configured" ? "DeepSeek Adapter prepared schedule changes" : "Adaptive Planner prepared schedule changes",
      detail: plan.days.length
        ? nextDay
          ? `Next recovery opportunity is Day ${nextDay.day}. Future sessions will rebalance automatically as progress changes.`
          : "Future sessions will rebalance automatically as progress changes."
        : "Adaptive planning begins after the first study roadmap is created.",
      status: plan.days.length ? liveStatus : "waiting",
      timestamp: nextDay ? nextDay.date : "Pending",
    },
    {
      id: "activity-memory",
      stage: "memory",
      title: backendStatus === "configured" ? "DeepSeek Coach preserved session context" : "Study Coach preserved session context",
      detail: agentError
        ? `Recent live agent issue: ${agentError}`
        : plan.days.length
          ? "Your roadmap and progress are saved locally so you can resume where you left off."
          : "Study history will be saved here as you build your plan.",
      status: agentError ? "local" : plan.days.length ? "live" : "waiting",
      timestamp: agentError ? "Needs review" : "Saved",
    },
  ];
}

function deriveStreak(progress: DailyProgress[]) {
  let streak = 0;

  for (const day of progress) {
    if (day.completed > 0) {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
}

function toApiPlannerInput(input: PlannerInput) {
  return {
    ...input,
    subjects: input.subjects.map((subject) => `${subject.name}${subject.topics.length ? ` (${subject.topics.join(", ")})` : ""}`),
  };
}

export function StudyPlannerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(() => readPersistedState());
  const [remoteAdaptivePlan, setRemoteAdaptivePlan] = useState<AdaptivePlan[] | null>(null);
  const [remoteInsights, setRemoteInsights] = useState<InsightMessage[] | null>(null);
  const [isAgentWorking, setIsAgentWorking] = useState(false);
  const [agentBackendStatus, setAgentBackendStatus] = useState<AgentBackendStatus>("offline");
  const [agentMode, setAgentMode] = useState<"openai" | "fallback">("fallback");
  const [agentError, setAgentError] = useState<string | null>(null);
  const [agentProvider, setAgentProvider] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state]);

  const subjectSummaries = useMemo(() => deriveSubjectSummaries(state.plan, state.progress), [state.plan, state.progress]);
  const weakSubjects = useMemo(
    () =>
      subjectSummaries
        .filter((summary) => summary.completion < 70)
        .map((summary) => summary.name)
        .slice(0, 3),
    [subjectSummaries],
  );
  const overallCompletion = useMemo(() => {
    if (!state.progress.length) {
      return 0;
    }
    return Math.round(state.progress.reduce((sum, day) => sum + day.completed, 0) / state.progress.length);
  }, [state.progress]);
  const streakCount = useMemo(() => deriveStreak(state.progress), [state.progress]);
  const fallbackAdaptivePlan = useMemo(() => deriveAdaptivePlan(state.plan, state.progress, weakSubjects), [state.plan, state.progress, weakSubjects]);
  const fallbackInsights = useMemo(
    () => deriveInsights(state.plan, state.progress, subjectSummaries, overallCompletion, streakCount),
    [state.plan, state.progress, subjectSummaries, overallCompletion, streakCount],
  );
  const agentActivities = useMemo(
    () => deriveAgentActivities(state.plan, state.progress, subjectSummaries, agentBackendStatus, agentProvider, agentError),
    [state.plan, state.progress, subjectSummaries, agentBackendStatus, agentProvider, agentError],
  );

  useEffect(() => {
    void fetchAgentHealth()
      .then((health) => {
        setAgentBackendStatus(health.aiConfigured ? "configured" : "fallback");
        setAgentMode(health.aiConfigured ? "openai" : "fallback");
        setAgentProvider(health.provider);
      })
      .catch(() => {
        setAgentBackendStatus("offline");
        setAgentMode("fallback");
        setAgentProvider(null);
      });
  }, []);

  const runAnalysis = useCallback(async (plan: StudyPlan, progress: DailyProgress[]) => {
    setIsAgentWorking(true);
    setAgentError(null);
    try {
      const { analysis, source, provider } = await requestProgressAnalysis(plan, progress);
      setRemoteAdaptivePlan(analysis.adaptivePlan);
      setRemoteInsights(analysis.insights);
      setAgentMode(source === "openai-compatible" ? "openai" : "fallback");
      setAgentBackendStatus(source === "openai-compatible" ? "configured" : "fallback");
      setAgentProvider(source === "openai-compatible" ? provider ?? agentProvider : null);
    } catch (error) {
      setRemoteAdaptivePlan(null);
      setRemoteInsights(null);
      setAgentMode("fallback");
      setAgentBackendStatus("offline");
      setAgentError(error instanceof Error ? error.message : "Live analysis is unavailable right now.");
    } finally {
      setIsAgentWorking(false);
    }
  }, [agentProvider]);

  const generatePlan = useCallback(async (input: PlannerInput) => {
    setIsAgentWorking(true);
    setAgentError(null);
    try {
      const { plan, source, provider } = await requestGeneratedPlan(toApiPlannerInput(input));
      const nextProgress = createEmptyProgress(plan);
      setState({ plan, progress: nextProgress });
      setAgentMode(source === "openai-compatible" ? "openai" : "fallback");
      setAgentBackendStatus(source === "openai-compatible" ? "configured" : "fallback");
      setAgentProvider(source === "openai-compatible" ? provider ?? agentProvider : null);
      await runAnalysis(plan, nextProgress);
    } catch (error) {
      const localPlan = buildPlan(input);
      const nextProgress = createEmptyProgress(localPlan);
      setState({ plan: localPlan, progress: nextProgress });
      setRemoteAdaptivePlan(null);
      setRemoteInsights(null);
      setAgentMode("fallback");
      setAgentBackendStatus("offline");
      setAgentError(error instanceof Error ? error.message : "Live planning is unavailable right now.");
    } finally {
      setIsAgentWorking(false);
    }
  }, [runAnalysis, agentProvider]);

  const updateDayProgress = useCallback(async (day: number, completed: number) => {
    const nextProgress = state.progress.map((entry) => {
      if (entry.day !== day) {
        return entry;
      }

      const subjects = entry.subjects.map((subject) => ({
        ...subject,
        completed,
        completedTopics: completed === 100 ? subject.targetTopics : subject.completedTopics,
      }));

      return {
        ...entry,
        completed,
        subjects,
      };
    });

    setState((current) => ({ ...current, progress: nextProgress }));
    await runAnalysis(state.plan, nextProgress);
  }, [runAnalysis, state.plan, state.progress]);

  const updateSubjectProgress = useCallback(async (day: number, subjectName: string, completed: number, completedTopics: string[]) => {
    const nextProgress = state.progress.map((entry) => {
      if (entry.day !== day) {
        return entry;
      }

      const subjects = entry.subjects.map((subject) =>
        subject.name === subjectName
          ? {
              ...subject,
              completed,
              completedTopics,
            }
          : subject,
      );

      return {
        ...entry,
        subjects,
        completed: calculateDayCompletion(subjects),
      };
    });

    setState((current) => ({ ...current, progress: nextProgress }));
    await runAnalysis(state.plan, nextProgress);
  }, [runAnalysis, state.plan, state.progress]);

  const refreshAgentAnalysis = useCallback(async () => {
    await runAnalysis(state.plan, state.progress);
  }, [runAnalysis, state.plan, state.progress]);

  const checkAgentConnection = useCallback(async () => {
    setAgentError(null);
    setAgentBackendStatus("checking");
    try {
      const health = await fetchAgentHealth();
      setAgentBackendStatus(health.aiConfigured ? "configured" : "fallback");
      setAgentMode(health.aiConfigured ? "openai" : "fallback");
      setAgentProvider(health.provider);
    } catch {
      setAgentBackendStatus("offline");
      setAgentMode("fallback");
      setAgentProvider(null);
    }
  }, []);

  const resetPlanner = useCallback(() => {
    const emptyState = buildDefaultState();
    setState(emptyState);
    setRemoteAdaptivePlan(null);
    setRemoteInsights(null);
    setIsAgentWorking(false);
    setAgentBackendStatus("offline");
    setAgentMode("fallback");
    setAgentError(null);
    setAgentProvider(null);

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const adaptivePlan = remoteAdaptivePlan ?? fallbackAdaptivePlan;
  const insights = remoteInsights ?? fallbackInsights;

  const value = useMemo(
    () => ({
      plan: state.plan,
      progress: state.progress,
      adaptivePlan,
      agentActivities,
      insights,
      subjectSummaries,
      weakSubjects,
      overallCompletion,
      streakCount,
      isAgentWorking,
      agentBackendStatus,
      agentMode,
      agentError,
      agentProvider,
      generatePlan,
      updateDayProgress,
      updateSubjectProgress,
      refreshAgentAnalysis,
      checkAgentConnection,
      resetPlanner,
    }),
    [
      state.plan,
      state.progress,
      adaptivePlan,
      agentActivities,
      insights,
      subjectSummaries,
      weakSubjects,
      overallCompletion,
      streakCount,
      isAgentWorking,
      agentBackendStatus,
      agentMode,
      agentError,
      agentProvider,
      generatePlan,
      updateDayProgress,
      updateSubjectProgress,
      refreshAgentAnalysis,
      checkAgentConnection,
      resetPlanner,
    ],
  );

  return <StudyPlannerContext.Provider value={value}>{children}</StudyPlannerContext.Provider>;
}

export function useStudyPlanner() {
  const context = useContext(StudyPlannerContext);
  if (!context) {
    throw new Error("useStudyPlanner must be used within StudyPlannerProvider");
  }
  return context;
}
