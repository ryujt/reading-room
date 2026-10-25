# 링크 보존 — TO-BE 유지 Job Flow

> **목표 기준** 2026.10.25 · **AS-IS 대비** 유지. [이번 기준선 원본](../../../as-is/details/jobflow/preserve-link.md)의 도표와 내부 계약을 목표에서도 유지한다. 아래 코드는 upstream 952ac454의 확인된 근거이며 목표 실행을 검증했다는 뜻이 아니다. [목표 핵심](../../system-design-to-be.md) C-05의 회귀 검증 대상이다.

## 1. 목적과 범위

worker loop가 DB의 미처리 링크를 선택한다. 웹 저장 요청이 worker를 직접 호출하지 않는다. 대표 입력은 user가 선택 가능한 self-host 조건, `url!=null && lastPreserved==null`, 안전한 HTML URL, 기존 preview 있음, Readable만 활성화이며 readable path는 없는 링크다. L0는 이 대표 입력을 보여 주며 다른 형식은 Worker JF-3~6.2에서 조건별로 전개한다.

## 2. 그림과 계약

```jobflow
scope: preserve_link
Object: Worker, Database, Origin, Storage
Worker.poll --> Database.selectPending
Worker.archive --> Origin.fetchDocument
Worker.archive --> Storage.writeReadable
Worker.archive --> Database.recordReadable
Worker.archive --> Database.markProcessed
```

poll과 archive는 하나의 worker process 안의 실행 노드다. 둘 사이 내부 호출은 L1의 processBatch→archiveHandler에서 연다. L0의 각 화살표는 실제 worker가 다른 경계에 요청하는 동작이며 원문 서버가 저장소를 호출한다는 뜻이 아니다. 아래는 대표 정상 입력의 순서 요약이며 실패 시 후속 호출이 달라지는 상세는 §5와 내부 그림에서 분리한다.

| 노드 | 실제 계약 | AS-IS 대비 |
|---|---|---|
| Worker.poll | `linkProcessing` loop, batch 선택 후 processBatch 완료를 기다리고 기본10초 delay. HTTP 아님 | 유지 |
| Database.selectPending | Prisma user/link findMany. mode links의 url not null/lastPreserved null과 설정별 user 조건 | 유지 |
| Worker.archive | `archiveHandler(link,browser)` 실행. Promise<void>, DB/file 부작용 | 유지 |
| Origin.fetchDocument | page.goto 및 request interceptor의 safeFetch, 실제 URL HTTP. loopback 테스트는 아직 없음 | 유지 |
| Storage.writeReadable | createFile의 local mkdir/writeFile 또는 S3 PutObject. boolean 반환, DB와 원자성 없음 | 유지 |
| Database.recordReadable | `prisma.link.update` readable path/textContent | 유지 |
| Database.markProcessed | finally의 link query 후 update lastPreserved, 빈 format을 unavailable로 채움 | 유지 |

## 3. 내부 추적

| 상위 노드 | 실제/제안 진입 심볼 | 내부 그림 또는 말단 근거 | 판정·중단 이유 |
|---|---|---|---|
| Worker.poll | `linkProcessing`:25, 등록 `worker.ts:16` | [JF-1](../../../as-is/details/worker.md#jf-1-반복-선택과-브라우저-수명--linkprocessing) → [JF-1.1](../../../as-is/details/worker.md#jf-11-공정한-선택--getlinkbatchfairly) | 펼침 — 선택, 반복, browser 재사용, processBatch |
| Database.selectPending | `getLinkBatchFairly`, Prisma calls:45/:88/:122/:151/:160 | [selector 근거](../../../as-is/details/worker.md#jf-11-공정한-선택--getlinkbatchfairly) | 외부 경계 — SQL engine은 범위 밖. 앱 predicate·집계·lastPickedAt 쓰기는 펼침 |
| Worker.archive | `archiveHandler`:25, processBatch 호출:46 | [JF-1.2](../../../as-is/details/worker.md#jf-12-보존-실행과-실패-회수--archivehandler) | 펼침 — try 전/안/후의 분리 |
| Origin.fetchDocument | `page.goto`:132, callback `protectPageRequests`:19 | [JF-1.2.1](../../../as-is/details/worker.md#jf-121-페이지-요청-보호--protectpagerequests) → [safeFetch](../../../as-is/details/adapters.md#jf-2-제목-조회와-안전한-redirect--fetchtitleandheaders) | 외부 경계 — 원문 응답 내부 제외, 요청 adapter는 펼침 |
| Storage.writeReadable | `handleReadability`:48 → `createFile`:7 | [JF-1.2.2](../../../as-is/details/worker.md#jf-122-readable-생성--handlereadability) → [adapter JF-3](../../../as-is/details/adapters.md#jf-3-디렉터리와-파일-쓰기--createfoldercreatefile) | 외부 경계 — fs/S3 SDK 내부 제외, writer·boolean 오류 변환은 펼침 |
| Database.recordReadable | `handleReadability`:53 | [JF-1.2.2](../../../as-is/details/worker.md#jf-122-readable-생성--handlereadability) | 외부 경계 — Prisma engine 제외, 실제 update field와 호출자 확인 |
| Database.markProcessed | `archiveHandler`:211/:216 | [JF-1.2C](../../../as-is/details/worker.md#jf-12c-finally와-다음-선택-여부) | 외부 경계 — 앱 finally/오류 propagation은 펼침, SQL engine 제외 |

외부 노드를 내부 분석 완료 수에 더하지 않는다. Preview·Screenshot/PDF·Monolith·직접 image/PDF와 boot/count는 [Worker JF-2~6.2](../../../as-is/details/worker.md#jf-2-부팅과-남은-작업-통계--init--migrationworker--countunprocessedbillablelinks), 파일 정리는 [Adapter JF-4](../../../as-is/details/adapters.md#jf-4-파일-조회존재삭제이동--readfile--fileexists--removefiles--movefiles)에서 전개한다. billing의 웹 가드는 API JF-14이며 store 구매 내부는 제외 경계다.

## 4. 정상 흐름의 단계별 설명

1. getLinkBatchFairly는 user 목록과 사용자별 link 후보를 조회하고 round-robin으로 id를 모은다. linkUserMap에서 나온 user ids는 lastPickedAt 갱신용이고, picked Set의 ids는 전체 link row 조회용이다.
2. on-demand loop는 필요한 경우 browser를 만들고 processBatch에서 각 link를 병렬 처리한다. archiveHandler는 안전성을 검사하고 context·route callback·page를 준비한다.
3. try 안에서 타입을 확인하고 HTML page를 열어 metadata와 content를 받는다. 대표 입력에서 이미 있는 preview와 비활성 capture/monolith 호출은 생략된다. handleReadability가 sanitize→parse→파일쓰기→DB path/textContent 저장을 수행한다.
4. finally가 현재 link를 다시 조회하고 lastPreserved를 기록한다. 현재 없는 format은 unavailable로 채운다. context close 후 processBatch가 남은 수를 기록하고 loop가 delay한다.

## 5. 실패·취소·복구

| 반례 | 실제 경로 | 상태·다음 선택 |
|---|---|---|
| 안전하지 않은 URL | archiveHandler:37 catch→skip marker:51 | unavailable+lastPreserved, 일반 selector에서 제외 |
| newContext/protect/newPage/mkdir 실패 | archiveHandler:81–86, try:112 이전 | finally 없음. marker null이면 다음 batch 재선택 가능. setup timer/context 정리 미보장 |
| page.goto/parse/DB write 실패 | try:112→catch:202→finally:206 | finally가 성공하면 lastPreserved 기록 후 원래 오류를 processBatch가 수신. 자동 재선택 제외 |
| timeout | timer:70→AbortController:71+reject→race catch/finally | 동일 marker 기록. signal은 Monolith에만 연결되어 전체 하위 작업의 취소는 보장 안 됨 |
| createFile false | Readable:48 반환값 무시→DB update:53 | 파일이 없어도 path가 DB에 남을 수 있음. S-01 |
| finally DB update 실패 | archiveHandler:216 throws | marker 미기록 가능, context.close 미도달 가능. 후속 선택은 실제 남은 DB 값에 달림 |

## 6. 완료와 근거

lastPreserved는 처리 시도 종료 marker이며 모든 형식 성공의 증거가 아니다. 실제 파일 존재/내용과 DB field는 별도로 확인해야 한다. 현재는 소스 조사 후보이고 모든 런타임 검증은 미실행이다.

독립 검토 입력은 정상 Readable 성공, try 내부 failure, try 이전 setup failure다. [Worker JF-1.2](../../../as-is/details/worker.md#jf-12-보존-실행과-실패-회수--archivehandler)→finally→selector의 null 조건으로 다음 선택 여부를 확인한다. [Navigation](../navigation/preserve-link.md)은 UI 비대상 사유를 기록한다.
