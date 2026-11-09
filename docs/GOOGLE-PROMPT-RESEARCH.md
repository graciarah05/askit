# Google 공식 자료 조사와 Askit 적용 기준

확인일: 2026-11-10. 대상: 대학생의 요청문 작성과 Gemini에서의 후속 실행.

Google의 전체 공식 문서를 모두 읽었다고 주장하지 않는다. [공식 문서 목차](https://aistudio.google.com/llms.txt)에서 프롬프트·멀티모달·학습·모델 설정 영역을 식별하고, 아래 관련 문서의 원문과 예시를 확인했다. API 문서, Gemini 앱/Workspace 사용법, Google Cloud의 배포 설정을 구분했다. 특정 모델의 예시를 다른 모델의 지원 기능으로 간주하지 않았다.

## 확인한 자료와 적용

| 공식 자료 | 확인한 핵심 | Askit에 적용한 판단 |
|---|---|---|
| [Prompt design strategies](https://ai.google.dev/gemini-api/docs/prompting-strategies) | 명확한 작업·제약·출력, 예시, 구획, 반복 평가 | 사용자 조건과 자료를 분리하고 작업별 결과 기준을 제공. 프롬프트 길이를 품질 지표로 쓰지 않음 |
| [Workspace Prompting guide 101](https://workspace.google.com/resources/ai/writing-effective-prompts/) | 역할·작업·맥락·형식, 자연스러운 표현, 모든 요소를 매번 요구할 필요 없음 | 역할 선택을 필수 질문으로 추가하지 않음. 짧은 작업 설명으로 시작하고 세부 조건은 선택 |
| [Google for Education 활용 사례](https://edu.google.com/intl/ALL_us/resources/higher-edu-ai-use-cases/)와 [50+ 활용 가이드](https://docs.google.com/presentation/d/1lrc_upYHQlwLkRx9u86oiBWU8Th9pX5UUv8g6-L6u3o/edit) | 개념 이해, 수업 자료 기반 연습, 글 피드백, 진로 준비 등 실제 과업 예시 | 과목명 자체보다 현재 이해 수준·자료 범위·원하는 도움을 받음. 이 사례집은 Askit 수요나 재방문율을 입증하는 조사 자료가 아님 |
| [LearnLM 현황](https://aistudio.google.com/docs/learnlm.md), [학습 설계](https://cloud.google.com/solutions/learnlm) | 학습 기능은 Gemini에 통합. 학습 목적에 맞는 지시가 필요 | 별도 LearnLM 모델을 선택시키지 않음. 퀴즈는 학생 답변 전 정답을 숨기고, 설명은 이해 수준에 맞춤. 다른 연구의 학습 성과를 Askit 성과로 인용하지 않음 |
| [Files API의 미디어 프롬프트 전략](https://ai.google.dev/gemini-api/docs/files) | 참고할 부분과 원하는 추출 결과를 구체화. 단일 이미지는 작업 지시보다 앞에 배치 권장 | 첨부마다 용도와 참고 부분을 지정. 실제 바이너리를 작업 요청보다 먼저 전송. 단순 파일명으로 분석했다고 표시하지 않음 |
| [Image understanding](https://ai.google.dev/gemini-api/docs/image-understanding) | 이미지 이해는 실제 이미지 입력을 필요로 함 | 파일 목록 보관과 모델 분석을 구분. 선택한 이미지에 대해서만 관찰 결과를 표시 |
| [Document understanding](https://ai.google.dev/gemini-api/docs/document-processing) | PDF의 시각적 문맥, 선명도·방향, 형식별 처리 차이 | PPTX 디자인 참고는 PDF/이미지로 안내. 이 버전은 PNG/JPG/WebP/PDF 분석, 짧은 텍스트 본문 전달 지원 |
| [Long context](https://ai.google.dev/gemini-api/docs/long-context) | 긴 자료 뒤에 명확한 질문을 배치하는 전략. 자료가 길다고 무조건 성능이 좋아지지 않음 | 자료 뒤에 실행 요청을 다시 명시. 원문은 모델이 재작성하지 않고 서버가 보존하여 붙임 |
| [Image generation](https://ai.google.dev/gemini-api/docs/image-generation) | 목적·주체·배경·구도·문구·수정 범위, 구체적 장면 설명과 반복 수정 | 이미지 문구를 직접 입력하고 유지/변경 요소를 분리. 스타일 참고 속 수치·회사명은 새 결과의 사실로 옮기지 않음 |
| [Video generation 현황](https://ai.google.dev/gemini-api/docs/video), [Omni 프롬프트 가이드](https://ai.google.dev/gemini-api/docs/omni) | 장면·시간·카메라·소리·정확한 문구, 편집 범위를 좁혀 보존 | 촬영 기획과 생성 영상용 설명을 구분. 총시간과 장면 수를 각각 확인. 현재 Argon 연결이 영상 생성까지 제공한다고 표시하지 않음 |
| [Gemini 4 Argon 모델](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/4-argon), [개발 가이드](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/guides/gemini-4-argon) | 지원되는 추론 수준·출력 한도·지원하지 않는 설정 | 서버에서 모델 고정. LOW 기본, MEDIUM 비교. 다른 모델의 MINIMAL·thinking_budget·온도 조절 팁을 가져오지 않음 |
| [Interactions API](https://ai.google.dev/api/interactions) | 입력, system_instruction, 구조화 응답, 상태·사용량 | 서버 전용 키, store:false, 완료된 결과만 반환. 사용량과 지연 시간을 구분해 기록 |
| [Structured output](https://ai.google.dev/gemini-api/docs/structured-output) | 스키마 일치가 의미 정확성을 보장하지 않음 | JSON 검사와 최종 결과의 사실·조건 검사를 별도로 시행 |
| [Thinking](https://ai.google.dev/gemini-api/docs/thinking) | 추론 설정과 출력 예산의 관계 | 내부 사고 과정 공개를 요구하지 않음. 불완전 응답은 성공으로 취급하지 않음 |
| [Grounding with Google Search](https://ai.google.dev/gemini-api/docs/google-search) | 검색 도구를 실제 사용해야 최신 사실을 근거로 삼을 수 있음 | 프롬프트 작성 API에는 검색 도구를 붙이지 않음. 검색하지 않은 상태에서 출처를 만들지 않도록 제한. 최종 Gemini에서 도구가 있을 때만 검색 지시 |
| [Pricing](https://ai.google.dev/gemini-api/docs/pricing) | 모델·날짜·입출력·추론·캐시별 비용 | 모델이 보고한 사용량으로 추정. 학생 요금제와 API 사용료를 혼동하지 않음 |

음악 생성, 실시간 음성, 임베딩, 복잡한 자율 에이전트 예시는 현재 요청문 작성 범위에서 제외했다. 입력 질문을 늘리거나 새 API를 연결할 근거로 쓰지 않았다. 과거 Veo Preview 코드 등 종료된 예시는 새 연결에 사용하지 않았다. 공개 문서가 바뀔 수 있으므로 모델/도구를 추가할 때 다시 확인해야 한다.

## 반드시 필요한 조건과 선택 조건

| 분류 | 언제 필요한가 | 받는 방법 |
|---|---|---|
| 할 일과 결과 | 모든 작업 | 작업 선택 + 짧은 설명. 목록 밖 작업은 직접 설명 |
| 내용 근거 | 요약·자료 기반 퀴즈 | 붙여넣기 / 파일 / Gemini에서 나중에 첨부. 내용을 추측해 채우지 않음 |
| 제출·평가 조건 | 과제 안내가 있을 때 | 원문 입력 또는 과제 안내 파일. 선택한 기본값보다 우선 |
| 수량과 시간 | 발표·영상에 지정 조건이 있을 때 | 각각 독립 선택 또는 직접 입력. 지정하지 않은 수량을 필수 조건처럼 만들지 않음 |
| 이해 수준과 독자 | 결과 난이도에 영향을 줄 때 | 선택 사항. 이미 설명에 있으면 재질문하지 않음 |
| 참고 파일의 역할 | 파일을 사용할 때 | 내용 근거 / 과제 안내 / 디자인 / 수정할 원본 / 결과 형식 / 직접 설명 |
| 유지·변경 범위 | 이미지·슬라이드 수정 | 원본 첨부 + 변경 부분. 다른 요소를 임의로 바꾸지 않음 |
| 정확한 글자·비율 | 이미지에 해당 조건이 있을 때 | 문구를 그대로 입력, 비율은 직접 입력도 허용 |
| 핵심 조건 충돌 | 같은 우선순위의 필수 조건이 양립 불가 | 충돌한 두 조건을 짚는 질문 하나. 새 선택지나 추가 과제를 만들지 않음 |

사용자가 모르는 맥락을 억지로 채우게 하지 않는다. 선택하지 않은 맥락은 제안과 사실을 구분하며 처리한다. 파일 전송 여부는 명시적으로 선택하게 하고, 나중에 첨부할 자료 때문에 여기서 진행을 막지 않는다.

## 공식 가이드를 그대로 복사하지 않은 이유

- 일반 문서의 온도 조정 조언보다 Argon의 실제 지원 설정을 우선했다.
- few-shot 권장을 사용자에게 예시 제출을 강요하는 근거로 해석하지 않았다. 서버에는 충돌·나중 첨부·디자인 참고의 짧은 판단 예시를 넣었다. 이 변경만의 인과 효과는 별도 절제 실험으로 입증하지 않았다.
- 학습 설명에 도움 되는 사고 단계와 모델 내부 사고 과정 출력 요구를 구분했다.
- 구조화 출력은 형식 검증에 사용하고, 과제 품질은 동일 입력의 실제 결과로 비교했다.
- Gemini 앱에서 가능한 슬라이드·이미지 생성과 이번 Argon 텍스트 API의 기능을 분리했다. 이미지 참고를 읽는 것과 수정된 이미지 파일을 만드는 것은 다른 검증 항목이다.

실제 결과와 한계는 [ARGON-REVIEW.md](ARGON-REVIEW.md), 평가 규칙은 [ARGON-VALIDATION.md](ARGON-VALIDATION.md)에 기록한다. 원문 전체를 배포 ZIP에 재배포하지 않고 출처와 적용 판단만 제공한다.
