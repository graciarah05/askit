import test from 'node:test';import assert from 'node:assert/strict';
import {requestIdentity,countInputTokens,publicConfigured,usageRPC} from '../../server/usage.js';
import {makeHandler} from '../../api/prompt.js';
import {freshPromptDraft} from '../../public/tasks.js';
import {normalizeInput} from '../../server/prompt-contract.js';
import {checkService} from '../../scripts/maintenance.mjs';
const env={VERCEL:'1',VERCEL_ENV:'production',ASKIT_AI_ENABLED:'true',ASKIT_PUBLIC_AI_ENABLED:'true',GEMINI_API_KEY:'test',SUPABASE_URL:'https://test.supabase.co',SUPABASE_SECRET_KEY:'sb_secret_test-only'};
const body=()=>({requestId:'test-public-request-01',draft:{...freshPromptDraft('custom'),goal:'팀플 일정 정리'},files:[]});
const req=()=>({method:'POST',headers:{origin:'https://askit.example',host:'askit.example','content-type':'application/json','x-vercel-forwarded-for':'203.0.113.10'},body:body()});
const res=()=>({headers:{},setHeader(k,v){this.headers[k]=v},end(s){this.body=JSON.parse(s)}});
test('signed client cookie remains stable; forged cookie cannot choose its identifier',()=>{
 const r=res(),a=requestIdentity(req(),r,env,new Date('2026-11-10T00:00Z'));const cookie=r.headers['Set-Cookie'].split(';')[0];
 const second=req();second.headers.cookie=cookie;const b=requestIdentity(second,res(),env,new Date('2026-11-10T00:00Z'));assert.deepEqual(a,b);
 second.headers.cookie=cookie.slice(0,-1)+(cookie.endsWith('0')?'1':'0');const c=requestIdentity(second,res(),env,new Date('2026-11-10T00:00Z'));assert.notEqual(a.client,c.client);
 second.headers.cookie=cookie;const d=requestIdentity(second,res(),env,new Date('2026-11-11T00:00Z'));assert.equal(a.client,d.client);assert.notEqual(a.ip,d.ip);
 assert(!JSON.stringify(a).includes('203.0.113.10'));assert.match(r.headers['Set-Cookie'],/Secure; HttpOnly; SameSite=Strict/);
});
test('production requires private Supabase configuration; missing trusted IP fails closed',()=>{
 assert(publicConfigured(env));assert(!publicConfigured({...env,SUPABASE_SECRET_KEY:'sb_publishable_no'}));const r=req();delete r.headers['x-vercel-forwarded-for'];assert.throws(()=>requestIdentity(r,res(),env));
});
test('token preflight includes system and output format; excessive or unsupported input stops',async()=>{
 let sent;const input=normalizeInput(body());
 assert.equal(await countInputTokens(input,{apiKey:'test',fetchImpl:async(url,init)=>{sent=JSON.parse(init.body);return {ok:true,json:async()=>({totalTokens:7000})}}}),7000);
 assert(sent.contents[0].parts.length>=3);
 for(const response of [{ok:true,json:async()=>({totalTokens:32001})},{ok:false,json:async()=>({})},{ok:true,json:async()=>({totalTokens:0})}])await assert.rejects(()=>countInputTokens(input,{apiKey:'test',fetchImpl:async()=>response}));
});
test('usage service outage is sanitized and not bypassed',async()=>{await assert.rejects(()=>usageRPC('askit_health',{},env,async()=>{throw Error('raw secret')}),e=>e.code==='usage_unavailable'&&!e.message.includes('secret'));});
test('public generation reserves first and settles actual estimate',async()=>{
 const order=[];const h=makeHandler({env,reserve:async()=>order.push('reserve'),countTokens:async()=>order.push('count'),generate:async()=>{order.push('generate');return {status:'ready',text:'ok',metrics:{cost:{usd:.03}}}},rpc:async(n,b)=>order.push([n,b.p_usd]),log:()=>{}});const out=res();const end=out.end;out.end=function(s){order.push('respond');end.call(this,s)};await h(req(),out);assert.equal(out.statusCode,200);assert.deepEqual(order,['reserve','count','generate',['askit_settle',.03],'respond']);
});
test('preflight failure returns reserved amount but keeps request attempt counted',async()=>{
 let charged,called=false;const h=makeHandler({env,reserve:async()=>{},countTokens:async()=>{throw Error('count failed')},generate:async()=>{called=true},rpc:async(n,b)=>{charged=b.p_usd},log:()=>{}});await h(req(),res());assert.equal(called,false);assert.equal(charged,0);
});
test('provider timeout or unknown bill retains reservation',async()=>{
 let charged;const h=makeHandler({env,reserve:async()=>{},countTokens:async()=>1,generate:async()=>{throw Error('network')},rpc:async(n,b)=>{charged=b.p_usd},log:()=>{}});await h(req(),res());assert.equal(charged,null);
});
test('monitor validates readiness, rejects redirects and never needs a model key',async()=>{
 const calls=[];const result=await checkService({ASKIT_SITE_URL:'https://askit.example',ASKIT_EXPECT_GENERATION:'true',ASKIT_MAINTENANCE_TOKEN:'test'},async(url,init)=>{calls.push({url:String(url),init});return {ok:true,json:async()=>({ok:true,generation:true,version:'1.4.0',community:false})}});assert(result.ok);assert.equal(calls.length,2);assert(calls.every(x=>x.init.redirect==='error'));assert(!JSON.stringify(calls).includes('GEMINI_API_KEY'));
 await assert.rejects(()=>checkService({ASKIT_SITE_URL:'http://localhost'},async()=>{}));
});

test('malformed JSON thrown by the host parser returns 400 before reserving',async()=>{
 let reserved=false;const h=makeHandler({env,reserve:async()=>{reserved=true},log:()=>{}});const r=req();Object.defineProperty(r,'body',{get(){throw SyntaxError('Unexpected end of JSON')}});const out=res();await h(r,out);assert.equal(out.statusCode,400);assert.equal(out.body.error.code,'invalid_json');assert.equal(reserved,false);
});
