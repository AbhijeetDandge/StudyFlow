export interface SubjectAllocation {
  name: string;
  topics: string[];
  hours: number;
}

export interface SubjectInput {
  name: string;
  topics: string[];
}

export interface SubjectDayProgress {
  name: string;
  completed: number;
  targetTopics: string[];
  completedTopics: string[];
}

export interface SubjectSummary {
  name: string;
  priority: "high" | "medium" | "low";
  completion: number;
  plannedHours: number;
  studiedHours: number;
  remainingHours: number;
}

export interface StudyDay {
  day: number;
  date: string;
  subjects: SubjectAllocation[];
}

export interface StudyPlan {
  totalDays: number;
  dailyHours: number;
  subjects: string[];
  days: StudyDay[];
  goal?: string;
  generatedAt?: string;
}

export interface DailyProgress {
  day: number;
  date: string;
  completed: number;
  target: number;
  subjects: SubjectDayProgress[];
}

export interface AdaptivePlan {
  day: number;
  date: string;
  status: "increased" | "decreased" | "adjusted";
  change: string;
  subjects: SubjectAllocation[];
}

export interface InsightMessage {
  id: string;
  type: "motivator" | "alert" | "info";
  agent: string;
  message: string;
  timestamp: string;
}

export interface AgentActivity {
  id: string;
  stage: "planning" | "analysis" | "adaptation" | "memory";
  title: string;
  detail: string;
  status: "live" | "local" | "waiting";
  timestamp: string;
}

export interface PlannerInput {
  subjects: SubjectInput[];
  totalDays: number;
  dailyHours: number;
  goal?: string;
}
