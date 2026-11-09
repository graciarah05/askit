# Askit 운영 구성 — 2026-11-10

## 구성
- Vercel: 화면, Argon 프롬프트 API, 상태 확인·기록 정리 API. 공개 주소 https://askit-alpha.vercel.app/.
- Supabase: Askit 전용 서울 프로젝트 `ivkkudsyiuxffrefzvda`. 커뮤니티 RLS·이미지 저장소·유료 호출 사용량 원장.
- Render: `scripts/maintenance.mjs`를 매시간 실행하는 외부 상태 점검·오래된 사용량 기록 정리. 웹 서버를 중복 운영하지 않는다. Gemini 키나 Supabase 비밀 키를 Render에 저장하지 않는다.
- GitHub→Vercel: main 변경 시 자동 배포 연결 완료. Render는 수동 배포 유지.
- GitHub: 비공개 `graciarah05/askit`. 비밀 키, node_modules, 실험에 쓴 타인 레퍼런스 이미지 제외.

## 승인된 비용과 실제 설정
사용자 승인: Gemini 한 달 800,000원 이내, Render 월 $7 예산으로 2개월.

Gemini 앱 내 추정 사용료 한도는 2026-11-10 06:03 KST부터 2026-12-10 06:03 KST까지 **총 $450**, 하루 $30. 날짜가 다음 달로 바뀌어도 전체 승인 기간의 합계가 초기화되지 않는다. 브라우저당 일 30회, IP당 일 300회, 전체 일 1,200회, 동시 3회. 학생 수·실패율을 보고 조정할 운영값이며 품질 점수가 아니다.

각 요청에 $1을 먼저 예약하고 실제 토큰 추정 비용으로 정산한다. 알 수 없는 실패 비용은 예약액을 유지한다. 토큰 사전 확인·32,000 입력 토큰·8,192 출력 토큰 한도, 고비용 이상치 중지, 만료 시 중지를 적용했다. 응답 완료 전에 정산하므로 서버 조기 종료로 정산이 빠지는 경우를 줄인다.

이는 **Google 청구서의 하드 한도가 아니다**. Google AI Studio 등 이 사이트 밖에서 같은 프로젝트로 쓴 비용, 환율·세금·가격 변경은 앱 원장에 자동 반영되지 않는다. Google Cloud의 실제 청구액과 대조해야 한다. 예산을 쓰기 위한 불필요한 재호출은 하지 않는다. 모델 thinking=low는 기존 품질/지연 실험 기준이며 높은 단계가 무조건 좋은 것으로 간주하지 않는다.

Render cron은 월 최소 $1, 실행 시간 비례 청구. $7 상시 웹 서버를 추가할 필요가 없다. 2개월 뒤 Render 작업 유지/중단을 확인해야 하며 자동 결제 해지 예약은 설정하지 않았다.

## 새 프로젝트 설치 순서
1. `backend/schema.sql`, `backend/storage.sql`, `backend/usage.sql`, `backend/usage-period.sql` 순서로 적용.
2. Vercel Secret: GEMINI_API_KEY, SUPABASE_SECRET_KEY, ASKIT_MAINTENANCE_TOKEN. 서버/공개 URL은 SUPABASE_URL, PUBLIC_SUPABASE_URL. 공개 키는 PUBLIC_SUPABASE_PUBLISHABLE_KEY.
3. 공개 생성은 ASKIT_AI_ENABLED=true + ASKIT_PUBLIC_AI_ENABLED=true 및 유효한 DB 정책 필요. 개발 검수 전용 ASKIT_EVAL_ENABLED는 production에서 false.
4. 정책의 period_start/period_end와 한도를 명시적으로 설정해야 한다. 새 설치는 비활성 상태가 기본이며 월별 자동 갱신 없음.
5. Render에는 ASKIT_SITE_URL, ASKIT_EXPECT_GENERATION=true, 전용 ASKIT_MAINTENANCE_TOKEN만 설정. `render.yaml` 참고.
6. Vercel Production 도메인만 공개하고 Preview 보호 유지. Production 환경으로 새 빌드하여 공개 설정 반영.

## 커뮤니티 개통 조건
현재 PUBLIC_COMMUNITY_ENABLED=false. 데이터베이스와 연결 코드는 준비됐으나 도메인·SMTP가 없으므로 실제 학생의 인증 이메일 전달은 미검증이다. 사용자가 도메인 구매 후 메일 서비스를 연결하기로 선택했다.

도메인 인증, Supabase SMTP/사이트 URL/리디렉션 URL/인증번호 메일 템플릿 설정 후 서로 다른 두 실제 계정으로 가입, 글·댓글·이미지, 소유자 수정·삭제, 계정 삭제 요청 절차를 검수한 뒤 true로 변경한다. 인증을 해제해서 공개하지 않는다.

문의/삭제 요청: gsa.teamgemini@gmail.com.

## 검증 기록
- 자동 검증 147개 통과.
- 사용량·권한·기간 만료·월 경계 예산 검증 22개 통과(PGlite).
- 커뮤니티 DB 검증 26개 통과(PGlite). 실제 SMTP/클라우드 사용자 흐름 검증을 뜻하지 않는다.
- 보호 Preview 실제 Argon 요청 1건 성공: 모델 처리 16.694초, 추정 $0.015432. DB 정산 결과 complete 확인. 공개 Production도 아래 별도 요청으로 확인했다.

- 공개 Production 이미지 첨부 1건 성공: 모델 처리 23.105초, 추정 $0.018700. 입력에 이미지 1,089 토큰 포함. 실제 첨부 도형의 위치·색을 읽고 고정 문구·비율 조건에 반영, 복사·보관함 저장 확인. 최종 이미지를 이번 배포 점검에서 새로 생성했다는 뜻은 아니다.
- 이번 연결 실험 2건 합계 $0.034132(추정). 이전 품질 실험 및 사이트 밖 사용료는 제외.
- Render `crn-dbp3cdugekts73e3a6l0`: 실제 수동 실행 성공. 상태 확인+전용 인증이 있는 기록 정리 모두 통과, 매시간 17분 실행.
- 공개 GET / 및 /api/health 200. 관리·평가 API는 무인증 404, 다른 Origin 생성 403. 잘못된 JSON 요청이 500으로 분류되던 문제를 수정했고 공개 최종본에서 400 확인.
- 390px 홈·입력, 320px 직접 입력을 실제 브라우저로 검수. 가로 넘침 없음. Chrome 확장 자동 첨부는 로컬 파일 권한 제한이 있었고 기본 macOS 파일 선택 창으로 실제 첨부를 완료했다.
- 공개 생성·접근 동작을 검증했으며 이메일 인증 커뮤니티의 최종 개통을 의미하지 않는다.

## 도메인 후보
2026-11-10 Vercel Registrar 조회, 1년 등록/갱신 USD, 구매 전 변동 가능·세금 별도.
- askitcampus.com: $12.03 / $12.03 — 학생 대상이 분명한 1순위.
- getaskit.app: $14.99 / $15.00.
- askit.study: $1.99 / $35.56 — 갱신비가 높아 우선 추천하지 않음.
모두 조회 시 구매 가능. 구매는 사용자가 진행하며 아직 DNS·메일 도메인 연결 전이다.
