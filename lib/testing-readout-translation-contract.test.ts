import test from "node:test";
import assert from "node:assert/strict";
import { applyReadoutTranslation, decodeReadoutTranslation, readoutTranslationStrings, translationChunks } from "./testing-readout-translation-contract.ts";
test("translation changes prose while preserving test identities, reporting dates, numeric values and hidden framework metadata", () => {
  const payload = { period: { label: "Month-to-date", start: "2026-10-01" }, tests: [{ test_id: "EM-Test", campaign_name: "EM-Test", channel: "Meta", summary: "Spend $12.30", evidence: ["[FRAMEWORK] {}", "Source https://example.com/2"], delta: { metrics: [{ name: "ROAS", test_value: 1.2, interpretation: "Up 2%" }] } }] };
  const strings = readoutTranslationStrings(payload);
  assert.deepEqual(strings, ["Spend $12.30", "Source https://example.com/2", "Up 2%"]);
  const translated = decodeReadoutTranslation({ answer_markdown: 'Translation completed.\n<translation-json>{"s0":"花费 $12.30","s1":"来源 https://example.com/2","s2":"提升 2%"}</translation-json>' }, strings);
  const actual = applyReadoutTranslation(payload, translated) as typeof payload;
  assert.equal(actual.tests[0].summary, "花费 $12.30");
  assert.equal(actual.tests[0].test_id, "EM-Test");
  assert.deepEqual(actual.period, payload.period);
  assert.equal(actual.tests[0].delta.metrics[0].test_value, 1.2);
  assert.equal(actual.tests[0].evidence[0], "[FRAMEWORK] {}");
  assert.equal(payload.tests[0].summary, "Spend $12.30");
});
test("reject incomplete translations and modified numbers or source URLs", () => {
  const decode = (value: string) => decodeReadoutTranslation({ answer_markdown: `Translation completed.\n<translation-json>${value}</translation-json>` }, ["Spend $12.30 https://example.com/2"]);
  assert.throws(() => decode('{}'), /coverage/);
  assert.throws(() => decode('{"s0":"花费 $13.30 https://example.com/2"}'), /numbers or links/);
  assert.throws(() => decode('{"s0":"花费 $12.30 https://other.com/2"}'), /numbers or links/);
});
test("chunks preserve complete source strings within the supported response budget", () => {
  assert.deepEqual(translationChunks(["aaa", "bbb", "cc"], 5), [["aaa"], ["bbb", "cc"]]);
  assert.throws(() => translationChunks(["toolong"], 3), /chunk size/);
});
test("English month names can be translated to Chinese numeric month names without changing the date", () => {
  const translated = decodeReadoutTranslation({ answer_markdown: 'Translation completed.\n<translation-json>{"s0":"10 月 19 日，花费 $12.30。"}</translation-json>' }, ["October 19, spend $12.30."]);
  assert.equal(translated.get("October 19, spend $12.30."), "10 月 19 日，花费 $12.30。");
});
test("relative periods such as previous month are not interpreted as numbered months", () => {
  assert.doesNotThrow(() => decodeReadoutTranslation({ answer_markdown: 'Translation completed.\n<translation-json>{"s0":"缺少前一周或前一月基准。"}</translation-json>' }, ["No prior-week or prior-month baseline."]));
  assert.doesNotThrow(() => decodeReadoutTranslation({ answer_markdown: 'Translation completed.\n<translation-json>{"s0":"十月 19 日"}</translation-json>' }, ["October 19"]));
});
test("sentence punctuation after a source link is not treated as part of its URL", () => {
  assert.doesNotThrow(() => decodeReadoutTranslation({ answer_markdown: 'Translation completed.\n<translation-json>{"s0":"来源 https://example.com/2。"}</translation-json>' }, ["Source https://example.com/2."]));
});
test("fixed goals and hypotheses translate once without changing campaign identity or hypothesis basis", () => {
  const payload = { test_frameworks: [{ test_id: "EM-Search-Test", test_goal: "Improve purchases", hypothesis: { text: "Clearer copy improves CVR", basis: "documented" } }], channel_frameworks: [] };
  const source = readoutTranslationStrings(payload);
  assert.deepEqual(source, ["Improve purchases", "Clearer copy improves CVR"]);
  const translated = applyReadoutTranslation(payload, new Map([[source[0], "增加购买"], [source[1], "更清晰的文案能够提高 CVR"]])) as typeof payload;
  assert.equal(translated.test_frameworks[0].test_goal, "增加购买");
  assert.equal(translated.test_frameworks[0].hypothesis.text, "更清晰的文案能够提高 CVR");
  assert.equal(translated.test_frameworks[0].hypothesis.basis, "documented");
  assert.equal(translated.test_frameworks[0].test_id, "EM-Search-Test");
});
