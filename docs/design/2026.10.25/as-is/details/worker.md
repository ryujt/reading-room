# Worker (Node 장기 실행 프로세스) — AS-IS 상세

> **대상**: `apps/worker/worker.ts`, `workers/linkProcessing.ts`, `lib/getLinkBatchFairly.ts`, `lib/archiveHandler.ts`, Readable handler · **기준**: `952ac454`·2026.10.25
> **근거 색인**: [브리프](../../_evidence-brief.md) · **상태**: 저장 후 보존의 전체 소스 분석 후보. 실제 실행 전이며 전체 의미 게이트를 기다린다.

## 1. 책임 / 비책임

- 책임: DB의 미처리 링크를 반복 조회, 브라우저 수명 관리, 형식별 보존, 처리 후 marker 기록.
- 비책임: HTTP 저장 요청에 동기 응답, 읽기 상태/감상 관리.
- 아무도 하지 않는 것: 실패한 보존을 형식별로 자동 재시도하는 별도 queue. marker 기록 여부가 다음 조회를 좌우한다. W-01.

## 2. 공개 계약

| 메서드·경로 | 입력 | 출력 | 오류 | 구현 |
|---|---|---|---|---|
| worker process 실행 | 환경변수 | init 후 여러 비동기 loop 시작 | process 종료 시 index가 재실행 | `apps/worker/index.ts:3`, `worker.ts:11` |
| linkProcessing | interval 초 | 끝나지 않는 Promise | batch/launch 오류 | `apps/worker/workers/linkProcessing.ts:25` |
| archiveHandler | Link+collection.owner+tags, Browser | void Promise, DB/file 부작용 | setup/보존/마무리 오류 | `apps/worker/lib/archiveHandler.ts:25` |

## 3. 내부 Job Flow — 드릴다운

**결론**: `linkProcessing`의 loop가 batch를 조율하고, 링크 하나의 `archiveHandler`가 format 함수를 순서대로 조율한다. Web의 POST와 직접 호출 관계는 없다.

| 상위 §5 노드 | L1 그림 | L2 이하 |
|---|---|---|
| [Worker.poll](jobflow/preserve-link.md#2-그림과-계약) | [JF-1](#jf-1-반복-선택과-브라우저-수명--linkprocessing) | [JF-1.1](#jf-11-공정한-선택--getlinkbatchfairly) |
| [Worker.archive](jobflow/preserve-link.md#2-그림과-계약) | [JF-1.2](#jf-12-보존-실행과-실패-회수--archivehandler) | [JF-1.2.1](#jf-121-페이지-요청-보호--protectpagerequests), [JF-1.2.2](#jf-122-readable-생성--handlereadability) |

**익명함수 구획**: `RouteCallback.callback`은 익명 함수 식별용 별칭이며 원문 이름이 아니다. 범위는 `apps/worker/lib/protectPageRequests.ts:19–66`의 `context.route("**/*", async (route) => {...})` 본문이다. 등록은 protectPageRequests가 하고 실행은 Playwright가 각 요청에 대해 한다. 아래 등록 그림과 callback 실행 그림을 분리한다.

**표기**: `Processing`은 linkProcessing.ts의 모듈 구획, `Archive`는 archiveHandler.ts, `Batch`는 getLinkBatchFairly.ts다. `prismaLink/User`는 실제 Prisma delegate 별칭이다. `onDisconnect`는 processBatch의 실제 callback 인자다. method 이름이 없는 inline callback은 표에 등록 위치를 밝히며 별도 서비스로 발명하지 않는다.


**확장 시나리오 드릴다운 지도** — 각 시나리오 §3의 전수 판정과 연결한다. 같은 hook을 공유하는 변형은 같은 내부 그림을 재사용한다.

| 상위 §5 노드 | L1 그림 | L2 이하 |
|---|---|---|
| [Worker.poll](jobflow/preserve-link.md#3-내부-추적) | [JF-1](#jf-1-반복-선택과-브라우저-수명--linkprocessing) · [JF-1.1](#jf-11-공정한-선택--getlinkbatchfairly) | 상세의 호출·분기·말단 표 |
| [Worker.archive](jobflow/preserve-link.md#3-내부-추적) | [JF-1.2](#jf-12-보존-실행과-실패-회수--archivehandler) | 상세의 호출·분기·말단 표 |

### JF-1 반복 선택과 브라우저 수명 — linkProcessing

```jobflow
orchestrator: Processing
Object: Processing, Batch, Utils
Processing.linkProcessing --> Processing.linkProcessingOnDemand
Processing.linkProcessingOnDemand --> Batch.getLinkBatchFairly
Batch.getLinkBatchFairly.empty --> Utils.delay
Batch.getLinkBatchFairly.nonempty --> Processing.ensureBrowser
Processing.ensureBrowser.result --> Processing.processBatch
Processing.processBatch --> Utils.delay
Utils.delay --> Batch.getLinkBatchFairly
```

```jobflow
orchestrator: Processing
Object: Processing, Archive, browser, callbacks, Remaining
Processing.processBatch --> Archive.archiveHandler
Archive.archiveHandler.rejected --> browser.isConnected
browser.isConnected.false --> callbacks.onDisconnect
Processing.processBatch --> Remaining.countUnprocessedBillableLinks
```

| 노드 | 코드 | 비고 |
|---|---|---|
| Processing.linkProcessing | `apps/worker/workers/linkProcessing.ts:25` | 등록/호출은 `apps/worker/worker.ts:16`, interval:8–9 기본10초. init은 migrationWorker를 await:12 후 이 loop를 await하지 않고 시작 |
| linkProcessingOnDemand | `apps/worker/workers/linkProcessing.ts:112` | BROWSER_LIFECYCLE 기본 on-demand:12–14. 이 값 외는 persistent:31 |
| Batch.getLinkBatchFairly | `apps/worker/workers/linkProcessing.ts:146` | maxBatchLinks 기본5:9, mode links. result 비면 idle browser를60초 후 close:151–158 |
| ensureBrowser / BrowserModule.launchBrowser | `apps/worker/workers/linkProcessing.ts:117`, `:128` | 연결 browser 재사용.30분 초과면 close 후 재생성:119–128. 그림의 launch는 새 browser 필요할 때만 |
| Processing.processBatch | `apps/worker/workers/linkProcessing.ts:36`, 호출`:167` | links.map(async callback)의 archiveHandler:46을 Promise.allSettled:41로 기다림. 링크들은 병렬 |
| Archive.archiveHandler | `apps/worker/workers/linkProcessing.ts:46` | reject시 로그:51–56, browser disconnect면 onDisconnect:59 |
| callbacks.onDisconnect | `apps/worker/workers/linkProcessing.ts:167` | on-demand는 browser=null/start=0:171–172, 다음 batch에서 relaunch. persistent는 restartBrowser:104–105 |
| Remaining.countUnprocessedBillableLinks | `apps/worker/workers/linkProcessing.ts:65` | allSettled 뒤 남은 수를 로그. selector와 별개 통계 호출. JF-2에서 내부를 펼침 |
| Utils.delay | `apps/worker/workers/linkProcessing.ts:160`, `:175` | 실제 while 재조회. loop는 요청 성공/실패와 무관하게 batch 이후 delay |

- `ensureBrowser`는 linkProcessingOnDemand 내부의 실제 이름 있는 closure다. 대문자 Processing은 이 lexical 범위를 묶는 표기다.
- 첫 그림은 **한 loop의 재호출**이다. empty/nonempty는 택일이며 `delay`에서 합류한다. loop 간격은 고정10초 tick이 아니라 이전 batch 작업시간+delay다.
- persistent:74–109는 browser를 먼저 띄워30분 rotation:91 후 같은 selector/processBatch/delay를 사용한다. 빈 batch에도 브라우저를 유지한다. 동일 selector/processBatch를 사용하므로 아래 실제 호출 표로 수명을 구분한다. 새 정책이나 다른 저장 경로는 없다.
**ensureBrowser 내부 구간 — 재사용 전제**: browser가 있고 연결되어 있으며 age<30분이다:118–124. 기존 browser를 반환하는 단일 말단이고 launch/close를 호출하지 않는다.

**ensureBrowser 내부 구간 — 새 브라우저 전제**: browser가 없거나 disconnected이거나 age≥30분이다. age≥30분의 connected browser에 한해 closeBrowser:121을 먼저 await한다. 새로 여는 공통 구간은 다음과 같다.

```jobflow
orchestrator: Processing
Object: Processing, BrowserModule
Processing.ensureBrowser --> BrowserModule.launchBrowser
BrowserModule.launchBrowser.result --> Processing.ensureBrowser.result
```

- launchBrowser는 `lib/browser.ts:53`: getBrowserOptions:54, PLAYWRIGHT_WS_URL이면 chromium.connectOverCDP:57 아니면 chromium.launch:60. 옵션은 proxy:14–20, 실행파일:23–28, context는 Desktop Chrome과 TLS 설정:34–50. 외부 Playwright는 lockfile1.57.0:21382이며 worker manifest의 ^1.55.0 resolution을 사용한다.
- 외부 child 시작은 `index.ts:7`의 Node+tsx spawn이고 exit callback:13이5초 뒤 launch:17을 재호출한다. Docker의 직접 실행 차이와 다른 loop 등록은 [시스템 구성](system-configuration.md)에 기록한다.

### JF-1.1 공정한 선택 — getLinkBatchFairly

다음은 maxBatchLinks>0이며 후보가 있는 실행이다. 각 구간은 같은 함수의 연속이며 동일 findMany의 다른 실제 call-site를 별도 조회 단계로 표시한다.

**선택1 — 사용자 후보와 사용자별 링크 개수**

```jobflow
orchestrator: Batch
Object: Batch, prismaUser, prismaLink
Batch.getLinkBatchFairly --> prismaUser.findMany
prismaUser.findMany.empty --> Batch.getLinkBatchFairly.result
prismaUser.findMany.nonempty --> prismaLink.findMany
```

첫 findMany:88은 users 각각의 후보 개수를 Map에 넣는다. **선택2 — 아직 batch에 여유가 있고 이번 round에서 추가 가능한 후보가 있을 때** while:110가 아래 query:122를 사용자마다 반복한다. skip과 Set을 갱신하고 더 이상 추가되지 않으면 loop를 끝낸다.

```jobflow
orchestrator: Batch
Object: Batch, prismaLink
Batch.getLinkBatchFairly --> prismaLink.findMany
```

**선택3 — picked.size>0 전제**: 마지막 query:151가 전체 row를 읽고 공정성 marker를 갱신한다. query:151의 입력 pickedIds는 선택2의 Set에서 오며, updateMany:160의 user ids는 선택1의 linkUserMap에서 온다. 두 query 사이 화살표는 순서만 나타내고 반환 배열을 user ids로 전달하지 않는다. 최종 반환값은 query:151의 batch를 pickedIds 순서로 정렬한 배열이다:165–178. picked=0이면 이 구간을 생략하고[]를 반환한다:147.

```jobflow
orchestrator: Batch
Object: Batch, prismaLink, prismaUser
Batch.getLinkBatchFairly --> prismaLink.findMany
prismaLink.findMany --> prismaUser.updateMany
prismaUser.updateMany --> Batch.getLinkBatchFairly.result
```

| 노드 | 코드 | 비고 |
|---|---|---|
| Batch.getLinkBatchFairly | `apps/worker/lib/getLinkBatchFairly.ts:12` | maxBatchLinks≤0이면[]:16. mode links는 url not null AND lastPreserved null:35–38 |
| prismaUser.findMany | `apps/worker/lib/getLinkBatchFairly.ts:45` | createdLinks.some(baseWhere), 선택적 활성구독/체험:52–71, EMAIL_PROVIDER이면 emailVerified:72–76, lastPickedAt null first+id:78 |
| prismaLink.findMany — 선택1 | `apps/worker/lib/getLinkBatchFairly.ts:88` | 사용자별 후보 count를 위한 id 조회, Map 작성:95 |
| prismaLink.findMany — 선택2 | `apps/worker/lib/getLinkBatchFairly.ts:122` | round-robin while:110, per-user offset:120, 링크 createdAt desc:43, Set dedupe:136. 더 이상 추가 없으면 break:144 |
| prismaLink.findMany — 선택3 | `apps/worker/lib/getLinkBatchFairly.ts:151` | 선택된 id의 실제 row+collection.owner+tags 조회. 그림의 동일 이름은 **서로 다른 실제 query 위치** |
| prismaUser.updateMany | `apps/worker/lib/getLinkBatchFairly.ts:160` | uniqueUsersWithLinks 전체 lastPickedAt 갱신. 반환 batch sort:167, return:178 |

- selector에는 row claim/status update/transaction lock이 없다. 동일 프로세스는 processBatch 완료를 기다리지만 여러 프로세스 사이 배타 선택을 보장하지 않는다. W-02.
- empty return은 최초 users 없음:83과 picked 없음:147에도 있다. 중간 query 실패는 catch 없이 loop 호출자에 전달한다.
- findMany의 호출 위치를 역할별로 나누었으며, 반환 데이터가 아닌 단계 이름을 반환값 포트로 붙이지 않았다. users empty/nonempty는 실제 배열 길이로 도출한다.

### JF-1.2 보존 실행과 실패 회수 — archiveHandler

A/B/C는 같은 함수의 준비→try 본문→finally를 나눈다. 오류가 발생한 위치에 따라 C를 통과하는지가 다르다.

#### JF-1.2A URL 가드와 try 이전 준비

**A1 그림 전제**: skipPreservation=false이고 http(s) URL이 있다. SSRF 호출은 실제로 발생한다. blocked 포트는 반환값이 아니라 UnsafeUrlError를 Archive가 catch한 경로다.

```jobflow
orchestrator: Archive
Object: Archive, SSRF, prismaLink, BrowserModule, browser, Protect, context, Files
Archive.archiveHandler --> SSRF.assertUrlIsSafeForServerSideFetch
SSRF.assertUrlIsSafeForServerSideFetch.blocked --> prismaLink.update
prismaLink.update.skipped
SSRF.assertUrlIsSafeForServerSideFetch.safe --> BrowserModule.getDefaultContextOptions
BrowserModule.getDefaultContextOptions.result --> browser.newContext
browser.newContext.result --> Protect.protectPageRequests
Protect.protectPageRequests --> context.newPage
context.newPage --> Files.createFolder
```

**A2 그림 전제**: 환경설정으로 skipPreservation=true이거나 URL protocol이 http(s)가 아니다. 환경/입력 판단은 Archive.archiveHandler:31–49가 소유한다. 준비 호출 없이 marker만 기록한다.

```jobflow
orchestrator: Archive
Object: Archive, prismaLink
Archive.archiveHandler --> prismaLink.update
```

| 노드 | 코드 | 비고 |
|---|---|---|
| Archive.archiveHandler / SSRF assert | `apps/worker/lib/archiveHandler.ts:25`, `:37` | skipPreservation 환경 조건:31–33이면 assert 생략. UnsafeUrlError는 skip=true:40, 다른 오류는 throw:42 |
| prismaLink.update | `apps/worker/lib/archiveHandler.ts:51` | skip 또는 http(s) 외이면 lastPreserved+모든format unavailable+indexVersion null, 바로 return:63 |
| BrowserModule.getDefaultContextOptions / browser.newContext | `apps/worker/lib/archiveHandler.ts:80`, `:81` | 이 전에 timeoutPromise+AbortController 생성:66–78 |
| Protect.protectPageRequests / context.newPage | `apps/worker/lib/archiveHandler.ts:82`, `:83` | **try:112 이전**. 이 부분에서 throw하면 C의 finally가 실행되지 않음 |
| Files.createFolder | `apps/worker/lib/archiveHandler.ts:85`, `:86` | preview와 archive 디렉터리. 동기 throw도 try 이전. [adapter JF-3](adapters.md#jf-3-디렉터리와-파일-쓰기--createfoldercreatefile) |

- skipPreservation=true 또는 비HTTP이면 곧바로 update branch로 간다. 그림은 SSRF 실패 경로를 대표로 표시했다.
- setup 이후 archivalSettings는 `isArchivalTag`로 뽑은 tags의 각 format OR:88–102, 없으면 collection.owner 설정:103–110을 사용한다. 이 계산은 로컬 boolean 집계이며 새 정책 함수가 아니다.
- `.skipped`는 void 반환으로 이 실행을 끝낸다. 파일 성공을 의미하지 않는다.

#### JF-1.2B 웹 문서와 Readable 경로

**B 그림의 대표 입력**: determineLinkType 결과 url, 기존 monolith 없음, preview는 이미 있음, readable 없음, Readable만 활성화되어 있다. Preview/Capture/Monolith는 호출되지 않는다. 다른 형식의 조건과 내부 협력은 아래 표 및 JF-3~6에서 별도로 추적한다.

```jobflow
orchestrator: Archive
Object: Archive, page, prismaLink, Readable
Archive.archiveHandler --> Archive.determineLinkType
Archive.determineLinkType.url --> page.goto
page.goto --> page.evaluate
page.evaluate.result --> prismaLink.update
prismaLink.update --> page.content
page.content.result --> Readable.handleReadability
```

| 노드 | 코드 | 비고 |
|---|---|---|
| Archive.determineLinkType | `apps/worker/lib/archiveHandler.ts:237`, 호출`:115` | fetchHeaders:249로 content-type 판단, prisma.link.update(type):260, type/imageExtension 반환:265. HEAD 내부는 JF-3 |
| page.goto | `apps/worker/lib/archiveHandler.ts:132` | domcontentloaded까지. 미리 업로드된 monolith.html이면 readFile:137 후 page.setContent:143/147. 샘플 정상 입력은 기존 monolith 없음 |
| page.evaluate / prismaLink.update | `apps/worker/lib/archiveHandler.ts:154`, `:161` | meta[name=description] 추출, trim500자. page.evaluate는 실제 원격 browser 코드 실행 |
| page.content | `apps/worker/lib/archiveHandler.ts:169` | HTML string을 Readable과 Monolith에 전달 |
| Preview.handleArchivePreview | `apps/worker/lib/archiveHandler.ts:172` | !link.preview일 때만. 현재 샘플은 기존 preview가 있는 입력으로 이 협력자를 생략한다. 내부는 JF-4 |
| Readable.handleReadability | `apps/worker/lib/archiveHandler.ts:176` | archiveAsReadable && !link.readable. 아래 JF-1.2.2로 펼침 |
| Capture.handleScreenshotAndPdf | `apps/worker/lib/archiveHandler.ts:183` | screenshot/PDF 설정 및 기존 path 조건:179–182. 내부는 JF-5 |
| Monolith.handleMonolith | `apps/worker/lib/archiveHandler.ts:192` | 설정&&미생성&&URL. catch에서 로그만:193–196. 내부는 JF-6~6.2 |

- 이 그림에는 대표 입력에서 실제로 실행되는 호출만 있다. Readable 반환 후 Promise.race를 마치면 C의 finally로 이어진다. Preview/Capture/Monolith는 이 입력에서 생략되며 JF-4~6에서 별도 입력으로 펼쳤다.
- determineLinkType이 image면 imageHandler:126, pdf면 pdfHandler:129 후 내부 IIFE return. 이들의 내부는 JF-3에서 펼친다.
- try는 IIFE와 timeoutPromise의 Promise.race:113이다. timeout은 abortController.abort:71과 reject:72, catch:202–205에서 rethrow. signal은 Monolith에만 전달되며 모든 하위 async 작업을 취소하는 보장은 없다.

#### JF-1.2C finally와 다음 선택 여부

```jobflow
orchestrator: Archive
Object: Archive, prismaLink, Files, context
Archive.archiveHandler --> prismaLink.findUnique
prismaLink.findUnique.exists --> prismaLink.update
prismaLink.update --> context.close
prismaLink.findUnique.deleted --> Files.removeFiles
Files.removeFiles --> context.close
```

| 노드 | 코드 | 비고 |
|---|---|---|
| finally 진입 | `apps/worker/lib/archiveHandler.ts:206` | try에 들어간 뒤 성공/throw/timeout 모두 진입. clearTimeout:207–209. A의 setup 실패에는 진입하지 않음 |
| prismaLink.findUnique | `apps/worker/lib/archiveHandler.ts:211` | 현재 row를 재조회. stale 입력의 이전 format 상태로 덮지 않음 |
| prismaLink.update | `apps/worker/lib/archiveHandler.ts:216` | lastPreserved=now, 현재 없는 format만 unavailable, indexVersion=null:219–225 |
| Files.removeFiles | `apps/worker/lib/archiveHandler.ts:229` | row가 삭제됐으면 남은 archive 제거. [Adapter JF-4](adapters.md#jf-4-파일-조회존재삭제이동--readfile--fileexists--removefiles--movefiles)의 callback 완료 차이를 따름 |
| context.close | `apps/worker/lib/archiveHandler.ts:232` | close reject는 catch로 무시. 앞의 DB/file await가 throw하면 이 줄에 도달하지 않음 |

- try 본문 오류를 C가 성공적으로 마무리하면 `lastPreserved!=null`이다. selector의 null 조건에서 제외되어 **자동 재시도되지 않는다**. 오류는 processBatch catch/log로 전달된다. W-01.
- newContext/protect/newPage/mkdir 등 try 이전 실패면 marker 미기록이다. 다음 batch가 다시 고를 수 있지만 loop가 계속 살아 있고 user/query 조건을 계속 만족해야 한다. 보장된 retry 횟수/백오프 정책은 없다.
- setup 실패 때 이미 만든 timeoutPromise의 timer도 이 finally에서 해제되지 않는다. 실제 unhandled rejection/프로세스 영향은 런타임 검증 전으로 남긴다.
- C의 update 자체 실패면 marker가 남지 않을 수 있다. 원래 오류보다 finally 오류가 우선 전달될 수 있으며 context cleanup까지 보장되지 않는다.

### JF-1.2.1 페이지 요청 보호 — protectPageRequests

```jobflow
orchestrator: Protect
Object: Protect, context
Protect.protectPageRequests --> context.route
context.route.result --> Protect.protectPageRequests.result
```

아래 `RouteCallback`은 **protectPageRequests.ts:19–66에 실제 등록된 anonymous callback의 문서상 구획 이름**이다. 새 함수·서비스가 아니다. 인자로 받은 route를 사용해 요청 처리를 조율하므로 orchestrator로 표시한다. 콜백 등록은 위 그림, 콜백의 실행은 아래 그림이다.

**C1 전제**: 요청 URL이 about/blob/data다. 실제 helper의 boolean으로 분기한다.

```jobflow
orchestrator: RouteCallback
Object: RouteCallback, route, Protect
RouteCallback.callback --> route.request
route.request --> Protect.isNonNetworkUrl
Protect.isNonNetworkUrl.true --> route.continue
```

**C2 전제**: network URL이고 remoteBrowser=true다. remote 여부는 callback closure의 환경값:17이며 request.url의 반환값이 아니다.

```jobflow
orchestrator: RouteCallback
Object: RouteCallback, SSRF, route
RouteCallback.callback --> route.request
route.request --> SSRF.assertUrlIsSafeForServerSideFetch
SSRF.assertUrlIsSafeForServerSideFetch.result --> route.continue
SSRF.assertUrlIsSafeForServerSideFetch.throws --> route.abort
```

**C3 전제**: network URL이고 remoteBrowser=false다. callback가 request method/header/body를 읽어 safeFetch에 전달하고 response buffer를 route.fulfill에 전달한다.

```jobflow
orchestrator: RouteCallback
Object: RouteCallback, route, SafeFetch, response
RouteCallback.callback --> route.request
route.request --> SafeFetch.safeFetch
SafeFetch.safeFetch.result --> response.buffer
response.buffer.result --> route.fulfill
SafeFetch.safeFetch.throws --> route.abort
response.buffer.throws --> route.abort
```

C2의 assert 오류와 C3의 fetch/buffer/fulfill 오류는 각 try/catch:28–35,39–65가 abort로 변환한다. 한 요청에서 C1/C2/C3는 택일이다.

| 노드 | 코드 | 비고 |
|---|---|---|
| Protect.protectPageRequests / context.route | `apps/worker/lib/protectPageRequests.ts:16`, `:19` | `**/*` callback 등록. 첫 그림은 요청 발생이 아니라 등록 완료 Promise |
| route.request / request.url | `apps/worker/lib/protectPageRequests.ts:20`, `:22` | about/blob/data면 continue:23. isNonNetworkUrl:8은 세 prefix의 순수 규칙 말단 |
| SSRF assert | `apps/worker/lib/protectPageRequests.ts:29` | remote browser에서 URL 검사 후 continue:30, catch abort:32. [adapter JF-1](adapters.md#jf-1-url-안전성--isurlsafeforserversidefetch) |
| SafeFetch.safeFetch | `apps/worker/lib/protectPageRequests.ts:45` | local mode는 method/headers/body를 서버 safeFetch로 전달. request headers 일부 제거:40–43 |
| route.fulfill | `apps/worker/lib/protectPageRequests.ts:56` | response header 제거:51–54, status/body 전달. 오류 abort:62 |

- 각 callback 그림의 화살표는 RouteCallback의 조율이다. request 객체나 route 객체가 SSRF 모듈을 직접 호출한다는 뜻이 아니다. 반환 request에서 url/method/body를 추출하는 위치는 표의 실제 callback 본문을 따른다.
- 요청 차단이 page.goto 실패로 나타나면 archiveHandler try 안이므로 C로 들어간다. route 등록 자체 실패는 try 밖이므로 C에 들어가지 않는다.

### JF-1.2.2 Readable 생성 — handleReadability

**그림 전제**: parse 결과의 articleText가 비어있지 않고 직렬화한 JSON 크기가 READABILITY_MAX_BUFFER 이하인 입력이다. 빈 text 또는 초과 크기는 createFile/DB update를 생략한다:26/:40–46. 해당 크기 판단은 Readable handler가 소유한다.

```jobflow
orchestrator: Readable
Object: Readable, JSDOM, DOMPurify, purifier, Readability, prismaLink, Files
Readable.handleReadability --> JSDOM.constructor
JSDOM.constructor.window --> DOMPurify.default
DOMPurify.default.result --> purifier.sanitize
purifier.sanitize.result --> JSDOM.constructor
JSDOM.constructor.document --> Readability.constructor
Readability.constructor --> Readability.parse
Readability.parse.article --> prismaLink.findUnique
prismaLink.findUnique.result --> Files.createFile
Files.createFile --> prismaLink.update
```

| 노드 | 코드 | 비고 |
|---|---|---|
| Readable.handleReadability | `apps/worker/lib/preservationScheme/handleReadability.ts:8` | 입력 HTML/link/optional keepContent. 호출 archiveHandler:176 |
| JSDOM.constructor / DOMPurify.default / purifier.sanitize | `apps/worker/lib/preservationScheme/handleReadability.ts:15`, `:16`, `:17` | 빈 window로 purifier 생성, sanitize후 URL을 붙인 두 번째 DOM:18. 같은 constructor가 두 번 나오는 것은 실제 별도 생성 |
| Readability.parse | `apps/worker/lib/preservationScheme/handleReadability.ts:20` | `new Readability(document).parse()`. articleText 공백/개행 제거와 TEXT_CONTENT_LIMIT:21–24 |
| prismaLink.findUnique | `apps/worker/lib/preservationScheme/handleReadability.ts:28` | articleText가 비어있지 않을 때만 현재 collectionId 조회:26. article 없음/빈 text는 아무 쓰기 없이 끝남 |
| Files.createFile | `apps/worker/lib/preservationScheme/handleReadability.ts:48` | JSON article, current collectionId path. keepContent면 content 치환:34–35. buffer>READABILITY_MAX_BUFFER(100MB)면 console.error 후 return:40–46 |
| prismaLink.update | `apps/worker/lib/preservationScheme/handleReadability.ts:53` | readable path/textContent를 DB에 기록. createFile boolean을 검사하지 않음 |

- parse/sanitize/file/DB의 thrown 오류는 handler에 catch가 없어 archiveHandler try/catch/finally로 돌아간다. 파일 false 반환은 정상 경로처럼 다음 DB update로 이어진다. S-01.
- Readability0.6.0(`yarn.lock:6377`), JSDOM22.1.0(:18366), DOMPurify는 worker manifest^3.4.13에 해당하는3.4.13(:13974). 라이브러리 parse/sanitize 내부는 외부 경계다.
- text 없음/크기 초과라면 path를 기록하지 않고 반환, C가 unavailable로 채운다. 파일 생성 자체와 marker 갱신은 별개 완료 사실이다.


### JF-2 부팅과 남은 작업 통계 — init / migrationWorker / countUnprocessedBillableLinks

**현재 기준선의 부팅**: migrations 배열에 활성 항목이 없다. 따라서 migrationWorker는 DB의 AppMigration 목록을 읽고 firstIdx=-1에서 반환한다. 선언만 있는 migration 실행 반복을 현재 실행되는 경로로 표시하지 않는다.

```jobflow
scope: worker_boot_calls
Object: Worker, Migration, prismaMigration, Processing
Worker.init --> Migration.migrationWorker
Migration.migrationWorker --> prismaMigration.findMany
Worker.init --> Processing.linkProcessing
```

| 노드 | 코드 | 비고 |
|---|---|---|
| Worker.init | `apps/worker/worker.ts:11` | migration await:12 후 linkProcessing:16 호출. RSS:15, autoTag:17, indexing:18은 별도 업무 loop로 등록되며 이 범위에서는 전개하지 않음 |
| Migration.migrationWorker | `apps/worker/workers/migrationWorker.ts:4` | findMany:9, 배열 선언:75, 활성 항목 없음, firstIdx=-1이면:21 반환. 조회 실패는 throw되어 init 다음 호출을 막음 |
| Processing.linkProcessing | `apps/worker/worker.ts:16` | Promise를 await하지 않고 시작. linkProcessing 내부는 JF-1 |

**통계**: STRIPE_SECRET_KEY가 있을 때만 user.findMany를 먼저 호출한다. 이 query 결과가 비어 있거나 Stripe 설정이 없으면 count에 owner 필터를 붙이지 않는다. 따라서 이 수치는 selector와 완전히 같은 후보 집합을 보장하지 않는다.

```jobflow
orchestrator: Remaining
Object: Remaining, prismaLink
Remaining.countUnprocessedBillableLinks --> prismaLink.count
prismaLink.count.result --> Remaining.countUnprocessedBillableLinks.result
```

| 노드 | 코드 | 비고 |
|---|---|---|
| Remaining.countUnprocessedBillableLinks | `apps/worker/lib/countUnprocessedBillableLinks.ts:3` | 호출자는 processBatch:65, batch 완료 후 로그용 |
| 조건부 prisma.user.findMany | `apps/worker/lib/countUnprocessedBillableLinks.ts:6` | Stripe 설정 시 활성 본인/부모 subscription 소유자 id 조회 |
| prismaLink.count | `apps/worker/lib/countUnprocessedBillableLinks.ts:18` | lastPreserved null+URL 있음. billedOwnerIds가 비어있지 않을 때만 collection.ownerId 필터:22–24. 숫자 반환:28, 오류는 processBatch로 전파 |

### JF-3 형식 판정과 직접 파일 보존 — determineLinkType / imageHandler / pdfHandler

**URL 있음 전제**의 형식 판정이다. URL이 없으면 determineLinkType은 URL type을 반환하고 HEAD를 생략한다:247. fetchHeaders는 IGNORE_URL_SIZE_LIMIT=true이면 null을 반환하여 HEAD를 생략한다. 아래 그림의 HEAD 호출 구간은 이 옵션이 false일 때다.

```jobflow
scope: type_probe_calls
Object: Archive, Headers, SafeFetch, prismaLink
Archive.determineLinkType --> Headers.fetchHeaders
Headers.fetchHeaders --> SafeFetch.safeFetch
Archive.determineLinkType --> prismaLink.update
```

| 노드 | 코드 | 비고 |
|---|---|---|
| Archive.determineLinkType | `apps/worker/lib/archiveHandler.ts:237` | fetchHeaders:249, content-type:250, PDF/image 판정:252–257, type와 확장자 반환:265 |
| Headers.fetchHeaders | `apps/worker/lib/fetchHeaders.ts:3` | 설정 우회:4, safeFetch HEAD:7과 10초 timeout:9–15를 race. 실패는 catch:18에서 null로 변환; signal 취소 없음 |
| prismaLink.update | `apps/worker/lib/archiveHandler.ts:260` | type 저장. HEAD 실패/null이면 기본 URL type. DB 실패는 archiveHandler try/catch/finally로 전달 |

**image type, 크기 제한 이하이고 현재 Link가 존재하는 입력**이다. 확장자와 type은 위 판정 결과에서 온다. PDF는 별도 다음 그림이다.

```jobflow
orchestrator: Image
Object: Image, SafeFetch, response, prismaLink, Preview, Files
Image.imageHandler --> SafeFetch.safeFetch
SafeFetch.safeFetch.result --> response.buffer
response.buffer.result --> prismaLink.findUnique
prismaLink.findUnique.exists --> Preview.generatePreview
Preview.generatePreview --> Files.createFile
Files.createFile --> prismaLink.update
```

```jobflow
orchestrator: PDF
Object: PDF, SafeFetch, response, prismaLink, Files
PDF.pdfHandler --> SafeFetch.safeFetch
SafeFetch.safeFetch.result --> response.buffer
response.buffer.result --> prismaLink.findUnique
prismaLink.findUnique.exists --> Files.createFile
Files.createFile --> prismaLink.update
```

| 노드 | 코드 | 비고 |
|---|---|---|
| Image.imageHandler | `apps/worker/lib/preservationScheme/imageHandler.ts:7` | safeFetch:8의 then callback이 response.buffer를 반환. 그림은 이 함수가 조립한 Promise 순서이며 response 객체가 Prisma를 호출하는 뜻이 아님 |
| PDF.pdfHandler | `apps/worker/lib/preservationScheme/pdfHandler.ts:6` | 같은 Promise 조립:7. 각 safeFetch rejection은 함수와 archiveHandler로 전파 |
| prismaLink.findUnique | `apps/worker/lib/preservationScheme/imageHandler.ts:16`, `apps/worker/lib/preservationScheme/pdfHandler.ts:15` | 각각 SCREENSHOT_MAX_BUFFER/PDF_MAX_BUFFER 기본100MB 초과이면 먼저 log+return. 삭제된 Link면 쓰기 생략 |
| Preview.generatePreview | `apps/worker/lib/preservationScheme/imageHandler.ts:21` | 반환 boolean을 무시. 아래 JF-4 |
| Files.createFile / prismaLink.update | `apps/worker/lib/preservationScheme/imageHandler.ts:23`, `:28`; `apps/worker/lib/preservationScheme/pdfHandler.ts:20`, `:25` | 현재 collectionId의 archive 경로에 저장한 뒤 DB path. false 반환 검사 없음. image/pdf 이후 archive IIFE는 바로 return:127/:130 |

크기 초과나 삭제된 row는 정상 void 반환이며 JF-1.2C가 나머지 형식을 unavailable로 기록한다. image/PDF handler가 실행된 분기에는 웹 페이지의 Readable/Monolith 호출이 없다. archiveHandler:125–130의 조건에는 해당 format path가 없어야 한다는 조건도 있다. 이미 image/pdf 값이 있으면 handler를 생략하고 page.goto 경로로 내려간다.

### JF-4 미리보기 — handleArchivePreview / generatePreview

**og:image가 있고 기존 preview가 archives 경로가 아닌 입력**에서 다음 시도를 한다. 상대 og:image는 page의 origin을 읽어 이어 붙인다:27–32. safeFetch가 non-ok면 generatePreview 호출을 생략한다. 아래는 ok 응답 구간이다.

```jobflow
orchestrator: Preview
Object: Preview, page, SafeFetch, response, Generator
Preview.handleArchivePreview --> page.evaluate
page.evaluate.ogImage --> SafeFetch.safeFetch
SafeFetch.safeFetch.result --> response.buffer
response.buffer.result --> Generator.generatePreview
```

**og 시도가 성공하지 않았고 기존 archive preview도 없을 때**는 screenshot을 fallback으로 만든다. page.screenshot Promise의 then callback은 `PreviewShot.callback`이라는 문서용 별칭이며 원문 이름이 아니다. 등록은 :56–57, 본문 :57–76, 실행자는 Promise fulfillment다. 아래는 허용 크기 이하인 callback 실행이다.

```jobflow
orchestrator: PreviewShot
Object: PreviewShot, Files, prismaLink
PreviewShot.callback --> Files.createFile
Files.createFile --> prismaLink.update
```

| 노드 | 코드 | 비고 |
|---|---|---|
| Preview.handleArchivePreview / page.evaluate | `apps/worker/lib/preservationScheme/handleArchivePreview.ts:15`, `:19` | og:image 추출. `!previewGenerated && !link.preview?.startsWith('archive')`:54가 fallback 판단 소유자 |
| SafeFetch.safeFetch / response.buffer / Generator.generatePreview | `apps/worker/lib/preservationScheme/handleArchivePreview.ts:37`, `:40`, `:41` | UnsafeUrlError만 catch에서 무시:48, 다른 오류 rethrow:49. generatePreview false도 fallback 후보 |
| page.screenshot / PreviewShot.callback | `apps/worker/lib/preservationScheme/handleArchivePreview.ts:56`, `:57` | JPEG quality20. 최대 PREVIEW_MAX_BUFFER 기본10MB 초과:59–62이면 log+return |
| Files.createFile / prismaLink.update | `apps/worker/lib/preservationScheme/handleArchivePreview.ts:64`, `:69` | fallback JPEG 파일 후 preview path. false 반환 검사 없음 |

**generatePreview에서 유효한 buffer/id가 있고 Jimp가 읽은 결과가 있으며 크기 제한 이하인 구간**이다. 크기 초과면 파일 쓰기 대신 preview=unavailable DB update:27 후 false를 반환한다. 입력 없음도 최종 :54에서 false, decode/resize/쓰기/DB throw는 catch:49에서 false다.

```jobflow
orchestrator: Generator
Object: Generator, Jimp, image, Files, prismaLink
Generator.generatePreview --> Jimp.read
Jimp.read.image --> image.resize
image.resize --> image.quality
image.quality --> image.getBufferAsync
image.getBufferAsync.result --> Files.createFile
Files.createFile --> prismaLink.update
prismaLink.update --> Generator.generatePreview.result
```

| 노드 | 코드 | 비고 |
|---|---|---|
| Generator.generatePreview / Jimp.read | `packages/lib/generatePreview.ts:5`, `:12` | image 없음:14–16 false |
| image.resize / quality / getBufferAsync | `packages/lib/generatePreview.ts:19`, `:20` | 폭1000/Jimp.AUTO, JPEG quality20. 외부 Jimp 처리에서 중단 |
| Files.createFile / prismaLink.update | `packages/lib/generatePreview.ts:36`, `:41` | 정상 true:48, catch false:54. 파일 false는 확인하지 않아 DB path와 파일 존재가 다를 수 있음 |

### JF-5 화면 캡처와 PDF — handleScreenshotAndPdf / autoScroll

먼저 page.evaluate(autoScroll)를 await하고 Link를 다시 읽는다. 삭제된 Link면 format 작업을 만들지 않는다. screenshot과 PDF는 **각각 설정 활성 + 기존 해당 archive prefix path 없음**일 때만 Promise 배열에 들어간다. 아래는 두 형식 모두 필요한 입력이며 한 형식만 필요하면 다른 호출/등록을 생략한다.

```jobflow
orchestrator: Capture
Object: Capture, page, prismaLink, Promise
Capture.handleScreenshotAndPdf --> page.evaluate
page.evaluate --> prismaLink.findUnique
prismaLink.findUnique.exists --> page.screenshot
page.screenshot --> page.pdf
page.pdf --> Promise.allSettled
```

screenshot→pdf는 Promise를 배열에 넣는 등록 순서이며 screenshot 완료를 기다리고 PDF를 시작하는 뜻이 아니다. `ShotWrite.callback`(:28–49)과 `PdfWrite.callback`(:67–88)은 각각 then의 **익명 함수 식별용 별칭 — 원문 이름 아님**이다. 각 callback에서 크기가 제한 이하일 때:

```jobflow
scope: capture_write_callbacks
Object: ShotWrite, PdfWrite, Files, prismaLink
ShotWrite.callback --> Files.createFile
ShotWrite.callback --> prismaLink.update
PdfWrite.callback --> Files.createFile
PdfWrite.callback --> prismaLink.update
```

| 노드 | 코드 | 비고 |
|---|---|---|
| Capture.handleScreenshotAndPdf / page.evaluate | `apps/worker/lib/preservationScheme/handleScreenshotAndPdf.ts:7`, `:12` | autoScroll 함수를 브라우저에서 실행; 현재 Link 조회:15 |
| page.screenshot / ShotWrite.callback | `apps/worker/lib/preservationScheme/handleScreenshotAndPdf.ts:27`, `:28` | fullPage JPEG, 크기 초과:29–35 return, createFile:37/update:41 |
| page.pdf / PdfWrite.callback | `apps/worker/lib/preservationScheme/handleScreenshotAndPdf.ts:61`, `:67` | width1366,height1931,printBackground, margin 기본15px:53. 크기 초과:68–74 return, createFile:76/update:81 |
| Promise.allSettled | `apps/worker/lib/preservationScheme/handleScreenshotAndPdf.ts:92` | 두 Promise의 실패를 rejected 결과로 소비하고 결과 배열을 검사하지 않음. format 실패가 이 await에서 throw로 전파되지는 않음 |
| Capture.autoScroll | `apps/worker/lib/preservationScheme/handleScreenshotAndPdf.ts:96` | page.evaluate가 실행할 실제 함수. 아래의 timer 등록을 조율 |

```jobflow
orchestrator: Capture
Object: Capture, Timer, Promise
Capture.autoScroll --> Timer.setTimeout
Timer.setTimeout --> Timer.setInterval
Timer.setInterval --> Promise.race
```

autoScroll의 timeout Promise(:97–101)와 scrolling Promise(:103–116)는 서로 다른 executor/callback이다. interval은 100ms마다 body.scrollHeight를 읽고 window.scrollBy:108, 끝까지 갔으면 clearInterval:111/scroll:112/resolve:113. timeout은 기본30초 뒤 resolve:99만 하며 interval을 해제하지 않는다. Promise.race:118 완료는 스크롤 interval 정지와 같지 않다. timer/DOM API는 외부 경계이고 callback 본문은 이 조건표로 말단 확인한다.

**EventEmitter 표기**: 실제 `on(event, callback)` 등록은 아래 소스 표에서 말단 확인한다. 렌더러가 단독 on을 빈 이벤트 이름으로 해석하므로 없는 등록 메서드 이름을 만들지 않고 등록 표와 callback 실행 도표를 연결한다.

### JF-6 Monolith child 실행 — handleMonolith

**URL이 있는 입력**이다. URL 없으면 :13 return. 먼저 HTML resource 주소를 검사한다. ALLOW_PRIVATE_NETWORK_ACCESS=true이면 proxy 시작을 생략하며, 아래 그림은 false인 기본 경로다.

```jobflow
scope: monolith_prepare_calls
Object: Monolith, Sanitize, Proxy
Monolith.handleMonolith --> Sanitize.sanitizeHtmlForMonolith
Monolith.handleMonolith --> Proxy.getSsrfProxyUrl
```

handleMonolith의 Promise executor(:22–95)가 spawn과 event 등록을 조율한다. `ChildSetup.executor`는 그 본문을 식별하는 문서용 별칭이며 원문 이름이 아니다. Promise 생성 시 동기 실행된다.

```jobflow
orchestrator: ChildSetup
Object: ChildSetup, childProcess, childStdin
ChildSetup.executor --> childProcess.spawn
childProcess.spawn.child --> childStdin.write
childStdin.write --> childStdin.end
```

close callback `ChildClose.callback`은 **익명 함수 식별용 별칭 — 원문 이름 아님**, 등록 `handleMonolith.ts:64`, 본문 :64–94, 실행자는 Node ChildProcess close event다. code가 0 또는 null이고 stdout이 비지 않으며 최대100MB 이하일 때만 다음 쓰기를 수행한다.

```jobflow
orchestrator: ChildClose
Object: ChildClose, Buffer, Files, prismaLink, callbacks
ChildClose.callback --> Buffer.concat
Buffer.concat.result --> Files.createFile
Files.createFile --> prismaLink.update
prismaLink.update --> callbacks.resolve
```

| 노드 | 코드 | 비고 |
|---|---|---|
| Monolith.handleMonolith | `apps/worker/lib/preservationScheme/handleMonolith.ts:8` | sanitize:15, proxy:20, executor:22 |
| childProcess.spawn | `apps/worker/lib/preservationScheme/handleMonolith.ts:35` | monolith stdin/stdout, args:23–33, AbortSignal+SIGKILL:37–38. proxy가 있으면 HTTP/HTTPS/ALL_PROXY 대소문자와 빈 NO_PROXY 환경:39–51 |
| childStdin.write/end / childStdout.on | `apps/worker/lib/preservationScheme/handleMonolith.ts:54`, `:55`, `:58` | data callback은 chunks.push만 한다. 최대 크기는 수집 중이 아니라 close 이후 검사 |
| child.on(error) | `apps/worker/lib/preservationScheme/handleMonolith.ts:60` | callback:61에서 reject. 실제 process 시작 실패가 이 Promise에 전파 |
| ChildClose.callback / Buffer.concat | `apps/worker/lib/preservationScheme/handleMonolith.ts:64`, `:69` | nonzero code:65–67, empty:70–72, buffer 초과:74–78는 reject하고 쓰기를 생략 |
| Files.createFile / prismaLink.update / resolve | `apps/worker/lib/preservationScheme/handleMonolith.ts:80`, `:85`, `:90` | catch:91–93 reject. createFile false는 검사하지 않음 |

archiveHandler:192의 `.catch`:193는 Monolith rejection을 로그로 소비한다. 따라서 Monolith 실패만으로 archiveHandler가 throw하지 않지만, 전체 timeout과 finally의 DB 실패는 별도다. signal로 child를 종료할 수 있어도 다른 format Promise를 모두 취소하지 않는다.

### JF-6.1 HTML 내 주소 검사 — sanitizeHtmlForMonolith

**private network 검사 기본 경로**다. sanitizer는 문서의 resource 속성, SVG href, srcset 후보, style 속성과 style element를 각각 순회한다. 다음은 HTTP(S) 주소이며 cache miss인 resolve 구간이다. 잘못 파싱되는 URL과 비HTTP scheme은 이 helper에서 true로 남고, 동일 host는 Promise cache를 재사용한다.

```jobflow
scope: monolith_sanitize_calls
Object: Sanitize, JSDOM, SSRF
Sanitize.sanitizeHtmlForMonolith --> JSDOM.constructor
Sanitize.sanitizeHtmlForMonolith --> Sanitize.resolvesToSafeTarget
Sanitize.resolvesToSafeTarget --> SSRF.isUrlSafeForServerSideFetch
```

| 노드 | 코드 | 비고 |
|---|---|---|
| Sanitize.sanitizeHtmlForMonolith / JSDOM.constructor | `apps/worker/lib/preservationScheme/sanitizeHtmlForMonolith.ts:106`, `:110` | resource attrs:114–120, SVG:123–131, srcset:134–153, inline style:157–165, style element:167–171; serialize:177 반환 |
| Sanitize.resolvesToSafeTarget | `apps/worker/lib/preservationScheme/sanitizeHtmlForMonolith.ts:46` | newURL:53 catchtrue:55, 비HTTPtrue:58–59. absolute.host cache:63–67; unsafe이면 attrs 제거/srcset 제외 |
| Sanitize.sanitizeCss | `apps/worker/lib/preservationScheme/sanitizeHtmlForMonolith.ts:72` | url/@import regex:79/82, 주소 검사:88, unsafe 토큰만 `url(about:invalid)`:90로 치환 |
| SSRF.isUrlSafeForServerSideFetch | `apps/worker/lib/preservationScheme/sanitizeHtmlForMonolith.ts:66` | [Adapter JF-1](adapters.md#jf-1-url-안전성--isurlsafeforserversidefetch)로 계속. boolean false가 제거 기준이며 다른 thrown 오류는 상위로 전파 |

CSS가 존재하는 별도 순회 구간은 다음과 같다. 같은 helper를 호출하지만 attribute 순회가 sanitizeCss를 호출하는 것은 아니다.

```jobflow
scope: monolith_css_calls
Object: Sanitize, SSRF
Sanitize.sanitizeHtmlForMonolith --> Sanitize.sanitizeCss
Sanitize.sanitizeCss --> Sanitize.resolvesToSafeTarget
Sanitize.resolvesToSafeTarget --> SSRF.isUrlSafeForServerSideFetch
```

각 loop의 입력은 JSDOM document와 같은 Map이며 이전 attribute 결과가 다음 태그의 입력이라는 선을 만들지 않는다. HTML sanitizer와 이후 proxy는 별개의 보호 단계다.

### JF-6.2 Monolith의 loopback proxy — getSsrfProxyUrl / handleConnect / handleRequest

**serverPromise가 없는 첫 호출**만 HTTP server를 만들고 listener를 등록한다. 기존 Promise면 재사용한다. `ProxySetup.executor`(:137–154)와 `ProxyListening.callback`(:142–149)은 익명 함수 식별용 별칭이며 원문 이름이 아니다. executor는 Promise가 동기 실행하고 listen callback은 Node가 listening 후 실행한다.

```jobflow
orchestrator: ProxySetup
Object: ProxySetup, http, server
ProxySetup.executor --> http.createServer
http.createServer.server --> server.listen
server.listen --> server.unref
```

| 노드 | 코드 | 비고 |
|---|---|---|
| Proxy.getSsrfProxyUrl | `apps/worker/lib/ssrfProxy.ts:135` | cache:136, Promise return:156. rejected Promise도 reset하는 코드 없음 |
| http.createServer / server.on | `apps/worker/lib/ssrfProxy.ts:138`, `:139` | request는 실제 handleRequest, connect는 handleConnect, error:140은 reject callback 등록 |
| server.listen / ProxyListening.callback | `apps/worker/lib/ssrfProxy.ts:142` | port0/127.0.0.1, callback server.address:143→주소 있으면 resolve URL:145, 아니면 reject:147 |
| server.unref | `apps/worker/lib/ssrfProxy.ts:152` | 프로세스 수명 참조 해제. 외부에 listen하지 않음 |

**CONNECT 요청 실행**은 등록과 다르다. `ConnectResolved.callback`은 :65–77의 then callback을 식별하는 문서용 별칭이며 원문 이름이 아니다. resolvePinnedAddress Promise가 fulfill된 후 Node Promise 처리기가 실행하며, 받은 ip를 net.connect에 전달한다. authority를 host/port로 분해하고 검증된 첫 IP로 연결한다. 다음 그림은 DNS 허용과 connect 성공 구간이다. `Connected.callback`은 :66–71 net.connect callback의 문서용 별칭이며 원문 이름이 아니다. Node가 연결 성공 후 실행한다.

```jobflow
scope: proxy_connect_calls
Object: Proxy, SSRF, ConnectResolved, net, Connected, clientSocket, serverSocket
Proxy.handleConnect --> Proxy.resolvePinnedAddress
Proxy.resolvePinnedAddress --> SSRF.resolveHostnameForServerSideFetch
ConnectResolved.callback --> net.connect
Connected.callback --> clientSocket.write
Connected.callback --> serverSocket.pipe
Connected.callback --> clientSocket.pipe
```

| 노드 | 코드 | 비고 |
|---|---|---|
| Proxy.handleConnect / splitAuthority | `apps/worker/lib/ssrfProxy.ts:55`, `:62` | splitAuthority:36 IPv6 bracket/port/default443 순수 파싱. malformed authority가 검증에서 실패하면 catch:78 |
| Proxy.resolvePinnedAddress / SSRF resolver | `apps/worker/lib/ssrfProxy.ts:26`, `:27` | 첫 검증 IP 반환:28. 허용 host 이름으로 다시 DNS 연결하지 않음 |
| net.connect 등록 callback | `apps/worker/lib/ssrfProxy.ts:65–71` | resolvePinnedAddress.then의 실제 익명 callback이 net.connect:66을 호출. 위 도표는 callback의 직접 child 호출을 표시; DNS helper가 net.connect를 호출하는 뜻이 아님 |
| Connected.callback | `apps/worker/lib/ssrfProxy.ts:66` | client에200:67, head있으면 server.write:68, 양방향pipe:69–70 |
| socket 오류·닫기 callback | `apps/worker/lib/ssrfProxy.ts:60`, `:73–76` | connect timeout15초→server.destroy, error/close는 상대 socket destroy. resolver/callback throw catch:78은 403 write/destroy. Node socket API에서 중단 |

**HTTP 요청 실행**: URL parsing 실패나 비http이면400으로 끝낸다:88–96. 정상 HTTP와 주소 검증 성공에 한해 :99의 then callback이 http.request:101을 호출한다. `HttpResolved.callback`(:100–124), `ProxyResponse.callback`(:112–115)은 익명 함수 식별용 별칭이며 원문 이름이 아니다.

```jobflow
scope: proxy_http_calls
Object: Proxy, HttpResolved, http, ProxyResponse, res, proxyRes
Proxy.handleRequest --> Proxy.resolvePinnedAddress
HttpResolved.callback --> http.request
ProxyResponse.callback --> res.writeHead
ProxyResponse.callback --> proxyRes.pipe
```

| 노드 | 코드 | 비고 |
|---|---|---|
| Proxy.handleRequest | `apps/worker/lib/ssrfProxy.ts:85` | URL:88, protocol:94, stripBrackets:99는 IP literal 표기 정규화 말단 |
| HttpResolved.callback / http.request | `apps/worker/lib/ssrfProxy.ts:100`, `:101` | host=검증IP:103, port104, method105,path106, Host=원래host109, timeout 옵션15초110이며 timeout event listener/destroy 코드는 없어 자동취소를 보장하지 않는다. 등록 후 req.pipe(proxyReq):123 |
| ProxyResponse.callback | `apps/worker/lib/ssrfProxy.ts:112` | 응답status/headers 전달:113, body pipe:114 |
| proxyReq.on(error) | `apps/worker/lib/ssrfProxy.ts:118` | headers 이전이면502:119, end:120. 주소 검증 rejection은 catch:125→403:126 |

socket/stream callback은 원 요청과 다른 시점에 실행된다. 오류 수신자가 Node callback인지 handleMonolith Promise인지 구분한다. proxy가 HTTP 오류를 응답한 뒤 Monolith가 어떻게 exit하는지는 외부 binary 동작이며 실제 실행으로 아직 확인하지 않았다.

## 4. 소유 상태·데이터

| 표 | 주요 열 | 비고 |
|---|---|---|
| Link | lastPreserved, readable/image/pdf/monolith/preview, textContent, type | null marker는 미처리 후보, unavailable은 처리 후 형식 없음 |
| User | lastPickedAt | 배치 공정성 정렬 marker. 링크 lock은 아님 |

## 5. 의존 — 나가는 방향

| 상대 | 쓰는 계약 | 배선·설정 | 타임아웃 | 결합 |
|---|---|---|---|---|
| Prisma | findMany/update | 공유 client | 명시 없음 | lastPreserved selector |
| Playwright | browser/context/page | local/CDP | 전체 보존 race 기본5분 | setup/cleanup 위치 |
| Files | createFile/createFolder | local/S3 | 명시 없음 | DB path와 독립 |

## 6. 실패 경계

| 항목 | 기본값 | 설정 키 | 위치 |
|---|---|---|---|
| batch 크기 | 5 | ARCHIVE_TAKE_COUNT | linkProcessing.ts:9 |
| batch 뒤 delay | 10초 | ARCHIVE_SCRIPT_INTERVAL | worker.ts:8 |
| 보존 race | 5분 | BROWSER_TIMEOUT | archiveHandler.ts:23/:77 |
| browser idle/max age | 60초/30분 | 상수 | linkProcessing.ts:10/:15 |

## 7. 검증 경계

| 테스트 | 무엇을 보장하나 | 실행 결과 |
|---|---|---|
| 성공/try내실패/try외실패 trace | marker와 다음 선택 차이 | 소스 검토 후보, 실행 전. 현재 조사한 테스트 목록에서 이 전 경로를 실행하는 worker 전용 테스트를 찾지 못함 |
| format writer 실패 | 파일 false와 DB path 차이 | 소스 대조, 장애 주입 전 |

## 8. 이슈

| ID | 분류 | 내용 | 근거 | 영향 |
|---|---|---|---|---|
| W-01 | 계약공백 | try 안 실패에도 finally가 처리 marker를 기록한다 | archiveHandler.ts:206–227 | selector 자동 재선택 제외 |
| W-02 | 정합성 | 배치에 DB claim/lock이 없다 | getLinkBatchFairly.ts:45–178 | 복수 worker가 같은 링크를 선택할 수 있음 |
| W-03 | 계약공백 | try 이전 setup 실패는 timer/context cleanup과 marker 기록을 통과하지 않는다 | archiveHandler.ts:66–112 | 재선택/자원 정리 동작이 try 안 오류와 다름 |

## 9. 미확인·한계

1. 실제 외부 원문·Chromium·DB·파일 결과는 실행하지 않았다.
2. 형식별 내부와 callback을 소스로 추적했다. 외부 Chromium/Jimp/Monolith·Node stream 및 실제 SMTP/S3의 내부 구현과 결과는 실행 검증 범위로 남긴다. RSS/AI/indexing의 독립 작업은 범위 밖이다.
3. setup 실패의 orphan timer와 cleanup 부작용은 소스상 위험이며 실제 프로세스 동작을 검증하지 않았다.
