import type { KnowledgeAreaId } from "@/lib/cbap/content/types";

// Approximate CBAP exam blueprint weights (tunable). Must sum to 1.0.
export const examBlueprint: Record<KnowledgeAreaId, number> = {
  RADD: 0.3,
  RLCM: 0.15,
  SA: 0.15,
  BAPM: 0.14,
  SE: 0.14,
  EC: 0.12,
};

export const MOCK_QUESTION_COUNT = 120;
export const MOCK_DURATION_MIN = 210;
