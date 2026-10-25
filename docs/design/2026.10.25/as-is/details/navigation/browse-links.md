# 목록 탐색 — AS-IS Navigation

> **DATE** 2026.10.25 · **기준** `952ac454` 소스 역추출. 실제 브라우저 관찰 전.
> [Job Flow](../jobflow/browse-links.md) · [핵심 화면](../../system-design-as-is.md#7-화면)

진입: Dashboard·Links·Search·collection route 직접 진입 또는 Sidebar 선택.

```navigation
(access_check) --> Login : 비인증 보호 경로
(access_check) --> LinksPage : 허용된 목록 경로
Dashboard --> LinksPage : 전체 또는 고정 링크 선택
LinksPage --> SearchResults : 검색어 제출
LinksPage --> CollectionLinks : Sidebar의 특정 컬렉션 선택
LinksPage --> CollectionsIndex : Sidebar의 Collections 관리 진입
LinkDrawer --> TagLinks : 태그 클릭
LinksPage --> TagLinks : 카드 태그 클릭
TagLinks --> Dashboard : metadata query 오류
LinksPage --> NewLinkModal : 새 링크
LinksPage --> LinkDrawer : 상세 열기
LinkDrawer --> LinksPage : 닫기
```

| 화면·판단 | 주소·소유·Layout | 실제 근거·계약 |
|---|---|---|
| CollectionsIndex | `/collections`, 범위 밖 관리 탐색 | `apps/web/components/Sidebar.tsx:151`, `pages/collections/index.tsx:21`; [제외 판정](../layout/index.md#제외비화면-판정) |
| Dashboard | `/dashboard`, [Layout](../layout/dashboard.md) | dashboard.tsx:31, sections |
| TagLinks | `/tags/:id`, [같은 Layout](../layout/links.md) | `apps/web/pages/tags/[id].tsx:35/:54/:59–62`; useTag 실패는 dashboard |
| LinksPage/SearchResults/CollectionLinks | `/links`, `/links/pinned`, `/search`, `/collections/:id`, [Layout](../layout/links.md) | route별 useLinks 입력. 검색은query.q,collection은query.id |
| NewLinkModal/LinkDrawer | [NewLink](../layout/new-link.md), [Drawer](../layout/link-drawer.md) | Sidebar state / LinkActions state |
| Login/access_check | [Login](../layout/login.md), [인증](access.md) | AuthRedirect |

sort/view/filter와 infinite scroll은 같은 화면의 상태 변화이므로 모든 query 호출을 이동 노드로 그리지 않는다. 목록 poll도 화면 이동이 아니다. 주소 직접 진입과 새로고침은 서버 데이터를 다시 읽고 view/sort는 localStorage에 의존한다. 본문에는 API 오류 전용 화면이 없을 수 있다. 브라우저 Back은 주소 이력으로 돌아가며 route 없는 drawer의 draft를 지키는 가드는 없다.
