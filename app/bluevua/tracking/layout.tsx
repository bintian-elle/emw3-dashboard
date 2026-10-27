import {Suspense,type ReactNode} from 'react';
import { ResetTrackingOnReload } from './reset-on-reload';
import { TrackingSidebar } from './tracking-sidebar';

export default function TrackingLayout({children}:{children:ReactNode}){
 return <div className="min-h-screen bg-background-secondary-default lg:flex"><ResetTrackingOnReload/><Suspense fallback={null}><TrackingSidebar/></Suspense>{children}</div>;
}
