# 메일 인증 링크 소비 — AS-IS Navigation

> DATE 2026.10.25 · 소스 분석 · [Job Flow](../jobflow/verify-email-link.md)

```navigation
EmailClient --> (auth_guard) : auth verify 링크
(auth_guard) --> Dashboard : 이미 인증된 비보호 진입
(auth_guard) --> VerifyBridge : 비인증 허용
VerifyBridge --> Login : token 또는 email 없음
VerifyBridge --> VerifyChoice : 모바일과 앱 설정
VerifyChoice --> NativeApp : 앱 링크
VerifyChoice --> (/email_callback) : 브라우저 계속
VerifyBridge --> (/email_callback) : 웹 replace
(/email_callback) --> (auth_guard) : session 변경
```

VerifyBridge/VerifyChoice는 [Verify Layout](../layout/verify.md), Login/Dashboard와 auth_guard는 [접근 Navigation](access.md)을 재사용한다. native 앱과 메일앱은 외부 화면이다. source는 `apps/web/pages/auth/verify.tsx:35–74`; config가 준비되지 않으면 bridge effect는 이동하지 않는다. 인증된 사용자의 가드와 bridge effect는 서로 다른 React 수명이므로 최종 경쟁 결과를 실행 확인했다고 주장하지 않는다.
