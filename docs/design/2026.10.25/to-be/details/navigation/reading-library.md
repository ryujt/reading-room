# 개인 library 읽기 — TO-BE Navigation

> DATE2026.10.25 · R-01·R-02/C-03 제안. [Job Flow](../jobflow/reading-library.md) · [핵심 §7](../../system-design-to-be.md#7-화면--사용자는-어디를-오가나)

인증 후 기본 진입 또는 Sidebar의 Reading Room으로 들어온다. 직접 `/reading-room?link=id&status=READING&query=...`를 열면 허용 query를 파싱하고 list와 선택 detail을 독립 조회한다.

```navigation
Login --> (auth_guard) : 인증됨
(auth_guard) --> ReadingLibrary : 기본 허용 진입
LegacySidebar --> ReadingLibrary : Reading Room 선택
ReadingLibrary --> (/reading_list) : 최초 또는 검색 shelf 추가페이지
(/reading_list) --> ReadingLibrary : rows counts 또는 오류
ReadingLibrary --> (/reading_get) : article 선택
(/reading_get) --> ReadingDetail : 접근 가능한 link
(/reading_get) --> ReadingLibrary : 없는 link 또는 접근 회수
ReadingDetail --> ReadingLibrary : clean 닫기
ReadingLibrary --> SaveReadingLink : Save a link
```

| 화면·판단 | 주소·소유·Layout | 이동과 표시 |
|---|---|---|
| ReadingLibrary | `/reading-room`, [library](../layout/reading-library.md) | global shelf counts, 검색/선택 shelf 결과, 다음30개 |
| ReadingDetail | 같은주소 `?link=id`, [detail](../layout/reading-detail.md) | desktop side panel, mobile full overlay, 별도get loading/error |
| SaveReadingLink | 주소없는overlay, [save](../layout/reading-save.md) | 원본 링크 저장 |
| Login/auth_guard | [유지 로그인](../layout/login.md), [access](access.md) | 구독/onboarding/public 우선 분기는 access에 유지 |
| LegacySidebar | 기존 Dashboard/Links shell | 새 product 항목 추가, 기존 링크 그대로 |

search 입력은 local draft이고 Enter/Search로 URL을 바꾼다. dirty detail에서 URL을 바꾸면 [이탈 Guard](leave-draft.md)를 거친다. 직접 새로고침은 저장된 API 값에서 시작하며 in-memory 초안을 자동복원하지 않는다. 목록 오류는 같은 화면에 Retry, 검색 빈 결과는 Clear filters, 진짜 빈 library는 Save a link CTA다. feature는 현재 표시된 결과 안의 Reading article을 추천하며 전역 “읽는 글 없음”을 추측하지 않는다.
