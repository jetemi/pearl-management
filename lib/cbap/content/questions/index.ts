import type { Question } from "../types";
import { bapmQuestions } from "./bapm";
import { ecQuestions } from "./ec";
import { rlcmQuestions } from "./rlcm";
import { saQuestions } from "./sa";
import { raddQuestions } from "./radd";
import { seQuestions } from "./se";

/**
 * Full practice bank, assembled per knowledge area so it can grow without one
 * unmanageable file. Counts are weighted to the official CBAP exam blueprint
 * (RADD 30%, RLCM 15%, SA 15%, BAPM 14%, SE 14%, EC 12%).
 *
 * These are original, study-grade items written against the published BABOK v3
 * structure (knowledge areas, 30 tasks, inputs/outputs, techniques). They are not
 * real exam questions and contain no BABOK Guide text.
 */
export const questions: Question[] = [
  ...bapmQuestions,
  ...ecQuestions,
  ...rlcmQuestions,
  ...saQuestions,
  ...raddQuestions,
  ...seQuestions,
];

export { bapmQuestions, ecQuestions, rlcmQuestions, saQuestions, raddQuestions, seQuestions };
