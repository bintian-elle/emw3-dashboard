import Image from "next/image";
import { cx } from "@/utils/cx";

const logoUrl = "/brand/emw3-logo.gif";

export function Emw3Logo({ className, priority = false }: { className?: string; priority?: boolean }) {
  return <Image src={logoUrl} alt="EMW3" width={270} height={100} unoptimized priority={priority} className={cx("h-auto w-40 object-contain mix-blend-multiply", className)} />;
}

export function BluevuaMark({ className }: { className?: string }) {
  return <span aria-hidden className={cx("flex items-center justify-center rounded-2xl bg-button-ghost-background text-title-1-semibold text-button-ghost-foreground", className)}>B</span>;
}
