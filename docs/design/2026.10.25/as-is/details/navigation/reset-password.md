# 새 비밀번호 설정 — AS-IS Navigation

> **DATE** 2026.10.25 · **기준** `952ac454` 소스 역추출. 실제 브라우저 관찰 전.
> [Job Flow](../jobflow/reset-password.md) · [핵심 화면](../../system-design-as-is.md#7-화면)

진입: 메일 링크 `/auth/reset-password?token=...`로 직접 진입한다.

```navigation
ResetPassword --> (/reset_password) : 새 비밀번호 제출
(/reset_password) --> ResetSuccess : 200 성공
(/reset_password) --> ResetPassword : 만료 또는 잘못된 입력
ResetSuccess --> Login : 돌아가기
```

| 화면·판단 | 주소·소유·Layout | 실제 근거·계약 |
|---|---|---|
| ResetPassword/ResetSuccess | 같은 URL, [Layout](../layout/reset-password.md) | reset-password.tsx:28–63/:65–109 |
| Login | `/login`, [Layout](../layout/login.md) | 성공 후 Link:101 |
| reset_password | POST `/api/v1/auth/reset-password` | [API JF-5](../web-api.md#jf-5-비밀번호-재설정-소비--resetpassword) |

최초 router.query.token을 form state에 넣고 후속 query 변경을 동기화하는 effect는 없다. 오류는 같은 입력 화면의 toast이며 성공은 입력을 제거한 안내 상태다. 비밀번호가 바뀌었다고 session을 자동 발급하는 흐름은 없다.
