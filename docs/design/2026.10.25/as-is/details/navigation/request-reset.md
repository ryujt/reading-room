# 재설정 메일 요청 — AS-IS Navigation

> **DATE** 2026.10.25 · **기준** `952ac454` 소스 역추출. 실제 브라우저 관찰 전.
> [Job Flow](../jobflow/request-reset.md) · [핵심 화면](../../system-design-as-is.md#7-화면)

진입: Login의 Forgot 링크 또는 `/forgot` 직접 진입.

```navigation
Forgot --> (/request_reset) : 유효 이메일 제출
(/request_reset) --> ForgotSent : 200 안내
(/request_reset) --> Forgot : API 오류
Forgot --> Login : 돌아가기
ForgotSent --> Login : 돌아가기
```

| 화면·판단 | 주소·소유·Layout | 실제 근거·계약 |
|---|---|---|
| Forgot/ForgotSent | `/forgot`의 isEmailSent 변형, [Layout](../layout/forgot.md) | forgot.tsx:24–59/:62–99 |
| Login | `/login`, [Layout](../layout/login.md) | 명시적 Link |
| request_reset | POST `/api/v1/auth/forgot-password` | [API JF-4](../web-api.md#jf-4-비밀번호-재설정-요청과-실제-발송--forgotpassword--sendpasswordresetrequest) |

메일의 링크를 누르는 것은 다른 시나리오의 직접 URL 진입이다. UI sent 상태는 SMTP 전달 성공의 증거가 아니다. 새로고침 시 isEmailSent와 email draft는 초기화된다.
