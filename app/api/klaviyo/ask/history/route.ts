import { currentSiteUser } from "@/lib/current-site-user";
import { conversationHistory } from "@/lib/codex-bridge";

export async function GET(){
 const user=await currentSiteUser();
 if(!user)return Response.json({error:"Unauthorized"},{status:401});
 try{return Response.json(await conversationHistory(user),{headers:{"Cache-Control":"no-store"}})}
 catch{return Response.json({error:"Conversation history is unavailable."},{status:502,headers:{"Cache-Control":"no-store"}})}
}
