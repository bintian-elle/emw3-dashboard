import type { LocalizedText } from "@/lib/script-lab-project";
import { sampleVisualPrompt, type SampleScript, type SampleStoryboard } from "@/lib/script-lab-sample-batch";
import styles from "./workbench.module.css";

type Translate = (text: LocalizedText) => string;

export function ScriptCopy({ copy, t, language = "de" }: { copy: SampleScript["copy"]["body"]; t: Translate; language?: string }) {
  const zh = t(["en", "zh"]) === "zh";
  return <>
    <p lang={zh ? "zh" : language}>{copy[zh ? 1 : 0]}</p>
    {zh && <p className={styles.sceneTranslation} lang={language}>{copy[0]}</p>}
  </>;
}

export function SceneTable({ storyboard, t }: { storyboard: SampleStoryboard; t: Translate }) {
  return <div className={styles.tableWrap} tabIndex={0} role="region" aria-label={t(["Storyboard table", "分镜表"])}>
    <table className={`${styles.table} ${styles.fullStoryboardTable}`}>
      <thead><tr>
        <th scope="col">{t(["Time", "时间"])}</th>
        <th scope="col">{t(["Visual", "画面"])}</th>
        <th scope="col">{t(["Dialogue (original / Chinese)", "台词（原文 / 中文）"])}</th>
        <th scope="col">{t(["Subtitles (original / Chinese)", "字幕（原文 / 中文）"])}</th>
        <th scope="col">{t(["Visual prompt", "AI 画面提示词"])}</th>
        <th scope="col">{t(["Shot purpose", "这一镜解决什么"])}</th>
      </tr></thead>
      <tbody>{storyboard.scenes.map(scene => <tr key={scene.time}>
        <td>{scene.time}</td><td>{t(scene.visual)}</td>
        <td><span lang={storyboard.language ?? "de"}>{scene.voiceover}</span><span className={styles.sceneTranslation} lang="zh">{scene.translation}</span></td>
        <td><span lang={storyboard.language ?? "de"}>{scene.subtitle ?? scene.voiceover}</span><span className={styles.sceneTranslation} lang="zh">{scene.subtitleTranslation ?? scene.translation}</span></td>
        <td lang="en">{sampleVisualPrompt(scene)}</td>
        <td>{t(scene.purpose)}</td>
      </tr>)}</tbody>
    </table>
  </div>;
}

export function CreativeRationale({ logic, storyboardLogic, t, includeExecution = true }: { logic: SampleStoryboard["logic"]; storyboardLogic?: SampleStoryboard["logic"]; t: Translate; includeExecution?: boolean }) {
  function field(key: "context" | "proof", label: LocalizedText) {
    const scriptText = t(logic[key]);
    const storyboardText = storyboardLogic && t(storyboardLogic[key]);
    return <div>
      <dt>{t(label)}</dt>
      <dd>{scriptText}</dd>
      {storyboardText && storyboardText !== scriptText && <dd>
        <strong>{t(["Storyboard", "分镜"])}</strong>{" "}{storyboardText}
      </dd>}
    </div>;
  }

  return <dl className={styles.briefFields}>
    {field("context", ["Audience and pain point", "人群与痛点"])}
    {field("proof", ["Selling point, hook and evidence", "卖点、Hook 和证据"])}
    {includeExecution && <div><dt>{t(["Scene and execution", "场景与执行"])}</dt><dd>{t(["German awareness campaign · 30-second vertical UGC for Meta.", "德国认知层 · Meta 竖屏 UGC · 30 秒。"])}</dd></div>}
  </dl>;
}

export function StoryboardContent({ storyboard, t }: { storyboard: SampleStoryboard; t: Translate }) {
  return <div className={styles.storyboardSections}>
    <section>
      <h3>{t(["Storyboard table", "分镜表"])}</h3>
      <SceneTable storyboard={storyboard} t={t} />
    </section>
    <section>
      <h3>{t(["Creative rationale", "底层逻辑"])}</h3>
      <CreativeRationale logic={storyboard.logic} t={t} />
    </section>
  </div>;
}
