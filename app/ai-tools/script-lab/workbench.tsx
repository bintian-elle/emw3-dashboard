"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Award, ArrowLeft, BarChart3, Boxes, FileText, Layers, Menu, Sparkles, TrendingUp, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { useSiteLanguage } from "@/components/application/dashboard/site-language-provider";
import { Card } from "@/components/ui/card";
import type { LocalizedText, ScriptLabProject } from "@/lib/script-lab-project";
import { scriptLabSectionFromSlug, scriptLabSectionPath, type ScriptLabSection } from "@/lib/script-lab-navigation";
import { ExcellentExamples } from "./excellent-examples";
import { ScriptCandidates } from "./script-candidates";
import { ScriptGenerator } from "./script-generator";
import { RuleLibrary } from "./rule-library";
import { TrendReferences } from "./trend-references";
import styles from "./workbench.module.css";

const sections = [
  { id: "generator", label: ["Script generation", "剧本生成"], icon: Sparkles },
  { id: "candidates", label: ["Script candidates", "剧本候选"], icon: FileText },
  { id: "results", label: ["Test results", "测试结果"], icon: BarChart3 },
  { id: "rules", label: ["Rule library management", "规则库管理"], icon: Layers },
  { id: "examples", label: ["Excellent examples", "优秀案例"], icon: Award },
  { id: "trends", label: ["Trending now", "流行趋势"], icon: TrendingUp },
] as const;

export function ScriptLabShell({ publicView, children }: { publicView: boolean; children: ReactNode }) {
  const pathname = usePathname();
  const slug = pathname.split("/").filter(Boolean).at(-1) ?? "";
  const section = slug === "rule-history" ? "rules" : scriptLabSectionFromSlug(slug);
  const { language } = useSiteLanguage();
  const t = (pair: LocalizedText) => pair[language === "zh" ? 1 : 0];
  const [drawer, setDrawer] = useState(false);

  const navigation = (
    <>
      {!publicView && <Link href="/ai-tools" className={styles.back}><ArrowLeft size={15} aria-hidden="true" />{t(["AI Tools", "AI 工具"])}</Link>}
      <div className={styles.brand}><Boxes size={23} aria-hidden="true" />AI Script Lab</div>
      {!publicView && <div className={styles.project}>
        <label htmlFor={drawer ? "mobile-lab-project" : "lab-project"}>{t(["Project", "项目"])}</label>
        <select id={drawer ? "mobile-lab-project" : "lab-project"} value="biceek" disabled><option value="biceek">Biceek</option></select>
      </div>}
      <nav className={styles.nav} aria-label={t(["Script Lab workspace", "脚本工作区"])}>
        {sections.map(({ id, label, icon: Icon }) => (
          <Link key={id} href={scriptLabSectionPath(id, publicView)} aria-current={section === id ? "page" : undefined} onNavigate={() => setDrawer(false)}>
            <Icon size={18} aria-hidden="true" />{t(label)}
          </Link>
        ))}
      </nav>
    </>
  );

  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar}>{!drawer && navigation}</aside>
      <div className={styles.workspace}>
        <div className={styles.mobileNav}>
          <Dialog.Root open={drawer} onOpenChange={setDrawer}>
            <Dialog.Trigger asChild><button className={styles.secondary} type="button"><Menu size={18} aria-hidden="true" />AI Script Lab</button></Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className={styles.overlay} />
              <Dialog.Content className={styles.drawer} aria-describedby={undefined}>
                <Dialog.Title className="sr-only">AI Script Lab</Dialog.Title>
                <Dialog.Close asChild><button className={styles.close} type="button" aria-label={t(["Close menu", "关闭菜单"])}><X size={20} /></button></Dialog.Close>
                {navigation}
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
        {children}
      </div>
    </main>
  );
}

export default function ScriptLabWorkbench({ project, publicView, canManageRules, section, ruleSourceUrl, selectionScope = "guest", projectLoading = false }: {
  project?: ScriptLabProject;
  publicView: boolean;
  canManageRules: boolean;
  section: ScriptLabSection;
  ruleSourceUrl?: string;
  selectionScope?: string;
  projectLoading?: boolean;
}) {
  const { brand, product } = project ?? { brand: "Biceek", product: "Findhoo 200" };
  const { language } = useSiteLanguage();
  const t = (pair: LocalizedText) => pair[language === "zh" ? 1 : 0];
  const title = t(sections.find(item => item.id === section)!.label);

  return <>
    <header className={styles.header}>
      <div><h1>{title}</h1><p>{brand} / {product}</p></div>
    </header>

    {section === "candidates" && <ScriptCandidates customer={publicView} canReview={canManageRules} t={t} />}

    {section === "generator" && <ScriptGenerator customer={publicView} canManage={canManageRules} pending={projectLoading} selectionScope={selectionScope} t={t} />}

    {section === "examples" && <ExcellentExamples customer={publicView} t={t} />}
    {section === "rules" && <RuleLibrary customer={publicView} canManage={canManageRules} sourceUrl={ruleSourceUrl} t={t} />}

    {section === "trends" && <TrendReferences customer={publicView} t={t} />}

    {section === "results" && <Card className={styles.panel}><h2>{t(["No test results yet", "暂无测试结果"])}</h2><p className={styles.muted}>{t(["Published videos and their test results will appear here.", "这里将展示已发布的视频及其测试结果。"])}</p></Card>}
  </>;
}
