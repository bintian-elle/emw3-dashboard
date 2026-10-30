type LinkFields = { instagram_permalink_url?: string; effective_object_story_id?: string; object_story_id?: string; permalink_url?: string; preview_shareable_link?: string };
type ReadGraph = (id: string, params: Record<string, string>) => Promise<LinkFields>;

function safeUrl(value?: string): string | null {
  if (!value) return null;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; } catch { return null; }
}

/** Optional metadata must never prevent performance data from loading. */
export async function resolveMetaCreativeLinks(adId: string, creativeId: string | undefined, read: ReadGraph) {
  const creative = creativeId ? await read(creativeId, {fields:'instagram_permalink_url,effective_object_story_id,object_story_id'}).catch(() => null) : null;
  let postUrl = safeUrl(creative?.instagram_permalink_url);
  const story = creative?.effective_object_story_id || creative?.object_story_id;
  if (!postUrl && story) {
    const post = await read(story, {fields:'permalink_url'}).catch(() => null);
    postUrl = safeUrl(post?.permalink_url);
  }
  const preview = !postUrl ? await read(adId, {fields:'preview_shareable_link'}).catch(() => null) : null;
  return {postUrl, previewUrl:safeUrl(preview?.preview_shareable_link)};
}

/** A missing public-page permission may hide a link, never the ad's metrics.
 * Rate limits, authentication failures and required data errors remain fatal. */
export function isOptionalMetaLinkPermissionError(params:Record<string,string>,error:unknown){
 const fields=new Set(['permalink_url','instagram_permalink_url,effective_object_story_id,object_story_id','preview_shareable_link']);
 return fields.has(params.fields)&&error instanceof Error&&/pages_read_engagement|Page Public Content Access/i.test(error.message);
}
