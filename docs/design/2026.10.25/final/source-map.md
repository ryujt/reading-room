# 최종 코드의 내부 호출 지도

이 문서는 TO-BE의 제안 이름을 실제 구현과 연결한다. 원본 전수 경로는 [AS-IS](../as-is/system-design-as-is.md), 제안한 새·변경 계약은 [TO-BE](../to-be/system-design-to-be.md), 실제 HTTP 결과는 [검증 기록](../verification.md)에 있다. 다음 scope는 실제 함수의 호출 사슬이다. 반환값을 다음 객체의 직접 호출처럼 연결하지 않는다. transaction callback과 event callback은 등록과 나중 실행을 구분한다.

## 구획과 코드 위치

| 그림 별칭 | 실제 코드·심볼 | 상태 |
|---|---|---|
| Page | `apps/web/pages/reading-room.tsx`의 `ReadingRoomPage`, `AuthenticatedRoom` | 전개: 세션 actor별 mount, 아래 UI 진입 |
| Room | `packages/reading-room-ui/useReadingRoom.ts`의 `useReadingRoom` 내부 함수·effect | 전개: 조회, 저장, 초안·수명 |
| Client/Transport | `apps/web/lib/reading-room/client.ts`의 `createRealReadingClient`가 반환한 list/get/put/createLink/getCollections 메서드, 내부 `request` | 전개: 실제 HTTP와 오류 수신 |
| NextNavigation | `apps/web/lib/reading-room/navigation.ts`의 `createNextReadingNavigation`과 반환 메서드 | 전개: Next pop 위임, history 보상 |
| ListRoute/ReadingRoute | `pages/api/v1/reading-links/index.ts`의 `readingLinks`, `pages/api/v1/links/[id]/reading.ts`의 `linkReading` (모두 `apps/web/` 아래) | 전개: 인증·입력·실패 응답 |
| Service/Snapshot/SingleSnapshot | `apps/web/lib/api/controllers/reading.ts`의 실제 함수와 이름 있는 nested callback `readSnapshot`, `readSingleSnapshot` | 전개: snapshot과 CAS |
| Policy | `apps/web/lib/api/readingPolicy.ts`의 실제 세 함수 | 확인된 말단: Prisma where/select 구성 |
| Validation | `packages/reading-room-ui/model.ts`의 parseReadingInput/parseShelfQuery/parseNewLink/sourceArticleURL | 확인된 순수 말단: 부수효과 없음 |
| LinkTable/ProgressTable | callback으로 받은 `tx.link`, `tx.readingProgress` | 외부 경계: Prisma SQL delegate; 실제 DB 증거 있음 |
| Auth | 원본 `apps/web/lib/api/verifyUser.ts` | [기존 내부 전개](../as-is/details/web-api.md#jf-11-사용자-검증--verifyuser) 재사용 |
| SaveLink/Worker | 원본 postLink/archiveHandler 및 변경 handleMonolith | 기존 내부 전개 재사용, 변경 수명은 아래 기록 |

## JF-1 화면 진입·조회

인증 actor가 있을 때 `ReadingRoomPage`는 actor id를 key로 `AuthenticatedRoom`을 만든다. 이 컴포넌트의 실제 `useEffect` callback은 router ready일 때 `createNextReadingNavigation`을 호출한다. 이 callback은 원문에 이름이 없는 함수이며, effect 등록의 실행 주체는 React다. DOM 준비 전 navigation을 만들지 않는다.

`useReadingRoom`의 list effect는 actor/filter/revision 변화, detail effect는 actor/linkId/detailRevision 변화에 반응한다. 두 effect는 서로의 응답으로 다른 요청을 자동 발행하는 연결이 아니다. 각각 AbortController와 epoch를 소유한다.

```jobflow
scope: reading_list_method_calls
Object: Client, Transport
Client.list --> Transport.request
```

```jobflow
scope: reading_detail_method_calls
Object: Client, Transport
Client.get --> Transport.request
```

`list`는 status/query/cursor를 GET `/api/v1/reading-links`에 전달한다. `get`은 GET `/api/v1/links/:id/reading`의 `{link,reading}`을 하나의 UI ReadingLink로 합친다. 성공은 해당 effect가 items/counts 또는 selected/draft로 반영한다. 실패는 해당 effect의 catch가 listError/detailError로 소비한다. actor unmount는 generation과 두 epoch를 무효화하므로 취소가 늦어도 이전 응답을 화면이나 URL에 반영하지 않는다.

`AuthenticatedRoom`은 원본 user query에서 현재 session id와 일치하는 이름만 사용한다. 실제 개인 기록은 localStorage 또는 전역 React Query cache에 넣지 않는다. 원본 앱의 config/collection/user 초기 요청은 실제 통합에서만 실행되며 별도 prototype entry에는 없다.

## JF-2 저장과 transport

선택된 링크가 있고 같은 저장이 진행 중이지 않을 때의 실제 직접 호출이다. parseReadingInput이 실패하면 Client.put은 생략된다.

```jobflow
scope: personal_save_calls
Object: Room, Validation, Client
Room.saveDraft --> Validation.parseReadingInput
Room.saveDraft --> Client.put
```

```jobflow
scope: real_put_calls
Object: Client, Transport
Client.put --> Transport.request
```

`request`는 자체 timer와 caller AbortSignal을 합쳐 fetch에 전달한다. 실제 fetch 응답을 받은 뒤 request 자신이 `response.json()`과 `response.ok`를 판단한다. 15초 timeout은 TIMEOUT, caller abort는 원래 취소, HTTP 오류는 ReadingError를 throw한다. timer와 listener는 finally에서 정리한다. 자동 mutation 재시도는 없다. PUT의 응답 유실 후 사용자가 재시도하면 서버의 현재 값 확인/CAS가 결정한다.

`saveDraft`가 성공 응답을 받으면 같은 id·epoch·actor 수명인지 확인한 뒤 selected/draft/row를 바꾸고 saved 표시와 목록 revision을 갱신한다. `READING_CONFLICT + current`만 비교 UI로 보낸다. VERSION_EXHAUSTED와 timeout 등은 초안을 유지하는 일반 저장 오류다. pending ref는 같은 tick의 중복 저장, conflict의 Load saved value와 이동을 막는다.

## JF-3 API 진입과 snapshot

인증 성공·지원 method·유효 입력이 전제다. Auth null이면 이미 전송한 인증 응답으로 종료한다. demo PUT은 controller 전에 거절한다.

```jobflow
scope: actual_list_route
Object: ListRoute, Auth, Validation, Service
ListRoute.readingLinks --> Auth.verifyUser
ListRoute.readingLinks --> Validation.parseShelfQuery
ListRoute.readingLinks --> Service.listReadingLinks
```

```jobflow
scope: actual_snapshot_registration
Object: Service, Prisma
Service.listReadingLinks --> Prisma.$transaction
Service.getReading --> Prisma.$transaction
```

각 `$transaction`은 각각 `readSnapshot` 또는 `readSingleSnapshot`을 **등록**한다. Prisma가 RepeatableRead transaction client로 실행하는 두 callback의 실제 호출은 다음과 같다.

```jobflow
scope: actual_list_snapshot
Object: Snapshot, Policy, LinkTable, ProgressTable, LinkRows
Snapshot.readSnapshot --> Policy.accessibleLinksWhere
Snapshot.readSnapshot --> Policy.readingLinkSelect
Snapshot.readSnapshot --> LinkTable.findMany
Snapshot.readSnapshot --> LinkTable.count
Snapshot.readSnapshot --> ProgressTable.groupBy
Snapshot.readSnapshot --> LinkRows.map
```

```jobflow
scope: actual_single_snapshot
Object: SingleSnapshot, Policy, Service
SingleSnapshot.readSingleSnapshot --> Policy.findAccessibleLink
SingleSnapshot.readSingleSnapshot --> Service.toReadingDTO
```

같은 Policy.findAccessibleLink 호출이 두 순수 helper 결과를 받아 조회를 이어간다. 그림의 같은 호출 재등장은 계속 실행을 표현하며 재실행이 아니다. renderer의 재등장 경고 2개는 실제 source 순서를 유지하기 위해 수용한다.

```jobflow
scope: actual_access_lookup
Object: Policy, LinkTable
Policy.findAccessibleLink --> Policy.accessibleLinksWhere
Policy.findAccessibleLink --> Policy.readingLinkSelect
Policy.findAccessibleLink --> LinkTable.findFirst
```

실제 call-site는 controller `:23–45`, policy `:17–20`이다. LinkRows는 `links.slice(0,30)`의 배열이며 `:36`의 map에 `toReadingDTO`를 callback으로 전달한다. 각 항목 변환을 실제 실행하는 주체는 Array.map이고 callback 본문은 controller `:14–20`이다. 목록 callback은 접근 조건과 필터를 구성해 take31/id-desc findMany를 호출한다. total은 접근 조건만, status group은 자기 userId와 접근 가능한 link만 사용한다. return은 30개와 nextCursor 및 `ALL/UNREAD/READING/FINISHED`다. 한 callback 안의 query들이 동일 snapshot에 있으므로 다른 상태가 두 count에 섞이지 않는다.

TO-BE와 달리 현재 row는 `findAccessibleLink`의 relation select로 함께 읽는다. 별도 findUnique 호출을 발명하지 않는다. `toReadingDTO`는 controller `:14`에 있고 명시적인 필드와 자기 개인 row만 반환한다. 원본 public Link/collection serializer는 새 relation을 포함하지 않는다.

## JF-4 실제 CAS 쓰기와 재확인

`putReading`의 `$transaction(tx => commitReading(...))`은 원문 익명 callback이다. 등록 call-site는 controller `:74`, callback 본문은 한 번의 commitReading 호출이고 실행 주체는 Prisma다. 이 문서는 callback을 별도 서비스로 만들지 않는다.

기존 row이고 입력 값이 현재 값과 다르며 expectedVersion이 일치하고 상한 미만인 구간이다. 아래 updateMany는 version 조건을 포함하며 count가 1이 아니면 findUniqueOrThrow를 생략하고 ChangedVersion을 throw한다.

같은 Service.commitReading 호출이 helper 이후 SQL 쓰기를 계속한다. 재등장은 같은 호출의 계속이며 재실행이 아니다. renderer 경고 1개를 실제 source 근거로 수용한다.

```jobflow
scope: actual_existing_cas
Object: Service, Policy, ProgressTable
Service.commitReading --> Policy.findAccessibleLink
Service.commitReading --> Service.toReading
Service.commitReading --> ProgressTable.updateMany
Service.commitReading --> ProgressTable.findUniqueOrThrow
```

최초 row이고 유효 version0인 구간에서는 updateMany 대신 `tx.readingProgress.create`를 호출한다. 같은 값이면 create/update를 모두 생략하고 현재 값을 반환한다. 접근 불가404, 다른 version, version 상한은 쓰기 전에 끝난다. 근거는 controller `:50–62`다.

```jobflow
scope: actual_conflict_refresh
Object: Service
Service.resolveConflict --> Service.getReading
```

`putReading` catch `:76`은 ChangedVersion 또는 P2002만 `resolveConflict`로 보낸다. 새로운 접근 확인 뒤 같은 값이면200, 다른 값이면 현재 reading이 있는409다. 그 외 오류는 route catch의 `readingFailure`로 전달된다. 조회·쓰기 transaction이 membership 철회를 전역 직렬화하지는 않는다.

## JF-5 초안 이동과 실제 Next history

`useReadingRoom`은 navigation.subscribe에 listener를 등록한다. 등록 call-site의 callback은 `requestRef.current(intent)`를 호출하고 실제 실행 주체는 navigation의 pop 처리다. UI의 shelf/search/detail/close/viewer/legacy 이동도 같은 requestNavigation으로 들어간다.

Room.resolveNavigation은 저장 완료를 받은 뒤 같은 호출에서 이동을 계속한다. 재등장은 같은 호출의 계속이며 재실행이 아니다. renderer 경고 1개를 수용하며 호출 순서를 바꾸지 않는다.

```jobflow
scope: explicit_guard_decision
Object: Room
Room.resolveNavigation --> Room.saveDraft
Room.resolveNavigation --> Room.applyDestination
```

그림은 **Save and leave가 성공한 구간**이다. 실패면 applyDestination을 호출하지 않는다. Keep editing은 pendingDestination만 비우며, Discard는 저장된 값으로 draft를 돌린 뒤 applyDestination을 호출한다. applyDestination은 승인한 intent.apply를 실행하기 전에 dirtyRef를 비워 불필요한 native 경고를 피한다.

Next adapter의 `subscribe`는 실제 `router.beforePopState(() => false)`를 등록하여 Next가 pop을 먼저 처리하지 못하게 한다. 같은 adapter의 원문 이름 있는 `pop`이 브라우저 popstate listener다. known index는 history.go(-delta)로 현재 URL에 돌아온 후 intent를 전달한다. 승인하면 history.go(delta)를 재실행하며 두 번째 이벤트는 applying flag로 소비한다. unknown legacy entry는 현재 URL과 Next state를 즉시 replaceState로 복원한 뒤 Guard를 띄운다. 승인 시 location.replace(targetURL), 취소 시 복원된 화면을 유지한다. 이는 history 일부를 문서 교체로 처리하는 제한된 정책이며 원래 history를 완벽히 재구성한다고 주장하지 않는다.

browser 종료·다른 document 이동은 beforeunload의 브라우저 기본 경고 한계가 있다. same-document pop을 beforeunload로 보호한다고 설명하지 않는다. 실제 Next Link 반례와 일반 internal Back은 별도 CUA 항목이다.

## JF-6 원본 Link 저장·원문 보기·worker 변경

collection 목록은 Client.getCollections→request→원본 GET collections이다. UI의 create 가능 표시는 owner 또는 해당 member.canCreate로 계산하고 서버가 원본 권한을 다시 판단한다. 조회 실패는 별도 collectionsError와 Retry/Save 비활성화로 소비한다.

```jobflow
scope: real_link_create_calls
Object: Client, Validation, Transport
Client.createLink --> Validation.parseNewLink
Client.createLink --> Transport.request
Client.createLink --> Client.get
```

이 그림은 POST가200으로 id를 반환한 구간이다. POST 실패 시 get을 호출하지 않는다. POST 성공 후 get만 실패하면 LINK_SAVED 안내로 이미 저장된 id를 알려 재POST 중복을 피하게 한다. 실제 저장 controller와 worker의 독립 polling은 [AS-IS 저장](../as-is/details/jobflow/save-link.md), [보존](../as-is/details/worker.md)을 재사용한다. 200은 보존 완료가 아니다.

viewer 진입은 dirty guard 후 원본 `/preserved/:id?format=...&returnTo=...`로 이동한다. `readingReturnTo`는 오직 `/reading-room`과 알려진 query만 정규화해 허용한다. 유효 link는 detail, link 없는 값은 library, 잘못된 값은 원본 Dashboard fallback이다. 원본 format picker는 router.query를 복사하므로 returnTo를 유지한다. Open source는 `sourceArticleURL`이 http/https로 확인한 값만 이동하며 업로드·비웹 URL은 비활성화한다.

실제 viewer 방문에서 확인한 기존 중첩 button 오류는 `apps/web/components/TextStyleDropdown.tsx:81`의 Trigger에 asChild를 넣어 보정했다. DropdownMenu가 자식 Button을 trigger로 사용하게 하여 button 안의 button을 제거한다. preference 저장 함수·API나 화면 배치를 바꾸지 않으며 baseline AS-IS의 원본 관찰과 구분한다.

원본 `handleMonolith`의 child.stdin에는 write 전에 error listener를 추가했다. callback은 inputFailed=true→child.kill(SIGKILL)→reject, close callback은 실패한 입력의 파일 쓰기를 생략한다. 이 callback은 원문 익명 함수이고 등록 대상은 child.stdin, 실행 주체는 Node stream이다. code=null의 signal 종료도 성공 파일로 간주하지 않는다. 소스 위치는 `apps/worker/lib/preservationScheme/handleMonolith.ts`이며 [실제 자식 재현 검사](../../../../examples/reading-room/worker-input.test.ts)는 조기 종료와 stdin만 닫은 생존 프로세스를 모두 다룬다. generic EPIPE stack의 정확한 발생 socket은 미확정이며 proxy 변경은 하지 않았다.

## 추적 완료 범위

| 대상 | 상태·근거 | 남은 외부 경계 |
|---|---|---|
| UI 조회·저장·초안·actor | 위 JF-1/2/5 및 공유 hook의 실제 함수. prototype controller10개와 실제 transport 검증 | React effect/브라우저 history 실행은 프레임워크·CUA 증거 |
| API 개인 접근·snapshot·CAS | JF-3/4와 실제 HTTP/SQL 13개, 독립 HTTP 12개 | Prisma/PostgreSQL 엔진 내부는 외부 경계 |
| 원본 저장·공유·읽기 | AS-IS 내부 전개 재사용, actual POST/archive HTTP 및 CUA | 웹사이트 원문·네트워크 내용은 외부 |
| 새 Link·viewer 접점 | JF-6, source/return URL 정책 검사 | 원본 viewer 내부는 AS-IS에서 전개 |
| worker 수정 | 실제 stdin listener/close와 subprocess 재현, 원본 proxy는 변경 없음 | Monolith binary 내부는 외부 경계 |

이 표는 변경한 개인 독서 흐름의 추적 상태이며 저장소 전체의 모든 기능을 실행했다고 뜻하지 않는다. 이메일·OAuth·구독·S3·remote browser·mobile/extension은 이 로컬 실행 검증 범위에 포함하지 않는다.

## 실제 진입과 call-site 색인

| 실제 함수·등록 위치 | 직접 호출·소비 위치 | 연결 |
|---|---|---|
| `apps/web/pages/reading-room.tsx:26` ReadingRoomPage | session actor와 user id 일치 확인 `:27–30`; AuthenticatedRoom key | JF-1 |
| 같은 파일 `:13` AuthenticatedRoom | Real client 생성 `:15`, React effect의 Next adapter 생성 `:17`, 원문 URL `:20`, viewer URL `:21–24` | JF-1/6 |
| `packages/reading-room-ui/useReadingRoom.ts:51` list effect | client.list `:55`, 성공/catch/finally `:56–59` | JF-1 |
| 같은 파일 `:63` detail effect | client.get `:69`, 성공/catch/finally `:70–73` | JF-1 |
| 같은 파일 `:114` saveDraft | validation `:117`, client.put `:122`, 수명 확인 `:123`, 오류 소비 `:129–134` | JF-2 |
| 같은 파일 `:136` resolveNavigation | saveDraft `:140`, applyDestination `:142`; subscribe 등록 `:90` | JF-5 |
| 같은 파일 `:158` saveLink | client.createLink `:165`, 수명 확인 후 이동 `:166–168` | JF-6 |
| `apps/web/lib/reading-room/client.ts:7` request | fetch `:14`, JSON/HTTP 상태 판단 `:15–21`, catch/finally `:23–26` | JF-2 |
| 같은 파일 `:28,33,35,36,41` get/list/put/createLink/getCollections | 실제 request와 반환 변환을 각 메서드 본문에서 수행 | JF-1/2/6 |
| `apps/web/lib/reading-room/navigation.ts:18` subscribe | beforePopState 등록 `:21`, pop 정의 `:22`, 이벤트 등록/cleanup `:41–42` | JF-5 |
| `apps/web/lib/reading-room/returnTo.ts:3` readingReturnTo | 정확한 pathname/키 검사 및 정규화 `:4–9` | JF-6 |
| `apps/web/pages/api/v1/reading-links/index.ts:7` readingLinks | verifyUser `:10`, query 검사 `:13`, listReadingLinks `:14` | JF-3 |
| `apps/web/pages/api/v1/links/[id]/reading.ts:7` linkReading | verifyUser `:10`, getReading `:14`, putReading `:19` | JF-3/4 |
| `apps/worker/lib/preservationScheme/handleMonolith.ts:8` handleMonolith | stdin error callback `:56–60`, write/end `:62–63`, close 검사 `:72–76` | JF-6 |

줄 번호는 이 최종 구현 시점의 실제 source를 기준으로 한다. 파일 수정 후 줄이 달라지면 함수 이름과 호출식을 함께 대조한다. 도표의 별칭은 위 실제 심볼을 찾기 위한 구획명이며 새 런타임 객체가 아니다.
