# 링크 상세 조회 — AS-IS Job Flow

> **DATE** 2026.10.25 · **기준** `952ac454` · 소스 역추출, 실제 HTTP/브라우저 실행 전.
> [핵심 흐름](../../system-design-as-is.md#5-흐름) · [Navigation](../navigation/inspect-link.md) · [시스템 구성](../system-configuration.md)

## 1. 목적·트리거·완료

- 트리거: 카드의 info를 누르거나 `/links/[id]` 직접 진입
- 완료 사실: 허용된 link의 제목·공유 description/tags·보존 형식이 상세 page/drawer에 표시
- Browser는 사용자 입력·query/mutation을, API는 인증과 업무 판단·DB 호출을 소유한다. 원격 라이브러리 내부는 외부 경계다.

## 2. 경계 흐름과 계약

```jobflow
scope: inspect_link
Object: Browser, API
Browser.openLink --> API.getLink
API.getLink.response --> Browser.receiveResult
```

| 노드 | 입력·출력·실패 계약 |
|---|---|
| Browser.openLink | 카드의 info를 누르거나 `/links/[id]` 직접 진입. 실제 진입과 입력 가드는 §3에 연결한다. |
| API.getLink | GET `/api/v1/links/:id`;200 `{response:link}`,401 invalidid/접근불가,인증실패 별도. |
| Browser.receiveResult | 공개 API가 아닌 **응답 후 다음 동작 노드**다. useGetLink queryFn:849의payload/캐시반영후 LinkDetails render; pages/links/[id]:21 |

응답선은 해당 요청 결과를 받는 실행을 요약한다. API가 React callback을 직접 호출하거나 query/mutation 등록을 HTTP로 보낸다는 뜻이 아니다. transport/JSON 오류는 Browser에서 생길 수 있다.

## 3. 상위 노드 내부 추적

| 상위 노드 | 실제 진입·호출 근거 | 내부 Job Flow | 판정·중단 이유 |
|---|---|---|---|
| Browser.openLink | `pages/links/[id].tsx:12` useGetLink, `LinkActions.tsx:170` LinkModal | [Browser 내부](../browser.md#jf-5-상세-query와-편집삭제-mutation--usegetlink--useupdatelink--usedeletelink) | 펼침 — 입력/등록/HTTP/결과 수신을 구분 |
| API.getLink | `pages/api/v1/links/[id]/index.ts:12`→getLinkById(`controllers/links/linkId/getLinkById.ts:5`) | [API 내부](../web-api.md#jf-7-개인-링크-상세수정삭제--getlinkbyid--updatelinkbyid--deletelink) | 펼침 — 권한/분기/Prisma·외부 호출을 추적 |
| Browser.receiveResult | useGetLink queryFn:849의payload/캐시반영후 LinkDetails render; pages/links/[id]:21 | [응답 소비](../browser.md#jf-5-상세-query와-편집삭제-mutation--usegetlink--useupdatelink--usedeletelink) | 펼침 — 원 요청자 callback 또는 query 이후 render. 별도 서버 서비스 아님 |
| 라이브러리·DB engine | 상세의 실제 호출/manifest·lockfile | [패키지 구성](../package-configuration.md) | 외부 경계 — app의 query·adapter를 확인한 뒤 외부 구현에서 중단 |

## 4. 정상 단계와 부작용

1. 상세 query는private/public경로를구분하고현재id key로등록한다.
2. private controller는getPermission의collection결과를받고owner 또는member를직접판단한다.
3. link와tags/collection/current-user pinnedBy를반환하고clientcache를동기화한다.

## 5. 실패·취소·재시도

getPermission(linkId)은조회자체만하므로caller의owner/member판단이필수다. query오류시standalone은별도error화면없이skeleton조건에남을수있다. drawer닫기는localstate만바꾸며요청취소를보장하지않는다.

## 6. 근거·확인 한계

개인읽기상태/감상은없다. Highlight는별도선택범위주석이며shared Link.description과도다르다.

코드상 동작과 실행 증거를 구분한다. 서비스·DB를 띄워 이 시나리오를 실행하지 않았다. 정적 검사나 대표 샘플 통과를 이 시나리오의 의미 승인으로 대체하지 않는다. 실제 소스 심볼·호출 줄과 내부 그림은 §3에서 찾을 수 있다.
