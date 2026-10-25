# 목록·검색·대시보드 조회 — TO-BE 유지 Job Flow

> **목표 기준** 2026.10.25 · **AS-IS 대비** 유지. [이번 기준선 원본](../../../as-is/details/jobflow/browse-links.md)의 도표와 내부 계약을 목표에서도 유지한다. 아래 코드는 upstream 952ac454의 확인된 근거이며 목표 실행을 검증했다는 뜻이 아니다. [목표 핵심](../../system-design-to-be.md) C-05의 회귀 검증 대상이다.

> **DATE** 2026.10.25 · **기준** `952ac454` · 소스 역추출, 실제 HTTP/브라우저 실행 전.
> [핵심 흐름](../../system-design-to-be.md#5-흐름--경계끼리-어떻게-소통하나) · [Navigation](../navigation/browse-links.md) · [시스템 구성](../system-configuration.md)

## 1. 목적·트리거·완료

- 트리거: 보호 목록/검색/collection route 진입 또는 sort/filter/스크롤 변화
- 완료 사실: 허용 collection의 link page가 표시되고 nextCursor가 있으면 추가 페이지를 가져온다
- Browser는 사용자 입력·query/mutation을, API는 인증과 업무 판단·DB 호출을 소유한다. 원격 라이브러리 내부는 외부 경계다.

## 2. 경계 흐름과 계약

```jobflow
scope: browse_links
Object: Browser, API
Browser.loadLinks --> API.searchLinks
API.searchLinks.response --> Browser.receiveResult
```

Dashboard 진입의 별도 GET과 태그 metadata는 search 응답에서 이어지는 호출이 아니다. 각 query가 독립적으로 실행된다.

```jobflow
scope: dashboard_read
Object: Browser, API
Browser.openDashboard --> API.getDashboard
API.getDashboard.response --> Browser.showDashboard
```

```jobflow
scope: tag_metadata
Object: Browser, API
Browser.openTag --> API.getTag
API.getTag.response --> Browser.showTagHeading
```

| 노드 | 입력·출력·실패 계약 | AS-IS 대비 |
|---|---|---|
| Browser.loadLinks | 보호 목록/검색/collection route 진입 또는 sort/filter/스크롤 변화. 실제 진입과 입력 가드는 §3에 연결한다. | 유지 |
| API.searchLinks | GET `/api/v1/search` query sort/cursor/searchQueryString/collectionId/tagId/pinnedOnly;200 `{data:{links,nextCursor},success,message}`. Meili nohits는 `{data:[]}`인 예외모양. 인증오류는verifyUser응답. | 유지 |
| Browser.receiveResult | 공개 API가 아닌 **응답 후 다음 동작 노드**다. `packages/router/links.tsx:98–105` data파싱과 pages.flatMap:58; `LinkViews/Links.tsx:376–387` sentinel | 유지 |
| Browser.openDashboard / showDashboard | Dashboard route 진입과 section 표시. 후자는 응답 후 다음 동작 노드다. | 유지 |
| API.getDashboard | GET `/api/v2/dashboard`; 인증 성공200 `{data,success,message}`, sections와 각 section 최대16개 links. 상세는 API JF-13. | 유지 |
| Browser.openTag / showTagHeading | `/tags/:id` metadata 조회와 heading 표시/오류 redirect. links query와 독립이며 후자는 다음 동작 노드다. | 유지 |
| API.getTag | GET `/api/v1/tags/:id`200 `{response:tag}`,404없음,400invalid id, 인증 오류. config legacy면 GET `/api/v1/tags` page에서 id 검색. | 유지 |

응답선은 해당 요청 결과를 받는 실행을 요약한다. API가 React callback을 직접 호출하거나 query/mutation 등록을 HTTP로 보낸다는 뜻이 아니다. transport/JSON 오류는 Browser에서 생길 수 있다.

## 3. 상위 노드 내부 추적

| 상위 노드 | 실제 진입·호출 근거 | 내부 Job Flow | 판정·중단 이유 |
|---|---|---|---|
| Browser.loadLinks | `pages/links/index.tsx:24`, `pages/search.tsx:36`→useLinks→useFetchLinks callback fetch:88 | [Browser 내부](../../../as-is/details/browser.md#jf-4-목록-query-등록실행과-페이지-합치기--uselinks--usefetchlinks) | 펼침 — 입력/등록/HTTP/결과 수신을 구분 |
| API.searchLinks | `pages/api/v1/search/index.ts:6` search→searchLinks:30 | [API 내부](../../../as-is/details/web-api.md#jf-6-검색과-접근-가능한-컬렉션--searchlinks--getaccessiblecollectionids) | 펼침 — 권한/분기/Prisma·외부 호출을 추적 |
| Browser.receiveResult | `packages/router/links.tsx:98–105` data파싱과 pages.flatMap:58; `LinkViews/Links.tsx:376–387` sentinel | [응답 소비](../../../as-is/details/browser.md#jf-4-목록-query-등록실행과-페이지-합치기--uselinks--usefetchlinks) | 펼침 — 원 요청자 callback 또는 query 이후 render. 별도 서버 서비스 아님 |
| Browser.openDashboard / Browser.showDashboard | `apps/web/pages/dashboard.tsx:44`, `packages/router/dashboardData.tsx:23–39` | [Browser JF-7](../../../as-is/details/browser.md#jf-7-공개-목록과-dashboard-읽기--usepubliclinks--usedashboarddata) | 펼침 — query와 render |
| API.getDashboard | `apps/web/pages/api/v2/dashboard/index.ts:20`→getDashboardData | [API JF-13](../../../as-is/details/web-api.md#jf-13-dashboard-section별-조회--getdashboarddata) | 펼침 — section 조건과 권한 query |
| Browser.openTag / Browser.showTagHeading | `apps/web/pages/tags/[id].tsx:35/:59–62` | [Browser JF-11](../../../as-is/details/browser.md#jf-11-태그-목록의-metadata--usetag) | 펼침 — 독립 metadata query, 오류 dashboard |
| API.getTag | `apps/web/pages/api/v1/tags/[id].ts:19` 또는 legacy index:21 | [API JF-15](../../../as-is/details/web-api.md#jf-15-태그별-목록-metadata--gettagbyid--gettags) | 펼침 — config 분기와 권한 |
| 라이브러리·DB engine | 상세의 실제 호출/manifest·lockfile | [패키지 구성](../package-configuration.md) | 외부 경계 — app의 query·adapter를 확인한 뒤 외부 구현에서 중단 |

## 4. 정상 단계와 부작용

1. 페이지가sort와query를hook에주며TanStack가queryFn을실행한다.
2. 검색API는getAccessibleCollectionIds로owner/member id를해결한다. Meili일때도hits id를Prisma에서다시권한필터링한다.
3. fallback은DBid cursor, Meili는offsetcursor이며결과merge는브라우저page단위다.

## 5. 실패·취소·재시도

권한조회오류는API로reject된다. useFetchLinks에는response.ok검사가없다. search+필터의OR구조를단순AND로해석하면안된다. 새로고침은서버query를다시수행하며view/sort는localStorage에서읽는다.

## 6. 근거·확인 한계

Dashboard는 같은개인목록의 별도계약 GET `/api/v2/dashboard`다. `dashboardData.tsx:23` queryFn→route `v2/dashboard/index.ts:20`→실제 getDashboardData(`getDashboardDataV2.ts:5`). [Browser JF-7](../../../as-is/details/browser.md#jf-7-공개-목록과-dashboard-읽기--usepubliclinks--usedashboarddata), [API JF-13](../../../as-is/details/web-api.md#jf-13-dashboard-section별-조회--getdashboarddata)에 펼쳤다. API의counts와각section16개query는같은snapshot이아니다.

코드상 동작과 실행 증거를 구분한다. 서비스·DB를 띄워 이 시나리오를 실행하지 않았다. 정적 검사나 대표 샘플 통과를 이 시나리오의 의미 승인으로 대체하지 않는다. 실제 소스 심볼·호출 줄과 내부 그림은 §3에서 찾을 수 있다.
