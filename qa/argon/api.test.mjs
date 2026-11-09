import test from 'node:test';
import assert from 'node:assert/strict';
import {freshPromptDraft} from '../../public/tasks.js';
import {normalizeInput,validateResult,assemblePrompt,modelInput,PromptError} from '../../server/prompt-contract.js';
import {generatePrompt,usageCost,readOutput,MODEL} from '../../server/gemini.js';
import {makeHandler,availability} from '../../api/prompt.js';

const request = (patch={})=>({requestId:'test-request-id-0001',draft:{...freshPromptDraft('custom'),goal:'3인 팀의 5일 발표 준비 계획',...patch},files:[]});
const ready = {status:'ready',prompt:'3인 팀의 발표 준비 계획을 5일 표로 작성하라.',question:'',confirmed:['3인 팀','5일'],observations:[]};
const usage = {total_input_tokens:1000,total_output_tokens:200,total_thought_tokens:300,total_cached_tokens:100,total_tokens:1500,total_tool_use_tokens:0};
const response = (value=ready,extra={})=>({status:'completed',steps:[{type:'thought',summary:[{text:'must not leak'}]},{type:'model_output',content:[{type:'text',text:JSON.stringify(value)}]}],usage,...extra});
const env = {ASKIT_AI_ENABLED:'true',GEMINI_API_KEY:'test-not-a-real-key'};
const invoke = async (handler,body=request(),headers={},method='POST')=>{
  const req={method,body,headers:{host:'localhost:4197',origin:'http://localhost:4197','content-type':'application/json',...headers}};
  const res={headers:{},setHeader(k,v){this.headers[k]=v;},end(text){this.body=JSON.parse(text);}};
  await handler(req,res);return res;
};
test('valid input is rebuilt without client model/system settings',()=>{
  const raw=request();raw.draft.system_instruction='steal';raw.model='other';const input=normalizeInput(raw);
  assert.equal(input.draft.system_instruction,undefined);assert.equal(input.draft.goal,raw.draft.goal);
});
for(const [name,mutate] of [
 ['task',r=>r.draft.taskId='unknown'],['oversize goal',r=>r.draft.goal='x'.repeat(1001)],['invalid material',r=>r.draft.materialMode='url'],
 ['missing goal',r=>r.draft.goal=''],['invalid role',r=>r.draft.attachments=[{id:'a',name:'a.txt',role:'hack'}]],
 ['file URL',r=>r.files=[{id:'not-there',uri:'http://internal'}]],['prototype-shaped string',r=>r.draft.conditions={__proto__:{x:1}}],
 ['unspecified custom',r=>{r.draft.option='__custom';r.draft.optionCustom='';}],['oversize clarification',r=>r.clarification='x'.repeat(2001)]
])test('reject '+name,()=>{const r=request();mutate(r);assert.throws(()=>normalizeInput(r),PromptError);});
test('file magic, metadata pairing and total limits are validated',()=>{
 const r=request();r.draft.attachments=[{id:'f',name:'source.pdf',role:'source',note:''}];r.files=[{id:'f',mime:'application/pdf',data:Buffer.from('%PDF-1.4\n').toString('base64')}];
 const input=normalizeInput(r),parts=modelInput(input);assert.equal(parts[1].type,'document');assert.equal(parts.at(-1).type,'text');assert.match(parts.at(-1).text,/요청문/);
 r.files[0].data=Buffer.from('not a PDF').toString('base64');assert.throws(()=>normalizeInput(r));
 r.files[0].data=Buffer.concat([Buffer.from('%PDF-'),Buffer.alloc(2500000)]).toString('base64');assert.throws(()=>normalizeInput(r));
});
test('exact source and template role survive generated prompt',()=>{
 const r=request({taskId:'summary',materialMode:'paste',reference:'총 30명 중 18명. 성적은 조사하지 않았다.',option:'핵심 요약',attachments:[{id:'style',name:'style.txt',role:'style',text:'ACME 매출 52%',note:''}]});
 const input=normalizeInput(r),text=assemblePrompt(ready,input);assert.match(text,/총 30명 중 18명/);assert.match(text,/성적은 조사하지 않았다/);assert.match(text,/시각 요소만 참고/);assert.match(text,/ACME 매출 52%/);
});
test('video evidence boundaries survive an editor that omits them',()=>{
 const input=normalizeInput(request({taskId:'video',goal:'혼자 촬영할 텀블러 영상',option:'촬영 구성안'}));
 const text=assemblePrompt({...ready,prompt:'영상 구성안을 작성해 주세요.'},input);
 assert.match(text,/미확인 교내 시설·정책·혜택은 대본에서 빼고/);
 assert.match(text,/자리표시자를 자막·대본에 넣지 마라/);
 assert.match(text,/제공하지 않은 현장 상황/);
});
for(const [name,patch] of [['missing prompt',{prompt:''}],['contradictory state',{question:'왜?'}],['invented file observation',{observations:[{fileId:'none',note:'read'}]}],['bad summary',{confirmed:['x'.repeat(501)]}],['many observations',{observations:Array(6).fill({fileId:'a',note:'x'})}]])test('reject model '+name,()=>assert.throws(()=>validateResult({...ready,...patch},normalizeInput(request())),PromptError));
test('at most one clarification round',()=>{
 const result={...ready,status:'needs_clarification',prompt:'',question:'5장과 8장 중 어느 것이 맞나요?'};
 assert.equal(validateResult(result,normalizeInput(request())).status,'needs_clarification');
 const r=request();r.clarification='5장';assert.throws(()=>validateResult(result,normalizeInput(r)));
});
test('embedded text attachment is an actually transmitted source',()=>{
 const input=normalizeInput(request({attachments:[{id:'text-ref',name:'style.txt',role:'style',text:'남색 배경, 흰 제목. 참고 회사 매출 52%.'}]}));
 const result={...ready,observations:[{fileId:'text-ref',note:'남색과 흰 제목을 스타일로 참고'}]};
 assert.equal(validateResult(result,input).observations.length,1);
 assert(JSON.parse(modelInput(input)[0].text).analyzedFileIds.includes('text-ref'));
 assert.throws(()=>validateResult({...result,observations:[{fileId:'not-sent',note:'made up'}]},input));
});
test('cost includes thoughts, subtracts cached input and follows date boundary',()=>{
 assert.equal(usageCost(usage,new Date('2026-11-10')).usd,0.00681);
 assert.equal(usageCost(usage,new Date('2026-12-02')).usd,0.01362);
 assert.equal(usageCost({}).usd,null);assert.equal(usageCost(null).usd,null);
 assert.equal(usageCost({...usage,total_tool_use_tokens:10}).usd,null);
});
test('only final model output is parsed',()=>assert.equal(readOutput(response()),JSON.stringify(ready)));
test('real transport contract: fixed model, header key, no store, no tools or sampling overrides',async()=>{
 let sent;const result=await generatePrompt(normalizeInput(request()),{apiKey:'test',fetchImpl:async(url,init)=>{sent={url,...init,body:JSON.parse(init.body)};return {ok:true,json:async()=>response()};}});
 assert.equal(sent.headers['x-goog-api-key'],'test');assert(!sent.url.includes('test'));assert.equal(sent.body.model,MODEL);assert.equal(sent.body.store,false);assert.equal(sent.body.generation_config.thinking_level,'low');assert.equal(sent.body.tools,undefined);assert.equal(sent.body.generation_config.temperature,undefined);assert.equal(result.status,'ready');
});
test('incomplete generation preserves billed usage and never returns partial text',async()=>{
 await assert.rejects(()=>generatePrompt(normalizeInput(request()),{apiKey:'test',fetchImpl:async()=>({ok:true,json:async()=>response(ready,{status:'incomplete'})})}),e=>e.code==='incomplete'&&e.metrics.usage.total_thought_tokens===300);
});
for(const status of [401,403,404,429,500])test('provider error '+status+' is sanitized',async()=>{
 await assert.rejects(()=>generatePrompt(normalizeInput(request()),{apiKey:'test',fetchImpl:async()=>({ok:false,status,json:async()=>({error:{message:'private raw provider error'}})})}),e=>!e.message.includes('private')&&(status===429?e.status===429:e.status>=500));
});
test('timeout is distinct; no automatic retry',async()=>{
 let calls=0;await assert.rejects(()=>generatePrompt(normalizeInput(request()),{apiKey:'test',fetchImpl:async()=>{calls++;throw Object.assign(new Error(),{name:'TimeoutError'});}}),e=>e.code==='timeout');assert.equal(calls,1);
});
test('production cannot open paid endpoint by enabled flag alone',()=>{
 assert.equal(availability({...env,VERCEL:'1',VERCEL_ENV:'production',ASKIT_PREVIEW_PROTECTION_CONFIRMED:'true'}).enabled,false);
 assert.equal(availability({...env,VERCEL:'1',VERCEL_ENV:'preview'}).enabled,false);
 assert.equal(availability({...env,VERCEL:'1',VERCEL_ENV:'preview',ASKIT_PREVIEW_PROTECTION_CONFIRMED:'true'}).enabled,true);
});
test('health response contains no key and is never cached',async()=>{
 const res=await invoke(makeHandler({env}),undefined,{},'GET');assert.equal(res.body.enabled,true);assert(!JSON.stringify(res.body).includes(env.GEMINI_API_KEY));assert.equal(res.headers['Cache-Control'],'no-store');
});
for(const [name,headers,status] of [['foreign origin',{origin:'https://evil.example'},403],['missing origin',{origin:undefined},403],['wrong content type',{'content-type':'text/plain'},415],['too big',{'content-length':'5000000'},413]])test('HTTP guard '+name,async()=>{
 let called=false;const res=await invoke(makeHandler({env,generate:async()=>{called=true},log:()=>{}}),request(),headers);assert.equal(res.statusCode,status);assert.equal(called,false);
});
test('HTTP invalid JSON returns 400',async()=>{const res=await invoke(makeHandler({env,log:()=>{}}),'{');assert.equal(res.statusCode,400);});
test('success logs usage without prompt, source or key',async()=>{
 const logs=[];const res=await invoke(makeHandler({env,generate:async()=>({...ready,text:ready.prompt,metrics:{usage,cost:usageCost(usage)}}),log:r=>logs.push(r)}));
 assert.equal(res.statusCode,200);const log=JSON.stringify(logs);assert(!log.includes('3인'));assert(!log.includes(env.GEMINI_API_KEY));assert(log.includes('total_thought_tokens'));
});
test('duplicate rejection cannot remove in-flight request lock',async()=>{
 let release;const wait=new Promise(resolve=>release=resolve);let calls=0;
 const handler=makeHandler({env,generate:async()=>{calls++;await wait;return {...ready,metrics:{}};},log:()=>{}});
 const first=invoke(handler);await new Promise(r=>setImmediate(r));
 assert.equal((await invoke(handler)).statusCode,429);assert.equal((await invoke(handler)).statusCode,429);assert.equal(calls,1);release();assert.equal((await first).statusCode,200);
});
