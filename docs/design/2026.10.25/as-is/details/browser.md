# Browser (React) — AS-IS 상세

> **대상**: `apps/web/components/ModalContent/NewLinkModal.tsx`, `apps/web/components/Sidebar.tsx`, `packages/router/links.tsx`의 저장 경로 · **기준**: 소스 `952ac454`·2026.10.25
> **근거 색인**: [브리프](../../_evidence-brief.md) · **상태**: 전체 소스 분석 후보. 실행 전이며 독립 의미 검토를 기다린다.

## 1. 책임 / 비책임

- 책임: 입력, 로컬 검증, mutation 등록, 낙관적 목록 반영과 오류 rollback.
- 비책임: 권한 결정, 영구 저장, 문서 보존.
- 아무도 하지 않는 것: 이 창에서 서버 저장 완료를 기다린 뒤 닫거나 실패 시 입력 초안을 복원하는 처리. B-01.

## 2. 공개 계약

| 메서드·경로 | 입력 | 출력 | 오류 | 구현 |
|---|---|---|---|---|
| NewLinkModal의 Create 클릭 | `link` 로컬 상태 | schema 성공이면 mutation 시작 후 창 닫기 | schema 실패 toast, 서버 오류는 닫힌 뒤 hook에서 처리 | `apps/web/components/ModalContent/NewLinkModal.tsx:88` |
| `useAddLink` | toast/t, 선택적 mobile auth | TanStack mutation 객체 | mutationFn reject, onError rollback | `packages/router/links.tsx:394` |

## 3. 내부 Job Flow — 드릴다운

**결론**: 클릭은 `submit`이 조율하지만 비동기 결과 처리는 `useMutation`에 등록한 callback이 조율한다. callback 등록과 외부 HTTP 호출은 다르다.

상위 [저장 시나리오](jobflow/save-link.md)의 Browser 노드를 실제 진입점에서 연다. 입력·출력·실패 의미는 같다.

| 상위 §5 노드 | L1 그림 | L2 이하 |
|---|---|---|
| [Browser.submitLink](jobflow/save-link.md#2-그림과-계약) | [JF-1](#jf-1-추가-창-제출--newlinkmodalsubmit) | [JF-1.1](#jf-11-mutation-등록과-http--linksuseaddlink), [JF-1.2](#jf-12-낙관적-쓰기와-결과-반영--useaddlink-callbacks) |
| [Browser.receiveSave](jobflow/save-link.md#2-그림과-계약) | [JF-1.2](#jf-12-낙관적-쓰기와-결과-반영--useaddlink-callbacks) | cache 변환 말단 표 |

**표기**: `NewLinkModal.submit`은 실제 컴포넌트 closure 함수다. `useAddLink.mutationFn/onMutate/onError/onSuccess`는 `useMutation({...})` 객체의 실제 함수-valued property를 enclosing function으로 한정한 이름이며, 클래스 메서드나 실제 직접 호출을 발명한 것이 아니다. 줄 번호는 위 소스 커밋 기준이다. callback의 `on` 표시는 렌더러에서 이벤트처럼 보일 수 있지만 여기서는 TanStack의 등록된 callback이다.

| 객체 | 코드 범위 | 담는 심볼 |
|---|---|---|
| NewLinkModal / props | NewLinkModal.tsx | `submit`, prop `onClose` |
| Links / useAddLink | router/links.tsx | `useAddLink`, 그 안의 callback property와 cache 순수 함수 |
| addLink / queryClient | hook이 반환한 mutation / `useQueryClient()` 결과 | 외부 TanStack Query 객체 |
| PostLinkSchema | schemaValidation.ts | Zod schema의 `safeParse` |


**확장 시나리오 드릴다운 지도** — 각 시나리오 §3의 전수 판정과 연결한다. 같은 hook을 공유하는 변형은 같은 내부 그림을 재사용한다.

| 상위 §5 노드 | L1 그림 | L2 이하 |
|---|---|---|
| [Browser.signIn](jobflow/access.md#3-상위-노드-내부-추적) | [Browser 내부](#jf-2-인증-입력과-화면-가드--loginuser--authredirect) | 상세의 호출·분기·말단 표 |
| [Browser.receiveResult](jobflow/access.md#3-상위-노드-내부-추적) | [응답 소비](#jf-2-인증-입력과-화면-가드--loginuser--authredirect) | 상세의 호출·분기·말단 표 |
| [Browser.loadLinks](jobflow/browse-links.md#3-상위-노드-내부-추적) | [Browser 내부](#jf-4-목록-query-등록실행과-페이지-합치기--uselinks--usefetchlinks) | 상세의 호출·분기·말단 표 |
| [Browser.receiveResult](jobflow/browse-links.md#3-상위-노드-내부-추적) | [응답 소비](#jf-4-목록-query-등록실행과-페이지-합치기--uselinks--usefetchlinks) | 상세의 호출·분기·말단 표 |
| [Browser.openDashboard / Browser.showDashboard](jobflow/browse-links.md#3-상위-노드-내부-추적) | [Browser JF-7](#jf-7-공개-목록과-dashboard-읽기--usepubliclinks--usedashboarddata) | 상세의 호출·분기·말단 표 |
| [Browser.openTag / Browser.showTagHeading](jobflow/browse-links.md#3-상위-노드-내부-추적) | [Browser JF-11](#jf-11-태그-목록의-metadata--usetag) | 상세의 호출·분기·말단 표 |
| [Browser.deleteLink](jobflow/delete-link.md#3-상위-노드-내부-추적) | [Browser 내부](#jf-5-상세-query와-편집삭제-mutation--usegetlink--useupdatelink--usedeletelink) | 상세의 호출·분기·말단 표 |
| [Browser.receiveResult](jobflow/delete-link.md#3-상위-노드-내부-추적) | [응답 소비](#jf-5-상세-query와-편집삭제-mutation--usegetlink--useupdatelink--usedeletelink) | 상세의 호출·분기·말단 표 |
| [Browser.editLink](jobflow/edit-link.md#3-상위-노드-내부-추적) | [Browser 내부](#jf-5-상세-query와-편집삭제-mutation--usegetlink--useupdatelink--usedeletelink) | 상세의 호출·분기·말단 표 |
| [Browser.receiveResult](jobflow/edit-link.md#3-상위-노드-내부-추적) | [응답 소비](#jf-5-상세-query와-편집삭제-mutation--usegetlink--useupdatelink--usedeletelink) | 상세의 호출·분기·말단 표 |
| [Browser.saveHighlight](jobflow/highlight.md#3-상위-노드-내부-추적) | [Browser 내부](#jf-9-highlight-선택-범위와-개인-주석--handlehighlightselection) | 상세의 호출·분기·말단 표 |
| [Browser.receiveResult](jobflow/highlight.md#3-상위-노드-내부-추적) | [응답 소비](#jf-9-highlight-선택-범위와-개인-주석--handlehighlightselection) | 상세의 호출·분기·말단 표 |
| [Browser.openHighlights / showHighlights](jobflow/highlight.md#3-상위-노드-내부-추적) | [Browser JF-9](#jf-9-highlight-선택-범위와-개인-주석--handlehighlightselection) | 상세의 호출·분기·말단 표 |
| [Browser.deleteHighlight / removeHighlight](jobflow/highlight.md#3-상위-노드-내부-추적) | [Browser JF-9](#jf-9-highlight-선택-범위와-개인-주석--handlehighlightselection) | 상세의 호출·분기·말단 표 |
| [Browser.mountUser / mountConfig / mountCollections](jobflow/initial-data.md#3-내부-추적) | [내부](#jf-12-초기-읽기와-개인-표시-설정--useuser--useconfig--usecollections--useupdateuserpreference) | 상세의 호출·분기·말단 표 |
| [Browser.receiveUser / receiveConfig / receiveCollections](jobflow/initial-data.md#3-내부-추적) | [내부](#jf-12-초기-읽기와-개인-표시-설정--useuser--useconfig--usecollections--useupdateuserpreference) | 상세의 호출·분기·말단 표 |
| [Browser.openLink](jobflow/inspect-link.md#3-상위-노드-내부-추적) | [Browser 내부](#jf-5-상세-query와-편집삭제-mutation--usegetlink--useupdatelink--usedeletelink) | 상세의 호출·분기·말단 표 |
| [Browser.receiveResult](jobflow/inspect-link.md#3-상위-노드-내부-추적) | [응답 소비](#jf-5-상세-query와-편집삭제-mutation--usegetlink--useupdatelink--usedeletelink) | 상세의 호출·분기·말단 표 |
| [Browser.selectFormat/renderFormat](jobflow/read-preserved.md#3-html-별도-host-경로) | [Browser JF-8](#jf-8-보존물-로딩과-refresh--fetchlinkcontent--loadmonolith--updatearchive) | 상세의 호출·분기·말단 표 |
| [Browser.selectMonolith/loadIframe](jobflow/read-preserved.md#3-html-별도-host-경로) | [Browser JF-8](#jf-8-보존물-로딩과-refresh--fetchlinkcontent--loadmonolith--updatearchive) | 상세의 호출·분기·말단 표 |
| [Browser.changeTextStyle](jobflow/reader-preference.md#3-내부-추적) | [내부](#jf-12-초기-읽기와-개인-표시-설정--useuser--useconfig--usecollections--useupdateuserpreference) | 상세의 호출·분기·말단 표 |
| [Browser.receivePreference](jobflow/reader-preference.md#3-내부-추적) | [내부](#jf-12-초기-읽기와-개인-표시-설정--useuser--useconfig--usecollections--useupdateuserpreference) | 상세의 호출·분기·말단 표 |
| [Browser.refreshArchive](jobflow/refresh-preservation.md#3-상위-노드-내부-추적) | [Browser 내부](#jf-8-보존물-로딩과-refresh--fetchlinkcontent--loadmonolith--updatearchive) | 상세의 호출·분기·말단 표 |
| [Browser.receiveResult](jobflow/refresh-preservation.md#3-상위-노드-내부-추적) | [응답 소비](#jf-8-보존물-로딩과-refresh--fetchlinkcontent--loadmonolith--updatearchive) | 상세의 호출·분기·말단 표 |
| [Browser.register](jobflow/register.md#3-상위-노드-내부-추적) | [Browser 내부](#jf-3-등록복구-요청--registeruser--submitrequest--submit) | 상세의 호출·분기·말단 표 |
| [Browser.receiveResult](jobflow/register.md#3-상위-노드-내부-추적) | [응답 소비](#jf-3-등록복구-요청--registeruser--submitrequest--submit) | 상세의 호출·분기·말단 표 |
| [Browser.requestReset](jobflow/request-reset.md#3-상위-노드-내부-추적) | [Browser 내부](#jf-3-등록복구-요청--registeruser--submitrequest--submit) | 상세의 호출·분기·말단 표 |
| [Browser.receiveResult](jobflow/request-reset.md#3-상위-노드-내부-추적) | [응답 소비](#jf-3-등록복구-요청--registeruser--submitrequest--submit) | 상세의 호출·분기·말단 표 |
| [Browser.resetPassword](jobflow/reset-password.md#3-상위-노드-내부-추적) | [Browser 내부](#jf-3-등록복구-요청--registeruser--submitrequest--submit) | 상세의 호출·분기·말단 표 |
| [Browser.receiveResult](jobflow/reset-password.md#3-상위-노드-내부-추적) | [응답 소비](#jf-3-등록복구-요청--registeruser--submitrequest--submit) | 상세의 호출·분기·말단 표 |
| [Browser.submitLink](jobflow/save-link.md#3-내부-추적) | [Browser JF-1](#jf-1-추가-창-제출--newlinkmodalsubmit) · [JF-1.1](#jf-11-mutation-등록과-http--linksuseaddlink) | 상세의 호출·분기·말단 표 |
| [Browser.receiveSave](jobflow/save-link.md#3-내부-추적) | [Browser JF-1.2](#jf-12-낙관적-쓰기와-결과-반영--useaddlink-callbacks) | 상세의 호출·분기·말단 표 |
| [Browser.saveSharing](jobflow/share-collection.md#3-상위-노드-내부-추적) | [Browser 내부](#jf-6-공유-dialog의-draft와-저장--submit--addmembertocollection) | 상세의 호출·분기·말단 표 |
| [Browser.receiveResult](jobflow/share-collection.md#3-상위-노드-내부-추적) | [응답 소비](#jf-6-공유-dialog의-draft와-저장--submit--addmembertocollection) | 상세의 호출·분기·말단 표 |
| [Browser.openEmailLink](jobflow/verify-email-link.md#3-내부-추적) | [내부](#jf-10-이메일-링크의-웹-bridge--verify) | 상세의 호출·분기·말단 표 |
| [Browser.evaluateAccess](jobflow/verify-email-link.md#3-내부-추적) | [내부](#jf-2-인증-입력과-화면-가드--loginuser--authredirect) | 상세의 호출·분기·말단 표 |
| [Browser.openPublic](jobflow/view-public.md#3-상위-노드-내부-추적) | [Browser 내부](#jf-7-공개-목록과-dashboard-읽기--usepubliclinks--usedashboarddata) | 상세의 호출·분기·말단 표 |
| [Browser.receiveResult](jobflow/view-public.md#3-상위-노드-내부-추적) | [응답 소비](#jf-7-공개-목록과-dashboard-읽기--usepubliclinks--usedashboarddata) | 상세의 호출·분기·말단 표 |
| [Browser.openPublicLink / showPublicLink](jobflow/view-public.md#3-상위-노드-내부-추적) | [Browser JF-5](#jf-5-상세-query와-편집삭제-mutation--usegetlink--useupdatelink--usedeletelink) | 상세의 호출·분기·말단 표 |
| [Browser.showPublicLinks](jobflow/view-public.md#3-상위-노드-내부-추적) | [Browser JF-7](#jf-7-공개-목록과-dashboard-읽기--usepubliclinks--usedashboarddata) | 상세의 호출·분기·말단 표 |

### JF-1 추가 창 제출 — NewLinkModal.submit

```jobflow
orchestrator: NewLinkModal
Object: NewLinkModal, PostLinkSchema, toast, addLink, props
NewLinkModal.submit --> PostLinkSchema.safeParse
PostLinkSchema.safeParse.invalid --> toast.error
PostLinkSchema.safeParse.valid --> addLink.mutateAsync
addLink.mutateAsync --> props.onClose
```

| 노드 | 코드 | 비고 |
|---|---|---|
| NewLinkModal.submit | `apps/web/components/ModalContent/NewLinkModal.tsx:88` | 실제 클릭 handler. Create 연결은 같은 파일:175. 입력은 로컬 `link` state:43 |
| PostLinkSchema.safeParse | `apps/web/components/ModalContent/NewLinkModal.tsx:89` | 호출. schema 선언은 `packages/lib/schemaValidation.ts:126`. valid/invalid는 `success` boolean 분기:91 |
| toast.error | `apps/web/components/ModalContent/NewLinkModal.tsx:92` | 오류 표시 후 return. mutation과 close 없음 |
| addLink.mutateAsync | `apps/web/components/ModalContent/NewLinkModal.tsx:98` | hook 생성:37. Promise를 await하지 않음. 자세한 등록/HTTP는 JF-1.1 |
| props.onClose | `apps/web/components/ModalContent/NewLinkModal.tsx:99` | 부모 연결 `apps/web/components/Sidebar.tsx:363`: `setNewLinkModal(false)` |

- 트리거는 사용자의 Create 클릭이며 완료는 **창 닫기와 요청 시작**이다. mutateAsync→onClose는 Promise를 기다리지 않는 순차 호출이며 반환값 전달이 아니다.
- `safeParse` 실패는 창을 유지한다. 서버 실패는 창을 되열지 않는다. submit 호출자는 이벤트 처리 결과를 사용하지 않으므로 가짜 `.result` 종결 노드를 만들지 않았다. B-01.
- `props.onClose`는 단일 state setter 위임 말단이다. Sidebar:362의 조건부 JSX에서 창이 제거된다.

### JF-1.1 mutation 등록과 HTTP — Links.useAddLink

```jobflow
orchestrator: Links
Object: Links, ReactQuery
Links.useAddLink --> ReactQuery.useQueryClient
ReactQuery.useQueryClient --> ReactQuery.useMutation
ReactQuery.useMutation.result --> Links.useAddLink.result
```

**URL 검사 구간 전제**: `link.url || link.type === url`이다. callback의 입력 조건으로 판단한다:409. URL 생성자가 throw하면 catch가 invalid_url_guide로 바꾼다:410–414.

```jobflow
orchestrator: useAddLink
Object: useAddLink, URL
useAddLink.mutationFn --> URL.constructor
URL.constructor.throws
URL.constructor.valid
```

**HTTP 구간 전제**: 위 검사를 통과했거나 `!link.url && link.type !== url`이라 생성자 검사를 생략했다. 두 경로는 fetch:417에서 합류한다. 아래는 fetch 응답을 JSON으로 읽는 공통 구간이다.

```jobflow
orchestrator: useAddLink
Object: useAddLink, browser, response
useAddLink.mutationFn --> browser.fetch
browser.fetch.result --> response.json
```

**성공 반환 구간 전제**: JSON parsing을 마쳤고 callback이 **response.ok**를 검사해 true임을 확인했다:433. `response.json`의 반환값 자체가 HTTP 성공을 결정하지 않는다.

```jobflow
orchestrator: useAddLink
Object: useAddLink, response
response.json.result --> useAddLink.mutationFn.result
```

**HTTP 오류 구간 전제**: parsing 뒤 response.ok가 false다:433. JSON의 data.response를 Error 메시지로 사용해 throw하고 TanStack가 onError에 전달한다.

```jobflow
orchestrator: useAddLink
Object: useAddLink, Error
useAddLink.mutationFn --> Error.constructor
```

각 구간은 같은 mutationFn 실행을 나눈 것이며 response.json을 다시 호출하지 않는다. fetch/JSON parsing 자체의 throw도 onError로 간다.

| 노드 | 코드 | 비고 |
|---|---|---|
| Links.useAddLink | `packages/router/links.tsx:394` | hook 호출은 NewLinkModal:37 |
| ReactQuery.useQueryClient / useMutation | `packages/router/links.tsx:405`, `:407` | queryClient를 closure에 담고 4개 callback을 등록. 외부 `@tanstack/react-query` 5.51.15, `yarn.lock:10473` |
| useAddLink.mutationFn | `packages/router/links.tsx:408` | TanStack가 mutateAsync를 받아 onMutate 이후 호출하는 등록 callback. 프로젝트 코드에 별도 직접 호출은 없음 |
| URL.constructor | `packages/router/links.tsx:411` | `link.url || link.type === 'url'`일 때만 검사. 없는 URL·비URL형이면 이 단계를 생략. throw는 `invalid_url_guide`:413 |
| browser.fetch | `packages/router/links.tsx:417` | POST `/api/v1/links`, JSON body, web에서는 cookie, mobile에만 선택적 bearer. 실제 API 진입은 [서버 JF-1](web-api.md#jf-1-post-분기--links) |
| response.json | `packages/router/links.tsx:431` | `!response.ok`면 `Error(data.response)` throw:433, 성공은 `data.response`:435 |

- 첫 그림의 화살표는 hook 조립이다. `useMutation` 호출 자체가 POST가 아니다. HTTP는 두 번째 그림의 등록 callback 실행에서만 발생한다.
- HTTP/JSON parsing 오류도 reject하여 JF-1.2의 `onError`에 전달된다. 이 fetch에는 명시적 AbortSignal/timeout/재시도 옵션이 없다. 외부 TanStack 내부의 scheduler/Promise 처리 코드는 분석 범위 밖이며 버전과 callback 계약에서 멈춘다.
- URL 검사 생략 경로는 유효성 오류 없이 `browser.fetch`로 이어진다. URL 생성자와 response parser는 표준 API 말단이다.

### JF-1.2 낙관적 쓰기와 결과 반영 — useAddLink callbacks

다음 세 그림은 한 함수의 순차 호출이 아니다. `useMutation`에 등록된 서로 다른 callback 실행이며 성공과 실패 중 하나만 결과 callback으로 선택된다. `onMutate`의 context가 결과 callback에 전달된다.

```jobflow
orchestrator: useAddLink
Object: useAddLink, queryClient, Links
useAddLink.onMutate --> queryClient.cancelQueries
queryClient.cancelQueries.result --> queryClient.getQueriesData
queryClient.getQueriesData --> queryClient.getQueryData
queryClient.getQueryData --> Links.mergeTagsFromQueriesData
Links.mergeTagsFromQueriesData.result --> queryClient.setQueriesData
queryClient.setQueriesData --> queryClient.setQueryData
queryClient.setQueryData --> useAddLink.onMutate.result
```

```jobflow
orchestrator: useAddLink
Object: useAddLink, queryClient
useAddLink.onSuccess --> queryClient.setQueriesData
queryClient.setQueriesData --> queryClient.invalidateQueries
```

**오류 복구 그림 전제**: onMutate가 context를 반환한 뒤 mutationFn이 실패했다. context가 없는 오류는 toast 뒤 return:537이며 cache 복구 호출을 생략한다.

```jobflow
orchestrator: useAddLink
Object: useAddLink, toast, queryClient
useAddLink.onError --> toast.error
toast.error --> queryClient.setQueryData
```

| 노드 | 코드 | 비고 |
|---|---|---|
| onMutate / cancelQueries | `packages/router/links.tsx:437`, `:438` | links와 dashboardData의 진행 조회를 각각 await 취소:438–439 |
| getQueriesData / getQueryData | `packages/router/links.tsx:441` | links와 dashboard snapshot, collections/tags/user를 읽음:441–453. 그림은 조회 종류를 대표로 표시하되 실제 읽기 목록은 이 행에 명시 |
| mergeTagsFromQueriesData | `packages/router/links.tsx:144`, 호출 `:448` | 각 cache page의 tags를 `extractTagsFromQueryData`:129로 추출, id별 map으로 deduplicate. 순수 변환 말단 |
| setQueriesData / setQueryData | `packages/router/links.tsx:518`, `:522` | 음수 tempId:469, 이름/컬렉션/tags를 구성:455–516. links에는 upsertLinkInInfiniteData:173, dashboard에는 upsertLinkInDashboardData:204를 updater로 등록 |
| onMutate.result | `packages/router/links.tsx:526` | previousLinks, previousDashboard, optimisticId를 TanStack callback context로 반환. 서버에 보내는 데이터 아님 |
| onSuccess / setQueriesData | `packages/router/links.tsx:545`, `:550` | 응답의 실제 link로 tempId 교체. invalidate 대상 dashboardData/collections/tags/publicLinks:554–557 |
| onError / toast.error | `packages/router/links.tsx:532`, `:533` | Error.message 번역, toast가 없으면 mobile Alert. context 없으면 return:537 |
| onError의 setQueryData | `packages/router/links.tsx:539`, `:543` | 모든 previousLinks query key와 dashboard snapshot 복원. 서버에 rollback을 요청하지 않음 |

| cache 말단 | 실제 본문과 호출 | 중단 이유 |
|---|---|---|
| upsertLinkInList | `packages/router/links.tsx:157`, :197/:211/:221 | id 또는 optimisticId 일치 항목 교체, 없으면 앞에 추가. 외부 상태 접근 없는 배열 변환 |
| upsertLinkInInfiniteData | `packages/router/links.tsx:173`, :519/:551 | 기존 pages 안의 동일 id 교체. 없으면 첫 page prepend. pages 없으면 원래 값 반환 |
| upsertLinkInDashboardData | `packages/router/links.tsx:204`, :523 | recent/collection 배열에 upsert 후 16개 제한. 영구 DB 쓰기 없음 |

- 성공 완료는 실제 link의 cache 반영과 관련 query 무효화이다. archive 완료를 기다리지 않는다.
- 실패 완료는 snapshot 복구와 오류 toast이다. 닫힌 NewLinkModal의 초안은 복원되지 않는다. B-01.
- `onMutate` 내부의 schema/collection 정보는 preview용이다. 이름으로 찾은 cached collection과 서버 `setCollection`의 이름 처리 규칙은 다를 수 있다. B-02.

### JF-2 인증 입력과 화면 가드 — loginUser / AuthRedirect

로그인 submit과 인증 후 화면 가드는 별도 실행이다. loginUser는 외부 next-auth `signIn` 결과를 받지만 Dashboard 이동을 직접 호출하지 않는다.

```jobflow
orchestrator: Login
Object: Login, NextAuth, toast
Login.loginUser --> NextAuth.signIn
NextAuth.signIn --> toast.dismiss
```

`apps/web/pages/login.tsx:40` loginUser, credentials signIn:48, !res.ok:58의 toast는 오류다. **res.error가 Email not verified인 경우만** email signIn:62와 router.push confirmation:68을 호출한다. 외부 provider 버튼의 loginUserButton은 같은 파일:78의 signIn(method)이며 credentials authorize와 다른 외부 provider 계약이다.

```jobflow
orchestrator: Login
Object: Login, NextAuth, router
Login.loginUser --> NextAuth.signIn
NextAuth.signIn --> router.push
```

두 번째 그림의 적용 범위는 credentials 실패 처리 내부의 **Email not verified 분기만**이다. 이 signIn의 인자는 email provider이며 두 그림이 모든 로그인에서 연속 실행되는 것은 아니다. email 결과의 ok 여부를 검사하지 않고 confirmation으로 보낸다.

```jobflow
orchestrator: AuthRedirect
Object: AuthRedirect, router
AuthRedirect.redirectTo --> router.push
```

| 내부 진입·등록 | 실제 호출과 판단 | 판정 |
|---|---|---|
| AuthRedirect render/effect | `apps/web/layouts/AuthRedirect.tsx:13`, useSession:15/useUser:17/useConfig:18, useInitialData:24/useTheme:25. effect:27–85는 React 등록 callback이며 이름 없는 함수 | 펼침 — effect가 아래 목적지를 결정하고 실제 named redirectTo:87→router.push:88을 호출 |
| effect 분기 | public:64 우선 허용; authenticated+inactive:67 subscribe; 이름 없는 parent member:69 onboarding; authenticated+비보호 경로:71 dashboard; unauthenticated+보호경로:77 login; else:82 허용 | 말단 확인 — 경로 prefix 배열:46–62와 구독 계산:32–43, DOM은 session loading이 아니고 shouldRenderChildren일 때만:91 |
| NextAuth.signIn / useSession | `apps/web/pages/_app.tsx:50–53` SessionProvider basePath `/api/v1/auth` | 외부 경계 — 실제 credentials/provider callback은 [API JF-2](web-api.md#jf-2-인증-provider와-callback--auth--authorize--callbacks)에서 펼침 |

가드 callback의 내부 계산은 순수 분기이며 redirectTo 외 숨은 서버 호출은 없다. user/config hook의 요청은 가드 판정과 다른 query 실행이다. 인증, username/name, 구독 확인이 모두 끝나면 무조건 Dashboard라는 단순화는 성립하지 않는다.


| 노드 | 코드 | 비고 |
|---|---|---|
| Login.loginUser / NextAuth.signIn / toast.dismiss | `apps/web/pages/login.tsx:40` | credentials 호출:48, toast dismiss:54; email 대체 호출:62와 confirmation push:68은 Email not verified 분기에 한정 |
| AuthRedirect.redirectTo / router.push | `apps/web/layouts/AuthRedirect.tsx:87` | effect가 선택한 url 인자를 push:88에 전달. session loading과 allowed flag는 렌더 가드:91 |


### JF-3 등록·복구 요청 — registerUser / submitRequest / submit

```jobflow
orchestrator: Register
Object: Register, fetch, response
Register.registerUser --> fetch.request
fetch.request.response --> response.json
```

그림은 필드가 채워지고 password≥8, submitLoader=false인 HTTP 구간이다. `apps/web/pages/register.tsx:45`→checkFields:49/59→fetch:68 POST users→json:76. response.ok:81은 **response 객체를 가진 registerUser의 if**다. 성공 뒤 email설정이면 signIn(email):83→confirmation:89, email없으면 login:92. 오류toast:96, fetch/JSON throw에는 catch/finally가 없어 loader를 복구하지 못한다. 반환값을 사용하는 상위 호출자는 없어 최종 반환 노드를 생략했다.

```jobflow
scope: reset_request_calls
Object: Forgot, fetch, response
Forgot.sendConfirmation --> Forgot.submitRequest
Forgot.submitRequest --> fetch.request
Forgot.submitRequest --> response.json
```

`apps/web/pages/forgot.tsx:43` sendConfirmation은 nonempty email:46에서 loader를 켜고 **await submitRequest:51**, named submitRequest:24→fetch:25→json:33→response.ok:35에 따라 isEmailSent=true:37 또는 toast:39. 외부 fetch 실패는 sendConfirmation으로 reject되어 :53/:55 cleanup에 도달하지 않는다.

```jobflow
orchestrator: ResetPassword
Object: ResetPassword, fetch, response
ResetPassword.submit --> fetch.request
fetch.request.response --> response.json
```

`apps/web/pages/auth/reset-password.tsx:28`, 입력/loader/requestSent 가드:31–35, fetch:41, json:49, response.ok:52→requestSent:54; error:56; loaderfalse:59. token은 query를 최초 state에 넣는 :23이며 이후 query effect는 없다. Confirm resend는 `pages/confirmation.tsx:17`에서 email/loader 가드→signIn:25→toastsuccess:35; 반환 res.ok를 검사하지 않는다. 이 함수는 next-auth 호출 하나와 표시 상태 갱신이므로 말단 확인으로 중단한다.


| 노드 | 코드 | 비고 |
|---|---|---|
| Register.registerUser / fetch.request / response.json | `apps/web/pages/register.tsx:45` | 필드 가드:49 이후 fetch:68→json:76. response.ok는 registerUser가:81에서 판단 |
| Forgot.sendConfirmation / submitRequest | `apps/web/pages/forgot.tsx:43` | submitRequest await:51, 실제 fetch:25/json:33/ok:35. rejection은 sendConfirmation에 돌아감 |
| ResetPassword.submit / fetch.request / response.json | `apps/web/pages/auth/reset-password.tsx:28` | fetch:41/json:49/ok:52, loader cleanup:59. transport 오류 catch 없음 |


### JF-4 목록 query 등록·실행과 페이지 합치기 — useLinks / useFetchLinks

```jobflow
scope: links_query_registration
Object: Page, Links, ReactQuery
Page.Page --> Links.useLinks
Links.useLinks --> Links.useFetchLinks
Links.useFetchLinks --> ReactQuery.useInfiniteQuery
```

실제 Page는 `apps/web/pages/links/index.tsx:14`이며 useLinks:24. `packages/router/links.tsx:32` useLinks는 localStorage sort:35, query:40를 만들어 useFetchLinks:56에 넘긴다. 결과 pages.flatMap:58은 순수 배열 변환이다. useFetchLinks:68는 callback 등록:78/80과 enabled:108, pending poll:109를 소유한다.

```jobflow
orchestrator: useFetchLinks
Object: useFetchLinks, fetch, response
useFetchLinks.queryFn --> fetch.request
fetch.request.response --> response.json
response.json.data --> useFetchLinks.queryFn.result
```

queryFn은 TanStack가 실행하는 실제 property:80–104다. fetch:88 `/api/v1/search?cursor=...`는 pageParam, query의 검색/필터를 URLSearchParams:82로 전달한다. json:98, `data.data.links`/nextCursor를 읽으며 response.ok 확인이 없다. queryKey:79, getNextPageParam:105와 flatten:58로 page를 합친다. 보존 대기 link가 있으면 5초 polling:109; 대기 여부 `hasPendingArchives`:24는 format null+lastPreserved 조합을 확인하는 순수 말단이다.


| 노드 | 코드 | 비고 |
|---|---|---|
| Page.Page / Links.useLinks | `apps/web/pages/links/index.tsx:14` | 호출:24; useLinks는 packages/router/links.tsx:32 |
| Links.useFetchLinks / ReactQuery.useInfiniteQuery | `packages/router/links.tsx:56` | useFetchLinks 정의:68, 등록:78, callback:80 |
| useFetchLinks.queryFn / fetch.request / response.json | `packages/router/links.tsx:80` | fetch:88/json:98, 반환 page:102. 결과 flatten은 useLinks:58 |


### JF-5 상세 query와 편집·삭제 mutation — useGetLink / useUpdateLink / useDeleteLink

```jobflow
orchestrator: useGetLink
Object: useGetLink, fetch, response, queryClient
useGetLink.queryFn --> fetch.request
fetch.request.response --> response.json
response.json --> queryClient.setQueryData
queryClient.setQueryData --> queryClient.setQueriesData
```

`packages/router/links.tsx:831` useGetLink는 useQuery:839에 queryFn:849를 등록한다. fetch:856는 public/private URL:851–854를 선택한다. json:864 후 response.ok:865 실패는 throw; 성공에서만 dashboard cache:873, links cache:882, publicLinks:894를 갱신하고 payload.response:910 반환. set 함수의 반환값을 다음 set 입력으로 넘기지 않는다. cache 변환은 [JF-1.2](#jf-12-낙관적-쓰기와-결과-반영--useaddlink-callbacks)의 순수 helper를 재사용한다. id/enable 가드:844와 pending poll:845를 상세 페이지와 drawer가 공유한다.

```jobflow
orchestrator: LinkDetails
Object: LinkDetails, updateLink, State
LinkDetails.submit --> updateLink.mutateAsync
updateLink.mutateAsync --> State.setMode
```

실제 `apps/web/components/LinkDetails.tsx:112` submit은 updatedAt을 제외한 JSON 비교:115–119 후 달라졌을 때 mutateAsync:122를 **await 없이** 호출하고 setMode(view):124를 호출한다. mode setter 표시는 실제 함수 인자 호출(:124)이다. 로컬 draft는 activeLink 변경 effect:62로 덮어쓴다. 서버 실패 후 편집 창 자동 복구/dirty navigation guard는 없다. update hook의 HTTP/rollback는 아래 표에서 함수별로 구분한다.

| hook·소스 | 실제 협력과 오류 수신자 | 판정 |
|---|---|---|
| useUpdateLink | `packages/router/links.tsx:562`, mutationFn:576 PUT:577, json:591, response.ok:593, onMutate:597 snapshot/optimistic, onError:683 rollback, onSuccess:708 cache/invalidation | 펼침 — 같은 HTTP callback 구조로 PUT 전용 데이터와 cache를 조율 |
| useDeleteLink | `packages/router/links.tsx:719`, mutationFn:733 DELETE fetch:734, json:746, !ok:748, onMutate:752 snapshot/remove, onError:784 rollback, onSuccess:803 invalidate | 펼침 — 캐시 삭제가 영구 삭제보다 먼저 실행될 수 있음 |
| DeleteLinkModal.submit | `apps/web/components/ModalContent/DeleteLinkModal.tsx:28` mutateAsync:29 미await, detail/preserved route에서 dashboard:35, close:37 | 말단 확인 — 세 호출과 if, 오류는 hook onError로 전달 |
| LinkModal.handleDelete | `apps/web/components/ModalContent/LinkModal.tsx:50` shift면 mutate:54/close56, 아니면 confirm onDelete:58/close59 | 말단 확인 — 사용자 shift가 confirmation을 우회; server 권한 우회는 아님 |

위 hook의 정확한 callback 호출 위치는 다음 보완 표와 원본에 연결하며 외부 TanStack 실행 순서를 직접 API 호출 사슬로 그리지 않는다.


| 노드 | 코드 | 비고 |
|---|---|---|
| useGetLink.queryFn / fetch.request / response.json | `packages/router/links.tsx:849` | fetch:856/json:864/ok:865, cache 갱신:873/882/894 |
| LinkDetails.submit / updateLink.mutateAsync / State.setMode | `apps/web/components/LinkDetails.tsx:112` | 변경 비교 뒤 mutateAsync:122 미await, setMode:124. State는 실제 함수 인자를 구분하는 구획 |


다음 그림들은 각각 useMutation에 등록된 callback의 **직접 호출**이다. onMutate는 유효한 link.id를 받았고 onError는 snapshot context가 있는 입력을 전제로 한다. 없으면 cache 쓰기를 생략한다. PUT과 DELETE는 별도 요청이며 둘을 연속 실행하는 선은 없다.

```jobflow
scope: update_delete_callbacks
Object: useUpdateLink, useDeleteLink, fetch, response, queryClient
useUpdateLink.mutationFn --> fetch.request
useUpdateLink.mutationFn --> response.json
useUpdateLink.onMutate --> queryClient.cancelQueries
useUpdateLink.onMutate --> queryClient.setQueriesData
useUpdateLink.onError --> queryClient.setQueryData
useDeleteLink.mutationFn --> fetch.request
useDeleteLink.mutationFn --> response.json
useDeleteLink.onMutate --> queryClient.cancelQueries
useDeleteLink.onError --> queryClient.setQueryData
```

| 노드 | 코드 | 비고 |
|---|---|---|
| useUpdateLink callbacks | `packages/router/links.tsx:576` | PUT:577/json:591; onMutate:597/cancel:603/setQueriesData는 optimistic snapshot 변환; onError:683은 이전 snapshot 복원 |
| useDeleteLink callbacks | `packages/router/links.tsx:733` | DELETE:734/json:746; onMutate:752 snapshot/remove, onError:784 rollback. 정확한 cache 호출은 각 callback 본문 |


### JF-6 공유 dialog의 draft와 저장 — submit / addMemberToCollection

```jobflow
scope: share_browser_calls
Object: Sharing, Members, PublicUser, updateCollection
Sharing.addMember --> Members.addMemberToCollection
Members.addMemberToCollection --> PublicUser.getPublicUserData
Sharing.submit --> updateCollection.mutateAsync
```

Sharing.addMember는 실제 이름있는 메서드가 아니라 **익명 함수 식별용 별칭 — 원문 이름 아님**. `components/ModalContent/EditCollectionSharingModal.tsx:177–185` onKeyDown과 :193–200 onClick에 등록한 handler 두 개가 동일 helper를 호출한다. 실행자는 React DOM event다. submit은 실제 named closure:50, await mutateAsync:59; per-call onSettled:62에서 성공만 onClose:69, 실패toast:67/loader해제:63. 입력은 local collection/member/role/public/propagate draft이고 저장 전 DB가 바뀌지 않는다.

| 노드 | 코드 | 비고 |
|---|---|---|
| Members.addMemberToCollection | `lib/client/addMemberToCollection.ts:10`, helper호출 :33 | 중복/빈값/owner가드:17–31. user반환의 username:35 있으면 local setMember callback:36, 없으면 추가 없음 |
| PublicUser.getPublicUserData | `lib/client/getPublicUserData.ts:3` fetch:4,json:6, !ok toast:8 | lookup실패여도 data.response를 반환:10, 객체보장을 강제하지 않음 |
| useUpdateCollection.mutationFn | `packages/router/collections.tsx:141` 등록:144, callback:145 fetchPUT:146,json:154,!okthrow:156 | onSuccess:160에서 collections cache의 동일id만 교체. 하위 전파 항목을 모두 refetch하지 않음 |
| Sharing.setMemberState | `EditCollectionSharingModal.tsx:102` | members배열 append:107, 입력clear:109 순수 local 말단 |

```jobflow
orchestrator: useUpdateCollection
Object: useUpdateCollection, fetch, response
useUpdateCollection.mutationFn --> fetch.request
fetch.request.response --> response.json
```

response.ok를 검사하는 주체는 callback:156이며 JSON 결과에 ok가 있는 것은 아니다. mutation rejection을 per-call onSettled가 받지만 `submit`에는 catch가 없어 Promise rejection 자체는 다시 전달될 수 있다.

### JF-7 공개 목록과 dashboard 읽기 — usePublicLinks / useDashboardData

```jobflow
scope: public_browser_registration
Object: PublicCollections, PublicLinks, ReactQuery, PublicData
PublicCollections.PublicCollections --> PublicLinks.usePublicLinks
PublicLinks.usePublicLinks --> PublicLinks.useFetchLinks
PublicLinks.useFetchLinks --> ReactQuery.useInfiniteQuery
PublicCollections.fetchCollection --> PublicData.getPublicCollectionData
```

fetchCollection은 **익명 함수 식별용 별칭 — 원문 이름 아님**. `pages/public/collections/[id]/index.tsx:73–83` useEffect callback이 등록되며 id있을 때 :75 helper호출,400이면dashboard:77 그외collectionstate:79. 원문 :35 component는 usePublicLinks:65를 별도 호출한다. 두 요청을 하나의 응답 데이터 전달선으로 잇지 않는다.

| 노드 | 코드 | 비고 |
|---|---|---|
| usePublicLinks/useFetchLinks | `packages/router/publicLinks.tsx:11/:44`, callback:47 fetch:48,json:55 | queryKeypublicLinks:46, response.ok검사없음, data.data.links:58, cursor:64, pendingpoll:70 |
| getPublicCollectionData | `lib/client/getPublicCollectionData.ts:1` fetch:2, status400분기:4,json:7 | metadata helper는 HTTP400만 특별 처리; 그 외 body반환 |
| useDashboardData | `packages/router/dashboardData.tsx:11` useQuery:21, callback:23→fetch:24→json:34→!okthrow:36→data.data:39 | authenabled:41, pendingpoll:42–57. 실제 대시보드 페이지 호출 `pages/dashboard.tsx:44` |

```jobflow
orchestrator: useDashboardData
Object: useDashboardData, fetch, response
useDashboardData.queryFn --> fetch.request
fetch.request.response --> response.json
```

callback은 TanStack가 실행한다. dashboard 목록은 전체 목록이 아니라 section별16개를 합친 결과이며 [API JF-13](web-api.md#jf-13-dashboard-section별-조회--getdashboarddata)의 조건을 따른다.

### JF-8 보존물 로딩과 refresh — fetchLinkContent / loadMonolith / updateArchive

```jobflow
scope: readable_browser_calls
Object: ReadableView, fetch, response, DOMPurify
ReadableView.fetchLinkContent --> fetch.request
ReadableView.fetchLinkContent --> response.json
ReadableView.fetchLinkContent --> DOMPurify.sanitize
```

`components/Preservation/ReadableView.tsx:66` named async closure는 useEffect:65에 등록한 callback에서 :76 호출한다. readable path가 archives로 시작할 때만 :68 GET archives format3, json:71→sanitize:73→setLinkContent. response.ok/catch/cancel guard가 없어 늦은 응답이 새 link 상태를 덮을 가능성을 코드상 기록한다. 이미 HTTP body를 sanitize한 뒤 표시하며 원본 DOMPurify 내부는 외부 경계다.

**HTML + USER_CONTENT_DOMAIN 설정**일 때만 서명 URL 경로다. 그 외 형식은 iframe/img의 src로 직접 archiveGET, HTML인데 별도domain없으면 직접 src를 :112에서 만든다.

```jobflow
scope: preserved_url_calls
Object: PreservationContent, URLHelper, fetch, response
PreservationContent.loadMonolith --> URLHelper.getPreservedFormatUrl
URLHelper.getPreservedFormatUrl --> fetch.request
URLHelper.getPreservedFormatUrl --> response.json
```

| 노드 | 코드 | 비고 |
|---|---|---|
| PreservationContent.loadMonolith | **익명 함수 식별용 별칭 — 원문 이름 아님**. `components/Preservation/PreservationContent.tsx:85–157` useEffect callback, React실행 | link/id/format가드:88, configerror:96,configloading:104. helper:124,then:132/catch:137는 isCancelled 검사, cleanup:147은 표시 억제만 하고 fetch abort하지 않음 |
| URLHelper.getPreservedFormatUrl | `packages/lib/getPreservedFormatUrl.ts:3` fetch:18→json:26.catchnull→!ok:27 또는 URL없음:31 throw | 정상 url:36,download=true이면 URL.searchParams:40. server token/view는 [API JF-11.1](web-api.md#jf-111-서명-url-발급과-별도-host-조회--handler--createpreservedformaturl) |
| PreservationNavbar.handleDownload | `components/Preservation/PreservationNavbar.tsx:63`, 별도domain HTML helper:76,그외 fetch:88 | non-okthrow, anchorclick:102. anchor는 실제 다운로드 요청을 다시 할 수 있음; Back Link:118은 항상dashboard |
| LinkActions.updateArchive | `components/LinkViews/LinkComponents/LinkActions.tsx:56` await mutation:60 catchtoast:63 finallydismiss:65 | ConfirmationModal의 handler `components/ConfirmationModal.tsx:40` await onConfirmed:41→close:42. updateArchive가 실패를 catch하므로 confirmation도 닫힘 |
| useUpdateArchive.mutationFn | `packages/router/links.tsx:1145` fetchPUT:1146,jsonfallback:1156,!okthrow:1157,onSuccessinvalidate:1164 |200 Invalid URL도 hook은 success로 받음. reset와 보존완료는 다름 |

### JF-9 highlight 선택 범위와 개인 주석 — handleHighlightSelection

```jobflow
scope: highlight_browser_calls
Object: ReadableView, Selection, postHighlight
ReadableView.handleMouseUp --> ReadableView.getHighlightedSection
ReadableView.getHighlightedSection --> Selection.getSelection
ReadableView.handleHighlightSelection --> postHighlight.mutate
```

| 노드 | 코드 | 비고 |
|---|---|---|
| handleMouseUp/getHighlightedSection | `components/Preservation/ReadableView.tsx:93/:147`, 호출:104 | selection range가 readable-view안인지:155, text walker:164로 absolute offsets계산:172–177. 기존 highlight면 id/color/comment를 가져오며 menu 위치는DOMrect |
| handleHighlightSelection | `ReadableView.tsx:343`, 실제 named closure, mutate 호출:371 | 말단 확인 — 새 선택의 text/offset 가드:347–353, 기존 highlight 선택:363, 성공 callback:378에서 menu와 id를 갱신 |
| useGetLinkHighlights | `packages/router/highlights.tsx:12`, callback:27 fetch:28,!ok:39,json:41 | authenticated+linkId에만enabled:44. public 익명읽기에서는 query없음 |
| usePostHighlight | `highlights.tsx:48`, mutationFn:52→POST:53→json:67,!ok:68 | onSuccess:72 cacheupsert. mutation click은 popup input을 닫을 수 있지만 server permission은 별도 |
| useRemoveHighlight | `highlights.tsx:90`, mutationFn:94→DELETE:95→json:108,!ok:109 | onSuccess:113 cachefilter. HighlightDrawer:87과 ReadableView:579에서 mutate |

텍스트 선택·offset 계산/DOM wrapping은 pure browser 연산이며 DOM method 경계에서 중단한다. `getHighlightedHtml`:196은 매highlight에 `applyHighlight`:218을 호출해 text node를 split/wrap한다. 실제 변경 저장은 user+link+offset을 소유하는 API [JF-12](web-api.md#jf-12-개인-highlight--postorupdatehighlight--getlinkhighlights)다.


### JF-10 이메일 링크의 웹 bridge — Verify

이 절은 AuthRedirect가 children을 허용한 비인증 진입을 전제로 한다. /auth/verify는 protected 목록에 없으므로 이미 인증된 사용자는 부모 가드가 dashboard로 보낼 수 있다. 메일 URL은 NextAuth callback에 바로 도달하지 않는다. `sendVerificationRequest.ts:29–31`가 `/auth/verify?token&email`을 만들며, 실제 Verify page의 effect가 목적지를 결정한다. `VerifyEffect.callback`은 `apps/web/pages/auth/verify.tsx:35–51` useEffect 본문의 **익명 함수 식별용 별칭 — 원문 이름 아님**이며 React가 실행한다.

**router.isReady와 config가 준비되고 token/email이 있는 입력**에서 UA와 설정을 판단한다. 모바일이며 MOBILE_APP_REDIRECT_ENABLED=true일 때만 appUrl을 호출하고 location.href에 대입한다. 아래는 그 분기이며 web 분기는 다음 표에서 별도 표시한다.

```jobflow
scope: verify_mobile_bridge
Object: VerifyEffect, Verify
VerifyEffect.callback --> Verify.appUrl
```

| 노드·말단 | 코드 | 결과·실패 |
|---|---|---|
| Verify render/useConfig | `apps/web/pages/auth/verify.tsx:9`, `:13` | webUrl 문자열:24–26, token/email은 string query만 허용:19–22 |
| VerifyEffect.callback | `apps/web/pages/auth/verify.tsx:35` | router/config 미준비:36 return, token/email 없음:38→router.push(login):39, UA 판정:43/setIsMobile:44 |
| Verify.appUrl | `apps/web/pages/auth/verify.tsx:28` | encodeURIComponent(token/email/origin)으로 `linkwarden://verify-email` 문자열 반환. 외부 native 앱 내부는 범위 밖 |
| 모바일 설정 분기 | `apps/web/pages/auth/verify.tsx:46–47` | appUrl 결과를 location.href로 지정. 화면에는 앱 열기/브라우저 계속 두 버튼:54–74. 앱을 못 여는 경우 자동 web fallback timer는 없음 |
| 웹 분기 / location.replace | `apps/web/pages/auth/verify.tsx:49` | `/api/v1/auth/callback/email`로 replace. 두 번째 버튼:65는 같은 webUrl을 href로 지정. 이후 토큰 소비는 NextAuth 외부 경계, session 반영 뒤 JF-2 가드 |

이 bridge는 인증 검증 자체를 수행하지 않는다. config 오류로 data가 없으면 effect가 return한 상태가 유지될 수 있다. 웹/초기 분기의 마지막 `else <></>`는 return문이 없으며 이를 성공 안내 화면으로 그리지 않는다. [Verify Layout](layout/verify.md), [접근 Navigation](navigation/access.md).

### JF-11 태그 목록의 metadata — useTag

태그 클릭은 `/tags/:id`에서 같은 useLinks에 tagId를 전달한다. metadata query와 link query는 별개다. 아래 첫 그림은 등록이고 둘째는 TanStack가 실행하는 callback의 실제 호출이다.

```jobflow
scope: tag_query_registration
Object: TagPage, Tags, Links, ReactQuery
TagPage.Page --> Tags.useTag
TagPage.Page --> Links.useLinks
Tags.useTag --> ReactQuery.useQuery
```

```jobflow
scope: tag_query_execution
Object: useTag, Tags, fetch, response
useTag.queryFn --> Tags.supportsTagPagination
useTag.queryFn --> fetch.request
useTag.queryFn --> response.json
```

| 노드 | 코드 | 비고 |
|---|---|---|
| TagPage.Page | `apps/web/pages/tags/[id].tsx:24` | positive finite tagId:27–29, metadata useTag:35, links useLinks:54. router ready+!loading+isError이면 dashboard:59–62 |
| Tags.useTag / useQuery | `packages/router/tags.tsx:247`, `:251` | enabled:285는 인증+id+config success/error. queryFn:253, queryKey:252 |
| Tags.supportsTagPagination | `packages/router/tags.tsx:57` | minimum2.14.0:34, shared version comparator. config 없거나 낮으면 legacy `/api/v1/tags`; 현재 버전이면 `/api/v1/tags/:id`:258–260 |
| fetch.request / response.json | `packages/router/tags.tsx:258`, `:270` | !okthrow:271. current는response:274, legacy는extractTagsPayload:89의 세 envelope를 정규화하고 id find:277–279, 없으면throw:281 |
| Links.useLinks | `apps/web/pages/tags/[id].tsx:54` | tagId와sort 입력, [JF-4](#jf-4-목록-query-등록실행과-페이지-합치기--uselinks--usefetchlinks) 재사용. metadata 실패 redirect와 query 완료는 독립 |

태그 이름 변경/삭제 관리 자체는 이번 과업에서 제외한다. 해당 메뉴가 같은 화면에 있다는 사실은 Layout에 남기며, tag 클릭으로 열리는 목록의 데이터·실패 처리는 여기까지 추적한다.

### JF-12 초기 읽기와 개인 표시 설정 — useUser / useConfig / useCollections / useUpdateUserPreference

AuthRedirect/Sidebar/폼의 초기 데이터와 reader 설정은 링크 CRUD와 독립 요청이다. 다음은 **hook 등록 후** 외부 TanStack가 실행하는 실제 property callback들을 표시한다. 화살표는 각각의 callback이 직접 호출하는 대상이며 서로 순차 실행된다는 뜻이 아니다.

```jobflow
scope: bootstrap_query_callbacks
Object: useUser, useConfig, useCollections, fetch, response
useUser.queryFn --> fetch.request
useUser.queryFn --> response.json
useConfig.queryFn --> fetch.request
useConfig.queryFn --> response.json
useCollections.queryFn --> fetch.request
useCollections.queryFn --> response.json
```

| 노드 | 코드 | 비고 |
|---|---|---|
| useUser.queryFn | `packages/router/user.tsx:26` | hook:8/useQuery:24. web은 session id로 `/api/v1/users/:id`:20–22, fetch:27→!ok:38 throw→json:43, document theme 적용:45–48. 인증/id 있을 때만 enabled:52 |
| useConfig.queryFn | `packages/router/config.tsx:67` | useConfig:60/useQuery:63; fetch:68 `/api/v1/config`, json:78, response:80. web은 비인증에도 enabled, response.ok 검사 없음 |
| useCollections.queryFn | `packages/router/collections.tsx:88` | useCollections:76/useQuery:86; fetch:89 `/api/v1/collections`, json:99, 배열이면 response:101 아니면[]:102. response.ok 검사는 없음; 인증 enabled:104 |
| useInitialData | `apps/web/hooks/useInitialData.tsx:5` | useEffect:8는 setSettings:9 호출뿐. 서버 초기화 API가 아님. 실제 localSettings store의 브라우저 설정 읽기에서 중단 |

**reader에서 text style 변경**은 즉시 개인 preference mutation을 호출한다. `TextStyleDropdown.tsx:74`의 event/selection handlers가 `updateUserPreference.mutate`를 호출하며 별도 Save 창이 없다. 아래 callback들은 useMutation:97에 등록되어 TanStack가 실행한다.

```jobflow
scope: preference_callbacks
Object: useUpdateUserPreference, fetch, response, queryClient
useUpdateUserPreference.mutationFn --> fetch.request
useUpdateUserPreference.mutationFn --> response.json
useUpdateUserPreference.onMutate --> queryClient.cancelQueries
useUpdateUserPreference.onMutate --> queryClient.setQueryData
useUpdateUserPreference.onSuccess --> queryClient.setQueryData
```

| 노드 | 코드 | 비고 |
|---|---|---|
| useUpdateUserPreference.mutationFn | `packages/router/user.tsx:98` | PUT `/api/v1/users/:sessionId/preference`:99, json:108, !ok:110 throw. API는 [JF-16](web-api.md#jf-16-초기-읽기와-표시-설정--getuserbyid--getcollection--updateuserpreference) |
| onMutate | `packages/router/user.tsx:128` | cancel:129 후 cache merge:130. rollback onError가 없어 실패 시 낙관적 설정이 남을 수 있음 |
| onSuccess | `packages/router/user.tsx:122` | server response로 cache 교체:123, html theme:124–126. reader는 user cache를 다시 렌더 |

### JF-13 UI 권한 표시 — usePermissions

| 노드 | 코드 | 비고 |
|---|---|---|
| usePermissions | `apps/web/hooks/usePermissions.tsx:6` | useCollections:7/useUser:9의 cache를 읽음. effect:12는 collectionId를 찾고 member flags를 계산 |
| 계산과 반환 | `apps/web/hooks/usePermissions.tsx:13–29` | owner면 true, 회원의 세 can flag가 모두 false면 undefined, 그 외 member 객체. collection을 못 찾으면 이전 permissions를 reset하지 않음 |
| 결과 소비 | `apps/web/components/ModalContent/LinkModal.tsx:40/:76/:141` | Edit/delete 표시를 결정. API의 독립 권한 검사와 동일한 권위 결과라고 보장하지 않음 |

이 helper는 단일 cache 기반 규칙으로 말단 확인한다. 별도 서버 권한 요청을 만들지 않으며 [초기 읽기](jobflow/initial-data.md)에서 실제 입력 query를 추적했다. 조건부 메뉴의 존재와 API 승인 결과는 구분한다.

## 4. 소유 상태·데이터

| 데이터 | 경로 | 쓰기 주체 | 생명주기·보존 | 원자성 |
|---|---|---|---|---|
| link/optionsExpanded | NewLinkModal state | 입력 handler | 창 unmount까지 | React state |
| links/dashboard cache | QueryClient | mutation callbacks | 브라우저 cache | 서버 트랜잭션과 무관 |
| previousLinks/context | mutation context | onMutate | mutation 완료까지 | 결과 오류에서 snapshot 복원 |

## 5. 의존 — 나가는 방향

| 상대 | 쓰는 계약 | 배선·설정 | 타임아웃 | 결합 |
|---|---|---|---|---|
| Web API | POST links | 동일 origin fetch | 명시 없음 | response envelope |
| TanStack Query | useMutation/cache | 5.51.15 | callback에서 명시 없음 | callback lifecycle |

## 6. 실패 경계

| 항목 | 기본값 | 설정 키 | 위치 |
|---|---|---|---|
| 중복 클릭 제한 | 없음 | 없음 | NewLinkModal:88/:175 |
| HTTP timeout | 명시 없음 | 없음 | router/links.tsx:417 |

## 7. 검증 경계

| 테스트 | 무엇을 보장하나 | 실행 결과 |
|---|---|---|
| 소스 success/invalid/server error 경로 대조 | close와 callback 순서 | 소스 확인, 실행 검증 아님 |
| `apps/web/e2e/tests/public/login.spec.ts:4` | 빈 값·오류 비밀번호·정상 Login 시나리오가 존재 | 테스트 소스 조사만 수행. Playwright 실행이나 제품 브라우저 결과로 계산하지 않음 |
| update/delete cache 실패 | onError snapshot 복원 소스 | 별도 mutation 실패 실행 검증 전 |

## 8. 이슈

| ID | 분류 | 내용 | 근거 | 영향 |
|---|---|---|---|---|
| B-01 | 계약공백 | 제출 창은 서버 응답 전에 닫히며 실패 초안 복원이 없다 | NewLinkModal:98–99, onError:532 | 실패 후 다시 입력해야 함 |
| B-02 | 정합성 | preview는 collection name을 기존 cache에서 매칭하나 서버는 Unorganized 외 이름으로 새 collection을 만든다 | router/links.tsx:461, setCollection.ts:41–58 | 서버 응답 전후 소속 표시가 달라질 수 있음 |
| B-03 | 오류 회수 | 가입·복구와 Readable fetch의 일부 경로에 catch/finally·취소 가드가 없음 | `apps/web/pages/register.tsx:68`, `forgot.tsx:51`, `components/Preservation/ReadableView.tsx:66` | loader 또는 늦은 응답이 UI에 남을 수 있음 |
| B-04 | 정합성 | preference 낙관적 cache를 onError에서 복원하지 않음 | `packages/router/user.tsx:128–134` | 서버 실패 뒤 표시 값과 서버 값이 다를 수 있음 |
| B-05 | 표시 권한 | collection을 찾지 못하면 기존 permissions state를 초기화하지 않음 | `apps/web/hooks/usePermissions.tsx:15–28` | 현재 API 권한을 보장하는 값으로 사용할 수 없음 |

## 9. 미확인·한계

1. 범위 내 화면·hook·callback의 소스 분석 후보를 작성했다. 전체 독립 의미 게이트와 실제 서비스 실행 검증은 별개로 남아 있다.
2. 제품 실행·브라우저 픽셀 확인 전이다. 도표 렌더 검토의 실제 범위는 근거 브리프에 기록했다. callback 라이브러리 내부는 외부 경계다.
