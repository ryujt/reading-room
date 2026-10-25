# 메일 인증 링크 소비 — AS-IS Job Flow

> DATE 2026.10.25 · 기준 `952ac454` · 소스 분석, 실행 전
> [핵심](../../system-design-as-is.md#5-흐름) · [Navigation](../navigation/verify-email-link.md)

## 1. 목적·트리거·완료

- 트리거: 메일에서 /auth/verify 링크를 열기.
- 완료: 웹 callback으로 인증을 계속하거나 모바일 앱 선택 버튼을 표시한다.
- Browser가 입력과 표시를, API가 해당 계약과 영속 결과를 소유한다.

## 2. 그림과 계약

아래 그림은 웹 callback 분기를 선택한 실행이다. 모바일 자동 앱 전환에서는 이 HTTP callback을 호출하지 않으며 선택 화면에 남을 수 있다.

```jobflow
scope: email_link_consume
Object: Browser, Auth
Browser.openEmailLink --> Auth.emailCallback
Auth.emailCallback.response --> Browser.evaluateAccess
```

| 노드 | 실제 계약 |
|---|---|
| Browser.openEmailLink | 부모 가드가 허용한 비인증 진입에서 token/email/config/UA 판단. missing input이면 login; 모바일 설정이면 native app 링크와 선택 UI. |
| Auth.emailCallback | 웹 분기 GET `/api/v1/auth/callback/email?token&email`; NextAuth가 검증 token을 소비하고 session을 만든다. 실패 시 라이브러리 오류 처리. |
| Browser.evaluateAccess | 공개 API가 아닌 session 변경 후 다음 동작. AuthRedirect가 목적지를 결정. |

## 3. 내부 추적

| 상위 노드 | 실제 진입·호출 근거 | 내부 Job Flow | 판정·중단 이유 |
|---|---|---|---|
| Browser.openEmailLink | `apps/web/pages/auth/verify.tsx:35–51` | [내부](../browser.md#jf-10-이메일-링크의-웹-bridge--verify) | 펼침 — 실제 호출·조건·결과 소비 |
| Auth.emailCallback | `apps/web/pages/api/v1/auth/[...nextauth].ts:200` | [내부](../web-api.md#jf-2-인증-provider와-callback--auth--authorize--callbacks) | 외부 경계 — NextAuth 프로토콜 내부는 lockfile 버전에서 중단 |
| Browser.evaluateAccess | `apps/web/layouts/AuthRedirect.tsx:27–85` | [내부](../browser.md#jf-2-인증-입력과-화면-가드--loginuser--authredirect) | 펼침 — 실제 호출·조건·결과 소비 |

## 4. 정상 흐름

웹 callback으로 인증을 계속하거나 모바일 앱 선택 버튼을 표시한다. 각 노드의 입력 가드와 반환 소비자는 위 내부 그림의 실제 심볼에서 이어진다. 응답선은 원 요청자의 다음 동작을 나타내며 API가 React 함수를 직접 호출한다는 뜻이 아니다.

## 5. 실패·취소·재시도

웹은 location.replace를 사용한다. 모바일 선택 UI의 Continue in browser는 href를 사용한다. app 링크 성공 여부를 확인하여 자동으로 fallback하는 코드는 없다. config가 준비되지 않으면 effect는 반환하며 의존성은 router.isReady와 config다.

## 6. 근거·한계

외부 메일 클라이언트와 native 앱 내부는 분석하지 않는다. 메일 생성은 API JF-17, 웹 bridge는 Browser JF-10이며 설정 이메일 변경 verify-email route와 다르다. 실제 HTTP와 화면 결과는 아직 실행하지 않았다.
