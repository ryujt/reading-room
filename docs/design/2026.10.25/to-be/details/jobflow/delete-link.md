# 링크 삭제 — TO-BE 유지 Job Flow

> **목표 기준** 2026.10.25 · **AS-IS 대비** 유지. [이번 기준선 원본](../../../as-is/details/jobflow/delete-link.md)의 도표와 내부 계약을 목표에서도 유지한다. 아래 코드는 upstream 952ac454의 확인된 근거이며 목표 실행을 검증했다는 뜻이 아니다. [목표 핵심](../../system-design-to-be.md) C-05의 회귀 검증 대상이다.

> **DATE** 2026.10.25 · **기준** `952ac454` · 소스 역추출, 실제 HTTP/브라우저 실행 전.
> [핵심 흐름](../../system-design-to-be.md#5-흐름--경계끼리-어떻게-소통하나) · [Navigation](../navigation/delete-link.md) · [시스템 구성](../system-configuration.md)

## 1. 목적·트리거·완료

- 트리거: Delete confirmation의 Delete 또는 권한있는 메뉴에서 Shift+Delete
- 완료 사실: DB link가 삭제되고 cache에서 제거된다. 파일 삭제 완료는200의 보장이 아님
- Browser는 사용자 입력·query/mutation을, API는 인증과 업무 판단·DB 호출을 소유한다. 원격 라이브러리 내부는 외부 경계다.

## 2. 경계 흐름과 계약

```jobflow
scope: delete_link
Object: Browser, API
Browser.deleteLink --> API.deleteLink
API.deleteLink.response --> Browser.receiveResult
```

| 노드 | 입력·출력·실패 계약 | AS-IS 대비 |
|---|---|---|
| Browser.deleteLink | Delete confirmation의 Delete 또는 권한있는 메뉴에서 Shift+Delete. 실제 진입과 입력 가드는 §3에 연결한다. | 유지 |
| API.deleteLink | DELETE `/api/v1/links/:id`;200삭제된link,401invalid/접근불가,400demo,DB/Meili예외는handler가JSON형태보장안함. | 유지 |
| Browser.receiveResult | 공개 API가 아닌 **응답 후 다음 동작 노드**다. useDeleteLink onMutate:752/onError:784/onSuccess:803; confirmation은미awaitclose | 유지 |

응답선은 해당 요청 결과를 받는 실행을 요약한다. API가 React callback을 직접 호출하거나 query/mutation 등록을 HTTP로 보낸다는 뜻이 아니다. transport/JSON 오류는 Browser에서 생길 수 있다.

## 3. 상위 노드 내부 추적

| 상위 노드 | 실제 진입·호출 근거 | 내부 Job Flow | 판정·중단 이유 |
|---|---|---|---|
| Browser.deleteLink | `DeleteLinkModal.tsx:28` submit 또는 `LinkModal.tsx:50` handleDelete | [Browser 내부](../../../as-is/details/browser.md#jf-5-상세-query와-편집삭제-mutation--usegetlink--useupdatelink--usedeletelink) | 펼침 — 입력/등록/HTTP/결과 수신을 구분 |
| API.deleteLink | `pages/api/v1/links/[id]/index.ts:39`→실제 deleteLink(`controllers/links/linkId/deleteLinkById.ts:7`) | [API 내부](../../../as-is/details/web-api.md#jf-7-개인-링크-상세수정삭제--getlinkbyid--updatelinkbyid--deletelink) | 펼침 — 권한/분기/Prisma·외부 호출을 추적 |
| Browser.receiveResult | useDeleteLink onMutate:752/onError:784/onSuccess:803; confirmation은미awaitclose | [응답 소비](../../../as-is/details/browser.md#jf-5-상세-query와-편집삭제-mutation--usegetlink--useupdatelink--usedeletelink) | 펼침 — 원 요청자 callback 또는 query 이후 render. 별도 서버 서비스 아님 |
| 라이브러리·DB engine | 상세의 실제 호출/manifest·lockfile | [패키지 구성](../package-configuration.md) | 외부 경계 — app의 query·adapter를 확인한 뒤 외부 구현에서 중단 |

## 4. 정상 단계와 부작용

1. frontend는낙관적으로목록에서제거하고API를요청한다.
2. caller가owner/canDelete를판단한뒤prisma.link.delete를await한다.
3. removeFiles는미await,선택적Meili deleteDocument는await한뒤200이다.

## 5. 실패·취소·재시도

파일/검색삭제실패로DB삭제를되돌리지않는다. UI는close후오류toast/rollback으로삭제된항목을잠시되보일수있다. confirmation취소는요청을시작하지않는다.

## 6. 근거·확인 한계

[Adapter JF-4](../../../as-is/details/adapters.md#jf-4-파일-조회존재삭제이동--readfile--fileexists--removefiles--movefiles)는localunlinkcallback수명까지구분한다.

코드상 동작과 실행 증거를 구분한다. 서비스·DB를 띄워 이 시나리오를 실행하지 않았다. 정적 검사나 대표 샘플 통과를 이 시나리오의 의미 승인으로 대체하지 않는다. 실제 소스 심볼·호출 줄과 내부 그림은 §3에서 찾을 수 있다.
