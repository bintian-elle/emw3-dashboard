import type { ReactNode } from "react";
import type { LocalizedText } from "@/lib/script-lab-project";
import styles from "./workbench.module.css";

export function ScriptDetailSections({ t, introduction, combination, opening, body, storyboard, storyboardHeading, sceneExecution, rationale, compliance, footer }: {
  t: (text: LocalizedText) => string;
  introduction?: ReactNode;
  combination: ReactNode;
  opening: ReactNode;
  body: ReactNode;
  storyboard: ReactNode;
  storyboardHeading?: LocalizedText;
  sceneExecution?: ReactNode;
  rationale?: ReactNode;
  compliance?: ReactNode;
  footer?: ReactNode;
}) {
  return <div className={styles.storyboardSections}>
    {introduction}
    <section>
      <h3>{t(["Combination elements", "组合元素"])}</h3>
      {combination}
    </section>
    <section>
      <h3>{t(["Opening hook", "前 3 秒 Hook"])}</h3>
      {opening}
    </section>
    <section>
      <h3>{t(["Script text", "剧本正文"])}</h3>
      {body}
    </section>
    <section>
      <h3>{t(storyboardHeading ?? ["Storyboard", "分镜"])}</h3>
      {storyboard}
    </section>
    {rationale && <section>
      <h3>{t(["Creative rationale", "底层逻辑"])}</h3>
      {rationale}
      {sceneExecution && <>
        <h4>{t(["Scene and execution", "场景与执行"])}</h4>
        {sceneExecution}
      </>}
    </section>}
    {compliance && <section>
      <h3>{t(["Compliance self-check", "合规自检"])}</h3>
      {compliance}
    </section>}
    {footer}
  </div>;
}
