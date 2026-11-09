> 연결 전의 설계 기록입니다. 현재 상태는 [ARGON-SETUP.md](ARGON-SETUP.md), 실제 검증은 [ARGON-REVIEW.md](ARGON-REVIEW.md)를 참고하세요.

# Gemini API 연결 시 이어갈 구조

현재 앱은 Google 계정에 접근하지 않고, Gemini 모델을 호출하지 않습니다. `compileRequest(draft)`가 반환한 요청을 사용자가 직접 복사합니다.

API 단계에서는 Vercel의 서버 함수에서만 Gemini 키를 읽어야 합니다. `public/config.js`나 `PUBLIC_` 환경변수에 Gemini 키를 넣으면 안 됩니다. 비밀 키는 서버 전용 `GEMINI_API_KEY`로 분리합니다. 현재 배포물에는 이 키나 호출 경로가 없습니다.

1. 현재 입력 자료와 작성 지침을 서버에서 분리합니다. 신뢰할 수 있는 규칙은 시스템 지침에, 사용자 자료는 별도의 데이터로 전달합니다. 길이·파일 형식·요청 횟수를 서버에서도 검증합니다.
2. 그때 사용 가능한 모델과 기능을 공식 문서에서 다시 확인합니다. 특정 모델명이나 temperature 값을 현재 UI의 고정 규칙으로 두지 않았습니다. 최신 모델은 매개변수 지원이 다르므로 과거의 설정을 그대로 옮기지 않습니다.
3. 최신 출처 확인은 실제 Google Search grounding 도구 설정과 응답의 grounding metadata를 사용합니다. 요청문에 “검색해”라고 적는 것만으로 검색이 활성화되지는 않습니다.
4. 응답 형식을 JSON으로 받을 경우 모델이 지원하는 스키마를 확인하고 서버에서 검증합니다. 형식 통과를 사실 정확성 통과로 해석하지 않습니다.
5. 자동 사고 기능이 있는 모델에 불필요하게 전체 사고 과정 출력을 요구하지 않습니다. 사용자에게는 결과, 필요한 출처, 한계만 제시합니다.
6. 실패·시간 초과·취소·재시도·비용 한도를 추가합니다. API 장애가 있어도 기존 복사 방식으로 계속 쓸 수 있게 유지합니다.
7. `qa/prompt-v2/cases.json`의 비교 과제를 같은 모델·조건에서 반복하고, 학생에게 결과를 가린 채 평가받습니다. 이번 소규모 확인만으로 일반적인 품질 우위를 보장하지 않습니다.

근거: [Google prompting strategies](https://ai.google.dev/gemini-api/docs/prompting-strategies), [Thinking](https://ai.google.dev/gemini-api/docs/thinking), [Grounding](https://ai.google.dev/gemini-api/docs/google-search), [모델별 지침](https://ai.google.dev/gemini-api/docs/gemini-3). 확인: 2026-11-09.

첨부 연결 시: 현재 IndexedDB의 파일 ID는 서버 파일 ID가 아닙니다. 업로드 API를 별도로 만들고 사용자 동의 흐름·서버 측 크기/형식 검사·보관 기간/삭제·타임아웃을 적용해야 합니다. `attachmentManifest`의 용도를 Gemini 파일/inlineData와 일치시킵니다. 프롬프트에 파일명을 적는 것만으로 모델이 파일을 읽을 수 있지는 않습니다. 저장소 부족 시 파일이 사라지면 재첨부를 요청해야 합니다.
