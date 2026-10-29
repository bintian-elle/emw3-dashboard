// Each analysis period is independent. Translation runs only after all English
// publication attempts, and failures are reported without losing completed work.
export async function runDailyStages({presets,generate,concluded,translate,onError=()=>{}}){
 const errors=[];
 async function attempt(stage,task){
  try{await task();}catch(error){
   const failure={stage,error:error instanceof Error?error.message:String(error)};
   errors.push(failure);onError(failure);
  }
 }
 for(const preset of presets)await attempt(`analysis:${preset}`,()=>generate(preset));
 await attempt('concluded',concluded);
 await attempt('translation',translate);
 return {errors};
}
