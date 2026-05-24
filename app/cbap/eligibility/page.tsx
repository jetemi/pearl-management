export default function EligibilityPage() {
  const gates = [
    "≥ 7,500 hours of BA work experience aligned with BABOK, in the last 10 years.",
    "Within that, ≥ 900 hours in each of 4 of the 6 knowledge areas (3,600 hrs total).",
    "≥ 35 hours of professional development in the last 4 years.",
    "Two references (career manager, client, or a CBAP recipient).",
    "Agree to the IIBA Code of Conduct and Terms & Conditions.",
  ];
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold">Eligibility & Application</h1>
      <p className="mt-1 text-sm opacity-70">Self-check before you apply on the IIBA portal. Verify current rules on iiba.org.</p>

      <h2 className="mt-5 font-semibold">Requirement gates</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
        {gates.map((g) => <li key={g}>{g}</li>)}
      </ul>

      <h2 className="mt-5 font-semibold">Exam format</h2>
      <p className="mt-2 text-sm">120 multiple-choice, case-study-based questions · 3.5 hours · scenario-driven, testing application of BABOK as the single source of truth.</p>

      <h2 className="mt-5 font-semibold">Hour-log tips</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
        <li>Log experience per project, mapped to specific BABOK knowledge areas and tasks.</li>
        <li>Concentrate hours in 4 areas to clear the 900-hour-each gate cleanly.</li>
        <li>Keep PD certificates (accredited professional development; not all self-study counts).</li>
      </ul>
    </div>
  );
}
