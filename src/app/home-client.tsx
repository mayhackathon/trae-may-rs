"use client";

import { useEffect, useMemo, useState } from "react";

type Brief = {
  engineering: string;
  pmMarketing: string;
  support: string;
  audit: string;
  businessImpact?: string;
};

type BriefResponse =
  | { generatedAt: string; brief: Brief }
  | { error: string };

type SourceSummary = {
  gitHistory: { title: string; lines: string[] };
  prs: { title: string; lines: string[] };
  tickets: { title: string; lines: string[] };
  supportNotes: { title: string; lines: string[] };
};

type TabKey = "engineering" | "pmMarketing" | "support" | "audit";

function extractBulletSection(text: string | undefined | null, heading: string): string[] {
  if (!text) return [];
  const lines = text.split("\n");
  const startIndex = lines.findIndex((l) => l.trim() === heading);
  if (startIndex === -1) return [];

  const out: string[] = [];
  for (let i = startIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      if (out.length) break;
      continue;
    }
    if (line.startsWith("- ")) out.push(line.slice(2));
    else if (out.length) break;
  }
  return out;
}

function prettyTabLabel(key: TabKey): string {
  switch (key) {
    case "engineering":
      return "Engineering";
    case "pmMarketing":
      return "PM and Marketing";
    case "support":
      return "Support";
    case "audit":
      return "Audit";
  }
}

export default function HomeClient({ sourceSummary }: { sourceSummary: SourceSummary }) {
  const [activeTab, setActiveTab] = useState<TabKey>("engineering");
  const [brief, setBrief] = useState<Brief | null>(null);
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const auditAssumptions = useMemo(
    () => (brief ? extractBulletSection(brief.audit, "Assumptions") : []),
    [brief]
  );
  const auditUncertainties = useMemo(
    () => (brief ? extractBulletSection(brief.audit, "Uncertainties / needs verification") : []),
    [brief]
  );
  const auditMissingContext = useMemo(
    () => (brief ? extractBulletSection(brief.audit, "Missing context") : []),
    [brief]
  );

  async function applyBriefResponse(res: Response) {
    const json = (await res.json()) as BriefResponse;
    if ("error" in json) throw new Error(json.error);
    setBrief(json.brief);
    setLastGeneratedAt(json.generatedAt);
  }

  async function onGetLatest() {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-brief", { method: "GET" });
      if (res.status === 404) return;
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      await applyBriefResponse(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setIsGenerating(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    const fetchLatest = async () => {
      try {
        const res = await fetch("/api/generate-brief", { method: "GET" });
        if (res.status === 404) return;
        if (!res.ok) return;
        if (mounted) await applyBriefResponse(res);
      } catch {
        return;
      }
    };
    
    // Initial fetch
    fetchLatest();
    
    // Poll every 3 seconds to update side-by-side during demo
    const intervalId = setInterval(fetchLatest, 3000);
    
    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, []);

  const sourceCards = [
    sourceSummary.gitHistory,
    sourceSummary.prs,
    sourceSummary.tickets,
    sourceSummary.supportNotes,
  ];

  const tabKeys: TabKey[] = ["engineering", "pmMarketing", "support", "audit"];
  const activeText = brief ? brief[activeTab] : "";

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-12">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">TRAE Ship Brief</h1>
        <p className="max-w-3xl text-base leading-7 text-zinc-600">
          View the latest role-specific release communication generated via TRAE.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        {sourceCards.map((card) => (
          <div
            key={card.title}
            className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900">{card.title}</h2>
              <span className="text-xs text-zinc-500">Snapshot</span>
            </div>
            <ul className="mt-3 space-y-1 text-sm text-zinc-700">
              {card.lines.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {/* Get Latest Brief button removed */}
          </div>
          <div className="flex flex-col items-start gap-1 sm:items-end">
            {lastGeneratedAt ? (
              <p className="text-xs text-zinc-500">Last generated: {lastGeneratedAt}</p>
            ) : null}
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-zinc-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {tabKeys.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={[
                    "rounded-md px-3 py-1.5 text-sm font-medium",
                    activeTab === key
                      ? "bg-zinc-900 text-white"
                      : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200",
                  ].join(" ")}
                >
                  {prettyTabLabel(key)}
                </button>
              ))}
            </div>
          </div>
          <div className="p-4">
            {brief ? (
              <pre className="whitespace-pre-wrap break-words text-sm leading-6 text-zinc-900">
                {activeText}
              </pre>
            ) : (
              <p className="text-sm text-zinc-500">
                Generate the brief via TRAE, then click Get Latest Brief.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h3 className="text-sm font-semibold text-amber-950">Uncertainty check</h3>
          <div className="mt-3 grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">
                Assumptions
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-950">
                {(auditAssumptions.length ? auditAssumptions : ["Generate to see assumptions."]).map(
                  (l) => (
                    <li key={l}>{l}</li>
                  )
                )}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">
                Needs verification
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-950">
                {(
                  auditUncertainties.length
                    ? auditUncertainties
                    : ["Generate to see what needs verification."]
                ).map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">
                Missing context
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-950">
                {(
                  auditMissingContext.length
                    ? auditMissingContext
                    : ["Generate to see missing context."]
                ).map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
