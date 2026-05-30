import HomeClient from "@/app/home-client";
import { getSourceSummary } from "@/lib/mockSources";

export default async function Home() {
  const sourceSummary = await getSourceSummary();

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans">
      <main className="flex flex-1 flex-col">
        <HomeClient sourceSummary={sourceSummary} />
      </main>
    </div>
  );
}
