import type {DashboardReport} from './ai-dashboard.ts';
import {comparisonRanges} from './ai-dashboard-periods.ts';
export function reportAnswer(report:DashboardReport){const periods=comparisonRanges(report.range);const notes=[...new Set(report.warnings.filter(w=>/coverage:|unavailable|partitions|provisional|token|cannot be verified/.test(w)))];return `${report.summary}\n\nPoP: ${periods.pop.start} – ${periods.pop.end}. YoY: ${periods.yoy.start} – ${periods.yoy.end}.\nPlatform-attributed revenue overlaps; store revenue is shown separately. — means unavailable.\n${notes.join('\n')}`.trim();}
