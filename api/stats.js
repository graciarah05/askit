import {usageRPC,publicConfigured} from '../server/usage.js';
import {authenticatedUser,analyticsContext,json} from '../server/analytics.js';
export function dateRange(url){
 const from=url.searchParams.get('from'),to=url.searchParams.get('to');
 if(![from,to].every(x=>/^\d{4}-\d{2}-\d{2}$/.test(x||'')&&new Date(x).toISOString().slice(0,10)===x)||Date.parse(to)<Date.parse(from)||Date.parse(to)-Date.parse(from)>61*86400000)throw Error('Invalid dates');
 return {from,to};
}
export function makeStatsHandler({env=process.env,rpc=usageRPC,user=authenticatedUser,context=analyticsContext}={}){return async(req,res)=>{
 if(req.method!=='GET'||req.headers['sec-fetch-site']==='cross-site')return json(res,403,{error:'접근할 수 없습니다.'});
 if(!publicConfigured(env))return json(res,503,{error:'통계 연결을 확인해 주세요.'});
 try{
  const id=await user(req,env);if(!id)return json(res,401,{error:'운영자 계정으로 로그인해 주세요.'});
  const access=await rpc('askit_analytics_access',{p_user:id},env);if(!access.operator)return json(res,403,{error:'통계를 볼 수 있는 운영자 계정이 아닙니다.'});
  const url=new URL(req.url,'https://'+req.headers.host);let range;try{range=dateRange(url);}catch{return json(res,400,{error:'조회 기간은 62일 이내로 선택해 주세요.'});}
  const who=await context(req,res,{audit:true},env,{rpc,user:async()=>id});
  await rpc('askit_analytics_record',{p_visitor:who.visitor,p_exclusion:'operator',p_events:[],p_server:false},env);
  const data=await rpc('askit_analytics_summary',{p_user:id,p_from:range.from,p_to:range.to,p_audit:url.searchParams.get('audit')==='1'},env);
  return json(res,200,data);
 }catch{return json(res,503,{error:'통계를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'});}
};}
export default makeStatsHandler();
