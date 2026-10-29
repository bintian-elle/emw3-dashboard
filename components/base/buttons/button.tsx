import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ComponentType,
  ReactNode,
  Ref,
} from "react";
import { cx } from "@/utils/cx";
import nova from "./nova-button.module.css";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "medium" | "small" | "xs";

type IconComponent = ComponentType<{
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}>;

type SharedButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
  leadingIcon?: IconComponent;
  trailingIcon?: IconComponent;
  children?: ReactNode;
};

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">, SharedButtonProps {
  ref?: Ref<HTMLButtonElement>;
}

export interface ButtonLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children">, SharedButtonProps {
  ref?: Ref<HTMLAnchorElement>;
}

// The public Button API maps onto the same source-owned Nova primitives used by
// the testing preview. Component-specific classes can still override sizing.
const variantNames = { primary: "default", secondary: "outline", ghost: "ghost", danger: "destructive" } as const;
const sizeNames = { medium: "default", small: "sm", xs: "xs" } as const;
const styles = {
  base: nova.button,
  size: { medium: nova.medium, small: nova.small, xs: nova.xs },
  iconOnlySize: { medium: nova.iconOnly, small: nova.iconOnly, xs: nova.iconOnly },
  icon: { medium: "size-4 shrink-0", small: "size-4 shrink-0", xs: "size-3 shrink-0" },
  label: { medium: "inline-flex items-center", small: "inline-flex items-center", xs: "inline-flex items-center" },
  variant: { primary: nova.primary, secondary: nova.secondary, ghost: nova.ghost, danger: nova.danger },
};

export function Button({
  variant = "primary", size = "medium", iconOnly = false,
  leadingIcon: Leading, trailingIcon: Trailing, children, className,
  type = "button", ref, ...props
}: ButtonProps) {
  return <button ref={ref} type={type} data-slot="button" data-variant={variantNames[variant]} data-size={sizeNames[size]} data-icon-only={iconOnly || undefined} className={cx(styles.base, className)} {...props}>
    {Leading && <Leading className={styles.icon[size]} aria-hidden />}
    {!iconOnly && children !== undefined && children !== null && <span className={styles.label[size]}>{children}</span>}
    {!iconOnly && Trailing && <Trailing className={styles.icon[size]} aria-hidden />}
  </button>;
}

/** Anchor counterpart to Button for navigational actions. */
export function ButtonLink({
  variant = "primary", size = "medium", iconOnly = false,
  leadingIcon: Leading, trailingIcon: Trailing, children, className,
  ref, ...props
}: ButtonLinkProps) {
  return <a ref={ref} data-slot="button" data-variant={variantNames[variant]} data-size={sizeNames[size]} data-icon-only={iconOnly || undefined} className={cx(styles.base, className)} {...props}>
    {Leading && <Leading className={styles.icon[size]} aria-hidden />}
    {!iconOnly && children !== undefined && children !== null && <span className={styles.label[size]}>{children}</span>}
    {!iconOnly && Trailing && <Trailing className={styles.icon[size]} aria-hidden />}
  </a>;
}

/** Style maps retained for existing advanced composition. */
export const buttonStyles = styles;
