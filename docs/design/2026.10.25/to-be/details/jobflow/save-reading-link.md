# Reading Room에서 새 링크 저장 — TO-BE Job Flow

> DATE2026.10.25 · 신규 UI/유지API R-05/C-03·C-05/D-03. [핵심 §5.23](../../system-design-to-be.md#523-reading-room에서-새-링크-저장) · [Navigation](../navigation/save-reading-link.md)

## 1. 목적과 범위

Reading Room의 Save a link overlay가 원본 Linkwarden POST를 호출한다. 기존 collection을 고르면 id를 보낸다. 매 링크마다 같은 이름의 collection을 새로 만드는 동작을 기본으로 하지 않는다. 새 collection은 사용자가 새 이름 옵션을 선택한 때만 만든다.

## 2. 그림과 계약

Save overlay를 열 때 선택지 조회가 먼저 일어난다. 아래 GET 응답이 POST를 자동 호출하지 않으며 실제 제출은 사용자의 별도 행동이다.

```jobflow
scope: load_save_collections
Object: Browser, API
Browser.openSave --> API.getCollections
API.getCollections.result --> Browser.receiveCollections
```

```jobflow
scope: save_reading_room_link
Object: Browser, API
Browser.submitNewLink --> API.postLink
API.postLink.result --> Browser.receiveCreatedLink
```

| 노드 | 실제 계약 | AS-IS 대비 |
|---|---|---|
| Browser.openSave/receiveCollections | (제안) overlay 열기와 응답 다음 동작 | 신규 |
| API.getCollections | 원본 GET `/api/v1/collections`, 인증 사용자의 목록 | 유지 |
| Browser.submitNewLink | (제안) URL/name/collection id 또는 새name,submit lock | 신규 |
| API.postLink | POST `/api/v1/links`, 원본200/400/409/인증오류/uncaught예외 | 유지 |
| Browser.receiveCreatedLink | (제안) 응답 다음 동작.200만창닫기+실제id선택;오류폼유지 | 신규 |

## 3. 내부 추적

| 상위 노드 | 실제/제안 진입 | 내부 그림·근거 | 판정 |
|---|---|---|---|
| Browser.openSave/receiveCollections | loadCollections (제안) | [Browser JF-4.1](../browser.md#jf-41-저장할-collection-선택지--loadcollections) | 펼침(제안) |
| API.getCollections | 원본 collections handler와 getCollection | [AS-IS 초기 데이터](../../../as-is/details/jobflow/initial-data.md#3-내부-추적) | 펼침, 기존 Prisma owner/member 조회 |
| Browser.submitNewLink/receiveCreatedLink | useReadingRoom.saveLink (제안) | [Browser JF-4](../browser.md#jf-4-원본-link-저장--savelink) → [transport](../browser.md#jf-11-http-수명--requestjson) | 펼침(제안) |
| API.postLink | `apps/web/pages/api/v1/links/index.ts:9/:39` | [AS-IS route](../../../as-is/details/web-api.md#jf-1-post-분기--links) → [postLink](../../../as-is/details/web-api.md#jf-12-저장-정책과-영속화--postlink) | 펼침,유지하는실제 본문·setCollection·capacity·metadata |
| URL/DB/files helpers | 원본 save 상세 추적표 | [AS-IS 확대한 협력자](../../../as-is/details/jobflow/save-link.md#3-내부-추적) | 펼침/말단/외부를원본대로분류 |

## 4. 정상 흐름의 단계별 설명

1. client는 초기 collection 조회에서 owner/canCreate 선택지를 표시한다. 서버 최종권한 검증을 대체하지 않는다.
2. Controller는 URL과 명시적 collection 입력을 검증하고 원본 POST를 await한다.
3. postLink는 setCollection·중복·용량·안전 URL metadata·DB create·파일준비를 그대로 수행한다. 여기서 worker 직접 호출이나 큐 발행은 없다.
4.200 후 새로운 실제 id를 선택하고 library를 reload한다. 새 reading row가 없어 Unread로 표시한다. format pending과 unavailable을 독립 표시한다.

## 5. 실패·취소·복구

schema/권한/중복/용량 오류는 overlay 안에 표시하며 draft를 유지한다.15초 timeout은 서버 저장 여부가 불명확하므로 자동 POST 재시도하지 않는다. 사용자가 library를 확인하고 재시도를 결정할 수 있다. 원본은 새 collection을 먼저 만들고 나중에 실패할 수 있으므로 rollback을 보장하지 않는다. 완료된보존이아닌200에“Saved to library”만표시한다.

## 6. 완료와 근거

완료는 원본 backend가 새 Link를 저장하고 UI가 실제 id를 표시한 상태다. worker보존은 [§5.16](../../system-design-to-be.md#516-백그라운드-보존)의 별도 트리거/완료다. prototype은 Fake create 결과만 검증하며 실제 DB/worker는 계약·통합 단계에서 따로 증명한다.
