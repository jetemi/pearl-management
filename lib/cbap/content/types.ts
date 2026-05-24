export type KnowledgeAreaId =
  | "BAPM" // Business Analysis Planning & Monitoring
  | "EC"   // Elicitation & Collaboration
  | "RLCM" // Requirements Life Cycle Management
  | "SA"   // Strategy Analysis
  | "RADD" // Requirements Analysis & Design Definition
  | "SE";  // Solution Evaluation

export interface KnowledgeArea {
  id: KnowledgeAreaId;
  name: string;
  purpose: string;
  summary: string;
  taskIds: string[];
  examWeight: number; // fraction 0..1
}

export interface Task {
  id: string;            // e.g. "BAPM-1"
  kaId: KnowledgeAreaId;
  name: string;
  purpose: string;
  elements: string[];
  inputs: string[];
  outputs: string[];
  techniques: string[];  // technique ids
  stakeholders: string[];
  guidelines: string[];
  notes: string;         // concise BABOK-precise study note
}

export interface Technique {
  id: string;            // e.g. "TECH-interviews"
  name: string;
  purpose: string;
  summary: string;
  relatedTaskIds: string[];
}

export type FlashcardType = "task" | "io" | "technique" | "concept";

export interface Flashcard {
  id: string;            // stable id, used as cbap_flashcard_state.card_id
  kaId: KnowledgeAreaId;
  type: FlashcardType;
  front: string;
  back: string;
}

export type Difficulty = "easy" | "medium" | "hard";

export interface Question {
  id: string;            // stable id, e.g. "Q-RADD-001"
  kaId: KnowledgeAreaId;
  taskId?: string;
  caseStudyId?: string;
  stem: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
  difficulty: Difficulty;
}

export interface CaseStudy {
  id: string;            // e.g. "CS-001"
  title: string;
  scenario: string;
  questionIds: string[];
}
