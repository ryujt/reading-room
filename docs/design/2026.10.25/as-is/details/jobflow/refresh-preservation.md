# 보존 다시 생성 요청 — AS-IS Job Flow

> **DATE** 2026.10.25 · **기준** `952ac454` · 소스 역추출, 실제 HTTP/브라우저 실행 전.
> [핵심 흐름](../../system-design-as-is.md#5-흐름) · [Navigation](../navigation/refresh-preservation.md) · [시스템 구성](../system-configuration.md)

## 1. 목적·트리거·완료

- 트리거: LinkDrawer/Preserved 메뉴에서 Refresh 확인
- 완료 사실: format/lastPreserved가 null로 reset되어 worker poll 대상이 된다; 아직 파일 재생성 완료가 아님
- Browser는 사용자 입력·query/mutation을, API는 인증과 업무 판단·DB 호출을 소유한다. 원격 라이브러리 내부는 외부 경계다.

## 2. 경계 흐름과 계약

```jobflow
scope: refresh_preservation
Object: Browser, API
Browser.refreshArchive --> API.refreshArchive
API.refreshArchive.response --> Browser.receiveResult
```

| 노드 | 입력·출력·실패 계약 |
|---|---|
| Browser.refreshArchive | LinkDrawer/Preserved 메뉴에서 Refresh 확인. 실제 진입과 입력 가드는 §3에 연결한다. |
| API.refreshArchive | PUT `/api/v1/links/:id/archive`;200being archived 또는200Invalid URL;404link없음,401권한,400demo. |
| Browser.receiveResult | 공개 API가 아닌 **응답 후 다음 동작 노드**다. useUpdateArchive onSuccess:1164 invalidate, LinkActions toast:61/error:63, ConfirmationModalclose:42 |

응답선은 해당 요청 결과를 받는 실행을 요약한다. API가 React callback을 직접 호출하거나 query/mutation 등록을 HTTP로 보낸다는 뜻이 아니다. transport/JSON 오류는 Browser에서 생길 수 있다.

## 3. 상위 노드 내부 추적

| 상위 노드 | 실제 진입·호출 근거 | 내부 Job Flow | 판정·중단 이유 |
|---|---|---|---|
| Browser.refreshArchive | `LinkActions.tsx:56` updateArchive→useUpdateArchive.mutateAsync:60 | [Browser 내부](../browser.md#jf-8-보존물-로딩과-refresh--fetchlinkcontent--loadmonolith--updatearchive) | 펼침 — 입력/등록/HTTP/결과 수신을 구분 |
| API.refreshArchive | `pages/api/v1/links/[id]/archive/index.ts:9` links→update:51/removeFiles:67 | [API 내부](../web-api.md#jf-10-보존-갱신-요청--links) | 펼침 — 권한/분기/Prisma·외부 호출을 추적 |
| Browser.receiveResult | useUpdateArchive onSuccess:1164 invalidate, LinkActions toast:61/error:63, ConfirmationModalclose:42 | [응답 소비](../browser.md#jf-8-보존물-로딩과-refresh--fetchlinkcontent--loadmonolith--updatearchive) | 펼침 — 원 요청자 callback 또는 query 이후 render. 별도 서버 서비스 아님 |
| 라이브러리·DB engine | 상세의 실제 호출/manifest·lockfile | [패키지 구성](../package-configuration.md) | 외부 경계 — app의 query·adapter를 확인한 뒤 외부 구현에서 중단 |

## 4. 정상 단계와 부작용

1. API는현재link를찾고owner/canUpdate를확인한다.
2. validURL이면formats/lastPreserved/indexVersion을null로reset하고removeFiles를호출한다.
3. 응답후worker의별도poll이발견하고목록pendingpoll이상태를재조회한다.

## 5. 실패·취소·재시도

invalidURL은200이어서UIsuccess로처리될수있다. 파일제거와worker새파일쓰기에전체transaction/claim이없다. 확인창은updateArchive가실패를catch한뒤에도닫힌다.

## 6. 근거·확인 한계

[worker보존](preserve-link.md)과연결되는것은DBmarker다. 직접HTTP→worker호출은없다.

코드상 동작과 실행 증거를 구분한다. 서비스·DB를 띄워 이 시나리오를 실행하지 않았다. 정적 검사나 대표 샘플 통과를 이 시나리오의 의미 승인으로 대체하지 않는다. 실제 소스 심볼·호출 줄과 내부 그림은 §3에서 찾을 수 있다.
