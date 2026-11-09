// Product entry points and menu instructions are curated from Google Help, never supplied by the model.
// Consumer limits are intentionally separate from Gemini API limits. Reviewed 2026-11-10.
import {choice} from './personalize.js';
export const WORKFLOW_REVIEWED='2026-11-10';
const help=id=>'https://support.google.com/gemini/answer/'+id+'?hl=ko';
export const destinations={
 chat:{name:'Gemini',url:'https://gemini.google.com/',mode:'새 채팅',steps:['새 채팅을 엽니다.','필요한 파일을 첨부하고 프롬프트를 붙여넣어 전송합니다.','결과를 읽고, 바꿀 부분만 같은 대화에서 요청합니다.'],check:'수치·사실·과제 조건을 원문과 대조하세요.',access:'Google 계정으로 로그인합니다. 학교 계정은 관리자가 허용한 기능만 사용할 수 있어요.',source:'https://support.google.com/gemini/?hl=ko'},
 learning:{name:'Gemini 가이드 학습',url:'https://gemini.google.com/',mode:'업로드 및 도구 → 도구 더보기 → 가이드 학습',steps:['입력창의 + (업로드 및 도구) → 도구 더보기 → 가이드 학습을 선택합니다.','프롬프트를 붙여넣고, 문제나 수업 자료가 있으면 함께 첨부합니다.','한 번에 한 질문에 답하면서 모르는 부분을 확인합니다.'],check:'설명을 다시 읽는 데서 끝내지 말고, 새 문제를 혼자 풀어 보세요.',access:'로그인이 필요해요. 모바일 앱에서 메뉴가 보이지 않으면 웹으로 열어 보세요.',source:help('16448384')},
 canvas:{name:'Gemini Canvas',url:'https://gemini.google.com/',mode:'업로드 및 도구 → 도구 더보기 → Canvas',steps:['입력창의 + (업로드 및 도구) → 도구 더보기 → Canvas를 선택합니다.','발표 자료·디자인 참고를 첨부한 뒤 프롬프트를 붙여넣습니다.','슬라이드와 발표 메모를 확인하고 수정할 부분을 요청합니다.','컴퓨터에서는 내보내기 → 프레젠테이션으로 계속 편집할 수 있어요. 계정에 따라 Slides로 내보내기로 표시되며, PPTX·PDF 메뉴가 제공되기도 합니다. 발표 대본은 내보낸 파일에 빠질 수 있으니 별도로 보관하세요.'],check:'장수·시간·출처를 확인하고, 실제로 소리 내어 읽어 보세요.',access:'로그인이 필요해요. 내보내기 안내는 컴퓨터 웹 기준입니다. 원본 PPTX의 서식이 그대로 보존된다고 보장할 수는 없어요.',source:help('16047321')},
 research:{name:'Gemini Deep Research',url:'https://gemini.google.com/',mode:'업로드 및 도구 → 도구 더보기 → Deep Research',steps:['입력창의 + (업로드 및 도구) → 도구 더보기 → Deep Research를 선택합니다.','소스에 Google 검색이 포함되어 있는지 확인하고 프롬프트를 붙여넣습니다.','조사 계획에서 범위·기간을 확인한 뒤 조사 시작을 누릅니다.','완성된 보고서의 출처를 열어 실제로 해당 주장을 뒷받침하는지 확인합니다.'],check:'발행일과 조사 대상·기간을 확인하세요. 링크가 있다는 것만으로 근거가 검증되지는 않아요.',access:'만 18세 이상·로그인이 필요합니다. 조사 횟수에 한도가 있고, 공식 안내상 보통 5~10분 정도 걸립니다.',source:help('15719111')},
 notebook:{name:'Gemini Notebook',url:'https://notebook.google.com/',mode:'새 노트북 → 소스 업로드 → 채팅',steps:['새 노트북 만들기 → 소스 업로드에서 내용·근거 자료를 추가합니다.','소스 목록에서 이번 답변에 쓸 자료만 선택합니다. 디자인 참고는 내용 소스로 넣지 않습니다.','채팅에 프롬프트를 붙여넣습니다. 퀴즈도 이 요청은 채팅에서 진행합니다.','답변에 달린 인용을 눌러 원문의 문장과 수치를 확인합니다.'],check:'같은 노트북에 모은 자료만 사용해요. 자료가 부족한 내용을 추측으로 채우지 않았는지 확인하세요.',access:'로그인이 필요합니다. 공식 도움말의 현재 명칭은 Gemini Notebook이며, 일부 화면에는 NotebookLM이 표시될 수 있어요. 모바일 앱은 일부 기능에 제한이 있어요.',source:'https://support.google.com/gemininotebook/answer/16206563?hl=ko'},
 image:{name:'Gemini 이미지',url:'https://gemini.google.com/',mode:'업로드 및 도구 → 이미지 만들기',steps:['입력창의 + (업로드 및 도구) → 이미지 만들기를 선택합니다. 사이드바에 이미지가 보이면 거기서 열어도 됩니다. 여러 참고 이미지나 수정 작업에는 Flash 또는 Pro가 표시되는 모델을 선택합니다.','참고 이미지와 수정할 원본을 첨부하고 프롬프트를 붙여넣습니다.','완성된 이미지를 확인한 뒤, 바꿀 부분만 같은 대화에서 요청합니다.'],check:'글자·날짜와 유지할 부분을 원본과 대조하세요. 내려받은 파일의 크기도 확인하세요. 이미지 수정은 원본을 다시 그릴 수 있어 색상·배치·크기가 조금 달라질 수 있습니다. 나머지 부분이 정확히 같아야 하는 작업은 원본 편집 도구에서 마무리하세요.',access:'로그인이 필요하고 이미지 편집은 만 18세 이상이어야 합니다. 학교 계정·지역별 제한이 있어요. 모델과 다운로드 해상도는 이용 범위에 따라 달라집니다.',source:help('14286560')},
 flow:{name:'Google Flow',url:'https://flow.google.com/',mode:'동영상 → Omni 1.2 Flash',steps:['새 프로젝트를 엽니다. 에이전트가 켜져 있으면 끄고, 입력창 아래 설정에서 동영상 → Omni 1.2 Flash를 선택합니다.','선택한 클립의 길이와 화면 비율을 맞춥니다. 출력 수는 1개로 두고, 생성 전에 표시되는 크레딧을 확인합니다.','해당 클립의 참고 이미지를 추가하고, 클립 프롬프트만 붙여넣어 생성합니다.','여러 클립이면 컴퓨터의 장면 빌더에 순서대로 추가해 연결하고, 재생해 본 뒤 내려받습니다.'],check:'장면 사이 인물·배경·소리의 연결과 정확한 문구를 확인하세요. 같은 참고 이미지를 써도 완전한 일관성이 보장되지는 않아요.',access:'만 18세 이상·지원 지역·로그인이 필요합니다. 일부 기능은 구독이 필요하며 모바일 웹 편집은 완전히 최적화되지 않았습니다. 한국에서는 요금제에 따라 눈에 보이는 워터마크가 붙을 수 있어요.',source:'https://support.google.com/flow/answer/16352836?hl=ko'}
};
const selectedOption=d=>d.option==='__custom'?String(d.optionCustom||''):String(d.option||'');
export function isGeneratedVideo(d){return d.taskId==='video'&&['AI로 영상 만들기','생성 영상용 장면 설명'].includes(selectedOption(d));}
function secondsIn(text){
 const raw=String(text||'');
 // Prefer an explicit whole-video duration over event timestamps in the same sentence.
 const whole=raw.match(/((?:\d+(?:\.\d+)?\s*분\s*)?\d+(?:\.\d+)?\s*초|\d+(?:\.\d+)?\s*분)\s*(?:짜리\s*)?(?:영상|동영상)/)?.[1];
 const matches=[...(whole||raw).matchAll(/(\d+(?:\.\d+)?)\s*분(?:\s*(\d+(?:\.\d+)?)\s*초)?|(\d+(?:\.\d+)?)\s*초/g)];
 return [...new Set(matches.map(m=>m[1]?Number(m[1])*60+Number(m[2]||0):Number(m[3])))];
}
function aspectsIn(text){
 const raw=String(text||'');
 const known=new Set(['9:16','16:9','1:1','4:5','3:4','4:3','21:9','2:3','3:2','9:21']);
 const ratios=[...raw.matchAll(/\b(\d+)\s*[:：]\s*(\d+)\b/g)].map(m=>`${m[1]}:${m[2]}`).filter(r=>known.has(r));
 if(ratios.length)return [...new Set(ratios)];
 return /가로\s*(?:형|영상|동영상)/.test(raw)?['16:9']:/세로\s*(?:형|영상|동영상)/.test(raw)?['9:16']:[];
}
export function videoPlan(d){
 const duration=choice(d,'context_duration',['8초','15초','30초','60초','90초']);
 // The form explicitly gives assignment conditions precedence over optional selections.
 const assignmentTimes=secondsIn(d.conditions);
 const fromText=assignmentTimes.length?assignmentTimes:secondsIn(duration||d.goal);
 const total=fromText.length===1?fromText[0]:8;
 const explicit=fromText.length===1;
 const invalid=explicit&&(!Number.isInteger(total)||total<3||total>120);
 const sceneChoice=choice(d,'context_scenes',['1장면','3장면','5장면','8장면']);
 const scenes=Number(sceneChoice.match(/^(\d+)\s*장면/)?.[1])||0;
 const count=invalid?0:Math.max(Math.ceil(total/10),Math.min(scenes||1,Math.floor(total/3)));
 const durations=Array.from({length:count},(_,i)=>Math.floor(total/count)+(i<total%count?1:0));
 const assignmentAspects=aspectsIn(d.conditions),goalAspects=aspectsIn(d.goal);
 const aspectChoice=choice(d,'context_aspect',['9:16','16:9','1:1']);
 const selectedAspects=aspectsIn(aspectChoice);
 // A custom ratio is an explicit preference even when the generator cannot offer it.
 const aspects=assignmentAspects.length?assignmentAspects:goalAspects.length?goalAspects:selectedAspects.length?selectedAspects:aspectChoice?[aspectChoice]:[];
 const requestedAspect=aspects.length===1?aspects[0]:'';
 const aspect=['9:16','16:9'].includes(requestedAspect)?requestedAspect:'9:16';
 return {total,explicit,durations,scenes,aspect,requestedAspect,invalid,ambiguous:fromText.length>1||aspects.length>1,
 note:aspects.length>1?'화면 비율이 두 가지 이상 적혀 있어요. 이번에 만들 비율 하나를 알려 주세요.':fromText.length>1?'서로 다른 길이가 적혀 있어요. 전체 길이를 “30초 영상”처럼 하나로 알려 주세요.':invalid?'AI 영상은 한 번에 3~120초 분량의 클립 프롬프트를 준비할 수 있어요. 더 긴 영상은 구간을 나눠 주세요.':[
 !explicit?'전체 길이를 정하지 않아 먼저 8초로 제안했어요.':`${total}초를 ${count}개 클립으로 나눴어요.`,
 !requestedAspect?'화면 비율은 세로 9:16으로 제안했어요.':requestedAspect!==aspect?`${requestedAspect}은 직접 선택할 수 없어 9:16으로 생성한 뒤 잘라내야 해요.`:'',
 scenes&&count!==scenes?'장면 수와 생성 횟수는 달라요. 한 장면이 여러 클립에 걸치거나 한 클립에 여러 장면이 들어갈 수 있어요.':''
 ].filter(Boolean).join(' ')};
}
// Split only an explicit series count, never infer it from people, dates or page labels.
export function imageCount(d){
 if(d.taskId!=='image')return 1;
 const read=text=>{const s=String(text||''),words={한:1,두:2,세:3,네:4,다섯:5,여섯:6,일곱:7,여덟:8,아홉:9,열:10,열한:11,열두:12};const count='(\\d+|열한|열두|다섯|여섯|일곱|여덟|아홉|한|두|세|네|열)';for(const noun of ['카드뉴스|포스터|카드','이미지']){const m=s.match(new RegExp('(?:'+noun+')\\s*(?:총\\s*)?'+count+'\\s*(?:장|개)(?![면은는째])'))||s.match(new RegExp(count+'\\s*(?:장|개)(?:짜리|의)?\\s*(?:'+noun+')'));if(m)return words[m[1]]||Number(m[1]);}return 0;};
 const direct=choice(d,'context_images',['1장','3장','5장']);
 const condition=read(d.conditions),selected=Number(direct.match(/^(\d+)\s*(?:장|개)?$/)?.[1])||0;
 const text=String(d.conditions||'')+' '+String(d.goal||'');
 const collage=/(?:콜라주|한\s*이미지에\s*모)/.test(text)&&!/(?:따로|별도|개별|콜라주[^.\n]{0,8}(?:안|말|않))/.test(text);
 return collage?1:condition||selected||read(d.goal)||1;
}
export function selectWorkflow(d){
 const option=selectedOption(d);let id='chat',reason='설명이나 초안을 바로 받을 수 있어요. 별도 도구 설정이 필요하지 않습니다.';
 if(d.unsure&&!d.goal?.trim())return {id,reason:'먼저 짧은 질문으로 할 일을 정해요. 목표를 정한 뒤 필요한 도구로 이어갈 수 있어요.',reviewed:WORKFLOW_REVIEWED};
 if(d.taskId==='concept'&&option==='질문에 답하며 배우기'){id='learning';reason='바로 답을 읽기보다, 질문에 답하면서 이해를 확인하는 방식에 맞아요.';}
 if(d.taskId==='presentation'&&option==='슬라이드 초안'){id='canvas';reason='글로 된 구성안을 넘어 슬라이드를 만들고 이어서 수정할 수 있어요.';}
 if(d.taskId==='report'&&option==='출처 찾아 조사하기'){id='research';reason='새 자료를 검색하고 여러 출처를 비교해야 하는 작업에 맞아요.';}
 const sources=(d.attachments||[]).filter(f=>f.role==='source');
 if(['summary','quiz'].includes(d.taskId)&&sources.length>=2){id='notebook';reason='자료를 한곳에 모으고 답변의 인용에서 원문을 바로 확인할 수 있어요.';}
 if(d.taskId==='image'){id='image';reason='이미지를 직접 생성하거나, 첨부한 원본의 일부를 바꿀 수 있어요.';}
 if(isGeneratedVideo(d)){id='flow';reason='클립 길이와 비율을 맞춰 만들고, 여러 장면을 연결할 수 있어요.';}
 return {id,reason,reviewed:WORKFLOW_REVIEWED,...(id==='flow'?{video:videoPlan(d)}:id==='image'?{imageCount:imageCount(d)}:{})};
}
export function basicWorkflow(d){const w=selectWorkflow(d);return w.id==='flow'?{id:'chat',reason:'기본 프롬프트는 Gemini에서 장면별 영상 요청문을 준비하는 단계예요. 완성된 장면 설명을 Flow에 넣어 영상을 생성하세요.',next:'flow',reviewed:WORKFLOW_REVIEWED}:w;}
export function workflowForResult(result){
 const w=result?.workflow;
 // Older saved prompts were written for chat; never send an old storyboard into a video generator.
 return w&&Object.hasOwn(destinations,w.id)?w:{id:'chat',reason:'이전에 저장한 Gemini용 프롬프트예요. 조건 수정에서 다시 만들면 작업에 맞는 도구 안내도 받을 수 있어요.',reviewed:WORKFLOW_REVIEWED};
}
export function destinationContract(w){return ({
 chat:'Gemini 일반 채팅에서 실행한다. 요청한 결과부터 제시하고 없는 도구나 파일을 만들었다고 주장하지 않는다.',
 learning:'Gemini 가이드 학습에서 사용한다. 처음에는 이해를 확인하는 짧은 질문 하나만 한다. 답을 듣고 필요한 힌트와 설명을 제공한다. 전체 정답을 먼저 공개하지 않는다.',
 canvas:'Gemini Canvas에서 실제 슬라이드 프레젠테이션을 만든다. 화면에 보여줄 내용과 발표자 메모를 분리한다. 슬라이드 화면에는 제목·요청한 핵심 내용·예시·실제 시각 요소만 배치한다. 시각 자료 배치 제안이라는 설명이나 발표 대본·시간표·검수 목록을 슬라이드 본문에 넣지 않는다. 대본과 배정 시간은 발표자 메모에 두고, 메모를 지원하지 않으면 슬라이드 밖에 별도로 준다. 개념을 설명하는 경우 예시가 정의의 핵심 조건을 모두 충족하는지 검증하고 부적절한 비유는 교체한다. 지정 장수는 표지·마무리·부록·출처 페이지를 포함한 전체 페이지 수다. 외부 사진이 꼭 필요한 요청이 아니면 직접 그린 도형·도식으로 시각화하고, 자동 이미지 출처 페이지를 추가하지 않는다. 필요한 출처 표기는 발표 메모에 남긴다. 슬라이드의 예시 자체에도 환불 가능 여부 등 판단에 필요한 가정을 명시한다. 지정 총 발표 시간·청중·시각 참고의 적용 범위를 지킨다. 내부 점검은 출력하지 않는다. 실제 PPTX 생성·원본 서식 보존을 보장하지 않는다.',
 research:'Gemini Deep Research에서 웹을 조사한다. 조사 질문·지역·기간·비교 기준과 원하는 결과를 지정한다. 1차 출처를 우선하고 발행일/기준일, 근거 링크와 불확실성/반론을 연결한다. 사용자가 주지 않은 조사 기간은 필수 조건으로 만들지 않는다. 조사 계획을 사용자에게 확인받은 뒤 실행한다.',
 notebook:'Gemini Notebook의 채팅에서 사용한다. 업로드하고 선택한 내용 소스만 근거로 삼는다. 핵심 수치와 판단마다 클릭해서 소스로 이동하는 Notebook 고유 인용을 사용한다. [본문N]·[파일N-N] 같은 자체 표식이나 임의 페이지를 인용으로 요구하지 않는다. 원문 전체는 채팅에 재복제하지 않고 이미 업로드한 소스의 파일명으로 지정한다. 해당 자료에 없는 내용은 없다고 밝힌다. 자료의 제목과 질문 범위를 구체적으로 지정한다. 템플릿의 내용을 사실로 옮기지 않는다.',
 image:'Gemini 이미지 생성/편집에서 사용한다. 첫 문장에서 실제 이미지를 만들거나 수정하도록 요청한다. 주체·행동·배경·구도·빛·스타일 중 필요한 것만 구체화하고 지정 문구는 그대로 보존한다. 가독성·잘림 방지가 명시되면 참고 디자인의 글자 겹침·잘림보다 우선한다. 모든 문구를 캔버스 안쪽 여백에 완전히 배치하고, 장식적 회전이나 겹침으로 음절이 가려지지 않게 한다. 공간이 부족하면 글자 크기와 줄바꿈을 조정한다. 원본 수정은 바꿀 것과 유지할 것을 짧고 정확하게 구분한다. 수정하지 않는 부분을 재디자인하거나 다시 그리지 않도록 요청하되, 픽셀·해상도 보존을 보장하지 않는다. 사용자가 금지하지 않은 장식·그림자·질감을 새 금지사항으로 만들지 않는다. 사용자 제공 사실을 추가하지 않는다.',
 flow:'Google Flow의 Omni 1.2 Flash 영상 생성창에 직접 붙여넣을 clips를 만든다. 장면 설명/대본/프롬프트를 써달라는 메타 요청이 아니라 촬영된 화면처럼 구체적으로 주체·동작·배경·카메라·빛·소리를 묘사한다. 단일 숏이면 컷 전환 없는 연속 촬영을 명시한다. 필요한 대사는 정확한 문구로, 소리는 별도로 명시한다. 정하지 않은 대사나 자막은 억지로 넣지 않는다. 글자 설명/표/JSON/체크리스트/인용번호를 영상 프롬프트 안에 넣지 않는다. 각 클립만 복사해도 인물·장소·스타일을 알 수 있어야 한다. 다른 클립을 보았다고 가정하지 않는다. 참고 이미지 파일의 용도는 지키되 과제 문서 전체를 영상 입력으로 요구하지 않는다.'
 })[w.id];}
