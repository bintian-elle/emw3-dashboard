import type {NextRequest} from 'next/server';
import {validDashboardOrigin} from './ai-dashboard';
import {currentSiteUser} from '@/lib/current-site-user';
export function isLocalDashboardRequest(request:Request){return process.env.NODE_ENV==='development'&&['localhost','127.0.0.1','[::1]'].includes(new URL(request.url).hostname);}
export async function dashboardOwner(request:Request){const user=await currentSiteUser();if(user)return user.sub;if(isLocalDashboardRequest(request))return 'local-preview';throw Error('Unauthorized');}
export function requireSameOrigin(request:NextRequest){if(!validDashboardOrigin(request.headers.get('origin'),request.headers.get('host')))throw Error('Same-origin requests only.');}
