# Web API (:4721) — TO-BE 상세

> **대상**: C-01·C-02, 기존 Next.js API 안의 개인 독서 기록 추가. 아래 신규 경로·심볼은 모두 `(제안)`이다.
> **기준**: upstream `952ac454`·2026.10.25, AS-IS 문서 확정 `4703808c`. 구현 전.
> **상위**: [핵심](../system-design-to-be.md) · **짝**: [AS-IS API](../../as-is/details/web-api.md) · **근거**: [브리프](../../_evidence-brief.md)

## 1. 책임 / 비책임

- **책임**: 개인 기록의 접근·snapshot·version 쓰기와 private DTO.
- **비책임**: 원본 Link 보존·공유 metadata·실제 읽음 판정.
- **아무도 하지 않는 것**: 동시 권한 회수의 즉시 직렬화와 요청 이력 기반 exactly-once 저장.

로그인한 사용자의 접근 가능한 Link에 대해 개인 status와 reflection만 읽고 쓴다. Link의 공유 description·tags·Highlight.comment는 수정하지 않는다. 원본 링크 저장·권한·보존 API는 유지한다. 새 서버·큐·DB를 도입하지 않고 기존 Prisma에 additive model을 둔다(D-01).

제안 파일과 구획:

| 객체 | 제안 파일·심볼 | 책임 |
|---|---|---|
| ListRoute | `apps/web/pages/api/v1/reading-links/index.ts`, `readingLinks` | method/인증/query 검사, 응답 |
| ReadingRoute | `apps/web/pages/api/v1/links/[id]/reading.ts`, `linkReading` | 인증·GET/PUT·demo 쓰기 차단, 응답 |
| ReadingService | `apps/web/lib/api/controllers/reading.ts`, `listReadingLinks`, `getReading`, `putReading`, `commitReading`, `resolveConflict` | snapshot 조회, 접근 확인, CAS와 충돌 결과 |
| Policy | `apps/web/lib/api/readingPolicy.ts`, `accessibleLinksWhere`, `findAccessibleLink` | 현재 user가 owner 또는 member인 Link predicate |
| Validation | `packages/reading-room-ui/model.ts`, `parseReadingInput`, `parseShelfQuery`, `toReadingDTO` | 순수 검증과 private DTO 변환 |
| Auth | 기존 `apps/web/lib/api/verifyUser.ts:14` | user/null, 실패 응답. demo 환경 판단을 반환값에 발명하지 않음 |
| Prisma/tx | 기존 Prisma client와 실제 transaction client | SQL 실행. `tx.link`, `tx.readingProgress`는 제안 모델 delegate |

## 2. 공개 계약

신규3개와직접재사용POST1개를아래에정의한다.그외유지계약전수는 [AS-IS §2](../../as-is/details/web-api.md#2-공개-계약)에있다.

응답은 기존 envelope와 맞춰 `{response: ...}`를 사용하고 `Cache-Control: private, no-store`를 둔다. 모든 새 endpoint는 session/bearer를 기존 verifyUser로 검증하며 client userId는 받지 않는다. 추가 body key는 400이다.

| 메서드·경로 | 입력 | 출력 | 오류 | 구현 |
|---|---|---|---|---|
| GET `/api/v1/reading-links` (제안) | status=ALL/UNREAD/READING/FINISHED, query≤200, cursor 양의 id 선택 | 200 `{items,nextCursor,counts}`. 최대30개 id 내림차순; 31번째로 다음 존재만 판단 | 400 query, 기존 인증 오류, 500 공통 안전 메시지. 읽기만 수행 | ListRoute.readingLinks (제안) |
| GET `/api/v1/links/:id/reading` (제안) | 양의 정수 id | 200 `{link,reading}`; 자기 기록만 포함 | 404 없는/접근 불가 Link를 동일 표현. 401 인증 오류. 공개만 된 비회원 Link는 불허 | ReadingRoute.linkReading (제안) |
| PUT 같은 경로 (제안) | `{status,reflection,expectedVersion}` | 200 `{reading}`; status와 reflection을 함께 저장 | 400 검증/demo, 404 접근/삭제, 409 `{code:"READING_CONFLICT",current}` 또는 `VERSION_EXHAUSTED`, 500. 공유 Link 필드 변경 없음 | ReadingRoute.linkReading (제안) |
| POST `/api/v1/links` (유지) | 원본 PostLinkSchema | 200 원본 Link | 기존 partial write·409·용량 계약 유지. 새 reading row를 같은 POST에 숨겨 쓰지 않음 | 원본 links/index.ts:39 → postLink |

`reading={status,reflection,version,updatedAt}`이며 row가 없으면 `{UNREAD,"",0,null}`이다. version은 저장 버전이며 실제로 읽은 시간·분량을 증명하지 않는다. reflection은 앞뒤 공백 trim 후 JavaScript UTF-16 code unit 280자 이하, CR/LF 불허, 빈 문자열 허용이다. UI의 maxLength와 서버 검증 단위를 맞춘다. Prisma Int에 맞춰 id/cursor는 1..2147483647, expectedVersion은 0..2147483647의 정수만 받으며 범위 밖은400이다. version이 상한에 도달한 row의 변경 쓰기는409 `VERSION_EXHAUSTED`로 거절하여 overflow를 만들지 않는다. 동일 payload 확인은 쓰기 없이200이다.

counts는 **검색어·선택 shelf와 무관한 현재 사용자의 전체 접근 가능 library**에 대한 all/unread/reading/finished 값이다. page는 query와 status를 적용한다. 같은 요청의 page·counts만 동일 snapshot이고 서로 다른 페이지 요청 간 snapshot 고정은 보장하지 않는다. cursor는 마지막 표시 id이며 `id < cursor`를 적용한다. 새 링크가 들어오면 첫 페이지 새로고침에서 보이고, 접근 회수·삭제로 뒤 페이지가 짧아질 수 있다. 클라이언트는 id로 중복 제거한다. 정렬 선택 UI는 제공하지 않는다.

## 3. 내부 Job Flow — 드릴다운

| 상위 §5 노드 | L1 그림 | L2 이하 |
|---|---|---|
| [API.listReadingLinks](jobflow/reading-library.md) | [JF-1](#jf-1-개인-library-조회--readinglinks) | [JF-1.1](#jf-11-같은-snapshot의-목록과-개수--listreadinglinks) |
| [API.getReading](jobflow/reading-library.md) | [JF-2](#jf-2-한-링크의-개인-기록--getreading) | [JF-2.1 접근 predicate](#jf-21-접근-판단--findaccessiblelink) |
| [API.putReading](jobflow/save-reading.md) | [JF-3](#jf-3-개인-기록-저장--linkreading) | [JF-3.1 CAS](#jf-31-version-쓰기--commitreading), [JF-3.2 충돌](#jf-32-충돌-재조회--resolveconflict) |
| API.postLink, auth, 공개/보존/공유 등 유지 | [AS-IS 드릴다운](../../as-is/details/web-api.md#3-내부-job-flow--드릴다운) | 해당 목표 시나리오의 전수 추적표 |

### JF-1 개인 library 조회 — readingLinks

scope는 제안 함수 사이의 실제 호출이다. 인증 성공·GET·query 유효가 공통 전제다. Auth가 null을 반환하면 controller를 부르지 않고 이미 보낸 인증 응답으로 끝난다.

```jobflow
scope: reading_list_calls
Object: ListRoute, Auth, Validation, ReadingService
ListRoute.readingLinks --> Auth.verifyUser
ListRoute.readingLinks --> Validation.parseShelfQuery
ListRoute.readingLinks --> ReadingService.listReadingLinks
```

| 노드 | 근거 | 비고 |
|---|---|---|
| ListRoute.readingLinks/Validation.parseShelfQuery | R-02·C-02·D-02 제안 | route가 method·인증·query 순서 판단, validation 실패400 |
| Auth.verifyUser | [AS-IS JF-1.1](../../as-is/details/web-api.md#jf-11-사용자-검증--verifyuser) | 동일한 session/bearer·구독 검증. null/error를 user로 취급하지 않음 |
| ReadingService.listReadingLinks | C-02 제안 | 성공 DTO를 route가200으로 전송; throw는 route가500 변환 |

트리거는 shelf GET이며 완료는 page와 counts를 담은200이다. 조회 실패에 빈 library를 성공으로 반환하지 않는다.

### JF-1.1 같은 snapshot의 목록과 개수 — listReadingLinks

단일 `listReadingLinks`가 아래 요청들을 조율한다. 첫 transaction callback을 **`readSnapshot`이라는 이름 있는 제안 함수**로 추출하고 Prisma에 전달한다. 반환값 화살표는 조율자가 다음 입력을 만든다는 뜻이다. tx 호출은 모두 같은 **RepeatableRead transaction client**를 사용한다.

```jobflow
scope: snapshot_registration
Object: ReadingService, Prisma
ReadingService.listReadingLinks --> Prisma.$transaction
```

```jobflow
scope: read_snapshot_calls
Object: Snapshot, Policy, LinkTable, ProgressTable, Validation
Snapshot.readSnapshot --> Policy.accessibleLinksWhere
Snapshot.readSnapshot --> LinkTable.findMany
Snapshot.readSnapshot --> LinkTable.count
Snapshot.readSnapshot --> ProgressTable.groupBy
Snapshot.readSnapshot --> Validation.toReadingDTO
```

| 노드 | 근거 | 비고 |
|---|---|---|
| ReadingService/Prisma | C-02·D-02 제안 | `$transaction(readSnapshot,{isolationLevel:RepeatableRead})`; callback executor는 Prisma |
| Snapshot.readSnapshot | 제안 `reading.ts`의 이름 있는 callback | userId/query/status/cursor를 closure로 받아 page31·전체 count·자기 status group count를 하나의 snapshot에서 읽음 |
| Policy.accessibleLinksWhere | R-01·R-02 제안 | `{collection:{OR:[{ownerId:userId},{members:{some:{userId}}}]}}` |
| LinkTable.findMany/count | `tx.link` 제안 | findMany는 접근+query+status+id cursor, take31/orderBy id desc. count는 접근만 적용 |
| ProgressTable.groupBy | `tx.readingProgress` 제안 | 현재 userId AND 접근 가능한 link relation, status별 count. 다른 사용자의 row 제외 |
| Validation.toReadingDTO | C-01 제안 말단 | 명시적 link 필드와 **current user row만** 변환. 전체 relation을 serialize하지 않음 |

row 없는 링크도 unread에 포함하므로 `unread=all-reading-finished`다. explicit UNREAD row와 absence가 모두 같은 shelf에 들어간다. query는 name/url/description의 case-insensitive contains, Meili를 사용하지 않는다. count 실패나 page 실패 시 전체 응답을500으로 끝낸다. 완료 snapshot 내부에서는 상태 변경으로 두 그룹에 중복 집계되거나 unread가 음수가 되는 모순이 없어야 한다. 이 약속은 구현 후 동시 갱신 테스트로 검증한다.

### JF-2 한 링크의 개인 기록 — getReading

인증 성공과 유효한 id가 전제다. getReading은 이름 있는 제안 callback `readSingleSnapshot`을 RepeatableRead transaction에 등록한다. Prisma가 실행하는 callback 안에서 접근 판정과 현재 row가 같은 snapshot을 보게 한다.

```jobflow
scope: single_snapshot_registration
Object: ReadingService, Prisma
ReadingService.getReading --> Prisma.$transaction
```

```jobflow
scope: personal_get_calls
Object: SingleSnapshot, Policy, ProgressTable, Validation
SingleSnapshot.readSingleSnapshot --> Policy.findAccessibleLink
SingleSnapshot.readSingleSnapshot --> ProgressTable.findUnique
SingleSnapshot.readSingleSnapshot --> Validation.toReadingDTO
```

| 노드 | 근거 | 비고 |
|---|---|---|
| ReadingService.getReading/Prisma.$transaction | R-01·C-02 제안 | callback 등록과 transaction 결과 반환. callback의 executor는 Prisma |
| SingleSnapshot.readSingleSnapshot | 제안 `reading.ts`의 이름 있는 callback | 그림은 접근 결과 Link가 있는 분기. 없으면404, 이후 row 조회 생략 |
| Policy.findAccessibleLink | 아래 JF-2.1 | 조회한 Link의 공개 여부만으로 개인 접근 허용 안 함 |
| ProgressTable.findUnique | `tx.readingProgress.findUnique({where:{userId_linkId}})` 제안 | row 없으면 synthesized Unread/version0 |
| Validation.toReadingDTO | C-01 제안 | private self row와 명시적 Link DTO 반환 |

### JF-2.1 접근 판단 — findAccessibleLink

findAccessibleLink가 조율한다. 아래 결과 선은 predicate 결과에 linkId를 더해 findFirst에 전달하는 배선이며 accessibleLinksWhere가 SQL을 직접 호출하지 않는다.

```jobflow
orchestrator: Policy
Object: Policy, LinkTable
Policy.findAccessibleLink --> Policy.accessibleLinksWhere
Policy.accessibleLinksWhere.result --> LinkTable.findFirst
```

| 노드 | 근거 | 비고 |
|---|---|---|
| Policy.findAccessibleLink | R-01 제안 | `linkId`와 접근 predicate를 AND하여 한 번 조회. tx를 인자로 받음 |
| LinkTable.findFirst | `tx.link.findFirst` 제안 | owner 또는 **모든 member**. canUpdate/canCreate/canDelete와 독립. null→404 |

GET/PUT마다 확인한다. 예전 row가 있다는 이유로 접근을 허용하지 않는다. 접근 회수 시 row는 보관하지만 응답하지 않으며 재가입 시 다시 보인다. 검사 이후 동시에 회원이 제거될 수 있으므로 **그 요청의 접근 검사 snapshot 시점** 권한을 인정한다. transaction 존재를 실시간 철회 직렬화 보장으로 설명하지 않는다.

### JF-3 개인 기록 저장 — linkReading

PUT·인증 성공·demo 아님·id/body 유효가 전제다. route 자체가 method/demo를 판단한다.

```jobflow
scope: put_route_calls
Object: ReadingRoute, Auth, Validation, ReadingService
ReadingRoute.linkReading --> Auth.verifyUser
ReadingRoute.linkReading --> Validation.parseReadingInput
ReadingRoute.linkReading --> ReadingService.putReading
```

```jobflow
scope: put_service_calls
Object: ReadingService, Prisma
ReadingService.putReading --> Prisma.$transaction
```

| 노드 | 근거 | 비고 |
|---|---|---|
| ReadingRoute.linkReading | C-02 제안 | GET은 JF-2, PUT은 본 그림. unsupported405; private no-store |
| Validation.parseReadingInput | C-01·R-03 제안 | unknown key와 client userId 거절. 단일 status/reflection 입력 |
| ReadingService.putReading | R-03·R-04 제안 | `$transaction(commitReading)`의 원자적 DB 쓰기. conflict/P2002는 아래 resolveConflict로, 예기치 않은 오류500 |

DB commit 후 HTTP 응답이 유실될 수 있다. API가 성공을 확인하지 못한 browser에 자동 재전송하지 않는다. Browser의 명시적 재시도와 current equality 규칙은 JF-3.2에 따른다.

### JF-3.1 version 쓰기 — commitReading

`commitReading`은 Prisma가 실행하는 이름 있는 제안 transaction callback이다. tx만 사용하며 policy read 후 CAS를 수행한다. 다음 그림들은 **같은 callback의 택일 분기**다.

```jobflow
scope: write_access_calls
Object: WriteTransaction, Policy, ProgressTable
WriteTransaction.commitReading --> Policy.findAccessibleLink
WriteTransaction.commitReading --> ProgressTable.findUnique
```

접근 있는 Link·현재 row 없음·expectedVersion=0인 분기만 아래 create를 실행한다. 다른 요청과 경합하면 unique constraint가 한 개만 허용한다.

```jobflow
scope: first_personal_write
Object: WriteTransaction, ProgressTable
WriteTransaction.commitReading --> ProgressTable.create
```

현재 row가 있고 expectedVersion이 일치하며 payload가 변경된 분기만 아래 CAS를 실행한다. 단순 read 뒤 unconditional update를 하지 않는다.

```jobflow
scope: compare_and_set_write
Object: WriteTransaction, ProgressTable
WriteTransaction.commitReading --> ProgressTable.updateMany
WriteTransaction.commitReading --> ProgressTable.findUnique
```

| 노드·분기 | 근거 | 비고 |
|---|---|---|
| WriteTransaction.commitReading | R-03·R-04·C-01·C-02 제안 | 동일 tx에서 access/current 확인. 없는 Link는404; 없는 row+nonzero version은 conflict |
| ProgressTable.create | 제안 Prisma ReadingProgress | userId/linkId unique, version1. status/reflection 함께 생성. P2002는 tx rollback 후 JF-3.2 |
| ProgressTable.updateMany | 제안 `where:{userId,linkId,version:expectedVersion}` | `{status,reflection,version:{increment:1}}` 단일 write. count=0은 conflict로 throw하여 rollback, 후속 findUnique 생략 |
| ProgressTable.findUnique | CAS count=1 이후만 | 방금 쓴 row를200으로 반환. 동일 payload와 동일 version이면 쓰기 없이 current200, version불변 |
| stale version | 현재 row와 payload 비교 | 동일 값이면 current200, 다르면 conflict. 초안이나 공유 필드를 임의 병합하지 않음 |

완료는 DB row commit이다. Link/User 삭제 FK 오류는 성공으로 바꾸지 않는다. 삭제와 겹친 경우 접근을 다시 확인하여404 또는 일반 오류로 소비한다. isolation은 쓰기 CAS의 조건부 UPDATE+unique가 담당하며 list의 RepeatableRead 약속과 혼동하지 않는다.

### JF-3.2 충돌 재조회 — resolveConflict

tx rollback 후 CAS count0 또는 P2002에서만 실행한다. fresh read transaction으로 접근을 다시 검사하고 현재 row를 얻는다. 아래 getReading은 JF-2와 같은 권한 계약이다. resolveConflict가 조율하며 결과 화살표는 current를 equality 검사에 전달하는 배선이다.

```jobflow
orchestrator: ReadingService
Object: ReadingService, Validation
ReadingService.resolveConflict --> ReadingService.getReading
ReadingService.getReading.result --> Validation.matchesReadingPayload
```

| 노드 | 근거 | 비고 |
|---|---|---|
| ReadingService.resolveConflict/getReading | R-04 제안 | 재조회에서도 접근이 없으면404로 끝나 current를 노출하지 않음 |
| Validation.matchesReadingPayload | 말단 제안 | normalized status/reflection 정확히 같으면200 current; 다르면409 current |

stale version+동일 payload의200은 **지금 DB 값이 요청한 값과 같다는 확인**이다. 독립 idempotency key나 이력 기반 exactly-once 보장이 아니다. 다른 탭이 값을 바꿨다가 되돌린 역사까지 구별하지 않는다. 응답 유실 뒤 current가 달라졌다면409로 사용자의 판단을 받는다.

## 4. 소유 상태·데이터

| 표 | 주요 열 | 비고 |
|---|---|---|
| ReadingProgress (제안) | userId/linkId/status/reflection/version/timestamps | unique pair, cascade, API단일쓰기 |
| User/Link (유지) | id와collection권한·format metadata | 새relation추가,기존필드불변 |


제안 `ReadingProgress`: `id`, `userId`, `linkId`, `status` enum, `reflection` default empty, `version` default1, `createdAt`, `updatedAt`. unique(userId,linkId), index(userId,status), Link/User relation onDelete Cascade. backfill 없이 absence=Unread를 읽기 계약에서 합성한다. 서버의 ReadingService만 쓴다. 원본 public/search/link 응답은 새 relation을 include하지 않는다.

## 5. 의존 — 나가는 방향

| 상대 | 쓰는 계약 | 배선·설정 | 타임아웃 | 결합 |
|---|---|---|---|---|
| verifyUser | session/bearer→user/null | 기존env/handler | 기존계약 | 인증user ID |
| Prisma | read tx·unique·conditionalupdate | 기존DATABASE_URL | interactive tx 제한명시예정 | schema와SQL predicate |
| model | 순수validation·DTO | 정적import | 없음 | status/reflection/version형식 |


새 route→verifyUser/validation→ReadingService→policy/Prisma 방향이다. UI 순수 model은 React·Next·Prisma를 import하지 않는다. Worker는 새 모델을 알 필요가 없다. DB schema 생성 후 web을 배포하고 기본 진입 변경은 마지막에 한다. migration을 적용하지 않은 web은 health/check 단계에서 실패를 발견하도록 구성한다.

## 6. 실패 경계

| 항목 | 기본값 | 설정 키 | 위치 |
|---|---|---|---|
| 읽기격리 | RepeatableRead | isolationLevel | readSnapshot/readSingleSnapshot |
| transaction대기/실행 |2000/5000ms 제안 | maxWait/timeout | Prisma.$transaction |
| DB자동쓰기 재시도 |0 | 없음 | putReading |
| unique/CAS경합 |fresh재조회1회 | 정책 | resolveConflict |


입력은 [기존 권한 조회](../../as-is/details/web-api.md#jf-7-개인-링크-상세수정삭제--getlinkbyid--updatelinkbyid--deletelink), [원본 저장](../../as-is/details/jobflow/save-link.md), Prisma User/Link 관계, 이 문서 §2다. 구현자가 새 reading endpoint를 publicLink controller에 재사용하면 안 된다. 공용 response 계약의 private row 부재를 회귀 검사한다.

## 7. 검증 계획

| 검증 | 대상 계약·시나리오 | 방법·명령 | 시점 |
|---|---|---|---|
| DB 제약·CAS | DB 제약·CAS 계약 | 새 격리 PostgreSQL에 migration, 동일 pair 동시PUT/두 version/different payload | UI 통합 전. row1개, 충돌 또는 동일 payload200, version의 단조 증가 |
| 권한·privacy | 권한·privacy 계약 | owner/read-only member/다른 user/public-only outsider/revoke/regrant의 실제 HTTP | UI 통합 전. 현재 actor의 row만 보이고404 구분 계약 유지 |
| lifetime | lifetime 계약 | Link 삭제/User 삭제 후 SQL row 수 | 실제 API/DB 단계. cascade0 |
| snapshot·page | snapshot·page 계약 | 동시 상태 변경 중 list counts,31개 이상 fixture와query/filter/cursor | 통합 전. 합계일치·음수없음·30개·중복없는idcursor |
| 응답 유실 | 응답 유실 계약 | 같은 expectedVersion 동일/다른 payload 재전송 | 통합 전. equality와 conflict 계약을 구분 |
| 원본 회귀 | 원본 회귀 계약 | POST link→worker 실제 파일/원문 viewer, public JSON에 reflection 없음 | 최종 통합. 보존 여부와 reading status 독립 |


## 8. 위험·미확정

| 관련 ID | 분류 | 내용 | 근거 | 영향·대응 |
|---|---|---|---|---|
| C-02 | 미확정 | Prisma 실제경합/오류코드 | 아직 실행 전 | UI연결전실제 HTTP/SQL |
| R-01 | 위험 | 검사후동시revoke | snapshot권한정책 | 현재요청허용시점을문서화 |
| R-02 | 위험 | 개인library규모증가 | contains/query | 성능관찰후필요시별도결정 |


실제 Prisma6/PostgreSQL의 오류 코드와 race 발생 모양은 아직 실행하지 않았다. 이 부분이 예상과 다르면 UI 구현 전에 CAS 구현·계약을 조정하고 문서를 갱신한다. count/query 성능은 개인 library 규모 가정이며 full-text index/별도 검색 서비스는 도입하지 않는다. 동시 revoke의 접근 검사 snapshot 정책은 의도한 한계다. 기존 signed archive token은 발급 이후 TTL 내 접근 가능할 수 있으며 새 reading 데이터와는 무관하다.

## 9. 미확인·한계

1. 아직 migration·HTTP·DB·동시성 실행 증거가 없다.
2. 기존 signed archive token 수명과 원본 SMTP/S3 조건은 새 API의 보장이 아니다.
