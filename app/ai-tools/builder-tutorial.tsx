'use client';

import {useEffect,useRef} from 'react';
import {createTutorialPlayback} from './builder-tutorial-playback';

/** The walkthrough is a silent illustrated demo, not a recording of client data. */
export function BuilderTutorial(){
 const video=useRef<HTMLVideoElement>(null);
 useEffect(()=>{
  const element=video.current;if(!element)return;
  const media=window.matchMedia('(prefers-reduced-motion: reduce)');
  const playback=createTutorialPlayback(element,media.matches);
  const restart=()=>playback.restart(),motionChanged=()=>playback.setReducedMotion(media.matches);
  const observer=new IntersectionObserver(entries=>playback.setVisible(entries.some(entry=>entry.isIntersecting)),{threshold:.25});
  observer.observe(element);element.addEventListener('loadedmetadata',restart);window.addEventListener('pageshow',restart);media.addEventListener('change',motionChanged);
  return()=>{observer.disconnect();element.removeEventListener('loadedmetadata',restart);window.removeEventListener('pageshow',restart);media.removeEventListener('change',motionChanged);playback.dispose();};
 },[]);
 return <div className="overflow-hidden rounded-2xl border border-border-button-default bg-background-secondary-default pt-3"><video ref={video} className="block aspect-[70/41] w-full bg-background-primary-default" controls playsInline muted loop preload="metadata" poster="/ai-tools/dashboard-builder-guide-headerless-v4.png" aria-label="Dashboard Builder walkthrough with English captions and no audio">
  <source src="/ai-tools/dashboard-builder-guide-headerless-v4.mp4" type="video/mp4"/>
  <track kind="captions" src="/ai-tools/dashboard-builder-guide.en.vtt" srcLang="en" label="English"/>
  Your browser does not support video playback. Download the walkthrough to watch it.
 </video></div>;
}
