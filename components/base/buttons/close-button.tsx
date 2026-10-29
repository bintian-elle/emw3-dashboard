import type { ButtonHTMLAttributes, Ref } from "react";
import { X } from "lucide-react";
import { cx } from "@/utils/cx";
import nova from "./nova-button.module.css";

type CloseButtonSize = "2xs" | "xs" | "sm" | "md";

export interface CloseButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  size?: CloseButtonSize;
  "aria-label": string;
  ref?: Ref<HTMLButtonElement>;
}

const sizes: Record<CloseButtonSize, string> = {
  "2xs": "size-4",
  xs: "size-5",
  sm: "size-6",
  md: "size-8",
};
const icons: Record<CloseButtonSize, string> = {
  "2xs": "size-2",
  xs: "size-3",
  sm: "size-3.5",
  md: "size-4",
};

export function CloseButton({ size = "xs", className, type = "button", ref, ...props }: CloseButtonProps) {
  return <button ref={ref} type={type} data-slot="button" data-variant="ghost" data-size="xs" data-close-size={size} data-icon-only="true" className={cx(nova.button, sizes[size], className)} {...props}>
    <X className={icons[size]} aria-hidden />
  </button>;
}
