import {usageRPC,publicConfigured} from '../server/usage.js';
import {normalizeEvents,readBody,sameOrigin,analyticsContext,json} from '../server/analytics.js';
export function makeAnalyticsHandler({env=process.env,rpc=usageRPC,context=analyticsContext}={}){return async(req,res)=>{
 if(req.method!=='POST'||!sameOrigin(req))return json(res,403,{error:'Forbidden'});
 if(!publicConfigured(env))return json(res,503,{error:'Unavailable'});
 let body,events;try{body=await readBody(req);events=normalizeEvents(body.events||[]);}catch{return json(res,400,{error:'Invalid events'});}
 try{const who=await context(req,res,body,env,{rpc});const data=await rpc('askit_analytics_record',{p_visitor:who.visitor,p_exclusion:who.exclusion,p_events:events,p_server:false},env);return json(res,data.limited?429:200,data);}catch{return json(res,503,{error:'Retry later'});}
};}
export default makeAnalyticsHandler();
