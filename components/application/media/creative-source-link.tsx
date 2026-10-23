"use client";

import { Link } from "react-aria-components";
import { Tooltip, TooltipTrigger } from "@/components/base/tooltip/tooltip";
import { useSiteLanguage } from "@/components/application/dashboard/site-language-provider";

export function CreativeSourceLink({ href, name, kind }: { href: string; name: string; kind: "post" | "preview" }) {
  const { language } = useSiteLanguage();
  const label = kind === "post"
    ? (language === "zh" ? "查看原帖" : "View original post")
    : (language === "zh" ? "查看广告预览" : "View ad preview");

  return <TooltipTrigger>
    <Link href={href} target="_blank" rel="noopener noreferrer" className="rounded-md text-text-secondary underline underline-offset-4 outline-none hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring">{name}</Link>
    <Tooltip>{label}</Tooltip>
  </TooltipTrigger>;
}
