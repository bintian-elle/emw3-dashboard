The current AI Insights implementation is still too descriptive.

Most insights simply restate KPI increases/decreases. I want to upgrade
the insight-generation logic from KPI summarization to analytical diagnosis.

Do not redesign the UI yet.

Please modify the analytics layer and AI prompt so that:

1. A single metric increase/decrease is NOT considered an insight.

2. Add relationship analysis where supported:
   - reach vs revenue
   - engagement vs conversion
   - orders vs AOV
   - Campaign vs Flow
   - Email vs SMS

3. Add deterministic funnel diagnosis:
   Recipients → Delivered → Open → Click → Conversion → Revenue

   Identify where the largest meaningful deterioration occurs.

4. Add counterfactual/hypothesis checks where the data supports them.
   Example:
   recipients up + revenue down contradicts the hypothesis that lower
   reach caused the revenue decline.

5. Add revenue-decline concentration analysis:
   - Top 1 driver contribution
   - Top 3 driver contribution
   - determine whether the decline is concentrated or broad-based
   using explicit configurable thresholds.

6. Trace important drivers hierarchically:
   EDM → Campaign/Flow → specific Campaign/Flow → Message → funnel metrics.

7. Upgrade the AI output schema for each insight to:

{
  "title": "",
  "observation": "",
  "interpretation": "",
  "supporting_evidence": [],
  "driver": "",
  "business_implication": "",
  "next_step": "",
  "confidence": "high | medium | low"
}

8. Add this quality rule to the system prompt:

"A metric change by itself is not an insight. Every selected insight
must connect multiple pieces of evidence and explain a relationship,
driver, contradiction, funnel-stage change, concentration, or business
implication. If an insight only restates that a KPI increased or
decreased, exclude it."

9. Generate candidate insights first, then select only the 3-5 most
valuable based on:
   - business impact
   - evidence strength
   - actionability
   - non-obviousness

10. Do not invent causal explanations. Distinguish:
    observation → supported interpretation → hypothesis → next investigation.

Before coding, inspect which of these analyses are supported by the
metrics already available in the current analytics payload. Do not
invent unavailable data or duplicate existing calculations.