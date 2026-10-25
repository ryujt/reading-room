# 초기 데이터 읽기 — TO-BE 유지 Navigation

> **목표 기준** 2026.10.25 · **AS-IS 대비** 유지. [이번 기준선 원본](../../../as-is/details/navigation/initial-data.md)의 도표와 내부 계약을 목표에서도 유지한다. 아래 코드는 upstream 952ac454의 확인된 근거이며 목표 실행을 검증했다는 뜻이 아니다. [목표 핵심](../../system-design-to-be.md) C-05의 회귀 검증 대상이다.

> DATE 2026.10.25 · [Job Flow](../jobflow/initial-data.md)

이 과업은 화면별 query 상태 갱신이며 전용 새 화면을 만들지 않는다. 결과를 받아 실제 이동하는 주체는 AuthRedirect다.

```navigation
RequestedPage --> (auth_guard) : session와 user config 상태
(auth_guard) --> RequestedPage : 허용
(auth_guard) --> Login : 비인증 보호 경로
(auth_guard) --> Dashboard : 인증 비보호 경로
(auth_guard) --> Subscription : 비활성 구독
(auth_guard) --> MemberOnboarding : 이름 없는 회원
```

[접근 Navigation](access.md)에 route별 의미와 Login/Dashboard Layout이 있다. Sidebar 선택지와 NewLink collection input은 [Links](../layout/links.md), [NewLink](../layout/new-link.md)에서 읽는다. query가 로딩된다는 이유로 별도 로딩 route를 발명하지 않는다.
