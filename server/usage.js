import {createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
import {isIP} from 'node:net';
import {PromptError,modelInput,systemInstruction,outputSchema} from './prompt-contract.js';
import {MODEL} from './gemini.js';

export const publicConfigured=env=>env.ASKIT_PUBLIC_AI_ENABLED==='true'&&/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(env.SUPABASE_URL||'')&&/^sb_secret_/.test(env.SUPABASE_SECRET_KEY||'');
export async function usageRPC(name,body={},env=process.env,fetchImpl=fetch){
 try{
  const r=await fetchImpl(env.SUPABASE_URL+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:env.SUPABASE_SECRET_KEY,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(6000)});
  if(!r.ok)throw Error();return r.status===204?null:await r.json();
 }catch{throw new PromptError('usage_unavailable','잠시 연결이 불안정해요. 입력은 그대로 남아 있습니다.',503);}
}
export function requestIdentity(req,res,env,now=new Date()){
 const secret=env.SUPABASE_SECRET_KEY;
 const hash=s=>createHmac('sha256',secret).update('askit-usage:'+s).digest('hex');
 const cookie=String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('__Host-askit-client='))?.slice(20)||'';
 const [raw,mac]=cookie.split('.');let id;
 if(/^[a-f0-9-]{36}$/.test(raw||'')&&/^[a-f0-9]{64}$/.test(mac||'')){
  const expected=hash('cookie:'+raw);if(timingSafeEqual(Buffer.from(mac),Buffer.from(expected)))id=raw;
 }
 if(!id){id=randomUUID();res.setHeader('Set-Cookie',`__Host-askit-client=${id}.${hash('cookie:'+id)}; Path=/; Max-Age=2592000; Secure; HttpOnly; SameSite=Strict`);}
 // Only trust Vercel's overwritten proxy header in hosted production.
 const ip=String(env.VERCEL==='1'?req.headers['x-vercel-forwarded-for']||req.headers['x-forwarded-for']||'':req.socket?.remoteAddress||'').trim();
 if(!isIP(ip))throw new PromptError('client_address','연결을 확인한 뒤 다시 시도해 주세요.',503);
 const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul'}).format(now);
 return {client:hash('client:'+id),ip:hash('ip:'+day+':'+ip)};
}
export async function reserveUsage(req,res,id,env,fetchImpl=fetch){
 const who=requestIdentity(req,res,env);
 const result=await usageRPC('askit_reserve',{p_id:id,p_client:who.client,p_ip:who.ip},env,fetchImpl);
 if(!result?.allowed){
  const message={personal:'오늘 이용 가능한 횟수를 다 썼어요. 기본 프롬프트로 이어갈 수 있습니다.',busy:'지금 요청이 많아요. 잠시 후 다시 시도해 주세요.',duplicate:'이미 처리 중인 요청이에요. 잠시 기다려 주세요.',budget:'현재 이용량 한도에 도달했어요. 기본 프롬프트로 이어갈 수 있습니다.',paused:'프롬프트 연결을 점검 중이에요. 기본 프롬프트로 이어갈 수 있습니다.'}[result?.reason]||'잠시 후 다시 시도해 주세요.';
  throw new PromptError('usage_limit',message,result?.reason==='paused'?503:429);
 }
}
export async function countInputTokens(input,{apiKey,fetchImpl=fetch,signal}={}){
 const parts=[{text:systemInstruction},{text:JSON.stringify(outputSchema)},...modelInput(input).map(p=>p.type==='text'?{text:p.text}:{inlineData:{mimeType:p.mime_type,data:p.data}})];
 let r,data;try{r=await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:countTokens`,{method:'POST',headers:{'x-goog-api-key':apiKey,'Content-Type':'application/json'},body:JSON.stringify({contents:[{role:'user',parts}]}),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(10000)]):AbortSignal.timeout(10000)});data=await r.json();}catch{throw new PromptError('token_check','자료의 크기를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.',503);}
 if(!r.ok||!Number.isSafeInteger(data.totalTokens)||data.totalTokens<1)throw new PromptError('token_check','자료의 크기를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.',503);
 if(data.totalTokens>32000)throw new PromptError('token_limit','자료가 길어요. 필요한 부분만 남기거나 파일을 나눠 주세요.',413);
 return data.totalTokens;
}
