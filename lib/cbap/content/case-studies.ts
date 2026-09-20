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
  {
    id: "CS-004",
    title: "Government agency — benefits claims digitization",
    scenario:
      "The National Benefits Agency processes claims across five regional offices, each of which has evolved its own variant of the official process. Eligibility rules change with every legislative session and must be auditable years afterwards. The agency wants online claim submission with automated eligibility screening. A ministerial deadline is fixed, the workforce is unionised and wary of automation, and every requirement decision must be defensible to an external auditor.",
    questionIds: ["Q-RADD-047", "Q-RADD-048", "Q-RADD-074"],
  },
  {
    id: "CS-005",
    title: "Healthcare provider — patient scheduling replacement",
    scenario:
      "Cedarview Health is replacing a 15-year-old patient scheduling system used by 12 clinics. A configurable commercial package meets roughly 80% of stated requirements out of the box; a custom build would meet all of them and integrate more cleanly with the electronic health record, but Cedarview has never delivered software at that scale. Clinicians want minimal workflow disruption, finance wants the lower total cost, and patient safety requirements are non-negotiable.",
    questionIds: ["Q-RADD-058", "Q-RADD-059", "Q-RADD-071"],
  },
  {
    id: "CS-006",
    title: "Logistics startup — scaling order management",
    scenario:
      "SwiftFreight handles 4,000 shipments a month on a platform built for a fraction of that, and projects tenfold growth within 18 months. The system exchanges shipment data with four carrier partners, each using a different format and update cadence. Month-end reporting already degrades response times beyond the agreed threshold. Leadership wants to know what must change to support the growth without a full rebuild.",
    questionIds: ["Q-RADD-053", "Q-RADD-054"],
  },
  {
    id: "CS-007",
    title: "University — student information system consolidation",
    scenario:
      "Northgate University is consolidating three student information systems inherited from separate faculties. Each faculty wrote its own requirements using different terms for the same concepts — 'enrolment', 'registration', and 'admission' overlap inconsistently across the three sets. Some requested features serve a single faculty and do not support the consolidation objective. The registrar is a powerful stakeholder with strong views, and the academic calendar leaves a single viable cutover window each year.",
    questionIds: ["Q-RADD-055", "Q-RADD-066"],
  },
];
