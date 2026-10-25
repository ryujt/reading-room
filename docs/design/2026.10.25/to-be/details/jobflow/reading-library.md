# 개인 library 읽기 — TO-BE Job Flow

> DATE2026.10.25 · 신규 제안 R-01·R-02/C-02·C-03/D-01·D-02. [핵심 §5.20](../../system-design-to-be.md#520-개인-library-읽기) · [Navigation](../navigation/reading-library.md)

## 1. 목적과 범위

인증된 사용자가 Reading Room에 들어가 shelf·검색·다음 페이지를 읽고 article을 선택한다. 링크는 원본 owner/member 접근 범위에서만 가져오며 개인 reading은 현재 user의 기록이다. public-only 외부 사용자는 대상이 아니다. UI는 library 요청과 상세 요청을 별개로 시작한다.

## 2. 그림과 계약

```jobflow
scope: reading_library
Object: Browser, API
Browser.openShelf --> API.listReadingLinks
API.listReadingLinks.result --> Browser.receiveShelf
```

상세 선택은 list 응답이 자동 실행하는 후속 API가 아니다. 사용자 클릭 또는 `?link=id` 직접 진입이 별도 트리거다.

```jobflow
scope: reading_selection
Object: Browser, API
Browser.selectLink --> API.getReading
API.getReading.result --> Browser.receiveReading
```

| 노드 | 실제 계약 | AS-IS 대비 |
|---|---|---|
| Browser.openShelf/receiveShelf | (제안) mount·검색 제출·shelf·Load more / 응답 다음 동작으로 rows/counts 표시 | 신규 |
| API.listReadingLinks | (제안) GET reading-links,30개 id desc, global counts,400/401/500 | 신규 |
| Browser.selectLink/receiveReading | (제안) article click/direct id / 선택 epoch 일치한 결과만 표시 | 신규 |
| API.getReading | (제안) GET links/:id/reading,200 own DTO 또는404 | 신규 |

전체 입력/오류 정의는 [API §2](../web-api.md#2-공개-계약)가 원본이다.

## 3. 내부 추적

| 상위 노드 | 제안 진입 심볼 | 내부 그림·근거 | 판정 |
|---|---|---|---|
| Browser.openShelf/receiveShelf | useReadingRoom.loadShelf | [Browser JF-1](../browser.md#jf-1-library와-선택--loadshelfselectlink) → [transport](../browser.md#jf-11-http-수명--requestjson) | 펼침(제안),epoch·cancel·오류 소비 |
| API.listReadingLinks | readingLinks→listReadingLinks→readSnapshot | [API JF-1](../web-api.md#jf-1-개인-library-조회--readinglinks) → [snapshot](../web-api.md#jf-11-같은-snapshot의-목록과-개수--listreadinglinks) | 펼침(제안),tx·query·groupBy |
| Browser.selectLink/receiveReading | useReadingRoom.selectLink | [Browser JF-1](../browser.md#jf-1-library와-선택--loadshelfselectlink) | 펼침(제안),독립 요청·stale discard |
| API.getReading | getReading→findAccessibleLink | [API JF-2](../web-api.md#jf-2-한-링크의-개인-기록--getreading) → [접근](../web-api.md#jf-21-접근-판단--findaccessiblelink) | 펼침(제안),absence 처리 |
| DTO/순수 query validation | parseShelfQuery/toReadingDTO | [API §2·JF-1.1](../web-api.md#jf-11-같은-snapshot의-목록과-개수--listreadinglinks) | 말단 확인(제안),값 규칙·명시적필드 |
| Prisma/fetch | transaction·HTTP 외부 런타임 | adapter 계약에서 중단 | 외부 경계, 구현 전 실제계약검증 예정 |

## 4. 정상 흐름의 단계별 설명

1. Controller가 URL에서 허용된 shelf/query/link를 읽고 list 요청 epoch를 발급한다. 상세 id가 있으면 별도 get도 시작한다.
2. ListRoute는 인증·query를 검증하고 service가 RepeatableRead readSnapshot을 실행한다. 권한 predicate, page, 전체 count, 현재 user status group을 같은 tx로 조회한다.
3. API는 필요한 Link 필드와 현재 user의 reading만 DTO로 만든다. Controller는 아직 현재 actor/epoch일 때만 rows/counts를 교체한다.
4. 상세 요청은 같은 접근 predicate를 재확인한다. 접근 가능한 row가 없으면404, personal row만 없으면 Unread/version0을 반환한다.
5. 상세는 저장된 값에서 draft를 만들고, 원문 format availability와 개인 status를 별개로 표시한다.

## 5. 실패·취소·복구

검색 결과 없음은 전체 library 없음과 구분한다. 통신 실패는 empty로 위장하지 않고 retry를 표시한다. filter 변경은 dirty guard를 통과하고 이전 요청을 취소한다. 취소 실패로 늦은 응답이 와도 epoch가 보호한다. revoke/delete는 상세404로 처리하며 row를 다른 user cache에 남기지 않는다. counts는 global이므로 좁은 검색 결과 수와 같지 않을 수 있음을 UI에 명시한다.

## 6. 완료와 근거

완료는 접근 가능한 page/counts와 선택한 link의 자기 상태를 표시한 것이다. 원문 보존·실제 독서·상태 쓰기는 이 GET의 완료가 아니다. [API 검증](../web-api.md#7-검증-계획)에서 pagination/privacy/snapshot을 실제 HTTP로 확인할 예정이다. 현재는 미구현 제안이다.
