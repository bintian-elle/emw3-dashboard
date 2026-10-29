export type SnapshotVersionScope={channel:string;scope:string;latest:boolean};
export type SnapshotVersion={updatedAt:string|null;scope:string|null};
type VersionRow={updated_at:Date|string|null;scope_key:string|null};
type VersionQuery=(sql:string,values:unknown[])=>Promise<{rows:VersionRow[]}>;

/** Read only metadata, preserving the caller's scope order, in one query. */
export async function querySnapshotVersions(query:VersionQuery,scopes:readonly SnapshotVersionScope[]):Promise<SnapshotVersion[]>{
 if(!scopes.length)return [];
 const result=await query(`
  select found.updated_at,found.scope_key
  from unnest($1::text[],$2::text[],$3::boolean[]) with ordinality as requested(channel,scope_key,latest,position)
  left join lateral (
   select updated_at,scope_key from testing_data_snapshots
   where channel=requested.channel and (requested.latest or scope_key=requested.scope_key)
   order by updated_at desc limit 1
  ) found on true order by requested.position
 `,[scopes.map(item=>item.channel),scopes.map(item=>item.scope),scopes.map(item=>item.latest)]);
 if(result.rows.length!==scopes.length)throw Error('Incomplete testing snapshot versions.');
 return result.rows.map(row=>({updatedAt:row.updated_at===null?null:new Date(row.updated_at).toISOString(),scope:row.scope_key}));
}
