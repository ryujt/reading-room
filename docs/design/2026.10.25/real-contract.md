# 실제 계약 구현과 근거

프로토타입 commit `eeafc4eb`의 설계를 검토한 뒤 실제 PostgreSQL과 NextAuth 위에 개인 기록 계약을 구현했다. 원본 Link 저장·공유·보존 controller는 유지한다. 이 단계는 새 화면을 연결하기 전의 API 검증 단계다.

## 실제 코드 경계

| 상위 역할 | 실제 함수와 호출·반환 | 근거 |
|---|---|---|
| 목록 route | `readingLinks`가 `verifyUser`의 actor와 `parseShelfQuery` 결과를 `listReadingLinks`로 전달하고 `{response:{items,nextCursor,counts}}`를 반환 | `apps/web/pages/api/v1/reading-links/index.ts` |
| 개별 route | `linkReading`이 `parseReadingId`와 `parseReadingInput`을 검사. GET→`getReading`, PUT→`putReading`. actor는 body에서 받지 않음 | `apps/web/pages/api/v1/links/[id]/reading.ts` |
| 권한·개인 row 선택 | `findAccessibleLink`→`accessibleLinksWhere`/`readingLinkSelect`→`tx.link.findFirst`. owner 또는 member 조건과 자기 `readingProgress` relation을 한 조회에 사용. 없으면 404 | `apps/web/lib/api/readingPolicy.ts:4–20` |
| 목록 snapshot | `listReadingLinks`→`prisma.$transaction(readSnapshot, RepeatableRead)`. callback의 `link.findMany`·`link.count`·`readingProgress.groupBy`가 같은 snapshot에서 실행. 31개를 읽고 30개 반환 | `apps/web/lib/api/controllers/reading.ts:23–38` |
| 개별 snapshot | `getReading`→`prisma.$transaction(readSingleSnapshot, RepeatableRead)`→`findAccessibleLink`→`toReadingDTO` | 같은 파일 `:41–45` |
| 상태·감상 쓰기 | `putReading`의 transaction callback→`commitReading`. 접근 재확인 후 현재 값 비교→동일하면 반환, 다른 version이면 `ChangedVersion`, 한계면 `VERSION_EXHAUSTED`, 최초면 create, 기존이면 version 조건 updateMany→findUniqueOrThrow | 같은 파일 `:50–62,72–78` |
| 경합 수신자 | `putReading` catch가 `ChangedVersion`/Prisma P2002만 `resolveConflict`로 전달. 새 `getReading`으로 접근을 다시 확인해 동일 payload면 현재 값, 다르면 current를 포함한 409 반환 | 같은 파일 `:65–78` |
| HTTP 실패 | route catch→`readingFailure`. 알려진 오류는 code/message/current, 나머지는 내용 없는 일반 500. 모든 새 응답은 private/no-store | `apps/web/lib/api/readingResponse.ts` |

TO-BE의 책임은 유지했지만 실제 구현의 `toReadingDTO`는 `model.ts`가 아니라 controller에 있다. 현재 개인 row는 별도 `ProgressTable.findUnique`를 선행하지 않고 접근 가능한 Link의 relation select로 읽는다. Prisma는 대리 id와 unique pair 대신 `@@id([userId,linkId])`를 사용한다. 두 foreign key의 cascade와 version CAS 의미는 같다. 최종 내부 JobFlow 색인은 이 실제 함수를 기준으로 추가하며 제안 문서를 실행 소스로 오인하지 않는다.

## HTTP 형식과 범위

GET `/api/v1/reading-links`의 `counts`는 정확히 `ALL`, `UNREAD`, `READING`, `FINISHED`이다. counts는 검색·shelf 필터와 무관한 접근 가능한 전체 수이며, items는 필터된 id 내림차순 최대 30개다. cursor는 마지막 id다.

GET `/api/v1/links/:id/reading`은 `{response:{link,reading}}`, PUT은 `{response:{reading}}`를 반환한다. 읽기 권한은 요청에서 확인한 시점을 기준으로 하며 동시에 실행되는 membership 철회를 직렬화한다고 약속하지 않는다. 같은 저장값의 200은 현재 값을 확인한 결과이고 요청별 idempotency key를 보장하지 않는다.

## 검토와 실행

독립 소스 검토는 권한, private DTO, RepeatableRead, CAS/P2002, Int32 경계, no-store를 확인했고 열린 필수 지적은 없었다. 작성자 실제 HTTP/SQL 13개 검사와 독립 실제 HTTP 12개 검사가 통과했다. 임시 테스트 collection/links는 원본 API로 정리했고 독립 probe가 fixture의 개인 값을 API로 원복했다. version 증가만 남는다.

실행 세부와 남은 통합 범위는 [검증 표](verification.md), 원안과 차이는 [TO-BE](to-be/system-design-to-be.md)를 참조한다. 실제 UI와 viewer 반환, timeout은 이후 통합 단계에서 별도로 확인한다.
