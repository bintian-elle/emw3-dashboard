/** The retired Markdown generator must not accept new manual jobs. */
export async function POST(){return Response.json({error:'This generator has been retired. Use the report generation button.'},{status:410,headers:{'Cache-Control':'no-store'}});}
