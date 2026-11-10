# Askit

학생이 자신의 과제 조건에 맞는 Gemini 프롬프트를 준비하고, Google AI 사용법과 다른 학생의 활용 경험을 찾는 모바일 웹입니다.

2026-11-10 · v1.4.0: 작업에 맞는 Google 도구·메뉴·설정과 전용 프롬프트를 함께 제공합니다. Vercel 공개 배포에 Gemini 4 Argon을 연결했습니다. 사용자가 저장한 API 키로 실제 생성·비교 실험을 진행했습니다. 모델은 서버가 선택하므로 Google AI Studio에서 별도로 선택할 필요가 없습니다.

- [도구별 연결·공식 근거·이번 검수 결과](docs/GOOGLE-WORKFLOWS-REVIEW.md)
- [설정과 현재 연결 범위](docs/ARGON-SETUP.md)
- [공식 자료 조사와 적용 기준](docs/GOOGLE-PROMPT-RESEARCH.md)
- [실제 결과·대기시간·비용 및 한계](docs/ARGON-REVIEW.md)
- [평가 루브릭](docs/ARGON-VALIDATION.md)

[공개 Askit](https://myaskit.com/) — Vercel 로그인 없이 접속할 수 있습니다.

이번 수정: 파일별 참고 강도, 구도·새 내용의 연결, 고정 문구·기호 보존, 카드뉴스 장별 복사. [실제 이미지 비교](qa/paired/reference-review.html) · [평가와 한계](docs/REFERENCE-FIDELITY-AUDIT.md).

## 현재 준비된 범위

- 프롬프트 8종(직접 설명 포함), 모든 주요 선택 항목의 직접 입력, 선택적인 과제 조건·자료·언어, 자료·템플릿 첨부, 파일별 참고 용도, 임시 저장, 보관함, 편집·복사 및 작업에 맞는 Google 도구 이동
- ASKIT Figma 원본 로고·아이콘·배경, 새로 작성한 스타일. Wanted 리소스/의존성 없음
- 학생 혜택 안내와 사용자가 지정한 Askit 학생 혜택 링크
- 공유형 커뮤니티 연결 코드와 별도 데이터베이스/이미지 저장소 구성: 이메일 인증, 글·활용 사례, 이미지, 댓글·답글, 좋아요, 저장, 신고, 작성자 수정·삭제
- 커뮤니티 설정이 없으면 닫힘 상태. 로컬 글을 공유된 것처럼 보여주는 대체 동작 없음

Argon은 프롬프트를 작성하고, 사용자가 최종 작업을 안내된 Google 도구에서 실행합니다. 기본 조합 방식도 유지하며 기다리기 싫거나 API 오류가 나면 바로 이어갈 수 있습니다. 공개 유료 생성은 승인된 한 달 예산 안에서 열었습니다. Supabase 커뮤니티의 도메인·인증 메일 연결과 두 실제 계정의 공유·권한·이미지 검증을 완료했습니다. 커뮤니티는 Vercel의 PUBLIC_COMMUNITY_ENABLED=true 설정으로 빌드합니다.

[공개 배포 구성·예산·남은 작업](docs/DEPLOYMENT.md)

## 실행·배포

Node.js 22 이상에서 프로젝트 폴더를 엽니다.

```sh
npm ci
npm run build
npm start
```

`http://127.0.0.1:4196`에서 확인할 수 있습니다. 정적 화면은 `dist`에서 제공하고, Vercel은 `api/`를 서버 함수로 배포합니다.

Vercel에서 이 폴더를 프로젝트 루트로 가져옵니다. 저장소를 연결한 뒤 Framework Preset은 Other, Build Command는 `npm run build`, Output Directory는 `dist`입니다. `vercel.json`에 같은 설정과 보안 헤더가 있습니다. 배포 전 비밀 키를 프런트엔드에 넣지 마세요.

AI 없이 기본 프롬프트 기능만 사용할 때는 추가 환경변수가 필요하지 않습니다. Argon 설정은 `docs/ARGON-SETUP.md`를 따릅니다. 공유형 커뮤니티 개통은 `backend/SETUP.md` 순서를 따릅니다.

## 주요 파일

- `public/workflows.js`, `public/workflow-ui.js`: 도구 선택·실제 메뉴 안내·클립별 프롬프트
- `public/tasks.js`: 입력을 Gemini 요청으로 조합하는 규칙
- `public/personalize.js`: 선택 항목 및 직접 입력 처리
- `public/attachments.js`: 로컬 파일 보관·텍스트 읽기·ZIP 내보내기
- `public/prompt-ui.js`: 필요한 조건만 펼치는 입력 화면
- `public/community.js`: 인증·공유 데이터·이미지 연결
- `public/app.js`, `public/styles.css`: 화면과 동작
- `backend/schema.sql`, `backend/storage.sql`: 새 Supabase 프로젝트 초기 구성
- `docs/REVIEW.md`: v1.1 검수 결과와 한계
- `docs/PROMPT-RUBRIC-V2.md`: 입력 분류·공식 근거·사전에 정한 판정 기준
- `qa/prompt-v2/`: 수정 전 실패와 수정 후 Gemini 응답·검수 기록
- `server/prompt-contract.js`, `server/gemini.js`, `api/prompt.js`: 입력·파일 검증, Argon 연결, 출력·비용 기록
- `docs/API-NEXT.md`: 연결 이전의 설계 기록 (현황은 ARGON-SETUP.md 참고)
- `preview/Askit.html`: 서버 없이 열어 보는 단일 파일. 커뮤니티 연결 설정은 포함하지 않습니다.

## 파일 첨부

파일은 기본적으로 브라우저에 보관합니다. AI 생성 시 선택한 PNG/JPG/WebP/PDF는 합계 2.5MB까지 서버를 거쳐 Google에 분석 요청으로 전송합니다. 최대 5개·파일당 20MB·합계 50MB는 Askit 자체 제한입니다. 짧은 UTF-8 TXT/MD/CSV(60KB, 20,000자 이하)는 본문을 요청에 포함합니다. 이미지·PDF는 분석 여부를 직접 선택할 수 있으며, PPTX 디자인 분석은 PDF/이미지 변환본을 사용합니다. 최종 결과를 만드는 Google 도구에는 필요한 원본을 다시 첨부해야 합니다. 파일과 프롬프트를 ZIP으로 받을 수 있습니다. 브라우저 보관이 막히면 현재 탭에서만 유지하며 이를 알립니다.

## 검증

```sh
npm test
npm run test:database
# npm start 실행 상태 + Google Chrome 설치 필요
npm run test:browser
npm run test:community
node qa/preview.mjs
```

데이터베이스 테스트는 PGlite에서 권한을 검증하며 Supabase의 인증/저장소 일부 환경을 모사합니다. 커뮤니티 브라우저 테스트는 두 브라우저와 모의 REST 응답을 사용합니다. 실제 메일 전달, 클라우드 RLS, 저장소 업로드, 국가별 Google 기능은 실제 연결 후 별도 확인해야 합니다.

## 콘텐츠·리소스

사용자가 제공한 ASKIT Figma 파일 `tqeovcoQwryalF4vys01OO`의 원본 자산을 사용했습니다. Pretendard 라이선스는 `public/assets/Pretendard-LICENSE.txt`에 포함했습니다. 첫 화면용 글꼴은 해당 원본을 문자 단위로 축소했으며, 그 밖의 글자는 전체 글꼴로 표시합니다. 인위적인 게시글, 사용 성과, 가입 수치는 넣지 않았습니다. 실제 서비스 배포 시 Figma 원본 키트의 사용권은 소유자 기준으로 유지해야 합니다.
