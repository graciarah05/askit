import {PromptError, PROMPT_VERSION, outputSchema, systemInstruction, modelInput, validateResult, assemblePrompt} from './prompt-contract.js';
export const MODEL='gemini-4-argon';
export const ENDPOINT='https://generativelanguage.googleapis.com/v1beta/interactions';

export function usageCost(usage, date=new Date()) {
  if(!usage) return {usd:null,reason:'usage_missing'};
  const names=['total_input_tokens','total_output_tokens','total_thought_tokens','total_cached_tokens'];
  if(names.some(k=>!Number.isSafeInteger(usage[k])||usage[k]<0)||usage.total_cached_tokens>usage.total_input_tokens) return {usd:null,reason:'usage_incomplete'};
  if((usage.total_tool_use_tokens||0)>0) return {usd:null,reason:'unexpected_tool_usage'};
  const promo=date<new Date('2026-12-01T00:00:00Z');
  const rates=promo?{input:2,output:10,cached:0.1}:{input:4,output:20,cached:0.2};
  const usd=((usage.total_input_tokens-usage.total_cached_tokens)*rates.input+usage.total_cached_tokens*rates.cached+(usage.total_output_tokens+usage.total_thought_tokens)*rates.output)/1e6;
  return {usd:Number(usd.toFixed(8)),currency:'USD',rates,pricingAsOf:'2026-11-10',basis:'Standard token estimate; excludes Vercel, taxes and final billing adjustments'};
}
export function readOutput(data) {
  return (data.steps||[]).filter(x=>x.type==='model_output').flatMap(x=>x.content||[]).filter(x=>x.type==='text').map(x=>x.text).join('');
}
export async function generatePrompt(input,{apiKey,thinking='low',maxOutputTokens=8192,timeoutMs=70000,signal,fetchImpl=fetch,now=()=>Date.now()}={}) {
  if(!apiKey) throw new PromptError('not_configured','AI 연결을 준비하고 있어요. 기본 프롬프트는 바로 만들 수 있습니다.',503);
  if(!['low','medium','high'].includes(thinking)) throw new PromptError('configuration','AI 설정을 확인해 주세요.',503);
  const started=now();
  // Avoid expanding a large nested array in the provider's decoding schema.
  // The server still enforces the exact planned count, durations and reference IDs.
  const schema=structuredClone(outputSchema);
  delete schema.properties.clips.maxItems;
  let response,data;
  try {
    response=await fetchImpl(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':apiKey},body:JSON.stringify({model:MODEL,store:false,stream:false,system_instruction:systemInstruction,input:modelInput(input),generation_config:{thinking_level:thinking,max_output_tokens:maxOutputTokens},response_format:{type:'text',mime_type:'application/json',schema}}),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(timeoutMs)]):AbortSignal.timeout(timeoutMs)});
    data=await response.json();
  } catch(error) {
    const timed=error.name==='TimeoutError'||error.name==='AbortError';
    throw new PromptError(timed?'timeout':'connection',timed?'시간이 오래 걸려 생성을 멈췄어요. 입력은 그대로 남아 있습니다.':'AI에 연결하지 못했어요. 입력은 그대로 남아 있습니다.',timed?504:502);
  }
  const metrics={model:MODEL,version:PROMPT_VERSION,thinking,durationMs:Math.max(0,now()-started),usage:data.usage||null,cost:usageCost(data.usage),providerStatus:data.status||null,providerHttpStatus:response.status||200};
  const fail=(code,message,status)=>{const error=new PromptError(code,message,status);error.metrics=metrics;throw error;};
  if(!response.ok) {
    // Keep diagnostics categorical: no provider message, user content or credentials in logs.
    const message=String(data.error?.message||'');
    metrics.providerErrorCategory=/schema|response_format|responseSchema/i.test(message)?'response_schema':/API key|API_KEY_INVALID/i.test(message)?'api_key':/billing|payment|quota/i.test(message)?'billing_or_quota':/model|not supported|unsupported/i.test(message)?'model_configuration':'other';
    metrics.providerErrorStatus=/^[A-Z_]+$/.test(data.error?.status||'')?data.error.status:null;
    if(response.status===429) fail('rate_limited','지금 요청이 많아요. 잠시 뒤 다시 시도하거나 기본 프롬프트로 이어가세요.',429);
    if([401,403,404].includes(response.status)) fail('provider_access','AI 연결 설정을 확인하고 있어요. 기본 프롬프트로 이어갈 수 있습니다.',503);
    fail('provider_error','AI 응답을 받지 못했어요. 입력은 그대로 남아 있습니다.',502);
  }
  if(data.status!=='completed') fail('incomplete','응답이 끝나기 전에 중단됐어요. 입력은 그대로 남아 있습니다.',502);
  try {
    const result=validateResult(JSON.parse(readOutput(data)),input);
    return {...result,text:assemblePrompt(result,input),metrics};
  } catch(error) {
    if(error instanceof PromptError) { error.metrics=metrics; throw error; }
    fail('invalid_output','완성된 프롬프트를 받지 못했어요. 입력은 그대로 남아 있습니다.',502);
  }
}
