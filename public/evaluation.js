const $=s=>document.querySelector(s),records=[];
let service;
try{const response=await fetch('/api/evaluate',{cache:'no-store'});if(!response.ok)throw Error();service=await response.json();$('#availability').textContent=service.model+' · 보호된 Preview';for(const c of service.cases){const option=document.createElement('option');option.value=c.id;option.textContent=c.id;$('#case-id').append(option);}$('#run').disabled=false;}catch{$('#availability').textContent='검증 기능이 꺼져 있습니다.';}
$('#evaluation-form').onsubmit=async event=>{
 event.preventDefault();if($('#run').disabled)return;$('#run').disabled=true;$('#result').value='';$('#status').textContent='생성 중';const start=performance.now(),timer=setInterval(()=>$('#status').textContent=Math.floor((performance.now()-start)/1000)+'초 · 생성 중',1000);
 try{const body={caseId:$('#case-id').value,variant:$('#variant').value,thinking:$('#thinking').value};const response=await fetch('/api/evaluate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(155000)});const record={date:new Date().toISOString(),httpStatus:response.status,...await response.json(),clientMs:Math.round(performance.now()-start)};records.push(record);$('#result').value=JSON.stringify(record,null,2);$('#metrics').textContent=JSON.stringify({generation:record.generated?.metrics,final:record.metrics,clientMs:record.clientMs},null,2);$('#status').textContent=response.ok?'완료 · '+records.length+'건':'실패 · 사용량 기록 확인';}
 catch{$('#status').textContent='응답을 받지 못했습니다. 자동으로 재시도하지 않습니다.';}
 finally{clearInterval(timer);$('#run').disabled=false;}
};
$('#export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(records,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='askit-argon-results.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);};
