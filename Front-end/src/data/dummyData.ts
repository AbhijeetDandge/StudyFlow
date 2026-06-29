import { StudyPlan, DailyProgress, AdaptivePlan, InsightMessage } from "./types";

export const dummyStudyPlan: StudyPlan = {
  totalDays: 7,
  dailyHours: 4,
  subjects: ["Mathematics", "Physics", "Chemistry", "Computer Science"],
  days: [
    { day: 1, date: "Mon, Apr 7", subjects: [
      { name: "Mathematics", topics: ["Linear Algebra", "Matrices"], hours: 2 },
      { name: "Physics", topics: ["Kinematics"], hours: 2 },
    ]},
    { day: 2, date: "Tue, Apr 8", subjects: [
      { name: "Chemistry", topics: ["Organic Chemistry Basics"], hours: 2 },
      { name: "Computer Science", topics: ["Data Structures – Arrays, Stacks"], hours: 2 },
    ]},
    { day: 3, date: "Wed, Apr 9", subjects: [
      { name: "Mathematics", topics: ["Calculus – Derivatives"], hours: 2 },
      { name: "Physics", topics: ["Thermodynamics"], hours: 2 },
    ]},
    { day: 4, date: "Thu, Apr 10", subjects: [
      { name: "Chemistry", topics: ["Chemical Bonding", "Periodic Table"], hours: 2.5 },
      { name: "Computer Science", topics: ["Algorithms – Sorting"], hours: 1.5 },
    ]},
    { day: 5, date: "Fri, Apr 11", subjects: [
      { name: "Mathematics", topics: ["Probability & Statistics"], hours: 2 },
      { name: "Physics", topics: ["Optics", "Waves"], hours: 2 },
    ]},
    { day: 6, date: "Sat, Apr 12", subjects: [
      { name: "Chemistry", topics: ["Electrochemistry"], hours: 1.5 },
      { name: "Computer Science", topics: ["Graph Theory", "BFS/DFS"], hours: 2.5 },
    ]},
    { day: 7, date: "Sun, Apr 13", subjects: [
      { name: "Mathematics", topics: ["Revision – All Topics"], hours: 1 },
      { name: "Physics", topics: ["Revision"], hours: 1 },
      { name: "Chemistry", topics: ["Revision"], hours: 1 },
      { name: "Computer Science", topics: ["Revision"], hours: 1 },
    ]},
  ],
};

export const dummyProgress: DailyProgress[] = [
  { day: 1, date: "Mon", completed: 90, target: 100 },
  { day: 2, date: "Tue", completed: 75, target: 100 },
  { day: 3, date: "Wed", completed: 100, target: 100 },
  { day: 4, date: "Thu", completed: 60, target: 100 },
  { day: 5, date: "Fri", completed: 85, target: 100 },
  { day: 6, date: "Sat", completed: 0, target: 100 },
  { day: 7, date: "Sun", completed: 0, target: 100 },
];

export const dummyAdaptivePlan: AdaptivePlan[] = [
  { day: 6, date: "Sat, Apr 12", status: "increased", change: "+1hr Chemistry (catch-up from Day 4)", subjects: [
    { name: "Chemistry", topics: ["Electrochemistry", "Organic Catch-up"], hours: 2.5 },
    { name: "Computer Science", topics: ["Graph Theory", "BFS/DFS"], hours: 2.5 },
  ]},
  { day: 7, date: "Sun, Apr 13", status: "adjusted", change: "Extended revision for weak subjects", subjects: [
    { name: "Chemistry", topics: ["Full Revision – Focus Area"], hours: 2 },
    { name: "Mathematics", topics: ["Revision"], hours: 1 },
    { name: "Computer Science", topics: ["Revision"], hours: 1 },
  ]},
];

export const dummyInsights: InsightMessage[] = [
  { id: "1", type: "motivator", agent: "Coach AI", message: "You're doing great! 🔥 3 days completed with an average of 85% completion.", timestamp: "2 min ago" },
  { id: "2", type: "alert", agent: "Planner AI", message: "You're falling behind in Chemistry. Consider adding 30 extra minutes today.", timestamp: "15 min ago" },
  { id: "3", type: "motivator", agent: "Coach AI", message: "Your Mathematics scores are improving! Keep up the momentum 📈", timestamp: "1 hr ago" },
  { id: "4", type: "info", agent: "Analytics AI", message: "Based on your progress, you're projected to complete 92% of the plan by Day 7.", timestamp: "2 hr ago" },
  { id: "5", type: "alert", agent: "Planner AI", message: "Physics Optics topic needs attention – only 60% covered on Day 5.", timestamp: "3 hr ago" },
  { id: "6", type: "motivator", agent: "Coach AI", message: "Amazing! You've maintained a 3-day study streak! 🔥🔥🔥", timestamp: "5 hr ago" },
];

export const weakSubjects = ["Chemistry", "Physics"];
export const streakCount = 3;
export const overallCompletion = 68;
