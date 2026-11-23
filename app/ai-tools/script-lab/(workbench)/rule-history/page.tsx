import { ScriptLabRuleHistoryPage } from "@/app/ai-tools/script-lab/rule-history-page";

export default async function InternalRuleHistory({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  return <ScriptLabRuleHistoryPage customer={false} pageNumber={(await searchParams).page} />;
}
