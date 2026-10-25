# 링크 저장 — TO-BE 유지 Job Flow

> **목표 기준** 2026.10.25 · **AS-IS 대비** 유지. [이번 기준선 원본](../../../as-is/details/jobflow/save-link.md)의 도표와 내부 계약을 목표에서도 유지한다. 아래 코드는 upstream 952ac454의 확인된 근거이며 목표 실행을 검증했다는 뜻이 아니다. [목표 핵심](../../system-design-to-be.md) C-05의 회귀 검증 대상이다.

## 1. 목적과 범위

로그인한 사용자가 `/links`에서 NewLinkModal을 열어 URL을 저장한다. 이 샘플은 STRIPE_SECRET_KEY와 email verification이 켜지지 않은 self-host 인증, 읽기 상태/감상 필드가 없는 원본 구조를 대상으로 한다. 실제 환경을 띄웠다는 뜻은 아니다. 정상 입력과 unsafe URL, 권한 거절, duplicate/용량 실패, 파일 준비 실패를 코드로 추적한다.

목표는 저장 요청 시작, DB 저장 응답, 후속 보존의 완료가 서로 다름을 확인하는 것이다. 보존은 [별도 시나리오](preserve-link.md)다. HTTP 저장에서 worker를 호출하는 선을 만들지 않는다.

## 2. 그림과 계약

L0는 요청/응답의 요약이며 상세 API 내부에서 원문 요청·Prisma·filesystem 협력을 펼친다. 다음 그림의 Browser.receiveSave는 실제 한 개의 소스 함수가 아니라 **응답 다음 동작 노드**이며 success/error callback에 대응한다.

```jobflow
scope: save_link
Object: Browser, API
Browser.submitLink --> API.postLink
API.postLink.success --> Browser.receiveSave
API.postLink.failure --> Browser.receiveSave
```

| 노드 | 실제 계약 | AS-IS 대비 |
|---|---|---|
| Browser.submitLink | NewLinkModal.submit:88 → addLink.mutateAsync:98, 즉시 onClose:99. schema 실패는 요청 없음 | 유지 |
| API.postLink | POST `/api/v1/links`, JSON PostLinkSchemaType. 200 `{response:newLink}`,400(schema/demo/collection/capacity),409 duplicate,401/404 auth. uncaught throw의 HTTP/JSON 모양은 이 handler가 보장하지 않음 | 유지 |
| Browser.receiveSave | 다음 동작 예외 노드. TanStack에 등록한 onSuccess:545 또는 onError:532, cache 교체/rollback과 toast. 화면 재진입 없음 | 유지 |

success/failure는 HTTP 성공과 요청/parse 실패를 구분한다. API는 browser에 오류 응답을 보낼 수 있고 transport/parse 오류는 fetch callback에서 생긴다. 같은 receiveSave로 두 선이 모이는 것은 한 mutation의 택일 결과이며 성공과 실패 callback을 동시에 호출한다는 뜻이 아니다.

## 3. 내부 추적

| 상위 노드 | 실제/제안 진입 심볼 | 내부 그림 또는 말단 근거 | 판정·중단 이유 |
|---|---|---|---|
| Browser.submitLink | `NewLinkModal.submit`, `NewLinkModal.tsx:88` | [Browser JF-1](../../../as-is/details/browser.md#jf-1-추가-창-제출--newlinkmodalsubmit) → [JF-1.1](../../../as-is/details/browser.md#jf-11-mutation-등록과-http--linksuseaddlink) | 펼침 — 로컬 검증, 미await mutation과 부모 close를 구분 |
| API.postLink | default `links`, `pages/api/v1/links/index.ts:9/:39` | [API JF-1](../../../as-is/details/web-api.md#jf-1-post-분기--links) → [postLink](../../../as-is/details/web-api.md#jf-12-저장-정책과-영속화--postlink) → [setCollection](../../../as-is/details/web-api.md#jf-121-컬렉션-결정과-생성-권한--setcollection) / [capacity](../../../as-is/details/web-api.md#jf-122-용량-판단--haspassedlimit) | 펼침 — 저장 조건을 전개. 조건부 웹 billing 가드는 API JF-14, store 구매 내부는 제외 경계 |
| Browser.receiveSave | `useAddLink`의 onSuccess/onError property, `packages/router/links.tsx:532/:545` | [Browser JF-1.2](../../../as-is/details/browser.md#jf-12-낙관적-쓰기와-결과-반영--useaddlink-callbacks) | 펼침 — callback 등록/실행/오류 수신자를 명시 |

| 확대한 협력자 | 내부 그림 또는 말단 근거 | 판정·중단 이유 |
|---|---|---|
| setCollection/getPermission | [API JF-1.2.1](../../../as-is/details/web-api.md#jf-121-컬렉션-결정과-생성-권한--setcollection) | 펼침 — id/Unorganized/다른 이름/기본값의 query 생략과 canCreate 판단 |
| URL/DNS/safeFetch/metadata | [adapter JF-1](../../../as-is/details/adapters.md#jf-1-url-안전성--isurlsafeforserversidefetch), [JF-2](../../../as-is/details/adapters.md#jf-2-제목-조회와-안전한-redirect--fetchtitleandheaders) | 펼침 — SSRF false와 예외, redirect 재검사, 오류 fallback |
| createFolder | [adapter JF-3](../../../as-is/details/adapters.md#jf-3-디렉터리와-파일-쓰기--createfoldercreatefile) | 펼침 — local 동기 mkdir/S3 no-op, 오류는 상위 전달 |
| PostLinkSchema/cache 변환 | [Browser JF-1/1.2 근거](../../../as-is/details/browser.md#jf-12-낙관적-쓰기와-결과-반영--useaddlink-callbacks), `schemaValidation.ts:126` | 말단 확인 — 입력 규칙과 순수 배열 변환을 실제 본문에서 확인 |
| QueryClient, next-auth, Prisma engine, DNS/fs/원문 | 각 adapter 근거 표와 lockfile | 외부 경계 — 우리 adapter/SQL predicate를 읽은 뒤 패키지·표준 계약에서 중단 |
| 조건부 billing/store sync | [API JF-14](../../../as-is/details/web-api.md#jf-14-api-구독-가드--verifysubscription) | 펼침 — 웹 가드의 sync 조건·반환·실패·grace 확인. 외부 경계 — Stripe SDK와 범위 밖 store 구매/receipt 내부는 제외 |

## 4. 정상 흐름의 단계별 설명

1. Sidebar의 state로 열린 창에서 submit이 PostLinkSchema를 검사한다. schema 성공 시 mutateAsync를 await하지 않고 부모 state를 false로 바꾼다. 실제 호출/부모 연결은 Browser JF-1이다.
2. TanStack가 등록된 onMutate로 cache snapshot을 만들고 임시 음수 id link를 넣는다. mutationFn은 POST를 보낸다. 등록과 callback 실행은 Browser JF-1.1/1.2에서 구분한다.
3. API links는 verifyUser 결과를 받고 **직접 demo 환경값을 판단**한다. 허용된 요청만 postLink로 간다. postLink는 URL 안전성 boolean을 계산한 후 setCollection을 호출한다.
4. setCollection이 기존 id 권한 또는 새 이름 생성 규칙을 적용한다. 중복과 용량은 그 뒤 검사한다. 안전한 URL에서만 metadata를 조회하며 오류는 빈 결과로 바뀐다.
5. link와 tags를 create하고 선택적 image update, 동기 createFolder를 실행한 뒤200을 반환한다. 브라우저 onSuccess는 임시 id를 실제 id로 바꾸고 관련 cache를 무효화한다. 이 응답은 worker 완료를 나타내지 않는다.

## 5. 실패·취소·복구

| 입력·실패 | 판단자와 소스 | 남는 상태·결과 수신자 |
|---|---|---|
| schema invalid | NewLinkModal.submit:89–96 | 요청하지 않고 창 유지, toast |
| 접근 불가 collectionId | setCollection:25–35 → postLink:38 |400, 생성 없이 browser onError. 창은 이미 닫힘 |
| 새 named collection 후 duplicate/용량 실패 | setCollection:58/67 후 postLink:53/69 | 새 collection/order는 남음, link는 없음. rollback 없음 |
| unsafe URL | isUrlSafeForServerSideFetch false, postLink:138–147 | URL을 저장하고 format unavailable+lastPreserved를 기록, metadata 호출 생략. worker의 null selector에서 제외 |
| metadata timeout/network | fetchTitleAndHeaders:40–42 | 빈 title/headers로 저장 계속. url/name fallback |
| link create 뒤 update/mkdir throw | postLink:153/:164 | 이미 만든 link/tag/collection은 남음. 200 미도달, handler catch 없음 |
| 사용자가 제출 전 close | Modal/Sidebar state setter | 초안 제거, 요청 없음 |
| 제출 후 close | 이미 요청 시작 | 명시적 AbortSignal 없음. 창 close가 서버 작업을 취소하지 않음 |

## 6. 완료와 근거

대표 저장 샘플은 독립 검토에서 작성 방식을 확인받았고 전체 범위로 확장했다. 이 파일은 소스 분석이며 실제 저장 실행 결과가 아니다. 전체 AS-IS 소스 의미 게이트는 통과했다. 목표 유지의 실행 검증은 아직 수행하지 않았다.

검토 경로: 이 파일 §3 → API JF-1.2 → C3 새 이름 → duplicate 반환 → Browser onError를 따라가면 **collection은 남고 창은 닫힌 채 cache만 복구**되는 결과를 확인할 수 있다. 두 번째 반례는 unsafe URL → B2 → lastPreserved 기록 → [worker selector](../../../as-is/details/worker.md#jf-11-공정한-선택--getlinkbatchfairly) 제외다.

같은 과업의 [Navigation](../navigation/save-link.md), [NewLink Layout](../layout/new-link.md), [브리프](../../../_evidence-brief.md)를 함께 검토한다.
