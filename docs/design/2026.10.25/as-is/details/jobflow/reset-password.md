# 재설정 토큰 소비 — AS-IS Job Flow

> **DATE** 2026.10.25 · **기준** `952ac454` · 소스 역추출, 실제 HTTP/브라우저 실행 전.
> [핵심 흐름](../../system-design-as-is.md#5-흐름) · [Navigation](../navigation/reset-password.md) · [시스템 구성](../system-configuration.md)

## 1. 목적·트리거·완료

- 트리거: 메일의 `/auth/reset-password?token=...`에서 새 비밀번호 제출
- 완료 사실: User.password가 갱신되고 token만료 처리 뒤 UI에 성공 문구와 Login 링크 표시
- Browser는 사용자 입력·query/mutation을, API는 인증과 업무 판단·DB 호출을 소유한다. 원격 라이브러리 내부는 외부 경계다.

## 2. 경계 흐름과 계약

```jobflow
scope: reset_password
Object: Browser, API
Browser.resetPassword --> API.resetPassword
API.resetPassword.response --> Browser.receiveResult
```

| 노드 | 입력·출력·실패 계약 |
|---|---|
| Browser.resetPassword | 메일의 `/auth/reset-password?token=...`에서 새 비밀번호 제출. 실제 진입과 입력 가드는 §3에 연결한다. |
| API.resetPassword | POST `/api/v1/auth/reset-password`, `{password,token}`;200성공문구,400schema/demo/invalidtoken. |
| Browser.receiveResult | 공개 API가 아닌 **응답 후 다음 동작 노드**다. submit response.ok:52→requestSent:54, 실패toast:56 |

응답선은 해당 요청 결과를 받는 실행을 요약한다. API가 React callback을 직접 호출하거나 query/mutation 등록을 HTTP로 보낸다는 뜻이 아니다. transport/JSON 오류는 Browser에서 생길 수 있다.

## 3. 상위 노드 내부 추적

| 상위 노드 | 실제 진입·호출 근거 | 내부 Job Flow | 판정·중단 이유 |
|---|---|---|---|
| Browser.resetPassword | `pages/auth/reset-password.tsx:28` submit→fetch:41 | [Browser 내부](../browser.md#jf-3-등록복구-요청--registeruser--submitrequest--submit) | 펼침 — 입력/등록/HTTP/결과 수신을 구분 |
| API.resetPassword | `pages/api/v1/auth/reset-password.ts:6` resetPassword, hash:32/token조회:35 | [API 내부](../web-api.md#jf-5-비밀번호-재설정-소비--resetpassword) | 펼침 — 권한/분기/Prisma·외부 호출을 추적 |
| Browser.receiveResult | submit response.ok:52→requestSent:54, 실패toast:56 | [응답 소비](../browser.md#jf-3-등록복구-요청--registeruser--submitrequest--submit) | 펼침 — 원 요청자 callback 또는 query 이후 render. 별도 서버 서비스 아님 |
| 라이브러리·DB engine | 상세의 실제 호출/manifest·lockfile | [패키지 구성](../package-configuration.md) | 외부 경계 — app의 query·adapter를 확인한 뒤 외부 구현에서 중단 |

## 4. 정상 단계와 부작용

1. 최초 query의 token이 local form state에 들어간다. API는 schema를통과한password를해시한뒤 유효token을찾는다.
2. user update, tokenexpires update, 오래된token deleteMany를순서대로실행한다.
3.200이면입력폼을성공화면으로교체한다.

## 5. 실패·취소·재시도

token없음/만료는400. 여러DBwrite는단일transaction이아니므로 password변경후token만료실패가가능하다. UI는newpassword초안을저장하지않으며reload시초기화된다.

## 6. 근거·확인 한계

해시 결과는 user update에 쓰이고 token조회입력은 token/expires이다. 둘을결과전달선으로혼동하지않는다.

코드상 동작과 실행 증거를 구분한다. 서비스·DB를 띄워 이 시나리오를 실행하지 않았다. 정적 검사나 대표 샘플 통과를 이 시나리오의 의미 승인으로 대체하지 않는다. 실제 소스 심볼·호출 줄과 내부 그림은 §3에서 찾을 수 있다.
