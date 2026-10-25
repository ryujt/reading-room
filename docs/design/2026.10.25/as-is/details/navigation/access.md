# 로그인과 진입 — AS-IS Navigation

> **DATE** 2026.10.25 · **기준** `952ac454` 소스 역추출. 실제 브라우저 관찰 전.
> [Job Flow](../jobflow/access.md) · [핵심 화면](../../system-design-as-is.md#7-화면)

진입: Login URL을 직접 열거나 보호 경로를 북마크로 연다. 보호 경로의 최초 판단은 auth_guard다. `/`의 Index는 고정 `/login` push이므로 독립 화면 노드를 만들지 않는다.

```navigation
(auth_guard) --> Login : 비인증 보호 경로
(auth_guard) --> Dashboard : 인증 후 비보호 경로
(auth_guard) --> Subscription : 비활성 구독
(auth_guard) --> MemberOnboarding : 이름 없는 구독 회원
(auth_guard) --> RequestedPage : 공개 또는 허용된 보호 경로
Login --> (/credentials) : 제출
(/credentials) --> Login : 일반 인증 오류
(/credentials) --> (/email_signin) : 이메일 미인증
(/email_signin) --> Confirmation : 메일 로그인 요청 후
(/credentials) --> (auth_guard) : session 인증됨
Login --> Register : 가입 링크
Login --> Forgot : 비밀번호 찾기
EmailClient --> (auth_guard) : 메일 링크 진입
(auth_guard) --> VerifyBridge : 비인증 auth verify 허용
VerifyBridge --> Login : token 또는 email 없음
VerifyBridge --> VerifyChoice : 모바일 UA와 앱 전환 설정
VerifyChoice --> NativeApp : 앱 열기
VerifyChoice --> (/email_callback) : 브라우저 계속
VerifyBridge --> (/email_callback) : 웹 분기
(/email_callback) --> (auth_guard) : NextAuth 토큰 소비 후 session
Confirmation --> (/email_resend) : 재발송
(/email_resend) --> Confirmation : 같은 안내 화면
```

| 화면·판단 | 주소·소유·Layout | 실제 근거·계약 |
|---|---|---|
| VerifyBridge/VerifyChoice | `/auth/verify`, [Layout](../layout/verify.md) | `apps/web/pages/auth/verify.tsx:35–74`, [Browser JF-10](../browser.md#jf-10-이메일-링크의-웹-bridge--verify) |
| EmailClient/NativeApp/email_callback | 외부 메일앱/native앱/NextAuth 계약 | 내부 Layout을 발명하지 않으며 URL 접점만 추적 |
| Login | `/login`, [Layout](../layout/login.md) | loginUser:40, signIn:48 |
| Confirmation | `/confirmation`, [Layout](../layout/confirmation.md) | email미인증 :61–68, resend:17 |
| Register/Forgot | `/register` [Layout](../layout/register.md), `/forgot` [Layout](../layout/forgot.md) | Login의 조건부 링크 |
| Dashboard | `/dashboard`, [Layout](../layout/dashboard.md) | AuthRedirect:71–75 |
| Subscription/MemberOnboarding | `/subscribe`, `/member-onboarding`; 제외 업무 목적지 | AuthRedirect:67–70. 결제 구매/초대 onboarding 자체는 개인독서 범위 밖이므로 Layout 확장 안 함 |
| RequestedPage/auth_guard | 실제 접근한 공개/보호 route | `layouts/AuthRedirect.tsx:27–85`, public우선:64 |
| credentials/email_signin/email_resend | NextAuth HTTP 계약 | [API JF-2](../web-api.md#jf-2-인증-provider와-callback--auth--authorize--callbacks) |

가드는 `_app`의 모든 page를 감싼다. session loading이면 children은 빈 fragment다. 원래 보호 URL을 callbackUrl로 보존하지 않으므로 로그인 성공을 “원래 링크 복귀”로 그리지 않는다. 이메일 signIn 성공 여부를 별도 검사하지 않고 confirmation으로 보낸다. 메일은 내부 `/auth/verify` bridge를 거친다. web은 callback으로 replace, 모바일 설정 분기는 앱 링크와 두 버튼을 표시한다. callback의 토큰 검증은 NextAuth 외부 계약이며 session이 바뀌면 가드를 다시 평가한다. 외부 provider 버튼은 해당 provider 페이지로 이동하며 그 원격 화면 내부는 분석 범위 밖이다.
