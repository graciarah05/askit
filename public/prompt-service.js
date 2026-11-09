import {getAttachment} from './attachments.js';

export const promptService={enabled:false,checked:false};
export async function checkPromptService() {
  if(location.protocol==='file:'){promptService.checked=true;return;}
  try{const response=await fetch('/api/prompt',{signal:AbortSignal.timeout(4000),cache:'no-store'});if(response.ok)Object.assign(promptService,await response.json());}catch{}
  promptService.checked=true;
}
export function analysisMime(file) {
  return ({png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',pdf:'application/pdf'})[file.name.split('.').pop().toLowerCase()]||'';
}
export function analysisLabel(file) {
  if(file.text)return '본문도 함께 분석';
  if(file.analyze===true)return '선택한 파일은 분석을 위해 전송됩니다.';
  return '결과를 만들 때 직접 첨부';
}
export async function requestPrompt(draft,{clarification='',signal,fetchImpl=fetch}={}) {
  const files=[];let size=0;
  for(const meta of draft.attachments){
    if(meta.text||meta.analyze!==true)continue;
    const file=await getAttachment(meta.id);
    if(!file)throw Error(meta.name+' 원본을 다시 첨부해 주세요.');
    const mime=analysisMime(meta);
    if(!mime)throw Error('함께 분석할 파일은 PNG·JPG·WebP·PDF로 선택해 주세요.');
    size+=file.size;
    if(size>2500000)throw Error('함께 분석할 파일의 합계는 2.5MB까지예요. 일부 파일의 함께 분석을 끄거나 크기를 줄여 주세요.');
    const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error('파일을 읽지 못했어요. 다시 선택해 주세요.'));reader.readAsDataURL(file);});
    files.push({id:meta.id,mime,data});
  }
  const started=performance.now();
  const response=await fetchImpl('/api/prompt',{method:'POST',headers:{'Content-Type':'application/json'},signal,body:JSON.stringify({requestId:crypto.randomUUID(),draft,files,clarification})});
  let result;try{result=await response.json();}catch{throw Error('응답을 읽지 못했어요. 입력은 그대로 남아 있습니다.');}
  if(!response.ok)throw Error(result.error?.message||'AI에 연결하지 못했어요. 입력은 그대로 남아 있습니다.');
  if(!['ready','needs_clarification'].includes(result.status)||(result.status==='ready'&&typeof result.text!=='string'))throw Error('완성된 프롬프트를 받지 못했어요.');
  return {...result,metrics:{...result.metrics,clientDurationMs:Math.round(performance.now()-started)}};
}
