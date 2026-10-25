# Public collection — TO-BE 유지 Layout

> **목표 기준** 2026.10.25 · **AS-IS 대비** 유지. [이번 기준선 원본](../../../as-is/details/layout/public-collection.md)의 도표와 내부 계약을 목표에서도 유지한다. 아래 코드는 upstream 952ac454의 확인된 근거이며 목표 실행을 검증했다는 뜻이 아니다. [목표 핵심](../../system-design-to-be.md) C-05의 회귀 검증 대상이다.

> **DATE** 2026.10.25 · **기준** `952ac454` 소스 역추출. 브라우저 픽셀 관찰 전.
> **주소·식별자** `/public/collections/[id]` · **소유** Browser
> [핵심 화면 색인](../../system-design-to-be.md#7-화면--사용자는-어디를-오가나) · [Navigation](../navigation/view-public.md)


**크기 표기**: 도표의 가중치는 영역 관계를 읽기 위한 값이며 코드의 실제 폭이나 픽셀 비율이 아니다. 실제 flex/grid·고정 크기·반응형 조건은 아래 소스 근거를 따른다. 단, NewLink의 3:2와 1:1 열 관계처럼 명시한 grid 관계는 소스에서 확인한 사실이다.

```layout
PublicCollection V Header, Separator, Controls, TagsConditional, LinkResults
Header > CollectionIdentity : 82, BrandThemeRSS : 18
CollectionIdentity V Name, AuthorAndTeam, Description
Controls > Search : 65, SortAndView : 35
```

| 영역 | 입력·출력 | 상호작용·상태 | 근거 |
|---|---|---|---|
| Header | collection/owner/members | avatarstack클릭→읽기전용Team,description,브랜드/theme/RSS | `pages/public/collections/[id]/index.tsx:121–232` |
| Controls | query.q/sort/viewMode | public컬렉션내검색,sort/view. 개인Sidebar없음 | :234–254 |
| Tags | publictags | all/tagchip이q를바꾸고목록조회. chipwrap | :256–295 |
| LinkResults | usePublicLinks | commonLinks renderer; publicactions는info,edit/delete숨김 | :298–307 |

collection없으면빈화면(:100),metadata400이면dashboard로push(:77)하고비인증이면가드가login으로보낸다. 오류전용문구는없다. max1500px,lg75%폭,작은폭100%+p5(:121),header2열은작은폭에서도유지하고긴title는실제CSS에따른다. [Links의card/list/masonry](links.md), [공개계약](../jobflow/view-public.md).
