# 메일 인증 링크 소비 — TO-BE 변경 Navigation

> **목표 기준** 2026.10.25 · **AS-IS 대비** 변경. 메일 bridge는 유지하고 이미 인증된 기본 목적지는 C-06을 적용한다. [이번 기준선 원본](../../../as-is/details/navigation/verify-email-link.md)의 도표와 내부 계약을 목표에서도 유지한다. 아래 코드는 upstream 952ac454의 확인된 근거이며 목표 실행을 검증했다는 뜻이 아니다. [목표 핵심](../../system-design-to-be.md) C-05의 회귀 검증 대상이다.

> DATE 2026.10.25 · 소스 분석 · [Job Flow](../jobflow/verify-email-link.md)

```navigation
EmailClient --> (auth_guard) : auth verify 링크
(auth_guard) --> ReadingLibrary : 이미 인증된 비보호 진입
(auth_guard) --> VerifyBridge : 비인증 허용
VerifyBridge --> Login : token 또는 email 없음
VerifyBridge --> VerifyChoice : 모바일과 앱 설정
VerifyChoice --> NativeApp : 앱 링크
VerifyChoice --> (/email_callback) : 브라우저 계속
VerifyBridge --> (/email_callback) : 웹 replace
(/email_callback) --> (auth_guard) : session 변경
```

VerifyBridge/VerifyChoice는 [Verify Layout](../layout/verify.md), Login/ReadingLibrary와 auth_guard는 [접근 Navigation](access.md)을 재사용한다. native 앱과 메일앱은 외부 화면이다. source는 `apps/web/pages/auth/verify.tsx:35–74`; config가 준비되지 않으면 bridge effect는 이동하지 않는다. 인증된 사용자의 가드와 bridge effect는 서로 다른 React 수명이므로 최종 경쟁 결과를 실행 확인했다고 주장하지 않는다.


C-06의 ReadingLibrary는 [새 Layout](../layout/reading-library.md)이며 인증된 비보호 진입의 목적지만 변경한다. token 소비와 모바일 bridge는 원본 계약을 유지한다.
