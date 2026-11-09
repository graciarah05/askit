// Render runs this independently from the website, without database or Gemini keys.
export async function checkService(env=process.env,fetchImpl=fetch){
 const origin=new URL(env.ASKIT_SITE_URL||'');
 if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/')throw Error('Set the exact HTTPS site origin.');
 const health=await fetchImpl(new URL('/api/health',origin),{signal:AbortSignal.timeout(15000),redirect:'error'});
 if(!health.ok)throw Error('Site health check failed: '+health.status);
 const state=await health.json();
 if(state.ok!==true||(env.ASKIT_EXPECT_GENERATION==='true'&&state.generation!==true))throw Error('Required service is unavailable.');
 if(env.ASKIT_MAINTENANCE_TOKEN){
  const cleanup=await fetchImpl(new URL('/api/maintenance',origin),{method:'POST',headers:{Authorization:'Bearer '+env.ASKIT_MAINTENANCE_TOKEN},signal:AbortSignal.timeout(15000),redirect:'error'});
  if(!cleanup.ok||(await cleanup.json()).ok!==true)throw Error('Retention cleanup failed.');
 }
 return {ok:true,version:state.version,generation:state.generation,community:state.community};
}
if(import.meta.url===new URL(process.argv[1],'file://').href){
 try{console.log(JSON.stringify({event:'askit_health',...await checkService()}));}
 catch(error){console.error(JSON.stringify({event:'askit_health',ok:false,message:error.message}));process.exitCode=1;}
}
