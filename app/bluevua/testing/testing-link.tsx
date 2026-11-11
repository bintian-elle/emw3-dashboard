'use client';

import Link from 'next/link';
import {useContext,type ComponentProps} from 'react';
import {WorkspaceNavigationStatus} from './workspace-navigation-status';
import {ChannelNavigationContext} from './channel-navigation-context';

/** Show navigation progress when moving between workspace views. */
export default function TestingLink({href,children,onNavigate,...props}:ComponentProps<typeof Link>){
 const navigateChannel=useContext(ChannelNavigationContext);
 const isWorkspace=typeof href==='string'&&/^\/bluevua\/testing(?:\/inventory)?(?:\?|#|$)/.test(href);
 const content=<>{children}{isWorkspace&&<WorkspaceNavigationStatus/>}</>;
 return <Link href={href} {...props} onNavigate={event=>{if(onNavigate){onNavigate(event);return;}if(typeof href==='string'&&navigateChannel?.(href))event.preventDefault();}}>{content}</Link>;
}
