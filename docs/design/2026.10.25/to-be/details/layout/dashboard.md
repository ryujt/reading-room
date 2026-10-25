# Dashboard — TO-BE 유지 Layout

> **목표 기준** 2026.10.25 · **AS-IS 대비** 유지. [이번 기준선 원본](../../../as-is/details/layout/dashboard.md)의 도표와 내부 계약을 목표에서도 유지한다. 아래 코드는 upstream 952ac454의 확인된 근거이며 목표 실행을 검증했다는 뜻이 아니다. [목표 핵심](../../system-design-to-be.md) C-05의 회귀 검증 대상이다.

> **DATE** 2026.10.25 · **기준** `952ac454` 소스 역추출. 브라우저 픽셀 관찰 전.
> **주소·식별자** `/dashboard` · **소유** Browser
> [핵심 화면 색인](../../system-design-to-be.md#7-화면--사용자는-어디를-오가나) · [Navigation](../navigation/browse-links.md)


**크기 표기**: 도표의 가중치는 영역 관계를 읽기 위한 값이며 코드의 실제 폭이나 픽셀 비율이 아니다. 실제 flex/grid·고정 크기·반응형 조건은 아래 소스 근거를 따른다. 단, NewLink의 3:2와 1:1 열 관계처럼 명시한 grid 관계는 소스에서 확인한 사실이다.

```layout
DashboardShell > Sidebar : 22, DashboardBody : 78
DashboardBody V DashboardToolbar, OrderedSections
DashboardToolbar > Heading : 65, LayoutAndViewControls : 35
OrderedSections V StatsSection, RecentSection, PinnedSection, CollectionSection
StatsSection > LinkCount : 25, CollectionCount : 25, TagCount : 25, PinnedCount : 25
```

OrderedSections는 고정4단계가 아니라 user.dashboardSections의 order순 반복이다. 그림은 기본STATS/RECENT/PINNED에collectionsection이추가된 예시이며 없는section은생략한다. Announcement는 MainLayout wrapper 안 Sidebar 앞의 조건부 sibling이며 `apps/web/components/Announcement.tsx:20`의 fixed bottom overlay다. 본문 공간을 차지하지 않아 위 본문 트리에서 분리한다.

| 영역 | 입력·출력 | 상호작용·상태 | 근거 |
|---|---|---|---|
| Sidebar | user/collections/localcollapse | Links/Search/collection/NewLink 진입 | `layouts/MainLayout.tsx:51`, `components/Sidebar.tsx` |
| Toolbar | viewMode, sections | view/layout dropdown. layout설정 업무는 제외 경계 | `pages/dashboard.tsx:138–150` |
| OrderedSections | 정렬sections와 API데이터 | Section render, 최근·pin·collection카드에서상세drawer/보존읽기 | :89–95/:152–174, [API JF-13](../../../as-is/details/web-api.md#jf-13-dashboard-section별-조회--getdashboarddata) |
| Skeleton | sections[0] 없음 |4통계skeleton 뒤3본문skeleton, 빈설정과loading분리를보장하지않음 | :175–186 |
| NewLink | localnewLinkModal | 조건부overlay. [NewLink](new-link.md) | :198–203 |

본문은 h-screen·overflow-y-auto, Sidebar펼침large에서 calc(100%-288px), 그외calc(100%-56px), mobilebottompadding20 (`MainLayout.tsx:56–59`). 통계는 mobile세로, sm2열, xl가로(:177); card개수반응형은 [Links](links.md)다. Survey는 Stripe·3일경과·referredBy null일때 나타나는 범위밖 제품조사dialog(:73–87/190)이며 개인독서업무 Layout으로 확장하지 않는다.
