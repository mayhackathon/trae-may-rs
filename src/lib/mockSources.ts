import { readFile } from "node:fs/promises";
import path from "node:path";

export type GitHistory = {
  range: string;
  commits: Array<{
    hash: string;
    date: string;
    author: string;
    subject: string;
    details: string[];
  }>;
};

export type PullRequests = {
  pullRequests: Array<{
    id: number;
    title: string;
    url: string;
    mergedAt: string;
    authors: string[];
    summary: string[];
    changedAreas: string[];
    risks: string[];
  }>;
};

export type Tickets = {
  tickets: Array<{
    key: string;
    title: string;
    status: string;
    type: string;
    priority: string;
    reportedBy: string;
    context: string[];
    acceptanceCriteria: string[];
    openQuestions: string[];
  }>;
};

export type SupportNotes = {
  notes: Array<{
    date: string;
    channel: string;
    summary: string;
    details: string[];
    impact: string;
  }>;
};

export type MockSources = {
  gitHistory: GitHistory;
  prs: PullRequests;
  tickets: Tickets;
  supportNotes: SupportNotes;
};

export type SourceSummary = {
  gitHistory: { title: string; lines: string[] };
  prs: { title: string; lines: string[] };
  tickets: { title: string; lines: string[] };
  supportNotes: { title: string; lines: string[] };
};

async function readJson<T>(fileName: string): Promise<T> {
  const fullPath = path.join(process.cwd(), "data", fileName);
  const raw = await readFile(fullPath, "utf-8");
  return JSON.parse(raw) as T;
}

export async function loadMockSources(): Promise<MockSources> {
  const [gitHistory, prs, tickets, supportNotes] = await Promise.all([
    readJson<GitHistory>("git-history.json"),
    readJson<PullRequests>("prs.json"),
    readJson<Tickets>("tickets.json"),
    readJson<SupportNotes>("support-notes.json"),
  ]);

  return { gitHistory, prs, tickets, supportNotes };
}

export async function getSourceSummary(): Promise<SourceSummary> {
  const sources = await loadMockSources();

  const primaryPr = sources.prs.pullRequests[0];
  const primaryTicket = sources.tickets.tickets[0];

  return {
    gitHistory: {
      title: "Git history",
      lines: [
        `Range: ${sources.gitHistory.range}`,
        `${sources.gitHistory.commits.length} commits`,
        sources.gitHistory.commits[0]?.subject ?? "No commits found",
      ],
    },
    prs: {
      title: "PR summaries",
      lines: [
        `${sources.prs.pullRequests.length} PR merged`,
        primaryPr ? `#${primaryPr.id}: ${primaryPr.title}` : "No PR found",
        primaryPr ? `Areas: ${primaryPr.changedAreas.join(", ")}` : "Areas: n/a",
      ],
    },
    tickets: {
      title: "Ticket context",
      lines: [
        `${sources.tickets.tickets.length} ticket`,
        primaryTicket ? `${primaryTicket.key}: ${primaryTicket.title}` : "No ticket found",
        primaryTicket ? `Reported by: ${primaryTicket.reportedBy}` : "Reported by: n/a",
      ],
    },
    supportNotes: {
      title: "Support notes",
      lines: [
        `${sources.supportNotes.notes.length} notes`,
        sources.supportNotes.notes[0]?.summary ?? "No notes found",
        sources.supportNotes.notes[0]?.impact ?? "Impact: n/a",
      ],
    },
  };
}
