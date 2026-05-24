import type { KnowledgeArea } from "./types";
import { examBlueprint } from "@/lib/cbap/blueprint";

export const knowledgeAreas: KnowledgeArea[] = [
  {
    id: "BAPM",
    name: "Business Analysis Planning & Monitoring",
    purpose: "Organize and coordinate the efforts of business analysts and stakeholders.",
    summary:
      "Defines how business analysis work is planned, governed, and improved: the BA approach, stakeholder engagement, governance, information management, and performance monitoring.",
    taskIds: ["BAPM-1", "BAPM-2", "BAPM-3", "BAPM-4", "BAPM-5"],
    examWeight: examBlueprint.BAPM,
  },
  {
    id: "EC",
    name: "Elicitation & Collaboration",
    purpose: "Obtain information from stakeholders and confirm the results.",
    summary:
      "Prepare for and conduct elicitation, confirm the results, communicate business analysis information, and manage stakeholder collaboration throughout the initiative.",
    taskIds: ["EC-1", "EC-2", "EC-3", "EC-4", "EC-5"],
    examWeight: examBlueprint.EC,
  },
  {
    id: "RLCM",
    name: "Requirements Life Cycle Management",
    purpose: "Manage and maintain requirements and design information from inception to retirement.",
    summary:
      "Trace, maintain, prioritize, assess changes to, and approve requirements and designs across their entire life cycle.",
    taskIds: ["RLCM-1", "RLCM-2", "RLCM-3", "RLCM-4", "RLCM-5"],
    examWeight: examBlueprint.RLCM,
  },
  {
    id: "SA",
    name: "Strategy Analysis",
    purpose: "Identify the strategic or tactical way an enterprise needs to address a business need.",
    summary:
      "Analyze the current state, define the future state, assess risks to reaching it, and define a change strategy for moving from one to the other.",
    taskIds: ["SA-1", "SA-2", "SA-3", "SA-4"],
    examWeight: examBlueprint.SA,
  },
  {
    id: "RADD",
    name: "Requirements Analysis & Design Definition",
    purpose:
      "Structure and organize requirements, specify and model them, validate and verify, and define the solution.",
    summary:
      "The analytical core: specify and model requirements and designs, verify and validate them, define the requirements architecture and design options, and recommend a solution that maximizes value.",
    taskIds: ["RADD-1", "RADD-2", "RADD-3", "RADD-4", "RADD-5", "RADD-6"],
    examWeight: examBlueprint.RADD,
  },
  {
    id: "SE",
    name: "Solution Evaluation",
    purpose: "Assess the performance of and value delivered by a solution in use.",
    summary:
      "Measure solution performance, analyze the results, assess limitations of both the solution and the enterprise, and recommend actions to increase delivered value.",
    taskIds: ["SE-1", "SE-2", "SE-3", "SE-4", "SE-5"],
    examWeight: examBlueprint.SE,
  },
];
