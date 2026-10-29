import { TestingPageHeader } from "../testing-page-header";
import { OverallFramework } from "./overall-framework";
import { ConcludedInventory } from "./concluded-inventory";

export default function ConcludedOverviewPage() {
  return <><TestingPageHeader section="Concluded Test" title="Concluded Test" showReportingPeriod={false}/><OverallFramework/><ConcludedInventory/></>;
}
