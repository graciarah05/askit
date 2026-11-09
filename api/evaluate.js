// Temporary, protected Preview-only benchmark. Fixed synthetic cases; no user data or arbitrary prompts.
import fs from 'node:fs/promises';
import {availability} from './prompt.js';
import {generatePrompt,usageCost,readOutput,MODEL,ENDPOINT} from '../server/gemini.js';
import {normalizeInput} from '../server/prompt-contract.js';
import {compileRequest} from '../public/tasks.js';
const cases=JSON.parse(await fs.readFile(new URL('../server/evaluation-cases.json',import.meta.url),'utf8'));
export default async function handler(req,res){
 const send=(status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(data));};
 if(!availability().enabled||process.env.ASKIT_EVAL_ENABLED!=='true'||process.env.VERCEL_ENV!=='preview')return send(404,{error:'Not found'});
 if(req.method==='GET')return send(200,{cases:cases.map(c=>({id:c.id,criteria:c.criteria})),model:MODEL});
 if(req.method!=='POST')return send(405,{error:'Method not allowed'});
 try{
  if(!req.headers.origin||new URL(req.headers.origin).host!==req.headers.host||req.headers['sec-fetch-site']==='cross-site')return send(403,{error:'Origin'});
  if(!String(req.headers['content-type']||'').startsWith('application/json')||Number(req.headers['content-length'])>1000)return send(400,{error:'Invalid request'});
  const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
  const c=cases.find(x=>x.id===body?.caseId),variant=body?.variant,thinking=body?.thinking||'low';
  if(!c||!['plain','baseline','argon','generic-editor'].includes(variant)||!['low','medium'].includes(thinking))return send(400,{error:'Unknown case'});
  let prompt=variant==='plain'?c.plain:compileRequest(c.draft).text,generated=null;
  if(variant==='generic-editor'){
   const start=Date.now();
   const response=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':process.env.GEMINI_API_KEY},signal:AbortSignal.timeout(70000),body:JSON.stringify({model:MODEL,store:false,stream:false,input:'다음 요청으로 Gemini에서 좋은 결과를 얻을 수 있도록 프롬프트를 개선해 줘. 완성된 프롬프트만 써줘.\n\n'+c.plain,generation_config:{thinking_level:thinking,max_output_tokens:8192}})});
   const data=await response.json(),metrics={model:MODEL,durationMs:Date.now()-start,usage:data.usage||null,cost:usageCost(data.usage),status:data.status||null};
   if(!response.ok||data.status!=='completed')return send(502,{caseId:c.id,variant,thinking,metrics,error:'Generic editor did not complete'});
   prompt=readOutput(data);generated={status:'ready',text:prompt,metrics};
  }
  if(variant==='argon'){
   generated=await generatePrompt(normalizeInput({draft:c.draft,files:c.id==='image-reference'?[{id:'reference-image',mime:'image/png',data:(await fs.readFile(new URL('../server/fixtures/shapes.png',import.meta.url))).toString('base64')}]:[]}),{apiKey:process.env.GEMINI_API_KEY,thinking});
   if(generated.status==='needs_clarification'||c.id==='image-reference')return send(200,{caseId:c.id,variant,thinking,generated,final:null,criteria:c.criteria});
   prompt=generated.text;
  }
  const start=Date.now();
  const response=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':process.env.GEMINI_API_KEY},signal:AbortSignal.timeout(70000),body:JSON.stringify({model:MODEL,store:false,stream:false,input:prompt,generation_config:{thinking_level:'low',max_output_tokens:8192}})});
  const data=await response.json();
  const metrics={model:MODEL,durationMs:Date.now()-start,usage:data.usage||null,cost:usageCost(data.usage),status:data.status||null};
  console.info(JSON.stringify({event:'prompt_benchmark',caseId:c.id,variant,thinking,generatedMetrics:generated?.metrics||null,metrics}));
  if(!response.ok||data.status!=='completed')return send(502,{caseId:c.id,variant,thinking,generated,metrics,error:'Final generation did not complete'});
  return send(200,{caseId:c.id,variant,thinking,input:c.draft,prompt,generated,final:readOutput(data),metrics,criteria:c.criteria});
 }catch(error){const failedBody=typeof req.body==='object'?req.body:{};return send(error.status||502,{caseId:failedBody?.caseId,variant:failedBody?.variant,thinking:failedBody?.thinking,error:error.code||'benchmark_failed',metrics:error.metrics||null});}
}
