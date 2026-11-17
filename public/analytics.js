import {accessToken} from './community.js';
const queueKey='askit-metrics-queue',sessionKey='askit-metrics-visit';
let queue=[],running=false,ready=null,retryTimer,attempts=0,lastPage='',enabled=false,audit=false,visitMemory;
const load=(key,storage)=>{try{return JSON.parse(storage.getItem(key)||'null');}catch{return null;}};
const save=()=>{try{sessionStorage.setItem(queueKey,JSON.stringify(queue));}catch{}};
export function visitSession(now=Date.now()){
 let s;try{s=load(sessionKey,localStorage);}catch{}s=s||visitMemory;
 if(!s||typeof s.id!=='string'||now-s.touched>1800000||now<s.touched)s={id:crypto.randomUUID(),touched:now};
 s.touched=now;visitMemory=s;try{localStorage.setItem(sessionKey,JSON.stringify(s));}catch{}return s.id;
}
function badge(){if(!audit||!document.body)return;let b=document.getElementById('audit-badge');if(!b){b=document.createElement('aside');b.id='audit-badge';b.className='audit-badge';b.textContent='운영 검수 · 실제 이용 통계에서 제외';document.body.append(b);}}
async function post(events){const token=await accessToken().catch(()=>''),r=await fetch('/api/analytics',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify({events,audit}),keepalive:true,signal:AbortSignal.timeout(5000)});if(!r.ok)throw Error('metrics');const data=await r.json();audit=!!data.excluded;badge();return data;}
export async function flushMetrics(){
 if(!enabled||running||!queue.length)return;running=true;clearTimeout(retryTimer);
 try{await ready;const batch=queue.slice(0,20),data=await post(batch),accepted=new Set(data.accepted||[]);queue=queue.filter(x=>!accepted.has(x.id));save();attempts=accepted.size?0:attempts+1;}
 catch{attempts++;}finally{running=false;if(queue.length&&attempts<8)retryTimer=setTimeout(flushMetrics,Math.min(60000,1000*2**attempts));}
}
export function track(name,meta={}){
 if(!enabled)return;
 const at=new Date().toISOString(),session=visitSession();
 // The visit key is stable across refreshes and tabs; the server deduplicates it.
 if(name!=='visit'&&!queue.some(e=>e.name==='visit'&&e.session===session))queue.push({id:crypto.randomUUID(),name:'visit',session,at,route:meta.route||''});
 queue.push({id:crypto.randomUUID(),name,session,at,route:meta.route||'',task:meta.task||'',tool:meta.tool||'',generation:meta.generation||null});
 queue=queue.filter(e=>Date.now()-Date.parse(e.at)<86400000).slice(-200);save();attempts=0;void flushMetrics();
}
export function trackPage(path){if(!enabled||document.visibilityState==='hidden')return;if(path===lastPage)return;lastPage=path;const [route,task]=path.split('/');track('page_view',{route,task});}
export function trackResult(result){if(result.analyticsVersion!==1||(result.generation==='argon'&&!result.generationId))return;track(result.generation==='argon'?'prompt_success':'basic_ready',{route:'result',task:result.taskId,tool:result.workflow?.id||'',generation:result.generation==='argon'?result.generationId:result.id});}
export async function measurementContext(){if(ready)await Promise.race([ready,new Promise(r=>setTimeout(r,800))]);return {session:visitSession()};}
export function startAnalytics(path){
 if(enabled||location.protocol!=='https:')return;enabled=true;
 let saved=[];try{saved=load(queueKey,sessionStorage)||[];}catch{}
 queue=saved.filter(e=>e&&Date.now()-Date.parse(e.at)<86400000).slice(-200);
 audit=new URLSearchParams(location.search).get('audit')==='1';
 ready=(navigator.locks?navigator.locks.request('askit-metrics-init',()=>post([])):post([])).catch(()=>{});trackPage(path);
 window.addEventListener('online',()=>{attempts=0;void flushMetrics();});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){lastPage='';trackPage(location.hash.slice(2)||'home');}else void flushMetrics();});
 window.addEventListener('pagehide',()=>void flushMetrics());
}
export function refreshAnalyticsIdentity(){if(enabled){ready=post([]).catch(()=>{});return ready;}}
export function trackExternal(link,event){
 if(event.defaultPrevented||!link||!['click','auxclick'].includes(event.type)||(event.type==='auxclick'&&event.button!==1))return;
 const type=link.dataset.metric;if(!type)return;
 track(type,{route:location.hash.slice(2).split('/')[0]||'home',tool:link.dataset.tool||''});
}
