import { createElement, type ReactNode } from "react";
import {
  ChartNoAxesCombined,
  FlaskConical,
  HeartPulse,
  Mail,
  Megaphone,
  MessageSquareText,
  PanelsTopLeft,
  Sparkles,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { cx } from "@/utils/cx";

export function DashboardSection({
  title,
  eyebrow,
  icon: Icon,
  iconTone = "neutral",
  description,
  action,
  children,
  className,
}: {
  title: string;
  eyebrow?: string;
  icon?: LucideIcon;
  iconTone?: "neutral" | "accent";
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const semanticIcon = Icon ?? sectionIcon(title);
  const isAi = title === "AI Performance Insights";
  const resolvedTone = isAi ? "accent" : iconTone;
  const visibleEyebrow = eyebrow && !/^\d+$/.test(eyebrow) ? eyebrow : undefined;

  return (
    <section className={cx("min-w-0 max-w-full space-y-5 pt-4", className)}>
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div className="flex min-w-0 items-start gap-3">
          <span className={cx("mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl", resolvedTone === "accent" ? "bg-accent-50 text-accent-700" : "bg-background-secondary-default text-foreground-icon-secondary")}>{createElement(semanticIcon,{className:"size-5","aria-hidden":"true"})}</span>
          <div className="min-w-0">
            {visibleEyebrow && <p className={cx("text-caption-1-semibold", resolvedTone === "accent" ? "text-accent-700" : "text-text-tertiary")}>{visibleEyebrow}</p>}
            <h2 className={cx("text-title-1-semibold tracking-tight text-text-primary", visibleEyebrow && "mt-1")}>{title}</h2>
            {description && <p className="mt-1 max-w-3xl text-body-regular text-text-secondary">{description}</p>}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}

function sectionIcon(title: string): LucideIcon {
  if (title === "Business Overall") return ChartNoAxesCombined;
  if (title === "List Health") return HeartPulse;
  if (title === "Subscribers") return Users;
  if (title.startsWith("Email")) return Mail;
  if (title.startsWith("SMS")) return MessageSquareText;
  if (title.startsWith("Flow")) return Workflow;
  if (title === "A/B Testing") return FlaskConical;
  if (title === "AI Performance Insights") return Sparkles;
  if (title.includes("Campaign")) return Megaphone;
  return PanelsTopLeft;
}

export function DashboardSurface({
  children,
  className,
  tone = "primary",
}: {
  children: ReactNode;
  className?: string;
  tone?: "primary" | "secondary";
}) {
  return (
    <Card
      className={cx(
        "min-w-0 max-w-full",
        tone === "primary" ? "shadow-xs" : "border-transparent bg-background-secondary-default shadow-none",
        className,
      )}
    >
      {children}
    </Card>
  );
}
