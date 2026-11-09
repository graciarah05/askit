// Each field represents one independent decision. Empty values impose no hidden constraint.
const pick=(key,label,values,hint='')=>({key,label,values,hint});
export const contextFields={
 concept:[pick('level','지금 이해한 정도',['처음 배우는 내용','기초는 알고 있어요','전공 수업 수준']),pick('approach','설명 방식',['생활 속 비유','비슷한 개념과 비교','계산·적용 과정'])],
 summary:[pick('length','요약 분량',['3문장','5개 항목','A4 반쪽']),pick('focus','중점적으로 볼 내용',['전체 흐름','주장과 근거','용어와 정의','서로 다른 관점'])],
 presentation:[pick('minutes','발표 시간',['3분','5분','7분','10분','15분']),pick('slides','슬라이드 수',['3장','5장','6장','8장','10장','12장']),pick('audience','발표를 듣는 사람',['주제를 처음 듣는 사람','같은 수업의 학생','전공 지식이 있는 청중']),pick('aspect','화면 비율',['16:9','4:3','9:16']),pick('focus','발표 목적',['개념 설명','주장 설득','대안 비교','사례 분석'])],
 report:[pick('stage','현재 준비한 것',['주제만 있어요','자료를 모았어요','주장과 초안이 있어요']),pick('scope','조사 범위',['한국 사례 중심','해외 사례 중심','국내외 비교']),pick('length','필요한 분량',['A4 1장','A4 3장','A4 5장'])],
 quiz:[pick('count','문제 수',['3문제','5문제','10문제','20문제']),pick('difficulty','난이도',['기본 개념 확인','개념 적용','헷갈리는 개념 구분']),pick('feedback','진행 방식',['한 문제씩 답하고 확인','모든 문제를 푼 뒤 확인'])],
 video:[pick('duration','전체 영상 길이',['8초','15초','30초','60초','90초']),pick('scenes','장면 수',['1장면','3장면','5장면','8장면']),pick('resources','촬영 여건',['혼자 스마트폰으로 촬영','팀원과 함께 촬영','기존 사진·영상으로 편집']),pick('aspect','화면 비율',['9:16','16:9','1:1']),pick('audio','소리',['효과음만','배경 음악','대사 포함','무음']),{key:'videoText',label:'영상에 넣을 정확한 문구',type:'textarea',hint:'대사나 자막이 필요하면 그대로 적어 주세요.'},pick('audience','영상을 볼 사람',['같은 학교 학생','일반 시청자','수업 발표 청중'])],
 image:[pick('images','이미지 수',['1장','3장','5장']),pick('aspect','크기·비율',['1:1','4:5','9:16','16:9','A4 세로']),pick('style','그림 스타일',['사진처럼','평면 일러스트','3D','수채화','픽셀 아트']),{key:'imageText',label:'이미지에 들어갈 정확한 문구',type:'textarea',hint:'넣을 글자가 있을 때만 적어 주세요. 줄바꿈이 필요하면 함께 적어 주세요.'},{key:'preserve',label:'그대로 유지할 것',type:'text',hint:'인물의 얼굴, 로고, 배경 배치 등'},{key:'avoid',label:'빼거나 바꿀 것',type:'text',hint:'원하지 않는 요소나 수정할 부분'}],
 custom:[pick('audience','누가 사용할 결과인가요?',['나 혼자','같은 수업의 학생','교수님','일반 독자']),pick('length','답변 분량',['핵심만 짧게','A4 반쪽','A4 1장'])]
};
export const contextRoles={concept:'학습 설명',summary:'자료 요약',presentation:'발표 준비',report:'보고서 준비',quiz:'학습 퀴즈',video:'영상 기획',image:'이미지 제작',custom:'사용자 작업'};
export const fieldsFor=id=>contextFields[id]||[];
export function choice(d,key,values){const v=d[key];return v==='__custom'?String(d[key+'Custom']||'').trim().slice(0,1000):values.includes(v)?v:'';}
export function selectedContext(d){return fieldsFor(d.taskId).flatMap(f=>{const v=f.values?choice(d,'context_'+f.key,f.values):String(d['context_'+f.key]||'').trim();return v?[`${f.label}: ${v}`]:[];});}
export function contextInstructions(d){return [...selectedContext(d),d.situation?.trim()?'수업·상황: '+d.situation.trim():'',choice(d,'language',['한국어','영어','한국어 설명 + 영어 핵심 용어'])?'답변 언어: '+choice(d,'language',['한국어','영어','한국어 설명 + 영어 핵심 용어']):'답변 언어: 사용자가 쓴 주제·자료의 주된 언어. 정할 수 없으면 한국어.'].filter(Boolean).join('\n');}
