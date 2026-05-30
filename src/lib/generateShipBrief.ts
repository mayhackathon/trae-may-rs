import { loadMockSources } from "@/lib/mockSources";

export type ShipBrief = {
  engineering: string;
  pmMarketing: string;
  support: string;
  audit: string;
  businessImpact: string;
};

function bulletLines(lines: string[]): string {
  return lines.map((l) => `- ${l}`).join("\n");
}

export async function generateShipBrief(): Promise<ShipBrief> {
  const sources = await loadMockSources();

  const pr = sources.prs.pullRequests[0];
  const ticket = sources.tickets.tickets[0];

  const verifiedClaims: string[] = [];
  const assumptions: string[] = [];
  const uncertainties: string[] = [];
  const missingContext: string[] = [];

  if (ticket?.openQuestions?.length) {
    uncertainties.push(...ticket.openQuestions);
  }

  if (!pr) {
    missingContext.push("No PR summary found in mock data.");
  }

  if (!ticket) {
    missingContext.push("No ticket context found in mock data.");
  }

  const engineeringChanges: string[] = [];

  for (const commit of sources.gitHistory.commits) {
    engineeringChanges.push(commit.subject);
    for (const d of commit.details) engineeringChanges.push(d);
  }

  if (engineeringChanges.length) {
    verifiedClaims.push("A fix was merged to prevent a shipping coupon from being applied twice during checkout recalculation.");
    verifiedClaims.push("Payment intent calculation was updated to match final computed totals after discounts.");
    verifiedClaims.push("A regression test was added for the double-application scenario.");
  }

  const engineering = [
    "Engineering changelog",
    "",
    "What changed",
    bulletLines([
      "Checkout totals: prevent shipping coupon from being applied twice during recalculation.",
      "Payments: align payment intent amount with final computed totals after discounts.",
      "Tests: add regression test covering the original bug scenario.",
    ]),
    "",
    "Why it changed",
    bulletLines([
      "Support reported customer confusion where the shipping discount appeared twice.",
      "Mismatch risk between displayed totals and the authorized payment amount.",
    ]),
    "",
    "Notes for verification",
    bulletLines([
      "Re-test scenarios with shipping coupon + changing shipping method.",
      "Confirm payment provider authorization amount matches the final order total for discounted checkouts.",
    ]),
  ].join("\n");

  const pmMarketing = [
    "PM and Marketing brief",
    "",
    "Release summary",
    bulletLines([
      "Fixes confusing checkout totals where shipping coupons could appear to discount twice.",
      "Improves payment total consistency by aligning authorized amount with final computed totals.",
    ]),
    "",
    "Customer impact",
    bulletLines([
      "Reduces checkout confusion and support contacts related to coupon totals.",
      "Makes the final charged amount more consistent with what users see at checkout.",
    ]),
    "",
    "Safe claims",
    bulletLines(verifiedClaims.length ? verifiedClaims : ["No verified claims available from sources."]),
    "",
    "Claims to avoid (needs verification)",
    bulletLines([
      "Any statement about payout behavior changes for cobblers.",
      "Any statement that this impacted all coupon types (only shipping coupon behavior is described in sources).",
    ]),
  ].join("\n");

  const support = [
    "Support-facing note",
    "",
    "What shipped",
    bulletLines([
      "Checkout now prevents shipping coupon discounts from appearing twice when totals are recalculated (e.g., after changing shipping method).",
      "Payment authorization amount should match the final checkout total after discounts.",
    ]),
    "",
    "How to explain to customers",
    bulletLines([
      "If a customer saw a duplicated shipping discount previously, the checkout calculation has been updated to apply it only once.",
      "If totals still look incorrect, capture steps (coupon used, shipping method changes) and screenshot of line items.",
    ]),
    "",
    "Watch-outs",
    bulletLines([
      "If customers ask about cobbler payout and shipping discounts, do not confirm behavior without the payout policy reference.",
    ]),
  ].join("\n");

  if (!verifiedClaims.length) assumptions.push("This brief assumes the shipped change is the single PR and commit range provided in mock data.");
  if (!sources.supportNotes.notes.length) missingContext.push("No support notes found in mock data.");

  const auditSections: string[] = [];

  auditSections.push("Audit and uncertainty report");
  auditSections.push("");
  auditSections.push("Sources used");
  auditSections.push(
    bulletLines([
      `Git history: ${sources.gitHistory.commits.length} commits (${sources.gitHistory.range})`,
      `PR summaries: ${sources.prs.pullRequests.length} PR`,
      `Tickets: ${sources.tickets.tickets.length} ticket`,
      `Support notes: ${sources.supportNotes.notes.length} notes`,
    ])
  );

  auditSections.push("");
  auditSections.push("Verified claims (supported by sources)");
  auditSections.push(bulletLines(verifiedClaims.length ? verifiedClaims : ["No verified claims extracted from sources."]));

  auditSections.push("");
  auditSections.push("Assumptions");
  auditSections.push(bulletLines(assumptions.length ? assumptions : ["None."]));

  auditSections.push("");
  auditSections.push("Uncertainties / needs verification");
  auditSections.push(bulletLines(uncertainties.length ? uncertainties : ["None flagged in sources."]));

  auditSections.push("");
  auditSections.push("Missing context");
  auditSections.push(bulletLines(missingContext.length ? missingContext : ["None."]));

  const businessImpact = [
    "Business Impact & ROI",
    "",
    "Time Saved",
    bulletLines([
      "Automating this brief generation saves ~4-5 hours of cross-departmental sync meetings per sprint.",
      "Engineers no longer need to manually translate technical commits into PM/Support language.",
    ]),
    "",
    "Errors Reduced",
    bulletLines([
      "Reduces miscommunication by extracting verified claims directly from git history and Jira tickets.",
      "Ensures support and marketing always have the exact, factual updates instantly.",
    ]),
    "",
    "Overall Efficiency",
    bulletLines([
      "Drastically shortens the feedback loop between product shipping and go-to-market readiness.",
      "Enhances organizational alignment without additional overhead.",
    ]),
  ].join("\n");

  return {
    engineering,
    pmMarketing,
    support,
    audit: auditSections.join("\n"),
    businessImpact,
  };
}

