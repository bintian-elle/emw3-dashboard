import {Suspense,type ReactNode} from 'react';
import { ResetTrackingOnReload } from './reset-on-reload';
import { TrackingSidebar } from './tracking-sidebar';
import report from './report-content.module.css';

export default function TrackingLayout({children}:{children:ReactNode}){
 return <div className={`${report.report} min-h-[calc(100dvh-3.75rem)] bg-[#f7f8fa] dark:bg-[#191a1d] lg:flex`}><ResetTrackingOnReload/><Suspense fallback={null}><TrackingSidebar/></Suspense>{children}</div>;
}
