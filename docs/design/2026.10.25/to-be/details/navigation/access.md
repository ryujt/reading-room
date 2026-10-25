# 로그인과 진입 — TO-BE 변경 Navigation

> **목표 기준** 2026.10.25 · **AS-IS 대비** 변경. 인증 계약은 유지하고 기본 목적지를 변경한다. [이번 기준선 원본](../../../as-is/details/navigation/access.md)의 도표와 내부 계약을 목표에서도 유지한다. 아래 코드는 upstream 952ac454의 확인된 근거이며 목표 실행을 검증했다는 뜻이 아니다. [목표 핵심](../../system-design-to-be.md) C-05의 회귀 검증 대상이다.

> **DATE** 2026.10.25 · **기준** `952ac454` 소스 역추출. 실제 브라우저 관찰 전.
> [Job Flow](../jobflow/access.md) · [핵심 화면](../../system-design-to-be.md#7-화면--사용자는-어디를-오가나)

진입: Login URL을 직접 열거나 보호 경로를 북마크로 연다. 보호 경로의 최초 판단은 auth_guard다. `/`의 Index는 고정 `/login` push이므로 독립 화면 노드를 만들지 않는다.

```navigation
(auth_guard) --> Login : 비인증 보호 경로
(auth_guard) --> ReadingLibrary : 인증 후 비보호 경로
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
| VerifyBridge/VerifyChoice | `/auth/verify`, [Layout](../layout/verify.md) | `apps/web/pages/auth/verify.tsx:35–74`, [Browser JF-10](../../../as-is/details/browser.md#jf-10-이메일-링크의-웹-bridge--verify) |
| EmailClient/NativeApp/email_callback | 외부 메일앱/native앱/NextAuth 계약 | 내부 Layout을 발명하지 않으며 URL 접점만 추적 |
| Login | `/login`, [Layout](../layout/login.md) | loginUser:40, signIn:48 |
| Confirmation | `/confirmation`, [Layout](../layout/confirmation.md) | email미인증 :61–68, resend:17 |
| Register/Forgot | `/register` [Layout](../layout/register.md), `/forgot` [Layout](../layout/forgot.md) | Login의 조건부 링크 |
| ReadingLibrary | `/reading-room`, [Layout](../layout/reading-library.md) | C-06 제안: AuthRedirect:71–75의 기본 목적지 변경 |
| Subscription/MemberOnboarding | `/subscribe`, `/member-onboarding`; 제외 업무 목적지 | AuthRedirect:67–70. 결제 구매/초대 onboarding 자체는 개인독서 범위 밖이므로 Layout 확장 안 함 |
| RequestedPage/auth_guard | 실제 접근한 공개/보호 route | `layouts/AuthRedirect.tsx:27–85`, public우선:64 |
| credentials/email_signin/email_resend | NextAuth HTTP 계약 | [API JF-2](../../../as-is/details/web-api.md#jf-2-인증-provider와-callback--auth--authorize--callbacks) |

가드는 `_app`의 모든 page를 감싼다. session loading이면 children은 빈 fragment다. 원래 보호 URL을 callbackUrl로 보존하지 않으므로 로그인 성공을 “원래 링크 복귀”로 그리지 않는다. 이메일 signIn 성공 여부를 별도 검사하지 않고 confirmation으로 보낸다. 메일은 내부 `/auth/verify` bridge를 거친다. web은 callback으로 replace, 모바일 설정 분기는 앱 링크와 두 버튼을 표시한다. callback의 토큰 검증은 NextAuth 외부 계약이며 session이 바뀌면 가드를 다시 평가한다. 외부 provider 버튼은 해당 provider 페이지로 이동하며 그 원격 화면 내부는 분석 범위 밖이다.


## 목표 변경 — 기본 진입

C-06은 AuthRedirect의 protected 목록에 `/reading-room`을 추가하고, 인증 후 비보호 경로의 기본 목적지를 `/reading-room`으로 바꾼다. 기존 구독·회원 이름·public 우선 판단은 유지한다. Index의 `/login` 진입도 같은 가드를 거친다. 새 기본 진입은 실제 로그인과 원본 보존 읽기가 검증된 통합 단계에서만 켠다. 원래 임의 보호 URL로 자동 복귀하는 새 계약은 추가하지 않는다. [Browser JF-6](../browser.md#jf-6-실제-서비스-조립--readingroompage) · [목표 Layout](../layout/reading-library.md).
