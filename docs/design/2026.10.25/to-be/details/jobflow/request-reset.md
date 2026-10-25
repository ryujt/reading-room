# 재설정 이메일 요청 — TO-BE 유지 Job Flow

> **목표 기준** 2026.10.25 · **AS-IS 대비** 유지. [이번 기준선 원본](../../../as-is/details/jobflow/request-reset.md)의 도표와 내부 계약을 목표에서도 유지한다. 아래 코드는 upstream 952ac454의 확인된 근거이며 목표 실행을 검증했다는 뜻이 아니다. [목표 핵심](../../system-design-to-be.md) C-05의 회귀 검증 대상이다.

> **DATE** 2026.10.25 · **기준** `952ac454` · 소스 역추출, 실제 HTTP/브라우저 실행 전.
> [핵심 흐름](../../system-design-to-be.md#5-흐름--경계끼리-어떻게-소통하나) · [Navigation](../navigation/request-reset.md) · [시스템 구성](../system-configuration.md)

## 1. 목적·트리거·완료

- 트리거: Forgot form에 이메일을 넣고 Send reset link 클릭
- 완료 사실: 200을 받은 UI가 sent 안내를 표시; SMTP 전달 완료는 이 응답의 보장이 아님
- Browser는 사용자 입력·query/mutation을, API는 인증과 업무 판단·DB 호출을 소유한다. 원격 라이브러리 내부는 외부 경계다.

## 2. 경계 흐름과 계약

```jobflow
scope: request_reset
Object: Browser, API
Browser.requestReset --> API.requestPasswordReset
API.requestPasswordReset.response --> Browser.receiveResult
```

| 노드 | 입력·출력·실패 계약 | AS-IS 대비 |
|---|---|---|
| Browser.requestReset | Forgot form에 이메일을 넣고 Send reset link 클릭. 실제 진입과 입력 가드는 §3에 연결한다. | 유지 |
| API.requestPasswordReset | POST `/api/v1/auth/forgot-password`, `{email}`;200응답문구,400 demo/schema/최근5분3회이상/사용자없음. | 유지 |
| Browser.receiveResult | 공개 API가 아닌 **응답 후 다음 동작 노드**다. submitRequest의 response.ok:35→setIsEmailSent:37, error:39 | 유지 |

응답선은 해당 요청 결과를 받는 실행을 요약한다. API가 React callback을 직접 호출하거나 query/mutation 등록을 HTTP로 보낸다는 뜻이 아니다. transport/JSON 오류는 Browser에서 생길 수 있다.

## 3. 상위 노드 내부 추적

| 상위 노드 | 실제 진입·호출 근거 | 내부 Job Flow | 판정·중단 이유 |
|---|---|---|---|
| Browser.requestReset | `pages/forgot.tsx:43` sendConfirmation→submitRequest:51, fetch:25 | [Browser 내부](../../../as-is/details/browser.md#jf-3-등록복구-요청--registeruser--submitrequest--submit) | 펼침 — 입력/등록/HTTP/결과 수신을 구분 |
| API.requestPasswordReset | `pages/api/v1/auth/forgot-password.ts:6` forgotPassword→sendPasswordResetRequest:57 미await | [API 내부](../../../as-is/details/web-api.md#jf-4-비밀번호-재설정-요청과-실제-발송--forgotpassword--sendpasswordresetrequest) | 펼침 — 권한/분기/Prisma·외부 호출을 추적 |
| Browser.receiveResult | submitRequest의 response.ok:35→setIsEmailSent:37, error:39 | [응답 소비](../../../as-is/details/browser.md#jf-3-등록복구-요청--registeruser--submitrequest--submit) | 펼침 — 원 요청자 callback 또는 query 이후 render. 별도 서버 서비스 아님 |
| 라이브러리·DB engine | 상세의 실제 호출/manifest·lockfile | [패키지 구성](../package-configuration.md) | 외부 경계 — app의 query·adapter를 확인한 뒤 외부 구현에서 중단 |

## 4. 정상 단계와 부작용

1. API는 schema·빈도·사용자순서로검사한다.
2. helper는 random token을24시간만료로 DB에생성하고 template을읽어 SMTP를시작한다. API는 helper Promise를기다리지않고200을보낸다.
3. 화면은 sent문구와Login링크로바뀐다.

## 5. 실패·취소·재시도

존재하지않는email은400으로구별된다. helper의DB/template/메일오류는이미보낸응답을실패로바꾸지못한다. 취소/back은이미시작한서버작업을취소하지않는다.

## 6. 근거·확인 한계

메일링크의 token 소비는 [별도 시나리오](reset-password.md)다.

코드상 동작과 실행 증거를 구분한다. 서비스·DB를 띄워 이 시나리오를 실행하지 않았다. 정적 검사나 대표 샘플 통과를 이 시나리오의 의미 승인으로 대체하지 않는다. 실제 소스 심볼·호출 줄과 내부 그림은 §3에서 찾을 수 있다.
