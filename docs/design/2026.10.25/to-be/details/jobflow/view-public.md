# 공개 링크와 컬렉션 읽기 — TO-BE 유지 Job Flow

> **목표 기준** 2026.10.25 · **AS-IS 대비** 유지. [이번 기준선 원본](../../../as-is/details/jobflow/view-public.md)의 도표와 내부 계약을 목표에서도 유지한다. 아래 코드는 upstream 952ac454의 확인된 근거이며 목표 실행을 검증했다는 뜻이 아니다. [목표 핵심](../../system-design-to-be.md) C-05의 회귀 검증 대상이다.

> **DATE** 2026.10.25 · **기준** `952ac454` · 소스 역추출, 실제 HTTP/브라우저 실행 전.
> [핵심 흐름](../../system-design-to-be.md#5-흐름--경계끼리-어떻게-소통하나) · [Navigation](../navigation/view-public.md) · [시스템 구성](../system-configuration.md)

## 1. 목적·트리거·완료

- 트리거: 공유 `/public/collections/:id` 또는 `/public/links/:id` URL 직접 진입
- 완료 사실: isPublic collection에 속한 link 목록·상세와 공개 team정보 표시
- Browser는 사용자 입력·query/mutation을, API는 인증과 업무 판단·DB 호출을 소유한다. 원격 라이브러리 내부는 외부 경계다.

## 2. 경계 흐름과 계약

```jobflow
scope: view_public
Object: Browser, API
Browser.openPublic --> API.getPublicCollection
API.getPublicCollection.response --> Browser.receiveResult
```

목록과 개별 상세는 다음 별도 공개 계약이다. metadata 결과가 목록 query를 직접 시작시키는 선은 없다.

```jobflow
scope: public_list
Object: Browser, API
Browser.openPublic --> API.searchPublicLinks
API.searchPublicLinks.response --> Browser.showPublicLinks
```

```jobflow
scope: public_detail
Object: Browser, API
Browser.openPublicLink --> API.getPublicLink
API.getPublicLink.response --> Browser.showPublicLink
```

| 노드 | 입력·출력·실패 계약 | AS-IS 대비 |
|---|---|---|
| Browser.openPublic | 공유 `/public/collections/:id` 또는 `/public/links/:id` URL 직접 진입. 실제 진입과 입력 가드는 §3에 연결한다. | 유지 |
| API.getPublicCollection | GET `/api/v1/public/collections/:id`200 `{response:collection}`/400 없음. verifyUser 없음. | 유지 |
| Browser.receiveResult | 공개 API가 아닌 **응답 후 다음 동작 노드**다. PublicCollections metadataeffect:75–81/setCollection, usePublicLinks pagesflatMap:32; 상세useGetLink | 유지 |
| API.searchPublicLinks | GET `/api/v1/public/collections/links?collectionId=...`; search envelope, publicOnly=true. invalid collection400. | 유지 |
| API.getPublicLink | GET `/api/v1/public/links/:id`;200 `{response:link 또는 null}`, invalid id401. collection.isPublic 조건. | 유지 |
| Browser.openPublicLink / showPublicLink / showPublicLinks | 주소 진입 및 각 query 결과 표시. show 노드는 응답 후 다음 동작이다. | 유지 |

응답선은 해당 요청 결과를 받는 실행을 요약한다. API가 React callback을 직접 호출하거나 query/mutation 등록을 HTTP로 보낸다는 뜻이 아니다. transport/JSON 오류는 Browser에서 생길 수 있다.

## 3. 상위 노드 내부 추적

| 상위 노드 | 실제 진입·호출 근거 | 내부 Job Flow | 판정·중단 이유 |
|---|---|---|---|
| Browser.openPublic | `pages/public/collections/[id]/index.tsx:65/:73`, publiclinks페이지useGetLink | [Browser 내부](../../../as-is/details/browser.md#jf-7-공개-목록과-dashboard-읽기--usepubliclinks--usedashboarddata) | 펼침 — 입력/등록/HTTP/결과 수신을 구분 |
| API.getPublicCollection | `apps/web/pages/api/v1/public/collections/[id].ts:15`→getPublicCollection | [API 내부](../../../as-is/details/web-api.md#jf-9-공개-링크와-공개-컬렉션--getpubliccollection--getlinkbyid) | 펼침 — 권한/분기/Prisma·외부 호출을 추적 |
| Browser.receiveResult | PublicCollections metadataeffect:75–81/setCollection, usePublicLinks pagesflatMap:32; 상세useGetLink | [응답 소비](../../../as-is/details/browser.md#jf-7-공개-목록과-dashboard-읽기--usepubliclinks--usedashboarddata) | 펼침 — 원 요청자 callback 또는 query 이후 render. 별도 서버 서비스 아님 |
| API.searchPublicLinks | `apps/web/pages/api/v1/public/collections/links/index.ts:31`→searchLinks(publicOnly) | [API JF-9](../../../as-is/details/web-api.md#jf-9-공개-링크와-공개-컬렉션--getpubliccollection--getlinkbyid), [JF-6](../../../as-is/details/web-api.md#jf-6-검색과-접근-가능한-컬렉션--searchlinks--getaccessiblecollectionids) | 펼침 — public access 재검사 |
| API.getPublicLink | `apps/web/pages/api/v1/public/links/[id].ts:10`→getLinkById | [API JF-9](../../../as-is/details/web-api.md#jf-9-공개-링크와-공개-컬렉션--getpubliccollection--getlinkbyid) | 펼침 — 공개 collection predicate |
| Browser.openPublicLink / showPublicLink | `packages/router/links.tsx:849–910` useGetLink public URL | [Browser JF-5](../../../as-is/details/browser.md#jf-5-상세-query와-편집삭제-mutation--usegetlink--useupdatelink--usedeletelink) | 펼침 — query의 응답 소비 |
| Browser.showPublicLinks | `packages/router/publicLinks.tsx:32/:58` | [Browser JF-7](../../../as-is/details/browser.md#jf-7-공개-목록과-dashboard-읽기--usepubliclinks--usedashboarddata) | 펼침 — page flatten/render |
| 라이브러리·DB engine | 상세의 실제 호출/manifest·lockfile | [패키지 구성](../package-configuration.md) | 외부 경계 — app의 query·adapter를 확인한 뒤 외부 구현에서 중단 |

## 4. 정상 단계와 부작용

1. AuthRedirect는/public prefix를인증여부와무관하게허용한다.
2. metadata·목록은별도요청이며API각각isPublic을조건으로적용한다.
3. 공개UI는team읽기와link정보/보존형식읽기를표시하고private수정메뉴를숨긴다.

## 5. 실패·취소·재시도

metadata400은dashboard로보내며비인증이면login으로다시이동한다. 링크미허용은200null이될수있다. 공개전환취소후매요청권한이재평가되지만이미발급한보존token은다른수명이다.

## 6. 근거·확인 한계

공개RSS는XML응답으로화면색인에서제외한다. 기존public본문에개인읽기 상태필드가있다고가정하지않는다.

코드상 동작과 실행 증거를 구분한다. 서비스·DB를 띄워 이 시나리오를 실행하지 않았다. 정적 검사나 대표 샘플 통과를 이 시나리오의 의미 승인으로 대체하지 않는다. 실제 소스 심볼·호출 줄과 내부 그림은 §3에서 찾을 수 있다.
