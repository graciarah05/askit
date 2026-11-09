import test from 'node:test';
import assert from 'node:assert/strict';
import {freshPromptDraft,compileRequest,migrateDraft} from '../../public/tasks.js';
import {selectWorkflow,videoPlan,destinations,workflowForResult} from '../../public/workflows.js';
import {activePrompt,allPromptText,fallbackPrompt,workflowPanel} from '../../public/workflow-ui.js';
import {normalizeInput,validateResult,assemblePrompt,modelInput} from '../../server/prompt-contract.js';
const draft=(taskId,patch={})=>({...freshPromptDraft(taskId),goal:'검증용 작업',...patch});
const file=(id,role='source',name=id+'.txt')=>({id,name,role,text:name.endsWith('.txt')?'제공된 사실만.':'',note:''});
for(const [name,d,id] of [
 ['short explanation',draft('concept'),'chat'],['interactive learning',draft('concept',{option:'질문에 답하며 배우기'}),'learning'],
 ['actual slides',draft('presentation'),'canvas'],['outline only',draft('presentation',{option:'구성안만'}),'chat'],['script only',draft('presentation',{option:'발표 대본'}),'chat'],['existing slides',draft('presentation',{option:'기존 슬라이드 수정'}),'chat'],
 ['new research',draft('report',{option:'출처 찾아 조사하기'}),'research'],['research plan only',draft('report',{option:'자료 조사 계획'}),'chat'],
 ['multiple evidence files',draft('summary',{attachments:[file('a'),file('b')]}),'notebook'],['template does not count',draft('summary',{attachments:[file('a'),file('b','style')]}),'chat'],
 ['quiz with sources',draft('quiz',{attachments:[file('a'),file('b')]}),'notebook'],['image edit',draft('image',{option:'기존 이미지 수정'}),'image'],
 ['filming',draft('video'),'chat'],['video generation',draft('video',{option:'AI로 영상 만들기'}),'flow'],['unknown custom intent',draft('custom'),'chat']
])test('destination: '+name,()=>assert.equal(selectWorkflow(d).id,id));
test('consumer clip limits, total and scene count stay independent',()=>{
 for(let total=3;total<=120;total++){const p=videoPlan(draft('video',{context_duration:'__custom',context_durationCustom:total+'초',context_scenes:'5장면'}));assert.equal(p.durations.reduce((a,b)=>a+b,0),total);assert(p.durations.every(s=>s>=3&&s<=10));}
 const p=videoPlan(draft('video',{context_duration:'15초',context_scenes:'8장면'}));assert.equal(p.scenes,8);assert.equal(p.durations.length,5);
});
test('default duration/aspect are disclosed proposals, custom ratio is not silently supported',()=>{
 const p=videoPlan(draft('video'));assert.equal(p.explicit,false);assert.match(p.note,/제안/);
 const q=videoPlan(draft('video',{context_aspect:'1:1'}));assert.equal(q.requestedAspect,'1:1');assert.match(q.note,/잘라내야/);
 const custom=videoPlan(draft('video',{context_aspect:'__custom',context_aspectCustom:'2:1'}));assert.equal(custom.requestedAspect,'2:1');assert.match(custom.note,/2:1/);
});
test('text duration, assignment precedence and one clarification',()=>{
 assert.equal(videoPlan(draft('video',{goal:'30초 동아리 영상'})).total,30);
 assert.equal(videoPlan(draft('video',{goal:'1분 30초 영상. 첫 3초에 노트가 펼쳐진다.'})).total,90);
 assert.equal(videoPlan(draft('video',{context_duration:'__custom',context_durationCustom:'1분 30초'})).total,90);
 assert.equal(videoPlan(draft('video',{context_duration:'60초',conditions:'과제는 30초'})).total,30);
 const i=normalizeInput({draft:draft('video',{option:'AI로 영상 만들기',context_duration:'60초'}),files:[],clarification:'30초'});assert.equal(i.workflow.video.total,30);
});
test('old drafts migrate but saved storyboards remain chat until regenerated',()=>{
 assert.equal(migrateDraft(draft('video',{option:'생성 영상용 장면 설명'})).option,'AI로 영상 만들기');
 assert.equal(workflowForResult({taskId:'video',text:'옛 구성안'}).id,'chat');
 assert.equal(workflowForResult({workflow:{id:'__proto__'}}).id,'chat');
});
test('basic fallback is explicitly a preparation step, not a Flow prompt',()=>{
 const r=compileRequest(draft('video',{option:'AI로 영상 만들기'}));assert.equal(r.workflow.id,'chat');assert.equal(r.workflow.next,'flow');assert.match(r.workflow.reason,/준비/);
});
const input=normalizeInput({draft:draft('video',{option:'AI로 영상 만들기',context_duration:'15초',attachments:[file('ref','style','ref.png')]}),files:[]});
const value={status:'ready',prompt:'15초 영상 구성',question:'',confirmed:['15초'],observations:[],clips:input.workflow.video.durations.map((s,i)=>({title:'장면 '+(i+1),seconds:s,prompt:'컷 전환 없는 연속 촬영. 책상 위 파란 노트로 카메라가 천천히 다가간다. 조용한 종이 넘기는 소리.',referenceIds:['ref']}))};
test('Flow output validates exact times and includes no chat/source wrapper',()=>{
 const r=validateResult(value,input),text=assemblePrompt(r,input);assert.equal(r.clips.length,2);assert(!text.includes('근거 확인'));assert(!text.includes('첨부파일별 용도와 원문'));assert.match(JSON.stringify(modelInput(input)),/Google Flow/);
});
for(const [name,mutate] of [
 ['wrong time',v=>v.clips[0].seconds=15],['missing clip',v=>v.clips.pop()],['imagined reference',v=>v.clips[0].referenceIds=['invented']],['chat meta request',v=>v.clips[0].prompt='영상 프롬프트를 작성해 줘. 주체와 카메라와 소리를 표로 제시해 줘.'],['too short',v=>v.clips[0].prompt='영상'],['false observation',v=>v.observations=[{fileId:'ref',note:'봤음'}]]
])test('reject video '+name,()=>{const v=structuredClone(value);mutate(v);assert.throws(()=>validateResult(v,input));});
test('only selected clip is copied; bundle keeps all; fallback changes task honestly',()=>{
 const r={...validateResult(value,input),text:'overview',activeClip:1,attachments:input.draft.attachments};assert.equal(activePrompt(r),r.clips[1].prompt);assert.match(allPromptText(r),/장면 1/);assert.match(allPromptText(r),/장면 2/);assert.match(fallbackPrompt(r),/직접 촬영/);
 const html=workflowPanel(r,false);assert.match(html,/8초|7초/);assert.match(html,/각각 사용/);assert(!html.includes('학생 혜택'));assert(!html.includes('가입'));
});
test('destinations use fixed official HTTPS URLs; source instructions are not executable HTML',()=>{
 for(const d of Object.values(destinations)){const u=new URL(d.url);assert.equal(u.protocol,'https:');assert(u.hostname.endsWith('.google.com'));}
 const html=workflowPanel({workflow:{id:'chat',reason:'<img onerror="bad">'},text:'ok'},false);assert(!html.includes('<img onerror'));assert.match(html,/&lt;img/);
});

test('conflicting durations need one explicit total, never silently default to eight seconds',()=>{
 const d=draft('video',{option:'AI로 영상 만들기',conditions:'30초 또는 60초',context_duration:'8초'});
 assert.equal(videoPlan(d).ambiguous,true);assert.throws(()=>compileRequest(d),/전체 길이/);assert.throws(()=>normalizeInput({draft:d,files:[]}),/전체 길이/);
});

test('video goal aspect agrees with UI, assignment wins, clock times are not ratios',()=>{
 const d=draft('video',{option:'AI로 영상 만들기',goal:'8초 가로 16:9 영상. 18:00에 시작하는 행사'});
 assert.equal(videoPlan(d).aspect,'16:9');assert.equal(videoPlan(d).requestedAspect,'16:9');
 assert.equal(videoPlan({...d,conditions:'세로 9:16으로 제출'}).aspect,'9:16');
 assert.equal(videoPlan({...d,goal:'8초 영상. 18:00 행사'}).requestedAspect,'');
 assert.throws(()=>normalizeInput({draft:{...d,goal:'8초 영상. 16:9 또는 9:16'},files:[]}),/비율/);
});
test('Notebook uses native source citations without duplicating source bodies',()=>{
 const d=draft('summary',{materialMode:'files',attachments:[file('a'),file('b'),file('rubric','assignment')]});
 const i=normalizeInput({draft:d,files:[]});
 const v={status:'ready',prompt:'두 소스를 비교하고 실제 인용을 달아 줘.',question:'',confirmed:[],observations:[],clips:[]};
 const text=assemblePrompt(validateResult(v,i),i);
 assert.match(text,/클릭 가능한 Notebook 인용/);assert.match(text,/a.txt/);assert.match(text,/rubric.txt/);assert(!text.includes('파일본문'));assert(!text.includes('제공된 사실만.'));
 assert.throws(()=>validateResult({...v,prompt:'각 판단에 [파일1-1]을 인용해 주세요.'},i));
});


test('binary references use their real filename without inventing a source line',()=>{
 const d=draft('image',{attachments:[file('ref','style','poster.jpg')]});
 const i=normalizeInput({draft:d,files:[]});
 const v={status:'ready',prompt:'[파일1-1]의 배치만 참고해 새 포스터를 생성해 줘.',question:'',confirmed:[],observations:[],clips:[]};
 const text=assemblePrompt(validateResult(v,i),i);
 assert.match(text,/"poster.jpg"의 배치/);assert(!text.includes('[파일1-1]'));
});
