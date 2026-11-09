import {randomUUID} from 'node:crypto';
import {normalizeInput,PromptError,MAX_BODY_BYTES} from '../server/prompt-contract.js';
import {generatePrompt,MODEL} from '../server/gemini.js';
import {publicConfigured,reserveUsage,usageRPC,countInputTokens} from '../server/usage.js';

export function availability(env=process.env) {
  const allowed=publicConfigured(env)||env.VERCEL!=='1'||(env.VERCEL_ENV==='preview'&&env.ASKIT_PREVIEW_PROTECTION_CONFIRMED==='true'&&env.ASKIT_PUBLIC_AI_ENABLED!=='true');
  return {enabled:env.ASKIT_AI_ENABLED==='true'&&!!env.GEMINI_API_KEY&&allowed,model:MODEL,attachmentsMaxBytes:2500000};
}
const active=new Set();
export function makeHandler({env=process.env,generate=generatePrompt,reserve=reserveUsage,rpc=usageRPC,countTokens=countInputTokens,log=record=>console.info(JSON.stringify(record))}={}) {
  return async function handler(req,res) {
    const id=randomUUID(),start=Date.now();
    const send=(status,body)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.end(JSON.stringify(body));};
    if(req.method==='GET') return send(200,availability(env));
    if(req.method!=='POST') {res.setHeader('Allow','GET, POST');return send(405,{error:{code:'method',message:'지원하지 않는 요청입니다.'}});}
    let requestId,registered=false,reserved=false,providerStarted=false,charge=null;const controller=new AbortController();const onClose=()=>{if(!res.writableEnded)controller.abort();};res.on?.('close',onClose);
    const settle=async()=>{if(reserved){reserved=false;try{await rpc('askit_settle',{p_id:requestId,p_usd:charge},env);}catch{log({event:'usage_settle_failed',requestId:id});}}};
    try {
      if(!availability(env).enabled) throw new PromptError('not_configured','연결을 준비하고 있어요. 기본 프롬프트는 바로 만들 수 있습니다.',503);
      const origin=req.headers.origin;
      const host=req.headers.host;
      if(!origin||new URL(origin).host!==host||req.headers['sec-fetch-site']==='cross-site') throw new PromptError('origin','이 페이지에서 다시 시도해 주세요.',403);
      if(!String(req.headers['content-type']||'').startsWith('application/json')) throw new PromptError('content_type','요청 형식을 확인해 주세요.',415);
      if(Number(req.headers['content-length'])>MAX_BODY_BYTES) throw new PromptError('too_large','분석할 파일의 크기를 줄여 주세요.',413);
      let raw=req.body;
      if(raw===undefined){let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>MAX_BODY_BYTES)throw new PromptError('too_large','분석할 파일의 크기를 줄여 주세요.',413);chunks.push(chunk);}raw=Buffer.concat(chunks).toString('utf8');}
      if(typeof raw==='string'){if(Buffer.byteLength(raw)>MAX_BODY_BYTES)throw new PromptError('too_large','분석할 파일의 크기를 줄여 주세요.',413);try{raw=JSON.parse(raw)}catch{throw new PromptError('invalid_json','요청 형식을 확인해 주세요.');}}
      if(Buffer.byteLength(JSON.stringify(raw))>MAX_BODY_BYTES)throw new PromptError('too_large','분석할 파일의 크기를 줄여 주세요.',413);
      if(typeof raw?.requestId!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(raw.requestId))throw new PromptError('request_id','페이지를 새로 열고 다시 시도해 주세요.');
      requestId=raw.requestId;
      if(active.has(requestId)||active.size>=2)throw new PromptError('busy','생성 중인 요청이 있어요. 잠시 뒤 다시 시도해 주세요.',429);
      const input=normalizeInput(raw);
      active.add(requestId);registered=true;
      if(publicConfigured(env)){
        await reserve(req,res,requestId,env);reserved=true;
        await countTokens(input,{apiKey:env.GEMINI_API_KEY,signal:controller.signal});
      }
      providerStarted=true;
      const result=await generate(input,{apiKey:env.GEMINI_API_KEY,thinking:env.GEMINI_THINKING_LEVEL||'low',signal:controller.signal});
      charge=result.metrics?.cost?.usd??null;
      log({event:'prompt_generation',requestId:id,status:result.status,...result.metrics});
      await settle();
      return send(200,{...result,requestId:id});
    }catch(error){
      charge=providerStarted?(error.metrics?.cost?.usd??null):0;
      const known=error instanceof PromptError;
      log({event:'prompt_generation',requestId:id,status:'error',code:known?error.code:'internal',durationMs:Date.now()-start,...(error.metrics||{})});
      await settle();
      return send(known?error.status:500,{error:{code:known?error.code:'internal',message:known?error.message:'요청을 처리하지 못했어요. 입력은 그대로 남아 있습니다.'},requestId:id});
    }finally{
      res.off?.('close',onClose);
      await settle();
      if(registered)active.delete(requestId);
    }
  };
}
export default makeHandler();
