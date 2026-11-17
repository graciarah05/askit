import {createHmac,timingSafeEqual} from 'node:crypto';
import {requestIdentity,usageRPC} from './usage.js';
export const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
const clientEvents=new Set(['visit','page_view','prompt_success','basic_ready','prompt_copy','copy_failed','google_ai_open','popup_blocked','student_benefit_click']);
const tasks=new Set(['custom','image','video','presentation','report','summary','quiz','concept']);
const tools=new Set(['chat','learning','canvas','research','notebook','image','flow']);
const routes=new Set(['home','create','result','saved','community','login','write','edit','benefits','privacy','help','guide','library']);
export function normalizeEvents(events){
 if(!Array.isArray(events)||events.length>20)throw Error('Invalid events');
 return events.map(e=>{
  if(!e||!uuid(e.id)||!uuid(e.session)||!clientEvents.has(e.name)||!Number.isFinite(Date.parse(e.at)))throw Error('Invalid event');
  if(['prompt_success','basic_ready'].includes(e.name)&&!uuid(e.generation))throw Error('Invalid generation');
  return {id:e.id,session:e.session,name:e.name,at:new Date(e.at).toISOString(),route:routes.has(e.route)?e.route:'',task:tasks.has(e.task)?e.task:'',tool:tools.has(e.tool)?e.tool:'',generation:uuid(e.generation)?e.generation:null};
 });
}
export function json(res,status,body){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');res.end(JSON.stringify(body));}
export function sameOrigin(req){try{return new URL(req.headers.origin).host===req.headers.host&&req.headers['sec-fetch-site']!=='cross-site';}catch{return false;}}
export async function readBody(req){
 if(!String(req.headers['content-type']||'').startsWith('application/json')||Number(req.headers['content-length'])>16000)throw Error('Invalid body');
 let body=req.body;if(body===undefined){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>16000)throw Error('Too large');chunks.push(chunk);}body=Buffer.concat(chunks).toString('utf8');}
 if(typeof body==='string'){if(Buffer.byteLength(body)>16000)throw Error('Too large');body=JSON.parse(body);}
 if(!body||Buffer.byteLength(JSON.stringify(body))>16000)throw Error('Invalid body');return body;
}
const mac=env=>createHmac('sha256',env.SUPABASE_SECRET_KEY).update('askit-audit:v1').digest('hex');
export function auditCookie(req,env){const value=String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('__Host-askit-audit='))?.split('=')[1]||'';return /^[a-f0-9]{64}$/.test(value)&&timingSafeEqual(Buffer.from(value),Buffer.from(mac(env)));}
function setAuditCookie(res,env){const previous=res.getHeader?.('Set-Cookie');res.setHeader('Set-Cookie',[...(Array.isArray(previous)?previous:previous?[previous]:[]),`__Host-askit-audit=${mac(env)}; Path=/; Max-Age=2592000; Secure; HttpOnly; SameSite=Strict`]);}
export async function authenticatedUser(req,env,fetchImpl=fetch){
 const bearer=String(req.headers.authorization||'');if(!/^Bearer [A-Za-z0-9_.-]{30,8192}$/.test(bearer))return null;
 const r=await fetchImpl(env.SUPABASE_URL+'/auth/v1/user',{headers:{apikey:env.SUPABASE_SECRET_KEY,Authorization:bearer},signal:AbortSignal.timeout(5000)});
 if(!r.ok)return null;const user=await r.json();return uuid(user.id)&&user.email_confirmed_at?user.id:null;
}
export async function analyticsContext(req,res,body,env,{rpc=usageRPC,user=authenticatedUser}={}){
 const identity=requestIdentity(req,res,env);let exclusion=null;
 if(env.VERCEL_ENV&&env.VERCEL_ENV!=='production')exclusion='preview';
 else if(/bot\b|crawler|spider|headless|slurp|facebookexternalhit|preview/i.test(String(req.headers['user-agent']||'')))exclusion='bot';
 if(auditCookie(req,env)||body.audit===true)exclusion='verification';
 if(req.headers.authorization){const id=await user(req,env);if(id){const access=await rpc('askit_analytics_access',{p_user:id},env);if(access.excluded)exclusion='operator';}}
 if(exclusion&&exclusion!=='bot')setAuditCookie(res,env);
 return {visitor:identity.client,exclusion};
}
export function measurement(raw,id,result,code,req,env){
 return {id,session:uuid(raw?.measurement?.session)?raw.measurement.session:id,name:result?.status==='ready'?'prompt_ready':result?.status==='needs_clarification'?'prompt_clarification':'prompt_failed',route:'create',task:tasks.has(raw?.draft?.taskId)?raw.draft.taskId:'',tool:tools.has(result?.workflow?.id)?result.workflow.id:'',duration:Math.min(180000,Math.max(0,Math.round(result?.metrics?.durationMs||0))),code:code?String(code).replace(/[^a-z_]/g,'').slice(0,40):null,exclusion:env.VERCEL_ENV&&env.VERCEL_ENV!=='production'?'preview':auditCookie(req,env)?'verification':null};
}
