import 'server-only';
import {cookies} from 'next/headers';
import {currentSiteUser} from './current-site-user';
import {reviewPreviewEnabled} from './review-access';

/** Server-only feature gate for draft experiences; never rely on the cookie alone. */
export async function isReviewPreview(){
 const [user,store]=await Promise.all([currentSiteUser(),cookies()]);
 return reviewPreviewEnabled(user,store.get('review_preview')?.value);
}
