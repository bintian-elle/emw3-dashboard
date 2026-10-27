/** Mount/navigation resets are explicit; ordinary pause, seek and visibility do not rewind. */
export type TutorialVideo=Pick<HTMLVideoElement,'currentTime'|'readyState'|'muted'|'play'|'pause'>;
export function createTutorialPlayback(video:TutorialVideo,initialReducedMotion:boolean){
 let visible=false,reducedMotion=initialReducedMotion,resetBeforePlay=true,disposed=false;
 function apply(){
  if(disposed)return;
  if(reducedMotion||!visible){video.pause();return;}
  if(resetBeforePlay){if(video.readyState<1)return;try{video.currentTime=0;}catch{return;}resetBeforePlay=false;}
  void video.play().catch(()=>{});
 }
 function restart(){if(disposed)return;video.pause();video.muted=true;resetBeforePlay=true;try{video.currentTime=0;}catch{}apply();}
 restart();
 return{restart,setVisible(value:boolean){visible=value;apply();},setReducedMotion(value:boolean){reducedMotion=value;apply();},dispose(){disposed=true;video.pause();}};
}
