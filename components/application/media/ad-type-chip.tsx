import { Chip } from "@/components/base/badges/chip";

export type AdContentType="Image"|"Video"|"Message";

export function resolveAdContentType({previewType,adType,hasVideo=false}:{previewType?:string;adType?:string;hasVideo?:boolean}):AdContentType {
  const value=`${previewType??""} ${adType??""}`.toUpperCase();
  if(hasVideo||value.includes("VIDEO"))return "Video";
  if(value.includes("TEXT")||value.includes("SEARCH")||value.includes("MESSAGE"))return "Message";
  return "Image";
}

export function AdTypeChip({type,className}:{type:AdContentType;className?:string}) {
  return <Chip className={className} variant="caption" color={type==="Video"?"purple":type==="Message"?"lime":"rose"}>{type}</Chip>;
}
