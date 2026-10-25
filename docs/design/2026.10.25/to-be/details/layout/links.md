# Links — TO-BE 유지 Layout

> **목표 기준** 2026.10.25 · **AS-IS 대비** 유지. [이번 기준선 원본](../../../as-is/details/layout/links.md)의 도표와 내부 계약을 목표에서도 유지한다. 아래 코드는 upstream 952ac454의 확인된 근거이며 목표 실행을 검증했다는 뜻이 아니다. [목표 핵심](../../system-design-to-be.md) C-05의 회귀 검증 대상이다.

> **DATE** 2026.10.25 · **기준** `952ac454` 소스 역추출. 브라우저 픽셀 관찰 전.
> **주소** `/links`, `/links/pinned`, `/search?q=...`, `/collections/[id]`, `/tags/[id]` · **소유** Browser
> [핵심 화면 색인](../../system-design-to-be.md#7-화면--사용자는-어디를-오가나) · [Navigation](../navigation/browse-links.md)


**크기 표기**: 도표의 가중치는 영역 관계를 읽기 위한 값이며 코드의 실제 폭이나 픽셀 비율이 아니다. 실제 flex/grid·고정 크기·반응형 조건은 아래 소스 근거를 따른다. 단, NewLink의 3:2와 1:1 열 관계처럼 명시한 grid 관계는 소스에서 확인한 사실이다.

```layout
LibraryShell > Sidebar : 22, ScrollBody : 78
ScrollBody V CollectionHeaderConditional, ListToolbar, SelectionBarConditional, EmptyConditional, LinkResults
ListToolbar > HeadingOrSearchDescription : 65, EditSortView : 35
LinkResults > CardOne : 25, CardTwo : 25, CardThree : 25, CardFour : 25
CardOne V Preview, IconAndName, URLAndFormats, CollectionAndDate
```

4열은 window폭881–1500px에서 columns=auto인 CardView의 대표 상태다. 동일 row를 보장하지 않는 Masonry는 다른 renderer이며 아래 List 구조와도 다르다. Announcement는 MainLayout wrapper에서 Sidebar보다 앞에 등록되는 조건부 sibling이지만 fixed overlay이므로 위 본문 트리에는 포함하지 않는다. `apps/web/components/Announcement.tsx:20`은 bottom-20/sm:bottom-10, z-30, 내부 max-w-md다. 본문 위쪽 공간을 차지하는 영역이 아니다.

```layout
ListResult V LinkRow, LoadingSentinel
LinkRow > Thumbnail : 12, LinkInformation : 76, HoverActions : 12
LinkInformation V Name, URLDescription, FormatsCollectionDate
```

```layout
MobileLibrary > CompactSidebar : 14, MobileBody : 86
MobileBody V MobileToolbar, SingleColumnCards, Sentinel
MobileToolbar > MobileHeading : 60, MobileControls : 40
SingleColumnCards V PreviewMobile, NameMobile, URLFormatsMobile, FooterMobile
```

| 영역 | 입력·출력 | 상호작용·상태 | 실제 근거 |
|---|---|---|---|
| Shell | user/collection/sidebarcollapse | Sidebar의 NewLink/Search/Links/collection으로 진입. 본문 h-screen scroll, mobilebottompadding20 | `layouts/MainLayout.tsx:42–62` |
| Heading/Toolbar | route와sort/view/edit state | all/pinned/search 제목이 다르며 공통 LinkListOptions는 children 뒤 Edit/Sort/View 순서 | `pages/links/index.tsx:38–55`, `pages/search.tsx:43–60`, `components/LinkListOptions.tsx:119–150` |
| CollectionHeader | activeCollection/name/color/owner | collection route에만 header·team/share·description·subcollection 영역을 toolbar앞에 표시. CRUD 메뉴는 범위 밖 | `pages/collections/[id].tsx:116` 이후 |
| SelectionBar | editMode·selectedIds | editMode+links있는 경우만 bulk선택bar가 toolbar뒤에 삽입. bulk업무는 제외하되 배치는 숨기지 않음 | `LinkListOptions.tsx:154` 이후 |
| Empty | !isLoading && no links | `/links`는 NoLinksFound, search는 nothing_found 문단. error전용 region은 없음 | `pages/links/index.tsx:57`, `pages/search.tsx:62` |
| Card | local show settings·linkformats | 이름/URL/형식/collection/date는 show 설정에 따라 숨김. info/actions→drawer, format→viewer, original→새tab | `LinkViews/LinkComponents/LinkCard.tsx:150–183` 및 앞 JSX |
| List | same link data | row형 thumbnail+정보, footerdivider, hoveractions overlay. Public은pin숨김 | `LinkViews/LinkComponents/LinkList.tsx:115–137` |
| Sentinel | hasNextPage/isLoading/inView | loading card/row 표시. inView && hasNextPage && !isFetchingNextPage이면fetchNextPage | `LinkViews/Links.tsx:141–149/:344–353/:376–387` |

`Links.tsx:409/426/443`은 List/Masonry/기본Card를 택일한다. Card 자동열은≤500:1,501–700:2,701–880:3,881–1500:4,≥1501:5(:62–69); 설정이0이 아니면 고정 columns1–8을 사용한다. Masonry도 별도 계산함수:194–201를 사용한다. 창폭1023이하에는 drag가 꺼진다(:405). 메타데이터를 모두 항상 보이는 수직 필드로 가정하지 않는다.

목록의 서버 계약은[검색 JobFlow](../jobflow/browse-links.md), 추가창은[NewLink](new-link.md), 상세는[LinkDrawer](link-drawer.md), 공개 collection은별도[PublicCollection](public-collection.md)이다. 보존 pending일 때 query polling으로 같은카드가 갱신되며 다른페이지로 이동하지 않는다.

태그 route는 같은 toolbar/Links renderer를 재사용한다. `apps/web/pages/tags/[id].tsx:24`가 positive finite id를 만들고 useTag:35와 useLinks({tagId}):54를 각각 실행한다. heading은 hash icon+activeTag.name이며 이름 변경 상태는 input/check/cancel로 바뀐다(:153–179). metadata query 오류는 dashboard로 보낸다(:59–62). links가 비면 this_tag_has_no_links 안내(:227 이후)를 표시한다. 이 화면의 rename/delete 메뉴는 범위 밖 태그 관리 진입으로 표시하며 독서 목록 탐색과 혼합하지 않는다.
