import { headers } from "next/headers";
import { getScriptLabRuleActor } from "@/lib/script-lab-rule-access";
import { getScriptLabLibraryVersion, getScriptLabRuleHistory } from "@/lib/script-lab-rule-store";
import { RuleHistoryView } from "./rule-history-view";

export async function ScriptLabRuleHistoryPage({ customer, pageNumber }: { customer: boolean; pageNumber?: string }) {
  const requested = Number(pageNumber);
  const page = Number.isSafeInteger(requested) && requested > 0 && requested <= 10000 ? requested : 1;
  const host = (await headers()).get("host") ?? "";
  const [version, data] = await Promise.all([getScriptLabLibraryVersion().catch(() => null), (async () => {
    const actor = await getScriptLabRuleActor(customer ? "customer" : "internal", host);
    const rows = actor ? await getScriptLabRuleHistory(actor, page, customer) : [];
    return { entries: rows.slice(0, 30), hasNextPage: rows.length > 30, needsLogin: customer && !actor };
  })().catch(() => ({ entries: null, hasNextPage: false, needsLogin: false }))]);
  return <RuleHistoryView customer={customer} page={page} version={version} {...data} />;
}
