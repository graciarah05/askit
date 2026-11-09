> 연결 전의 설계 기록입니다. 현재 상태는 [ARGON-SETUP.md](ARGON-SETUP.md), 실제 검증은 [ARGON-REVIEW.md](ARGON-REVIEW.md)를 참고하세요.

# Argon 연결과 만들기 개선의 순서

2026-11-10 조사. 결론: 최소 API 경로를 먼저 연결하고, 실제 결과·지연·비용을 측정하면서 입력 화면과 생성 규칙을 함께 개선하는 편이 타당하다. 이번 변경은 학생 혜택 링크 교체이며 Argon 호출을 구현하거나 실행하지 않았다.

## 근거와 현재 상태

현재 `compileRequest`는 입력값과 고정 규칙으로 요청문을 조합한다. 파일은 로컬에 보관하고 이미지/PDF/PPTX를 분석하지 않는다. 앞선 실험은 Gemini 웹의 Flash 표시 환경으로, Argon API의 품질·응답시간을 입증하지 않는다.

Google 공식 문서에서 공개 모델 `gemini-4-argon`, 시스템 지침, 구조화 출력과 이미지 등 멀티모달 입력 지원을 확인했다. 이미지 자체의 출력은 지원 대상으로 표시되지 않는다. 사고 수준은 LOW/MEDIUM/HIGH이고 기본값은 MEDIUM이다. MINIMAL이나 thinking_budget은 지원하지 않으며 temperature/top_p/top_k 사용자 설정은 무시된다. 따라서 기존 모델의 설정을 그대로 옮기거나 temperature만 바꿔 품질을 조정하는 방법은 적합하지 않다. 이 세부 사항은 Google Cloud 공식 모델 문서 기준이며 실제 채택할 Developer API의 설정·지원 형식은 연결 시 다시 확인한다.

- [Argon 모델 명세](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/4-argon)
- [Argon 개발 가이드](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/guides/gemini-4-argon)
- [공식 공개 안내](https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-argon/)

## 권장 구현

1. 기존 화면과 조합기를 보존한 채 Vercel 서버에서 Argon을 호출하는 최소 경로를 만든다. 키는 서버에만 보관하고 요청당 사용량·지연·실패를 기록한다.
2. 사용자 작업, 명시적 선택, 첨부 용도를 입력으로 전달한다. 출력은 `ready` 또는 `needs_clarification`, 최종 프롬프트, 확인된 조건, 필요한 질문 하나로 나눈다. 구조화된 형태라도 내용이 옳은지는 별도 검사한다.
3. 설명 한 줄과 첨부로 시작한다. 자료에 적힌 분량·평가 기준을 추출해 짧은 요약으로 보여주고 수정할 수 있게 한다. 학교·전공·기한을 추측해 채우지 않는다. 필수 정보가 충분하면 추가 질문 없이 생성한다.
4. 단일 호출을 우선 시험하고 LOW/MEDIUM을 비교한다. 모든 요청을 HIGH나 다중 검토 호출로 처리하는 선택은 실제 품질 이득과 대기시간을 확인한 뒤 결정한다. 실패·시간 초과 시 입력은 유지하고 기존 조합 방식으로 이어갈 수 있게 한다.
5. 현재 로컬 보관만 한다는 첨부 안내는 실제 Google 전송 흐름에 맞춰 수정한다. 과제 내용과 디자인 참고는 끝까지 구분한다.

[구조화 출력 문서](https://ai.google.dev/gemini-api/docs/structured-output)는 형식 준수와 의미적 정확성을 구별하며 애플리케이션의 검증을 권고한다.

## 파일에서 먼저 검증할 부분

PPTX를 선택할 수 있다는 사실이 API에서 슬라이드 배치를 읽는다는 뜻은 아니다. 디자인 템플릿은 PDF 또는 슬라이드 이미지로 변환해 텍스트뿐 아니라 레이아웃을 전달하는 경로를 먼저 검증한다. 이미지와 PDF를 최소 연결에 포함하고, 문서 변환 실패와 작은 글자 인식도 검사한다. Argon이 참조를 읽어 프롬프트를 만드는 것과 최종 이미지/PPT를 만드는 것은 별도 단계다.

- [문서 이해](https://ai.google.dev/gemini-api/docs/document-processing)
- [파일 입력 방식](https://ai.google.dev/gemini-api/docs/file-input-methods)

## 품질 판단

동일 사용자 입력·첨부·최종 결과 생성 모델을 고정해 다음 세 경로를 비교한다: 직접 요청, 현재 조합 프롬프트, Argon 생성 프롬프트. 프롬프트의 길이나 문체보다 이를 실행한 최종 결과의 조건 준수·원문 충실성·템플릿 용도 반영을 평가한다. 누락/충돌 시 질문 수, 첫 결과 성공률, 수정 횟수, 응답시간의 중앙값/95백분위, 요청당 실제 비용도 함께 측정한다. 작은 고정 사례를 반복한 뒤 실제 학생의 비교 평가로 확대한다. 첨부를 보지 않고 읽었다고 하거나, 없는 사실·출처를 만드는 경우는 치명적인 실패로 분리한다.

모델의 공개 벤치마크는 Askit의 프롬프트 생성 품질을 보장하지 않는다. LOW도 고정된 시간이나 비용 상한을 보장하지 않는다. 서비스 예산과 기본 대기시간 기준은 실측 전 가정으로 명시한다.

[공식 가격 공지](https://cloud.google.com/blog/products/ai-machine-learning/gemini-4-argon-available-on-google-cloud)는 2026-11-30까지 입력/출력 100만 토큰당 $2/$10, 이후 $4/$20을 안내한다. 실제 채택 경로의 가격표와 추론 토큰 등 청구 사용량을 확인한 뒤 예산을 확정한다. 학생용 웹 요금제 혜택을 서비스 API 예산으로 간주하지 않는다. [API 청구 안내](https://ai.google.dev/gemini-api/docs/billing).

## 이번 링크 변경

현재 혜택 버튼과 신청 기한 종료 뒤 버튼을 모두 `https://gemini-google.kr/askit`으로 교체했다. 정적 빌드와 단일 HTML에도 반영했으며 실제 화면의 버튼 href를 확인했다. 외부 가입이나 결제는 실행하지 않았다.
