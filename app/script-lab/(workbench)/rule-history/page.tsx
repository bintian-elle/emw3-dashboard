import { ScriptLabRuleHistoryPage } from "@/app/ai-tools/script-lab/rule-history-page";

export default async function CustomerRuleHistory({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  return <ScriptLabRuleHistoryPage customer pageNumber={(await searchParams).page} />;
}
