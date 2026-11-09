# Askit Argon 연결 상태와 설정

2026-11-10 / v1.2.0

## 현재 완료된 설정

- Vercel 프로젝트: `askit` / `prj_l4fdI3sARxD8P2cQdyyAWmuZtADl`
- 사용자가 저장한 `GEMINI_API_KEY`로 실제 `gemini-4-argon` 호출 성공.
- 모델은 `server/gemini.js`에서 지정한다. Google AI Studio의 대화 화면에서 모델을 선택할 필요는 없다.
- 키는 서버 환경 변수에만 있으며 브라우저 코드·빌드·검수 기록에 포함하지 않는다.
- 보호된 Preview에서만 AI 생성 기능을 켠다. 테스트 링크를 열려면 해당 Vercel 계정으로 로그인해야 한다.

| 환경 변수 | 값/유형 | 범위 |
|---|---|---|
| GEMINI_API_KEY | 사용자가 입력한 키 / Secret | Preview |
| ASKIT_AI_ENABLED | true / Config | Preview |
| GEMINI_THINKING_LEVEL | low / Config | Preview |
| ASKIT_PREVIEW_PROTECTION_CONFIRMED | true / Config | Preview, Vercel 인증 유지 |
| ASKIT_EVAL_ENABLED | false / Config | 최종 Preview에서는 고정 사례 실험 기능 종료 |

[Vercel 설정 열기](https://vercel.com/graciarah05-2261s-projects/askit/settings/environment-variables). 값을 변경하면 새로 배포해야 기존 배포에 적용된다. 키는 채팅에 보내지 않는다.

## 호출 흐름

1. 사용자가 작업과 필요한 조건을 작성한다.
2. 브라우저가 같은 사이트의 `/api/prompt`에 요청한다.
3. 서버가 길이·파일 형식·용도·필수 조건을 검사하고 Argon에 보낸다.
4. 완료 응답의 구조를 검사하고, 원문과 파일 목록을 보존하여 요청문을 만든다.
5. 사용자가 확인한 뒤 Gemini 앱에 복사한다. 이미지·PDF 등의 원본은 Gemini에도 첨부한다.

API는 최종 과제나 이미지를 생성하는 서비스가 아니라, 그 작업을 요청할 프롬프트를 만드는 단계다. 검증에서 최종 결과까지 API로 생성한 것은 비교 실험이며 일반 이용 흐름에는 그 추가 호출이 없다.

## 대기·오류·파일

- 자동 재시도 없음. 진행 시간 표시, 한 번 눌러 기본 프롬프트로 전환 가능.
- 오류가 나도 입력 유지. 기본 프롬프트로 계속하거나 사용자가 재시도할 수 있음.
- 중요 조건 충돌 시 질문 한 번. 이미 받은 조건이나 선택적 취향은 다시 묻지 않음.
- 보관용 첨부: 최대 5개, 파일당 20MB, 합계 50MB.
- 실제 분석용 바이너리: PNG/JPG/WebP/PDF 합계 2.5MB. 각 파일에서 분석을 직접 선택.
- 짧은 TXT/MD/CSV는 본문을 전달. 용도에 따라 내용·디자인·형식을 구분.
- `store:false`는 Interactions 대화 저장을 끄는 설정이다. Google의 모든 운영상 보존까지 없다고 보장하는 문구로 쓰지 않는다.

## 공개 서비스 전환 전 남은 사항

현재 공개 Production의 유료 API는 코드에서 비활성화되어 있다. 배포가 성공했다고 불특정 사용자에게 유료 호출을 개방한 상태는 아니다.

공개 전에는 서버 인스턴스 간에 공유되는 호출 제한·예산 한도, 이용자 식별/남용 방지 방식, 초과 시 처리, 운영 알림을 연결하고 검증해야 한다. 현재의 동시 요청 2개 제한은 한 실행 인스턴스에서만 적용되므로 일일 비용 제한이 아니다. Google 예산 알림도 그 자체로 강제 차단이라는 뜻은 아니다.

공유형 커뮤니티는 기존 별도 Supabase 구성을 유지하며 이번 작업에서 연결하지 않았다. AI 연결 완료가 커뮤니티 운영 준비 완료를 뜻하지 않는다.

## 개발·검증

Node 22에서 `npm ci`, `npm test`, `npm run build`, `npm start` 순으로 실행한다. 로컬에서 실제 API를 쓸 때만 `.env.example`을 참고해 `.env.local`에 별도 키를 넣는다. `.env.local`은 배포 ZIP이나 Git에 포함하지 않는다.

`qa/argon/serve-fixture.mjs`는 성공·오류·대기 화면을 검사하는 가짜 응답 서버다. 해당 서버에서 보이는 결과를 실제 Argon 품질 증거로 사용하지 않는다. 실제 호출 기록은 `qa/argon/live-results.json`이다.
