"use client";

import { useMemo, useRef, useState } from "react";
import {
  Button as AriaButton,
  Dialog,
  DialogTrigger,
  I18nProvider,
  Popover,
  RangeCalendar,
} from "react-aria-components";
import {
  CalendarDate,
  endOfMonth,
  endOfYear,
  getLocalTimeZone,
  isSameDay,
  startOfMonth,
  startOfYear,
  today,
} from "@internationalized/date";
import { CalendarDays } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/base/buttons/button";
import {
  DateChipInput,
  MonthPanel,
  formatTriggerDate,
  popoverClassName,
  triggerButtonClassName,
} from "@/components/base/date-picker/shared";
import { cx } from "@/utils/cx";
import { useDismissOnOutsidePress, useTriggerToggle } from "@/utils/use-dismiss-on-outside-press";
import { useSiteLanguage } from "@/components/application/dashboard/site-language-provider";

/** Dual-month range selection with pending changes committed on Apply. */

export interface DateRangeValue {
  start: CalendarDate;
  end: CalendarDate;
}

export interface DateRangePickerProps {
  value?: DateRangeValue | null;
  defaultValue?: DateRangeValue | null;
  onChange?: (value: DateRangeValue | null) => void;
  isDisabled?: boolean;
  className?: string;
  "aria-label"?: string;
  /** Trigger text shown when no range is committed yet. Default "Select date range". */
  placeholder?: string;
  /** Return a message to keep an invalid pending range from being applied. */
  validateRange?: (value: DateRangeValue) => string | undefined;
}

function daysInRange(value: DateRangeValue) {
  const tz = getLocalTimeZone();
  const ms = value.end.toDate(tz).getTime() - value.start.toDate(tz).getTime();
  return Math.round(ms / 86_400_000) + 1;
}

function useQuickSelectPresets() {
  return useMemo(() => {
    const now = today(getLocalTimeZone());
    const lastMonth = now.subtract({ months: 1 });
    const lastYear = now.subtract({ years: 1 });
    return [
      { label: "Today", range: { start: now, end: now } },
      { label: "Yesterday", range: { start: now.subtract({ days: 1 }), end: now.subtract({ days: 1 }) } },
      { label: "Last week", range: { start: now.subtract({ days: 7 }), end: now.subtract({ days: 1 }) } },
      { label: "This month", range: { start: startOfMonth(now), end: endOfMonth(now) } },
      { label: "Last month", range: { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) } },
      { label: "This year", range: { start: startOfYear(now), end: endOfYear(now) } },
      { label: "Last year", range: { start: startOfYear(lastYear), end: endOfYear(lastYear) } },
      { label: "All time", range: { start: now.subtract({ years: 10 }), end: now } },
    ];
  }, []);
}

function isPresetActive(value: DateRangeValue | null, range: DateRangeValue) {
  return !!value && isSameDay(value.start, range.start) && isSameDay(value.end, range.end);
}

function QuickSelect({
  value,
  onSelect,
}: {
  value: DateRangeValue | null;
  onSelect: (range: DateRangeValue) => void;
}) {
  const presets = useQuickSelectPresets();
  const { language } = useSiteLanguage();
  const labels: Record<string, string> = { Today: "今天", Yesterday: "昨天", "Last week": "上周", "This month": "本月", "Last month": "上月", "This year": "今年", "Last year": "去年", "All time": "全部时间" };

  return (
    <div className="flex w-[118px] shrink-0 flex-col gap-1.5">
      {presets.map((preset) => (
        <button
          key={preset.label}
          type="button"
          onClick={() => onSelect(preset.range)}
          className={cx(
            "w-full cursor-pointer rounded-2lg px-2 py-1.5 text-left text-body-medium text-text-primary transition-colors duration-150 ease",
            isPresetActive(value, preset.range)
              ? "bg-background-tertiary-default"
              : "hover:bg-background-secondary-hover",
          )}
        >
          {language === "zh" ? labels[preset.label] : preset.label}
        </button>
      ))}
    </div>
  );
}

function Footer({
  value,
  onChange,
  onCancel,
  onApply,
  invalidReason,
}: {
  value: DateRangeValue | null;
  onChange: (value: DateRangeValue) => void;
  onCancel: () => void;
  onApply: () => void;
  invalidReason?: string;
}) {
  const { language } = useSiteLanguage();
  const zh = language === "zh";
  return (
    <div className="flex items-center justify-between pt-3 pr-4">
      <div className="flex items-center gap-2.5">
        <AnimatePresence>
          {value && (
            <motion.div
              key="range-summary"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: [0.34, 1.2, 0.64, 1] }}
              className="flex items-center gap-2.5"
            >
              <div className="flex items-center gap-[5px]">
                <DateChipInput
                  date={value.start}
                  label={zh ? "开始日期" : "Start date"}
                  onCommit={(start) =>
                    onChange({ start, end: start.compare(value.end) > 0 ? start : value.end })
                  }
                />
                <span className="text-body-medium text-text-secondary">-</span>
                <DateChipInput
                  date={value.end}
                  label={zh ? "结束日期" : "End date"}
                  onCommit={(end) =>
                    onChange({ start: end.compare(value.start) < 0 ? end : value.start, end })
                  }
                />
              </div>
              <span className="rounded-xl bg-background-tertiary-default px-2 py-2 text-body-medium text-text-secondary">
                {zh ? `已选择 ${daysInRange(value)} 天` : `${daysInRange(value)} day${daysInRange(value) === 1 ? "" : "s"} selected`}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="flex items-center gap-2.5">
        <Button variant="secondary" onClick={onCancel}>
          {zh ? "取消" : "Cancel"}
        </Button>
        <Button onClick={onApply} disabled={!value || !!invalidReason}>
          {zh ? "应用" : "Apply"}
        </Button>
      </div>
    </div>
  );
}

export function DateRangePicker({
  value,
  defaultValue = null,
  onChange,
  isDisabled,
  className,
  "aria-label": ariaLabel = "Date range",
  placeholder,
  validateRange,
}: DateRangePickerProps) {
  const { language } = useSiteLanguage();
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState<DateRangeValue | null>(defaultValue);
  const committedValue = isControlled ? (value ?? null) : internalValue;

  const [pendingValue, setPendingValue] = useState<DateRangeValue | null>(committedValue);
  const invalidReason = pendingValue ? validateRange?.(pendingValue) : undefined;

  const commit = (next: DateRangeValue | null) => {
    if (!isControlled) setInternalValue(next);
    onChange?.(next);
  };

  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLElement>(null);
  useDismissOnOutsidePress(isOpen, () => setIsOpen(false), [triggerRef, popoverRef]);
  // Pressing the trigger while open closes the popover instead of reopening
  const allowOpenChange = useTriggerToggle(isOpen, triggerRef);

  return (
    <I18nProvider locale={language === "zh" ? "zh-CN" : "en-US"}>
    <DialogTrigger
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!allowOpenChange(open)) return;
        if (open) setPendingValue(committedValue);
        setIsOpen(open);
      }}
    >
      <AriaButton ref={triggerRef} isDisabled={isDisabled} className={cx(triggerButtonClassName, className)}>
        <CalendarDays className="size-4 shrink-0 text-foreground-icon-primary" aria-hidden="true" />
        <span className="flex items-center justify-center whitespace-nowrap px-1 text-body-medium text-text-primary">
          {committedValue ? `${formatTriggerDate(committedValue.start)} - ${formatTriggerDate(committedValue.end)}` : (placeholder ?? (language === "zh" ? "选择日期范围" : "Select date range"))}
        </span>
      </AriaButton>
      <Popover ref={popoverRef} offset={4} placement="bottom end" isNonModal className={popoverClassName}>
        <Dialog aria-label={ariaLabel} className="outline-none">
          {({ close }) => (
            <RangeCalendar
              aria-label={ariaLabel}
              visibleDuration={{ months: 2 }}
              value={pendingValue}
              onChange={setPendingValue}
            >
              <div className="flex gap-3">
                <div className="pt-4 pl-4">
                  <QuickSelect
                    value={pendingValue}
                    onSelect={(range) => setPendingValue(range)}
                  />
                </div>
                <div className="flex flex-col pt-2 pr-2 pb-3">
                  <div className="flex gap-2">
                    <MonthPanel offset={0} showPrev />
                    <MonthPanel offset={1} showNext />
                  </div>
                  <Footer
                    value={pendingValue}
                    onChange={setPendingValue}
                    onCancel={() => {
                      setPendingValue(committedValue);
                      close();
                    }}
                    onApply={() => {
                      if (!pendingValue || invalidReason) return;
                      commit(pendingValue);
                      close();
                    }}
                    invalidReason={invalidReason}
                  />
                  {invalidReason && <p role="alert" className="px-4 pt-2 text-body-medium text-text-error-primary">{invalidReason}</p>}
                </div>
              </div>
            </RangeCalendar>
          )}
        </Dialog>
      </Popover>
    </DialogTrigger>
    </I18nProvider>
  );
}
