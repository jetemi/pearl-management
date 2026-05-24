import type { CaseStudy } from "./types";

export const caseStudies: CaseStudy[] = [
  {
    id: "CS-001",
    title: "Regional bank — mobile account onboarding",
    scenario:
      "MeridianBank, a regional retail bank, wants to launch mobile self-service account onboarding. The sponsor wants onboarding time cut from 3 days to under 1 hour; compliance insists every account still passes KYC/AML checks; branch staff fear losing relevance. The current onboarding process is undocumented and varies by branch. The BA has been engaged to lead analysis and has conflicting stakeholder priorities to reconcile.",
    questionIds: ["Q-SA-001", "Q-EC-002", "Q-BAPM-003", "Q-SA-009"],
  },
  {
    id: "CS-002",
    title: "Manufacturer — ERP module replacement",
    scenario:
      "Northwind Manufacturing is replacing its aging inventory module with a new ERP component. Requirements span warehouse staff, finance, and an external logistics provider. Several requirements conflict, change requests are arriving weekly, and a fixed go-live date is set. The BA must keep requirements aligned, assess incoming changes, and recommend whether to build a custom integration or buy a vendor connector.",
    questionIds: ["Q-RLCM-002", "Q-RLCM-007", "Q-RADD-004", "Q-RADD-013"],
  },
  {
    id: "CS-003",
    title: "Retailer — loyalty app three months post-launch",
    scenario:
      "BrightMart launched a customer loyalty app three months ago, expecting a 15% lift in repeat purchases. Actual lift is 4%. The app works as designed and has no major defects, but adoption among store staff promoting it is low and a key promotion rule was never configured. Leadership wants to know whether to invest more, change the organization, or retire the feature.",
    questionIds: ["Q-SE-002", "Q-SE-005", "Q-SE-008"],
  },
];
