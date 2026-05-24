import type { KnowledgeAreaId } from "@/lib/cbap/content/types";
import { isoDate } from "@/lib/cbap/srs";

export interface PlanItem { key: string; label: string }
export interface PlanWeek { week: number; startDate: string; theme: string; items: PlanItem[] }

/**
 * 12-week intensive plan. Weeks are anchored to lead up to the exam date: week 1
 * starts 12 weeks before the exam, or today if that point has already passed.
 */
export function generatePlan(examDateIso: string, today = new Date()): PlanWeek[] {
  const exam = new Date(examDateIso + "T00:00:00");
  const twelveWeeksBefore = new Date(exam);
  twelveWeeksBefore.setDate(twelveWeeksBefore.getDate() - 7 * 12);
  const startDate = twelveWeeksBefore > today ? twelveWeeksBefore : today;

  const weeks: { theme: string; focus: KnowledgeAreaId[] }[] = [
    { theme: "Orientation + Strategy Analysis", focus: ["SA"] },
    { theme: "BA Planning & Monitoring", focus: ["BAPM"] },
    { theme: "Elicitation & Collaboration", focus: ["EC"] },
    { theme: "Requirements Life Cycle Management", focus: ["RLCM"] },
    { theme: "RADD part 1 (specify, model, verify, validate)", focus: ["RADD"] },
    { theme: "RADD part 2 (architecture, design options, value)", focus: ["RADD"] },
    { theme: "Solution Evaluation", focus: ["SE"] },
    { theme: "Techniques deep-dive + flashcard mastery", focus: [] },
    { theme: "Practice quizzes — all KAs, fix weak areas", focus: [] },
    { theme: "Mock exam 1 + review", focus: [] },
    { theme: "Mock exam 2 + targeted review", focus: [] },
    { theme: "Final review, eligibility/application check, rest", focus: [] },
  ];

  return weeks.map((w, idx) => {
    const start = new Date(startDate);
    start.setDate(start.getDate() + idx * 7);
    const items: PlanItem[] = [
      { key: `w${idx + 1}-read`, label: w.focus.length ? `Read & note: ${w.focus.join(", ")} tasks` : "Review notes across all KAs" },
      { key: `w${idx + 1}-cards`, label: "Clear daily flashcard queue (every day)" },
      { key: `w${idx + 1}-quiz`, label: w.focus.length ? `Practice quiz: ${w.focus.join(", ")}` : "Practice quiz: weakest KA" },
    ];
    return { week: idx + 1, startDate: isoDate(start), theme: w.theme, items };
  });
}
