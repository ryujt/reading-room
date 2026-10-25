# 가입 — TO-BE 유지 Navigation

> **목표 기준** 2026.10.25 · **AS-IS 대비** 유지. [이번 기준선 원본](../../../as-is/details/navigation/register.md)의 도표와 내부 계약을 목표에서도 유지한다. 아래 코드는 upstream 952ac454의 확인된 근거이며 목표 실행을 검증했다는 뜻이 아니다. [목표 핵심](../../system-design-to-be.md) C-05의 회귀 검증 대상이다.

> **DATE** 2026.10.25 · **기준** `952ac454` 소스 역추출. 실제 브라우저 관찰 전.
> [Job Flow](../jobflow/register.md) · [핵심 화면](../../system-design-to-be.md#7-화면--사용자는-어디를-오가나)

진입: Login의 가입 링크 또는 `/register` 직접 진입. 이미 인증되면 access 가드가 우선 적용된다.

```navigation
Register --> (validate_registration) : 제출
(validate_registration) --> Register : 필수값 또는 비밀번호 오류
(validate_registration) --> (/users_post) : 유효 입력
(/users_post) --> Register : API 오류
(/users_post) --> (/registration_email) : 생성 성공과 이메일 설정
(/registration_email) --> Confirmation : 메일 로그인 요청 후
(/users_post) --> Login : 생성 성공과 이메일 미설정
Register --> Login : 로그인 링크
```

| 화면·판단 | 주소·소유·Layout | 실제 근거·계약 |
|---|---|---|
| Register | `/register`, [Layout](../layout/register.md) | registerUser:45, local가드:49–61 |
| Confirmation/Login | [Confirmation](../layout/confirmation.md), [Login](../layout/login.md) | register.tsx:81–96 |
| users_post/registration_email | POST users, signIn email | [API JF-3](../../../as-is/details/web-api.md#jf-3-가입과-선택적-기존-사용자-조회--postuser--isauthenticatedrequest) |

등록 비활성 설정에서는 form 대신 안내문이 표시된다. 서버 오류는 toast와 같은 form이며 transport exception은 loader가 남을 수 있다. Back/새로고침은 draft를 복원하지 않는다. 신규 User가 생성된 뒤 메일 발송 문제로 되돌아가도 계정 생성은 이미 남아 있을 수 있다.
