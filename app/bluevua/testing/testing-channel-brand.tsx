import Image from "next/image";
import { Camera } from "lucide-react";

const logos: Record<string, string> = {
  "Google Search": "/brand/channels/google-search.svg",
  "Google PMAX": "/brand/channels/google-ads.svg",
  "Google Demand Gen": "/brand/channels/google-discover.svg",
  EDM: "/brand/channels/klaviyo.png",
  "Social Media": "/brand/channels/instagram-gradient.svg",
};
const singleColorMarks: Record<string, {src: string; color: string}> = {
  Meta: {src: "/brand/channels/meta.svg", color: "#0866ff"},
  Reddit: {src: "/brand/channels/reddit.svg", color: "#ff4500"},
};

/** Channel marks for the opt-in Overview design preview. */
export function TestingChannelBrand({ name, eager = false }: { name: string; eager?: boolean }) {
  const logo = logos[name];
  const solidMark = singleColorMarks[name];
  return <span aria-hidden="true" className="inline-flex size-5 shrink-0 items-center justify-center">
    {logo ? <Image src={logo} alt="" width={20} height={20} loading={eager ? "eager" : "lazy"} unoptimized className="size-5 object-contain" /> : solidMark ? <span className="size-5 shrink-0" style={{backgroundColor:solidMark.color,mask:`url('${solidMark.src}') center / contain no-repeat`}} /> : <Camera className="size-5" />}
  </span>;
}
