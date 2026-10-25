# Browser (React UI) — TO-BE 상세

> **대상**: C-03·C-04·C-06·C-07, 개인 library·draft·제품 진입·독립 프로토타입. 새 심볼과 경로는 `(제안)`이다.
> **기준**: upstream `952ac454`·2026.10.25. [짝 AS-IS](../../as-is/details/browser.md) · [핵심](../system-design-to-be.md) · [브리프](../../_evidence-brief.md)

## 1. 책임 / 비책임

- **책임**: 개인 library·draft·오류와 이동의 수명.
- **비책임**: 서버 권한·DB 영속화·원문 보존.
- **아무도 하지 않는 것**: 사용자가 실제 읽은 분량을 자동 판정하거나 탭 강제종료 뒤 초안을 복구하지 않는다.

ReadingRoomApp은 화면과 초안 수명을 소유하고, 주입받은 ReadingClient로만 영속 작업을 요청한다. 실서비스는 기존 인증된 Next page가 RealReadingClient를 조립한다. 프로토타입은 별도 Vite entry가 FakeReadingClient와 메모리 session을 조립한다. 업무 서버·실제 인증·기존 `_app`·background config fetch가 prototype entry에 들어오지 않는다(D-03).

| 구획 객체 | 제안 파일·심볼 | 책임 |
|---|---|---|
| UI | `packages/reading-room-ui/ReadingRoomApp.tsx`, `ReadingRoomApp` | library/detail/save/guard rendering, 순수 presentation props |
| Controller | `packages/reading-room-ui/useReadingRoom.ts`, `useReadingRoom` 안의 `loadShelf`, `selectLink`, `saveDraft`, `requestNavigation`, `resolveNavigation`, `saveLink` | actor별 state·epoch·draft·pending destination |
| Client | `packages/reading-room-ui/client.ts`, `ReadingClient` interface | list/get/put/createLink/getCollections 계약. 구현체는 주입 |
| HTTP | `apps/web/lib/reading-room/realClient.ts`, `RealReadingClient`, `requestJson` | timeout·AbortSignal·HTTP error envelope |
| Navigation | `apps/web/lib/reading-room/navigation.ts`, `readLocation`, `commitLocation`, `subscribePopState`, `safeReadingReturnTo` | allowlist URL 직렬화, browser history 보상과 guard |
| Fake | `apps/reading-room-prototype/src/fakeClient.ts`, `FakeReadingClient` | deterministic fixture·지연·오류·conflict·초기화, 네트워크 없음 |
| Page | `apps/web/pages/reading-room.tsx`, `ReadingRoomPage` | real client/actor/Next shell 조립 |

## 2. 공개 계약

새 UI/adapter 공개 계약 7개 묶음이다. 선언 위치는 아래 제안 파일이며 기존 Browser 계약은 [AS-IS §2](../../as-is/details/browser.md#2-공개-계약)에 유지한다.

| 메서드·경로 | 입력 | 출력 | 오류 | 구현 |
|---|---|---|---|---|
| ReadingClient.list/get (제안) | shelf query 또는linkId+signal | API DTO | typed HTTP/transport error | client.ts interface, realClient.ts/fakeClient.ts 제안 |
| ReadingClient.getCollections (제안) | 현재 actor | 원본 collection 목록 | 인증/HTTP 오류 | realClient.ts/fakeClient.ts |
| ReadingClient.put (제안) | id+draft+expectedVersion | reading DTO | 409 current 또는typed error | client.ts interface와구현체 제안 |
| ReadingClient.createLink (제안) | URL/name/collection id 또는새name | 원본 Link | 원본오류,자동 retry없음 | realClient.ts/fakeClient.ts 제안 |
| requestNavigation (제안) | 다음location/viewer URL | clean이동 또는Guard | 허용되지않은목적지거절 | useReadingRoom.ts 제안 |
| resolveNavigation (제안) | save/discard/keep | 목적지실행 또는기존초안 | save실패시draft/destination유지 | useReadingRoom.ts 제안 |
| Fake scenario control (제안) | reset/empty/fail/conflict/slow | 결정적fixture state | 미지원 입력fail closed | fakeClient.ts 제안 |

UI 문구는 읽기 상태를 사용자가 직접 고르는 분류로 설명한다. 저장된 format은 원본 viewer로 열고, 없는 format은 pending/unavailable로 구분한다. status=Finished를 실제 본문 열람 검증으로 보고하지 않는다.

## 3. 내부 Job Flow — 드릴다운

| 상위 §5 노드 | L1 그림 | L2 이하 |
|---|---|---|
| [Browser.openShelf/receiveShelf/selectLink/receiveReading](jobflow/reading-library.md) | [JF-1](#jf-1-library와-선택--loadshelfselectlink) | [JF-1.1 transport](#jf-11-http-수명--requestjson) |
| [Browser.submitReading/receiveReading](jobflow/save-reading.md) | [JF-2](#jf-2-초안-저장--savedraft) | [JF-1.1](#jf-11-http-수명--requestjson) |
| [Browser.changeLocation/resolveGuard](jobflow/leave-draft.md) | [JF-3](#jf-3-이탈-판단--requestnavigationresolvenavigation) | [JF-3.1 history](#jf-31-브라우저-뒤로가기--subscribepopstate) |
| Browser.openSave/receiveCollections | [JF-4.1](#jf-41-저장할-collection-선택지--loadcollections) | 원본 GET collections |
| [Browser.submitNewLink/receiveCreatedLink](jobflow/save-reading-link.md) | [JF-4](#jf-4-원본-link-저장--savelink) | 기존 POST [API 내부](../../as-is/details/web-api.md#jf-12-저장-정책과-영속화--postlink) |
| [Browser.openPreserved/returnToLibrary](jobflow/read-preserved.md) | [JF-5](#jf-5-원본-viewer-왕복--safereadingreturnto) | 순수 return hint 검증 |
| Browser.authGuard/initialData | [JF-6](#jf-6-실제-서비스-조립--readingroompage) | [AS-IS 초기 읽기](../../as-is/details/browser.md#jf-12-초기-읽기와-개인-표시-설정--useuser--useconfig--usecollections--useupdateuserpreference) |
| 나머지 유지 노드 | 각 목표 시나리오 §3 | AS-IS의 실제 심볼·호출 위치 재사용 |

### JF-1 library와 선택 — loadShelf/selectLink

scope는 제안 Controller가 직접 부르는 함수다. UI event/mount가 시작점이며 별도 fetch가 response consumer를 직접 호출한다고 그리지 않는다.

```jobflow
scope: shelf_calls
Object: Controller, Client, State
Controller.loadShelf --> Client.list
Controller.loadShelf --> State.setShelf
```

```jobflow
scope: selected_link_calls
Object: Controller, Client, State
Controller.selectLink --> Client.get
Controller.selectLink --> State.setSelected
```

| 노드 | 근거 | 비고 |
|---|---|---|
| Controller.loadShelf/selectLink | R-02·C-03 제안 | 각 요청 시작 시 epoch 증가, 이전 AbortController 취소. set은 성공하고 현재 actor/epoch/id와 일치할 때만 |
| Client.list/get | R-01·D-03 제안 | real은HTTP, fake는메모리. 상세 direct link는 현재 list page에 없어도 별도 get |
| State.setShelf/setSelected | React state setter의 제안 별칭 | shelf는 reset/append 구분, append id중복 제거. selected는 서버 기준+draft 복제. 다른 선택의 응답은 무시 |

트리거는 route query 진입·명시적 검색 제출·shelf 선택·Load more·article 클릭이다. 성공 시 rows/counts 또는 상세가 표시된다. 실패하면 inline retry를 표시하고 기존 rows는 낡은 데이터 표시와 함께 유지한다. 권한404는 상세를 지우고 접근 불가를 보여 주며 개인 draft 내용을 다른 actor에게 재사용하지 않는다. session actor가 바뀌면 전체 state/requests를 초기화한다. private row를 localStorage에 보존하지 않는다. 자동 background polling은 추가하지 않고 Refresh와 save 후 reload를 사용한다.

### JF-1.1 HTTP 수명 — requestJson

네트워크가 발생하는 것은 **real entry만**이다. 각 RealReadingClient 메서드가 requestJson을 직접 호출한다. 동일 helper지만 POST는 자동 재시도하지 않는다.

```jobflow
scope: real_transport_calls
Object: Client, HTTP, Fetch, Response
Client.put --> HTTP.requestJson
HTTP.requestJson --> Fetch.fetch
HTTP.requestJson --> Response.json
```

위 그림은 fetch가 정상 응답하고 JSON parse까지 도달한 경로다. 아래는 timeout 또는 caller signal이 발생하여 등록한 abortRequest callback을 실행한 별도 경로다. timer 등록과 callback 실행을 구분한다.

```jobflow
scope: transport_abort_callback
Object: HTTP, Abort
HTTP.abortRequest --> Abort.abort
```

| 노드·호출 | 근거 | 비고 |
|---|---|---|
| Client.put/HTTP.requestJson | C-03 제안 | 실제 client의 모든 요청은 이 helper 사용; endpoint별 method/path/JSON 지정 |
| timer·caller signal | 제안 requestJson 내부 이름 있는 `abortRequest` callback | setTimeout 기본15000ms 또는 caller abort 이벤트 때만 AbortController.abort. 성공/실패 finally에서 timer와 listener 정리 |
| Fetch.fetch | Web platform 외부 | 합성 controller.signal을 넘김. timeout/cancel이 서버 commit rollback을 뜻하지 않음 |
| Response.json | HTTP.requestJson이 await 후 직접 호출 | parse실패도 typed transport error. response.ok 판단은 HTTP가 수행 |

timeout이면 “저장 결과를 확인하지 못했습니다. 초안은 유지됩니다.”라고 표시하고 진행 중 잠금을 해제한다. 읽기 PUT은 명시적 재시도 가능하며 같은 payload/version을 유지한다. POST는 결과 유실 시 “이미 저장되었을 수 있습니다. 라이브러리를 확인한 뒤 다시 시도하세요.”를 표시하고 자동 재전송하지 않는다. call-site가 unmount/새선택으로 취소한 읽기는 UI error로 표시하지 않는다. 브라우저 탭 종료 자체는 요청 완료를 보장하지 않는다.

### JF-2 초안 저장 — saveDraft

유효한 selected+dirty draft이며 다른 save가 없는 경우에만 실행한다. status 버튼은 **로컬 draft 변경**이고 reflection과 한 Save로 함께 저장한다.

```jobflow
scope: save_draft_calls
Object: Controller, Validation, Client, State
Controller.saveDraft --> Validation.parseReadingInput
Controller.saveDraft --> Client.put
Controller.saveDraft --> State.setSavedReading
```

| 노드 | 근거 | 비고 |
|---|---|---|
| Controller.saveDraft | R-03·R-04·C-03 제안 | pending 동기 ref로 중복 제출 차단. actor/id/epoch와 baseVersion을 capture |
| Validation.parseReadingInput | [API 공유 규칙](web-api.md#2-공개-계약) | 실패는 inlineerror+입력focus, HTTP 없음 |
| Client.put | §2 | 결과 처리 때 캡처한 actor/id/epoch 일치 검사. 새 선택에 응답 덮어쓰기 금지 |
| State.setSavedReading | 제안 local state 전이 | 성공200만 base/draft를 반환값으로 교체, dirty=false, Saved aria-live 유지. counts/rows는 reload |

그림은200의 정상 분기다. 실패는 base/draft를 바꾸지 않고 error를 aria-live로 알리며 Save 또는 오류 action에 focus를 복원한다.`READING_CONFLICT` code와 current가 함께 있는409만 current와 내 draft를 함께 보여 주고 “서버 값 불러오기” 또는 “내 초안으로 덮어쓰기”를 제공한다. 전자는 명시적 discard, 후자는 사용자가 current를 검토하고 선택했을 때만 expectedVersion을 current.version으로 바꿔 다시 PUT한다.409 응답이 오래되었으면 다시409가 날 수 있다. `VERSION_EXHAUSTED`409는 비교/덮어쓰기 UI를 열지 않는다. 초안을 유지하고 “이 기록은 더 이상 갱신할 수 없습니다”라는 저장 불가 안내로 소비한다. 저장 중에는 draft 입력·다른 이동을 잠시 막지만15초 제한 후 복구할 수 있다. Saved 문구는 서버 DTO effect가 지우지 않으며 다음 사용자 편집 때 지운다.

### JF-3 이탈 판단 — requestNavigation/resolveNavigation

다음은 dirty=true인 이탈 요청 경로다. clean이면 Guard를 열지 않고 commitLocation을 직접 호출한다. pending destination은 하나이며 Guard가 열린 동안 추가 이동을 덮어쓰지 않는다.

```jobflow
scope: guard_request_calls
Object: Controller, State
Controller.requestNavigation --> State.setPendingDestination
Controller.requestNavigation --> State.openGuard
```

save-and-leave를 고른 분기다. resolveNavigation이 조율하며 saveDraft의 성공 결과를 받아 commitLocation을 호출한다. 아래 결과 화살표는 saveDraft가 Navigation을 직접 부른다는 뜻이 아니다.

```jobflow
orchestrator: Controller
Object: Controller, Navigation
Controller.resolveNavigation --> Controller.saveDraft
Controller.saveDraft.success --> Navigation.commitLocation
```

| 노드·분기 | 근거 | 비고 |
|---|---|---|
| Controller.requestNavigation | R-04·C-04 제안 | shelf/query URL 변경, 다른 detail, close, legacy Dashboard/Links, original viewer 링크가 모두 통과 |
| Controller.resolveNavigation | 제안 action enum | keep→pending없애고원focus, discard→draft없애고목적지실행, save→성공때만실행 |
| Navigation.commitLocation | 제안 실제 adapter | location 객체를 검증·직렬화한 뒤 history 또는 Next navigation 실행 |

완료는 선택한 목적지로 이동하거나 기존 draft에 남는 것이다. save 실패/409/timeout은 Guard 안 오류와 destination을 유지한다. retry·discard·keep 세 선택이 다시 가능하다. dialog focus trap/Escape=keep/기존 focus 복귀를 제공한다. 단순히 dirty flag를 false로 바꾸고 이동하는 것을 저장 완료로 표시하지 않는다.

### JF-3.1 브라우저 뒤로가기 — subscribePopState

history의 URL은 popstate 시점에 이미 바뀌므로 native event를 preventDefault만 해서 취소할 수 없다. 제안 adapter는 앱이 만든 history entry에 증가하는 index와 이전 확정 location을 저장한다.

```jobflow
scope: history_guard_calls
Object: Navigation, History, Controller
Navigation.handlePopState --> History.go
Navigation.handlePopState --> Controller.requestNavigation
```

위 그림은 **같은 document 안에서 알고 있는 index로 이동했고 dirty인 경로**다. handlePopState는 도착 index delta를 읽어 원래 entry로 보상 이동하고, 보상 popstate는 suppression flag로 소비한 뒤 원래 목적지를 guard에 전달한다. discard/save 성공 때 그 delta를 재적용하고 one-shot allow flag로 재가드하지 않는다. clean이면 보상 없이 location state를 갱신한다.

레거시 Dashboard→Reading Room의 Next client navigation처럼 **같은 document인데 index가 없는 entry**는 별도로 처리한다. 실서비스 adapter는 `router.beforePopState(handleNextPopState)`를 등록한다. dirty이고 unknown entry이면 callback이 false를 반환하여 Next page 전환을 막고, 대상의 same-origin URL을 capture한 뒤 `history.replaceState`로 마지막 Reading Room URL과 Next state를 현재 entry에 복원한다. 그 후 같은 Guard를 연다. keep이면 그 위치에 남고 save/discard이면 capture한 URL로 `window.location.replace`하여 실제 목적지를 연다. 이 fallback은 기존 history stack의 정확한 모양을 보존하지 않지만 같은 document 이동에서 초안을 조용히 버리지는 않는다. 허용 목적지는 현재 origin의 검증된 상대 경로이며 외부 URL을 입력으로 받지 않는다. 등록 해제는 cleanup에서 beforePopState 기본 허용으로 복원한다.

```jobflow
scope: unknown_next_history_guard
Object: Navigation, History, Controller
Navigation.handleNextPopState --> History.replaceState
Navigation.handleNextPopState --> Controller.requestNavigation
```

이 그림은 dirty+unknown index인 callback 실행만 나타낸다. callback 등록은 Next adapter의 mount에서 수행한다. clean은 Next 기본 이동을 허용한다. known-index dirty 경로도 beforePopState가 false를 반환하여 Next의 선행 page 전환을 막고 위 보상 알고리즘에 위임한다. **다른 document로 나가기와 탭 종료만** `beforeunload`의 브라우저 기본 경고에 맡긴다. 사용자 제스처·브라우저 정책에 따라 경고가 나타나지 않을 수 있고 커스텀 Save&Leave는 보장하지 않는다. prototype known-index Back과 별도로 실제 Dashboard→Reading Room→dirty→Back의 unknown entry를 통합 검증한다(C-04, 검토 R-TB-1).

### JF-4 원본 Link 저장 — saveLink

```jobflow
scope: new_link_calls
Object: Controller, Validation, Client, State
Controller.saveLink --> Validation.parseNewLink
Controller.saveLink --> Client.createLink
Controller.saveLink --> State.selectCreatedLink
```

그림은 원본 POST200 경로다. new save overlay는 URL/name/collection을 받으며 기존 collection은id로 보낸다. 새 이름을 지정한 때만 name을 보내고 새 collection 생성임을 설명한다. create 가능 collection 필터는 UI 편의이며 서버가 최종권한을 검사한다. POST를 await한200 이후만 overlay를 닫고 실제 id detail을 연다. status는 아직absence Unread이고 새 개인 기록 자동생성 없음. error/timeout이면 폼과 typed error를 남긴다. 원본의 collection 선행생성·후속 mkdir 부분실패 가능성을 숨기지 않는다. 이 새 overlay 개선은 레거시 NewLinkModal의 즉시닫힘 코드를 전면 수정하는 요구가 아니다.

### JF-4.1 저장할 collection 선택지 — loadCollections

새 Save overlay를 열 때 Controller가 실제 또는 fake client의 getCollections를 호출한다. 기존 API는 같은 인증 사용자가 접근 가능한 collection 목록을 반환한다. UI가 owner 또는 canCreate만 선택 가능하게 보여 주지만 원본 POST가 최종 권한을 검사한다.

```jobflow
scope: save_collection_options
Object: Controller, Client, State
Controller.loadCollections --> Client.getCollections
Controller.loadCollections --> State.setCollections
```

| 노드 | 근거 | 비고 |
|---|---|---|
| Controller.loadCollections | C-03 제안 | overlay mount 시작, epoch와 actor 확인 후 set |
| Client.getCollections | 원본 GET /api/v1/collections, fake는 fixture | 실패는 선택지 없음으로 숨기지 않고 Retry |
| State.setCollections | 제안 React setter 별칭 | raw 목록에서 owner/canCreate를 표시, 실제 선택 payload는 id |

완료는 선택지 표시다. 로딩/오류 동안 생성은 비활성이고, 원본 API의 성공 envelope를 실제 계약 단계에서 확인한다. collection 목록 자체를 읽기 상태 목록과 같은 transaction으로 묶는 약속은 없다.

### JF-5 원본 viewer 왕복 — safeReadingReturnTo

```jobflow
scope: preserved_return_calls
Object: Controller, Navigation, Viewer
Controller.openPreserved --> Navigation.safeReadingReturnTo
Controller.openPreserved --> Navigation.commitLocation
Viewer.backToLibrary --> Navigation.safeReadingReturnTo
Viewer.backToLibrary --> Navigation.commitLocation
```

| 노드 | 근거 | 비고 |
|---|---|---|
| Controller.openPreserved | R-05·C-06 제안 | 사용 가능한 format만 `/preserved/:id?format=n&returnTo=...`로 현재 탭 이동, 먼저 dirty guard |
| Navigation.safeReadingReturnTo | 말단 제안 | 허용 경로는 정확히 `/reading-room`, query는 양의 linkId와 허용status·query만. 외부 scheme/host, `//`, 역슬래시, 다른 path, 추가 key는 거절 |
| Viewer.backToLibrary | 기존 `PreservationNavbar.tsx:118` 변경 제안 | 유효 hint 있으면 Reading Room으로, 없거나 invalid면 기존 `/dashboard`. 형식변경 시 hint 유지 |

서버 archive/token/readable 계약은 바꾸지 않는다. 같은 viewer의 Original source는 외부 URL이며 이 문서의 return hint로 임의 외부 이동을 허용하지 않는다. 다운로드·주석·글꼴 등 기존 도구는 유지한다.

### JF-6 실제 서비스 조립 — ReadingRoomPage

```jobflow
scope: real_page_composition
Object: Page, Session, UI, Client
Page.ReadingRoomPage --> Session.useSession
Page.ReadingRoomPage --> Client.RealReadingClient
Page.ReadingRoomPage --> UI.ReadingRoomApp
```

Page는 기존 `_app`의 AuthRedirect 안에 존재한다. AuthRedirect protected 목록에 새route를 추가하고 인증 후 비보호 기본목적지를 변경한다(C-06). 원본 useUser/config/collections 및 guard는 [기존 Browser](../../as-is/details/browser.md)의 흐름이다. Sidebar에 Reading Room 항목을 추가하고 기존 Dashboard/Links를 유지한다. 로그아웃/actor변경 시 UI를 unmount하여 private cache를 폐기한다. 이 실제 서비스 조립을 prototype에 import하지 않는다.

## 4. 소유 상태·데이터

`actorId`, shelf/query/cursor, list+counts, selected base, status/reflection draft, baseVersion, load epochs, pendingSave, conflict current, pendingDestination, notice를 Controller가 소유한다. permanent data는 API다. 아래는 한 detail draft의 Controller 수명이며 row의 reading status 전이가 아니다.

```state
<s> --> (Clean)
(Clean) --> (Dirty) : 사용자 편집
(Dirty) --> (Saving) : Save
(Saving) --> (Clean) : 200
(Saving) --> (Dirty) : timeout 또는 오류
(Saving) --> (Conflict) : READING_CONFLICT
(Conflict) --> (Clean) : 서버 값 불러오기
(Conflict) --> (Saving) : 검토 후 내 값 저장
(Dirty) --> (Clean) : 버리기
(Clean) --> <e>
```

## 5. 의존 — 나가는 방향

| 상대 | 쓰는 계약 | 배선·설정 | 타임아웃 | 결합 |
|---|---|---|---|---|
| ReadingClient | list/get/put/createLink | props로real/fake주입 | real15초 | interface와DTO |
| Next/History | beforePopState·push/replace | realadapter만 | 해당없음 | 실제 routerentry수명 |
| API | 인증HTTP | realClient의동일origin |15초 | 상태코드와envelope |


pure UI→ReadingClient interface+model만 의존한다. real adapter→fetch, Next wrapper→auth/router, fake adapter→fixture이며 역방향 import는 금지한다. CSS는 읽기 앱 namespace로 한정하여 기존 auth/viewer/모달을 덮지 않는다. font는 repository에 있는 local font 또는 system serif/sans만 사용하여 외부 요청이 없다. 검토 wrapper `/__review/mobile.html`은390px iframe으로 같은 prototype을 열며 제품 업무 UI와 분리한다.

## 6. 실패 경계

| 항목 | 기본값 | 설정 키 | 위치 |
|---|---|---|---|
| 요청제한 |15000ms | timeoutMs 주입옵션 | requestJson |
| 자동쓰기 재시도 |0 | 변경불가정책 | Controller/Client |
| 동시 save |1 | pendingRef | saveDraft/saveLink |
| 초안 보존 |메모리 | actorId key | useReadingRoom |


구현 입력은 이 문서와 [4개 새 Layout](layout/index.md), [API 계약](web-api.md#2-공개-계약)이다. prototype entry에는 CSP `connect-src 'none'`을 넣고 bundle/import audit로 real API/auth/config 모듈이 없는지 확인한다. fake는 지원하지 않는 method/input을 명시적 오류로 거절하며 URL fetch fallback을 두지 않는다. prototype에서 fake preserved view가 필요하면 fixture 본문과 “Prototype sample”을 표시하고 실제 archive 검증으로 기록하지 않는다.

## 7. 검증 계획

| 검증 | 대상 계약·시나리오 | 방법·명령 | 시점 |
|---|---|---|---|
| 독립성 | 독립성 계약 | entry/import/built bundle audit, CSP 확인, 서버 없이 prototype 실행 | prototype gate 이전. no API/auth/DB startup 경로 |
| UX·시각 | UX·시각 계약 | root CUA desktop 실제 viewport와390×844 wrapper | prototype gate. 본문≥14px·조작≥44px, 제목과longtext,빈/오류/충돌/저장/Back |
| draft/state | draft/state 계약 | deterministic fake defer로 A→B stale reply, 실패/409/timeout/중복 click | prototype와real adapter 통합. 초안·목적지 유지 |
| HTTP timeout | HTTP timeout 계약 | 로컬 멈춘 응답 fixture의 requestJson 테스트 | real contract 단계.15초 대신 테스트용짧은값으로 timeout/cleanup/명시retry |
| 실제 auth/viewer | 실제 auth/viewer 계약 | 실제 로그인→library→PUT→reload→preserved→Back | 최종 단계. UI와별도HTTP·DB증거 일치 |


## 8. 위험·미확정

| 관련 ID | 분류 | 내용 | 근거 | 영향·대응 |
|---|---|---|---|---|
| C-04 | 미확정 | 실제 Next history 연동 | R-TB-1 | prototype와real각각Back반례검증 |
| R-06 | 미확정 | 시각·focus 최종품질 | 아직 실행 전 | root CUA 후개발자 결정 |


browser history 보상은 Next router와 결합될 때 구현 검증이 필요하다. 먼저 fake-only prototype에서 명시적 location adapter로 검증하고 실서비스에서 shallow route/Back 동작을 다시 검증한다. 브라우저 강제 종료·오프라인은 영구 draft 복구를 보장하지 않는다. 키보드 focus·모바일 높이·서체의 최종 시각 판단은 아직 시행하지 않았다. TO-BE 그림은 제품 픽셀 결과가 아니다.

## 9. 미확인·한계

1. 제안 파일과 실제 구현의 일치, runtime/브라우저 실행을 아직 확인하지 않았다.
2. 브라우저 강제 종료 후 메모리 draft는 복구하지 않는다.
