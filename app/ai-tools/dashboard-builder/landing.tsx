import Link from 'next/link';
import { ArrowLeft, ArrowRight, LayoutDashboard, Plus } from 'lucide-react';
import { BuilderTutorial } from '../builder-tutorial';
import styles from '../../workspace-entry.module.css';

const dashboards = [
  { id: 'bluevua', name: 'Bluevua', description: 'Explore channel performance, store sales and email revenue in one report.' },
  { id: 'biceek', name: 'Biceek', description: 'Explore website traffic, store sales and email performance together.' },
  { id: 'ringconn', name: 'RingConn', description: 'Understand website traffic, purchases and revenue with a focused GA4 report.' },
] as const;
const steps = [['01', 'Ask a question', 'Choose a workspace and describe what you want to see.'], ['02', 'Build your overview', 'Metrics, trends and tables appear on your canvas.'], ['03', 'Add text', 'Add your own notes and written observations.'], ['04', 'Edit titles', 'Rename any component title, then press Enter.'], ['05', 'Arrange components', 'Drag handles to choose component positions.'], ['06', 'Change chart colors', 'Click a chart or legend to choose a color.'], ['07', 'Export PDF', 'Save your current report to share it.']] as const;

export function BuilderLanding({ embedded = false }: { embedded?: boolean }) {
  const Container = embedded ? 'div' : 'main';
  return <Container className={styles.page}><div className={styles.container}>
    {!embedded && <><div className={styles.topline}><p className={styles.eyebrow}>AI Tools</p><Link href="/ai-tools" className={styles.back}><ArrowLeft size={15}/> Back to AI tools</Link></div><h1 className={styles.heading}>Dashboard Builder</h1><p className={styles.description}>Start with an overview or a blank canvas. Ask questions, arrange your report and share the result.</p></>}
    <section className={styles.section} aria-labelledby="builder-dashboards-heading"><h2 id="builder-dashboards-heading" className={styles.sectionTitle}>Your dashboards</h2><p className={styles.description}>Open an overview or create a new dashboard.</p><div className={styles.grid}>
      {dashboards.map(dashboard => <Link key={dashboard.id} href={`/ai-tools/dashboard-builder/${dashboard.id}`} aria-label={`Open ${dashboard.name} Overview Dashboard`} className={styles.card}><div className={styles.cardTop}><span className={styles.icon}><LayoutDashboard size={18}/></span><ArrowRight size={16}/></div><h3 className={styles.cardTitle}>{dashboard.name} Overview Dashboard</h3><p className={styles.cardText}>{dashboard.description}</p><span className={styles.cardLink}>Open dashboard <ArrowRight size={14}/></span></Link>)}
      <Link href="/ai-tools/dashboard-builder/new" aria-label="Create a new blank dashboard" className={styles.card}><div className={styles.cardTop}><span className={styles.icon}><Plus size={18}/></span><ArrowRight size={16}/></div><h3 className={styles.cardTitle}>New blank dashboard</h3><p className={styles.cardText}>Start with an empty canvas. Add metrics, charts and text with AI, then arrange your report your way.</p><span className={styles.cardLink}>Create dashboard <ArrowRight size={14}/></span></Link>
    </div></section>
    <section className={styles.section} aria-labelledby="builder-tutorial-heading"><h2 id="builder-tutorial-heading" className={styles.sectionTitle}>How it works</h2><p className={styles.description}>A quick walkthrough: ask, add text, edit titles, arrange and export.</p><div style={{ marginTop: '1rem' }}><BuilderTutorial/></div><p className={styles.cardText}>English captions · No audio</p><ol className={styles.steps}>{steps.map(([number, title, description]) => <li key={number}><span className={styles.eyebrow}>{number}</span><h3 className={styles.stepTitle}>{title}</h3><p className={styles.cardText}>{description}</p></li>)}</ol></section>
  </div></Container>;
}
