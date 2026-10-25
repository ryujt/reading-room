# 회원 가입 — AS-IS Job Flow

> **DATE** 2026.10.25 · **기준** `952ac454` · 소스 역추출, 실제 HTTP/브라우저 실행 전.
> [핵심 흐름](../../system-design-as-is.md#5-흐름) · [Navigation](../navigation/register.md) · [시스템 구성](../system-configuration.md)

## 1. 목적·트리거·완료

- 트리거: Register의 Sign up form 제출
- 완료 사실: User와 기본 dashboard sections가 생성되고 email설정에 따라 confirmation 또는 login으로 이동
- Browser는 사용자 입력·query/mutation을, API는 인증과 업무 판단·DB 호출을 소유한다. 원격 라이브러리 내부는 외부 경계다.

## 2. 경계 흐름과 계약

```jobflow
scope: register
Object: Browser, API
Browser.register --> API.registerUser
API.registerUser.response --> Browser.receiveResult
```

| 노드 | 입력·출력·실패 계약 |
|---|---|
| Browser.register | Register의 Sign up form 제출. 실제 진입과 입력 가드는 §3에 연결한다. |
| API.registerUser | POST `/api/v1/users`, name/email또는username/password/acceptPromotionalEmails.201 `{response:userWithoutPassword}`,400 schema/중복/차단/demo,401 invite조건. |
| Browser.receiveResult | 공개 API가 아닌 **응답 후 다음 동작 노드**다. registerUser의 response.ok:81와 router.push:89/:92, 실패toast:96 |

응답선은 해당 요청 결과를 받는 실행을 요약한다. API가 React callback을 직접 호출하거나 query/mutation 등록을 HTTP로 보낸다는 뜻이 아니다. transport/JSON 오류는 Browser에서 생길 수 있다.

## 3. 상위 노드 내부 추적

| 상위 노드 | 실제 진입·호출 근거 | 내부 Job Flow | 판정·중단 이유 |
|---|---|---|---|
| Browser.register | `pages/register.tsx:45` registerUser→fetch:68 | [Browser 내부](../browser.md#jf-3-등록복구-요청--registeruser--submitrequest--submit) | 펼침 — 입력/등록/HTTP/결과 수신을 구분 |
| API.registerUser | `pages/api/v1/users/index.ts:6` users→postUser:14, controller실제정의:17 | [API 내부](../web-api.md#jf-3-가입과-선택적-기존-사용자-조회--postuser--isauthenticatedrequest) | 펼침 — 권한/분기/Prisma·외부 호출을 추적 |
| Browser.receiveResult | registerUser의 response.ok:81와 router.push:89/:92, 실패toast:96 | [응답 소비](../browser.md#jf-3-등록복구-요청--registeruser--submitrequest--submit) | 펼침 — 원 요청자 callback 또는 query 이후 render. 별도 서버 서비스 아님 |
| 라이브러리·DB engine | 상세의 실제 호출/manifest·lockfile | [패키지 구성](../package-configuration.md) | 외부 경계 — app의 query·adapter를 확인한 뒤 외부 구현에서 중단 |

## 4. 정상 단계와 부작용

1. UI는 필수값과 8자password를 검사한다. API는 별도로 schema와 registration/invite조건을 검사한다.
2. isAuthenticatedRequest는 선택적 parent/admin조회이며 일반비인증가입도 가능하다. 중복user조회 뒤hashSync와nestedcreate가 수행된다.
3. password를제외한201응답이 돌아오면 email설정에맞춰다음화면으로 이동한다.

## 5. 실패·취소·재시도

이미 존재하는 email/username은400. 생성 성공 뒤 email발송이 실패해도 user create를 되돌리는 보상은 없다. UI fetch/parse exception의 catch/finally가 없어 pending표시가 남을 수 있다.

## 6. 근거·확인 한계

새 계정 생성은 읽기 상태 테이블 생성을 포함하지 않는다. 해당 모델은 원본에 없다.

코드상 동작과 실행 증거를 구분한다. 서비스·DB를 띄워 이 시나리오를 실행하지 않았다. 정적 검사나 대표 샘플 통과를 이 시나리오의 의미 승인으로 대체하지 않는다. 실제 소스 심볼·호출 줄과 내부 그림은 §3에서 찾을 수 있다.
