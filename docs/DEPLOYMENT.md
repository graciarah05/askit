# Askit 운영 구성 — 2026-11-10

## 구성
- Vercel: 화면, Argon 프롬프트 API, 상태 확인·기록 정리 API. 공개 주소 https://myaskit.com/. 기존 Vercel 주소는 그대로 유지하며 www는 기본 주소로 308 이동한다.
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

## 커뮤니티 개통
Vercel Production·Preview에 PUBLIC_COMMUNITY_ENABLED=true 설정을 저장했다. 새 빌드부터 반영한다. 도메인 myaskit.com과 HTTPS, Resend의 auth.myaskit.com 발송 도메인 인증, Supabase SMTP 연결을 완료했다. 가입·로그인 메일은 한국어 인증번호 방식이다.

공개 전 격리된 로컬 화면을 실제 Supabase·Resend에 연결해 두 실제 계정으로 인증, 공유 글·댓글·좋아요, 소유자 수정, 이미지 업로드를 검수했다. 다른 계정의 글 수정·삭제 및 소유자 위조는 실제 authenticated 역할로 거부됨을 확인했다. 승인받은 검수 글 두 개를 화면에서 삭제했고 연결된 댓글·좋아요·저장 이미지까지 0건을 확인했다. 검수 계정은 삭제하지 않았다. 인증과 RLS를 유지한다.

Resend의 Delivered 상태는 수신 메일 서버의 수락을 뜻하며 Gmail 기본 받은편지함 배치를 보증하지 않는다. 계정 삭제 요청은 아래 운영 이메일에서 수동 처리하며 이번 검수에서 계정 자체를 삭제하지 않았다. 무료 메일 발송 한도는 하루 100통·월 3,000통이다.

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
- 위 자동 검증과 기존 생성 실험은 이전 배포에서 실행한 결과다. 이번 도메인 연결 후 복잡한 팀 일정 프롬프트 생성 1건을 추가 확인했으며 DB 정산 complete, 추정 $0.014222였다. 새 요청의 정확한 대기시간은 별도로 측정하지 않았다.
- 실제 커뮤니티 검증 범위는 위 개통 항목에 기록했다. 최종 공개 주소 확인 결과는 로컬 qa/paired/launch/release-results.json에 별도로 기록한다.

## 도메인·메일 연결 — 2026-11-10
- 구매: 가비아 myaskit.com. 가비아 DNS 사용 유지.
- 웹 DNS: A @ → 216.150.1.1, 216.150.16.1 / CNAME www → e81616e90196db25.vercel-dns-016.com. 실제 Vercel 프로젝트의 추천값을 확인해 적용.
- Vercel: 두 도메인 소유 확인, DNS 정상, 자동 갱신 HTTPS 인증서 발급. 실제 기본 주소 200, www 308→기본 주소, /api/health 200 확인.
- Supabase Site URL: https://myaskit.com. 인증번호 입력 방식이므로 임의 리디렉션·와일드카드는 추가하지 않음.
- Resend: 무료 플랜, Tokyo, auth.myaskit.com 인증 완료. 발신자 Askit <login@auth.myaskit.com>, smtp.resend.com:465, 사용자 resend. 비밀키는 Supabase SMTP에만 저장하며 저장소·문서에는 기록하지 않음.
- Render 점검 주소를 myaskit.com으로 변경하고 배포 완료. 2026-11-10 12:29 KST 수동 실행에서 상태 확인·인증된 기록 정리 성공을 확인했다.

## Render Pro 필요성 검토 — 2026-11-10
현재 작업 공간은 Hobby($0 + 개별 서비스 사용료). 연결된 작업은 기존 puang-api와 Askit 점검 작업 2개이며, 월 사용량은 8MB/5GB, 빌드 1분/500분, 서비스 2개/25개였다. Askit 점검은 최근 3회 모두 성공. 짧은 작업의 CPU·메모리 시계열은 조회 결과가 없어 부하 성능을 단정하지 않는다.

현재 계정에 제시된 Pro는 월 $25 + 별도 서비스 사용료이며, 팀원 초대·수평 자동 확장·추가 환경 등이 주된 차이. Askit 요청은 Vercel/Gemini와 Supabase가 처리하므로 현 구성에서는 Pro로 얻는 직접적인 사용자 성능 이익이 없다. Hobby 유지. 기존 puang-api 비용과 Askit 비용을 구분하며 결제 화면의 전체 작업 공간 예상액을 Askit 비용으로 간주하지 않는다.

근거: https://render.com/pricing , https://render.com/docs/cronjobs#compute-plans-and-billing , 연결된 작업 공간 Billing·서비스·실행 로그.

## 모바일 흐름 수정 — 2026-11-10
- 실제 공개 모바일 화면에서 잘못된 인증번호의 권한 오류 문구와 새로고침 시 인증 단계 유실을 확인하고 수정. 이메일·발송 시각만 탭에 최대 1시간 보관하며 인증번호는 저장하지 않는다. 발송 간격 안내, 지속되는 오류 안내, 이메일 수정·재발송을 제공한다.
- Google 도구를 열기 전에 다시 첨부할 실제 파일명과 파일 받기 버튼을 표시한다. 텍스트가 프롬프트에 포함된 경우와 Notebook 소스, Flow 클립별 이미지를 구분한다.
- 실제 Gemini 이미지 화면에서 첨부·붙여넣기·16:9 설정·생성까지 완료. 한 사례의 흐름 검증이며 일반 프롬프트 대비 우월성 검증은 아니다.
- 관련 자동 검증 155개 통과. 모바일 화면별 결과와 최종 배포 확인은 qa/mobile-production-audit/에 기록한다.
