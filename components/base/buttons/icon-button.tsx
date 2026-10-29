import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ComponentType,
  Ref,
} from "react";
import { cx } from "@/utils/cx";
import nova from "./nova-button.module.css";

type IconButtonSize = "medium" | "small";
type IconComponent = ComponentType<{
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}>;

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  icon: IconComponent;
  size?: IconButtonSize;
  "aria-label": string;
  ref?: Ref<HTMLButtonElement>;
}

export interface IconLinkButtonProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children"> {
  icon: IconComponent;
  size?: IconButtonSize;
  "aria-label": string;
  ref?: Ref<HTMLAnchorElement>;
}

export function IconButton({ icon: Icon, size = "medium", className, type = "button", ref, ...props }: IconButtonProps) {
  return <button ref={ref} type={type} data-slot="button" data-variant="outline" data-size={size === "small" ? "sm" : "default"} data-icon-only="true" className={cx(nova.button, className)} {...props}>
    <Icon aria-hidden />
  </button>;
}

/** Anchor counterpart to IconButton for navigational actions. */
export function IconLinkButton({ icon: Icon, size = "medium", className, ref, ...props }: IconLinkButtonProps) {
  return <a ref={ref} data-slot="button" data-variant="outline" data-size={size === "small" ? "sm" : "default"} data-icon-only="true" className={cx(nova.button, className)} {...props}>
    <Icon aria-hidden />
  </a>;
}
