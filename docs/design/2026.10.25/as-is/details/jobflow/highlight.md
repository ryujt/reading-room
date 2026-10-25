# 선택 범위 highlight·주석 — AS-IS Job Flow

> **DATE** 2026.10.25 · **기준** `952ac454` · 소스 역추출, 실제 HTTP/브라우저 실행 전.
> [핵심 흐름](../../system-design-as-is.md#5-흐름) · [Navigation](../navigation/highlight.md) · [시스템 구성](../system-configuration.md)

## 1. 목적·트리거·완료

- 트리거: Readable에서 텍스트 선택 후 색상/댓글 저장 또는 주석 삭제
- 완료 사실: 개인 user/link/offset 주석이 저장되고 해당 highlight cache와 DOM표시 갱신
- Browser는 사용자 입력·query/mutation을, API는 인증과 업무 판단·DB 호출을 소유한다. 원격 라이브러리 내부는 외부 경계다.

## 2. 경계 흐름과 계약

```jobflow
scope: highlight
Object: Browser, API
Browser.saveHighlight --> API.writeHighlight
API.writeHighlight.response --> Browser.receiveResult
```

주석 목록 query와 삭제는 저장 POST와 다른 계약이다. 조회는 reader/drawer mount, 삭제는 개인 항목의 삭제 동작에서 시작한다.

```jobflow
scope: highlight_read
Object: Browser, API
Browser.openHighlights --> API.getHighlights
API.getHighlights.response --> Browser.showHighlights
```

```jobflow
scope: highlight_delete
Object: Browser, API
Browser.deleteHighlight --> API.deleteHighlight
API.deleteHighlight.response --> Browser.removeHighlight
```

| 노드 | 입력·출력·실패 계약 |
|---|---|
| Browser.saveHighlight | Readable에서 텍스트 선택 후 색상/댓글 저장. 실제 진입과 입력 가드는 §3에 연결한다. |
| API.writeHighlight | POST `/api/v1/highlights` PostHighlightSchema;200 row,400 schema/demo/권한. |
| Browser.receiveResult | 공개 API가 아닌 **응답 후 다음 동작 노드**다. usePostHighlight onSuccess:72 cacheupsert, percallReadableView:378 menu/id갱신; deleteonSuccess:113 filter |
| API.getHighlights | GET `/api/v1/links/:id/highlights`; current user/link rows,200 `{response:rows}`. 인증 필요. 현재 collection 접근을 다시 조회하지 않음. |
| API.deleteHighlight | DELETE `/api/v1/highlights/:id`;200 id,401 invalid id,400 demo. id/user predicate로 삭제; DB 오류는 전파. |
| Browser.openHighlights / showHighlights / deleteHighlight / removeHighlight | query 또는 클릭 시작, 응답 후 목록 표시/cache 제거. show/remove는 다음 동작 노드다. |

응답선은 해당 요청 결과를 받는 실행을 요약한다. API가 React callback을 직접 호출하거나 query/mutation 등록을 HTTP로 보낸다는 뜻이 아니다. transport/JSON 오류는 Browser에서 생길 수 있다.

## 3. 상위 노드 내부 추적

| 상위 노드 | 실제 진입·호출 근거 | 내부 Job Flow | 판정·중단 이유 |
|---|---|---|---|
| Browser.saveHighlight | `ReadableView.tsx:343` handleHighlightSelection→postHighlight.mutate:371; highlights router:48 | [Browser 내부](../browser.md#jf-9-highlight-선택-범위와-개인-주석--handlehighlightselection) | 펼침 — 입력/등록/HTTP/결과 수신을 구분 |
| API.writeHighlight | `pages/api/v1/highlights/index.ts:6` verify:10/schema:20→postOrUpdateHighlight:32; DELETE route:19 | [API 내부](../web-api.md#jf-12-개인-highlight--postorupdatehighlight--getlinkhighlights) | 펼침 — 권한/분기/Prisma·외부 호출을 추적 |
| Browser.receiveResult | usePostHighlight onSuccess:72 cacheupsert, percallReadableView:378 menu/id갱신; deleteonSuccess:113 filter | [응답 소비](../browser.md#jf-9-highlight-선택-범위와-개인-주석--handlehighlightselection) | 펼침 — 원 요청자 callback 또는 query 이후 render. 별도 서버 서비스 아님 |
| Browser.openHighlights / showHighlights | `packages/router/highlights.tsx:12/:27–44` | [Browser JF-9](../browser.md#jf-9-highlight-선택-범위와-개인-주석--handlehighlightselection) | 펼침 — 등록과 query 결과 |
| Browser.deleteHighlight / removeHighlight | `packages/router/highlights.tsx:90/:94–113` | [Browser JF-9](../browser.md#jf-9-highlight-선택-범위와-개인-주석--handlehighlightselection) | 펼침 — mutation/cache 제거 |
| API.getHighlights / API.deleteHighlight | `apps/web/pages/api/v1/links/[id]/highlights/index.ts:13`, `apps/web/pages/api/v1/highlights/[id].ts:19` | [API JF-12](../web-api.md#jf-12-개인-highlight--postorupdatehighlight--getlinkhighlights) | 펼침 — 서로 다른 조회/삭제 predicate |
| 라이브러리·DB engine | 상세의 실제 호출/manifest·lockfile | [패키지 구성](../package-configuration.md) | 외부 경계 — app의 query·adapter를 확인한 뒤 외부 구현에서 중단 |

## 4. 정상 단계와 부작용

1. browser가readable-view내선택범위를textoffset으로계산한다.
2. 서버는write시owner/canUpdate를확인하고동일user/link/start/end row를조회해update 또는create한다.
3. 조회는user/link,삭제는id/user조건이고현재collection권한재조회는없다.

## 5. 실패·취소·재시도

readonly회원은원문읽기가가능해도highlight쓰기권한은없다. 조회/삭제권한은write와다르고권한회수후자기주석조회가가능할수있다. find후create는동시upsert보장이없다.

## 6. 근거·확인 한계

이comment는선택범위annotation이다. Link별Unread/Reading/Finished나독립한줄reflection은현ASIS에없다.

코드상 동작과 실행 증거를 구분한다. 서비스·DB를 띄워 이 시나리오를 실행하지 않았다. 정적 검사나 대표 샘플 통과를 이 시나리오의 의미 승인으로 대체하지 않는다. 실제 소스 심볼·호출 줄과 내부 그림은 §3에서 찾을 수 있다.
