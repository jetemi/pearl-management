import type {
  KnowledgeArea,
  KnowledgeAreaId,
  Task,
  Technique,
  Flashcard,
  Question,
  CaseStudy,
} from "./types";
import { knowledgeAreas } from "./knowledge-areas";
import { tasks } from "./tasks";
import { techniques } from "./techniques";
import { flashcards } from "./flashcards";
import { questions } from "./questions";
import { caseStudies } from "./case-studies";

export { knowledgeAreas, tasks, techniques, flashcards, questions, caseStudies };
export type { KnowledgeArea, KnowledgeAreaId, Task, Technique, Flashcard, Question, CaseStudy };

export function getFlashcardsByKa(kaId: KnowledgeAreaId): Flashcard[] {
  return flashcards.filter((f) => f.kaId === kaId);
}

export function getQuestionsByKa(kaId: KnowledgeAreaId): Question[] {
  return questions.filter((q) => q.kaId === kaId);
}

export function getCaseStudyById(id: string): CaseStudy | undefined {
  return caseStudies.find((c) => c.id === id);
}

export function getKnowledgeArea(id: KnowledgeAreaId): KnowledgeArea | undefined {
  return knowledgeAreas.find((k) => k.id === id);
}

export function getTasksByKa(kaId: KnowledgeAreaId): Task[] {
  return tasks.filter((t) => t.kaId === kaId);
}

export function getTaskById(id: string): Task | undefined {
  return tasks.find((t) => t.id === id);
}

export function getTechniqueById(id: string): Technique | undefined {
  return techniques.find((t) => t.id === id);
}

/** Dev-time integrity check: every technique id referenced by a task must exist. */
export function findMissingTechniqueIds(): string[] {
  const known = new Set(techniques.map((t) => t.id));
  const referenced = new Set(tasks.flatMap((t) => t.techniques));
  return [...referenced].filter((id) => !known.has(id));
}
