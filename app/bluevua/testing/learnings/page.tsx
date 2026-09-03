import { RiBookOpenLine } from "@remixicon/react";
import { TestingSectionPlaceholder } from "../section-placeholder";

export default function LearningsPage() {
  return <TestingSectionPlaceholder eyebrow="LEARNINGS" title="Learning Library" description="Turn completed tests into reusable insights, winning patterns, production guidance, and the next testing backlog." icon={RiBookOpenLine} items={["Winning patterns","Channel insights","Next test ideas"]} />;
}
