'use client';

import Link from 'next/link';
import type {ComponentProps} from 'react';
import {WorkspaceNavigationStatus} from './workspace-navigation-status';

/** Show navigation progress when moving between workspace views. */
export default function TestingLink({href,children,...props}:ComponentProps<typeof Link>){
 const isWorkspace=typeof href==='string'&&/^\/bluevua\/testing(?:\/inventory)?(?:\?|#|$)/.test(href);
 const content=<>{children}{isWorkspace&&<WorkspaceNavigationStatus/>}</>;
 return <Link href={href} {...props}>{content}</Link>;
}
