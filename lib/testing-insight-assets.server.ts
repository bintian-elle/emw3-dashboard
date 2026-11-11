import 'server-only';
import {cache} from 'react';
import localAssets from './testing-insight-assets-local.json';
import type {InsightAsset} from './testing-insight-assets';

/** Fixed creative metadata is shipped locally; reporting metrics remain in shared snapshots. */
export const readInsightAssets=cache(async ():Promise<InsightAsset[]>=>localAssets);
