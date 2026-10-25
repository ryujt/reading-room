# 로그인과 기본 진입 — AS-IS Job Flow

> **DATE** 2026.10.25 · **기준** `952ac454` · 소스 역추출, 실제 HTTP/브라우저 실행 전.
> [핵심 흐름](../../system-design-as-is.md#5-흐름) · [Navigation](../navigation/access.md) · [시스템 구성](../system-configuration.md)

## 1. 목적·트리거·완료

- 트리거: 비인증 사용자가 Login의 credentials form을 제출
- 완료 사실: JWT session을 받은 뒤 AuthRedirect가 공개/구독/onboarding/보호 경로 조건에 맞는 화면을 표시
- Browser는 사용자 입력·query/mutation을, API는 인증과 업무 판단·DB 호출을 소유한다. 원격 라이브러리 내부는 외부 경계다.

## 2. 경계 흐름과 계약

```jobflow
scope: access
Object: Browser, API
Browser.signIn --> API.authenticate
API.authenticate.response --> Browser.receiveResult
```

| 노드 | 입력·출력·실패 계약 |
|---|---|
| Browser.signIn | 비인증 사용자가 Login의 credentials form을 제출. 실제 진입과 입력 가드는 §3에 연결한다. |
| API.authenticate | POST `/api/v1/auth/callback/credentials` 등 NextAuth의 basePath `/api/v1/auth`; credentials 결과의 ok/error와 session. 이메일 미확인은 email signIn을 별도로 시작한다. NextAuth 프로토콜 내부는 외부 경계. |
| Browser.receiveResult | 공개 API가 아닌 **응답 후 다음 동작 노드**다. `layouts/AuthRedirect.tsx:27–85` effect와 redirectTo:87; login error처리는 `login.tsx:58–68` |

응답선은 해당 요청 결과를 받는 실행을 요약한다. API가 React callback을 직접 호출하거나 query/mutation 등록을 HTTP로 보낸다는 뜻이 아니다. transport/JSON 오류는 Browser에서 생길 수 있다.

## 3. 상위 노드 내부 추적

| 상위 노드 | 실제 진입·호출 근거 | 내부 Job Flow | 판정·중단 이유 |
|---|---|---|---|
| Browser.signIn | `apps/web/pages/login.tsx:40` loginUser→signIn:48; `_app.tsx:50–53` SessionProvider | [Browser 내부](../browser.md#jf-2-인증-입력과-화면-가드--loginuser--authredirect) | 펼침 — 입력/등록/HTTP/결과 수신을 구분 |
| API.authenticate | `pages/api/v1/auth/[...nextauth].ts:194` auth→NextAuth:200→Credentials authorize:61 | [API 내부](../web-api.md#jf-2-인증-provider와-callback--auth--authorize--callbacks) | 펼침 — 권한/분기/Prisma·외부 호출을 추적 |
| Browser.receiveResult | `layouts/AuthRedirect.tsx:27–85` effect와 redirectTo:87; login error처리는 `login.tsx:58–68` | [응답 소비](../browser.md#jf-2-인증-입력과-화면-가드--loginuser--authredirect) | 펼침 — 원 요청자 callback 또는 query 이후 render. 별도 서버 서비스 아님 |
| 라이브러리·DB engine | 상세의 실제 호출/manifest·lockfile | [패키지 구성](../package-configuration.md) | 외부 경계 — app의 query·adapter를 확인한 뒤 외부 구현에서 중단 |

## 4. 정상 단계와 부작용

1. credential 값으로 signIn을 요청한다. provider authorize는 user를 조회하고 email verification 조건과 password를 검사한다.
2. NextAuth가 JWT/session callback을 실행하며 token.id가 session.user에 전달된다.
3. AuthRedirect는 public을 먼저 허용하고 inactive subscription/onboarding/기본dashboard/미인증login을 구분한다.

## 5. 실패·취소·재시도

잘못된 credentials는 toast로 Login 유지. Email not verified는 email provider 호출 뒤 confirmation. 보호 경로의 최초 목적지를 복귀 URL로 저장하는 코드가 없어 로그인 후 원래 링크로 돌아간다고 보장하지 않는다. 전송 exception에서 loader복구가 완전하지 않다.

## 6. 근거·확인 한계

외부 OAuth의 원격 로그인 화면과 `/subscribe`, `/member-onboarding`의 독립 업무는 범위 밖 목적지이며 Navigation에서 표시한다. API의 verifyUser와 NextAuth session callback의 구독 반환 처리 차이는 [API JF-14](../web-api.md#jf-14-api-구독-가드--verifysubscription).

코드상 동작과 실행 증거를 구분한다. 서비스·DB를 띄워 이 시나리오를 실행하지 않았다. 정적 검사나 대표 샘플 통과를 이 시나리오의 의미 승인으로 대체하지 않는다. 실제 소스 심볼·호출 줄과 내부 그림은 §3에서 찾을 수 있다.
