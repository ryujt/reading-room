# 초기 데이터 읽기 — AS-IS Navigation

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
