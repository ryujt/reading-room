# 컬렉션 공개·회원 권한 변경 — AS-IS Job Flow

> **DATE** 2026.10.25 · **기준** `952ac454` · 소스 역추출, 실제 HTTP/브라우저 실행 전.
> [핵심 흐름](../../system-design-as-is.md#5-흐름) · [Navigation](../navigation/share-collection.md) · [시스템 구성](../system-configuration.md)

## 1. 목적·트리거·완료

- 트리거: 컬렉션 owner가 Sharing dialog에서 공개/회원/역할을 바꾸고 Save
- 완료 사실: 공개 flag와root회원관계가 저장되고 dialog가 닫힌다. 선택하면 하위 회원관계도 순차 변경
- Browser는 사용자 입력·query/mutation을, API는 인증과 업무 판단·DB 호출을 소유한다. 원격 라이브러리 내부는 외부 경계다.

## 2. 경계 흐름과 계약

```jobflow
scope: share_collection
Object: Browser, API
Browser.saveSharing --> API.updateCollection
API.updateCollection.response --> Browser.receiveResult
```

| 노드 | 입력·출력·실패 계약 |
|---|---|
| Browser.saveSharing | 컬렉션 owner가 Sharing dialog에서 공개/회원/역할을 바꾸고 Save. 실제 진입과 입력 가드는 §3에 연결한다. |
| API.updateCollection | PUT `/api/v1/collections/:id`, UpdateCollectionSchema+propagateToSubcollections;200collection,400schema/demo,401owner아님,403parent조건. 사람lookup GET public/users/:id는draft보조계약. |
| Browser.receiveResult | 공개 API가 아닌 **응답 후 다음 동작 노드**다. useUpdateCollection onSuccess:160 rootcache교체, dialog percall onSettled:62 성공close/실패draft유지 |

응답선은 해당 요청 결과를 받는 실행을 요약한다. API가 React callback을 직접 호출하거나 query/mutation 등록을 HTTP로 보낸다는 뜻이 아니다. transport/JSON 오류는 Browser에서 생길 수 있다.

## 3. 상위 노드 내부 추적

| 상위 노드 | 실제 진입·호출 근거 | 내부 Job Flow | 판정·중단 이유 |
|---|---|---|---|
| Browser.saveSharing | `EditCollectionSharingModal.tsx:50` submit→useUpdateCollection.mutateAsync:59 | [Browser 내부](../browser.md#jf-6-공유-dialog의-draft와-저장--submit--addmembertocollection) | 펼침 — 입력/등록/HTTP/결과 수신을 구분 |
| API.updateCollection | `pages/api/v1/collections/[id].ts:28`→실제 updateCollection(`controllers/collections/collectionId/updateCollectionById.ts:8`) | [API 내부](../web-api.md#jf-8-공유-권한-변경과-하위-컬렉션-전파--updatecollection) | 펼침 — 권한/분기/Prisma·외부 호출을 추적 |
| Browser.receiveResult | useUpdateCollection onSuccess:160 rootcache교체, dialog percall onSettled:62 성공close/실패draft유지 | [응답 소비](../browser.md#jf-6-공유-dialog의-draft와-저장--submit--addmembertocollection) | 펼침 — 원 요청자 callback 또는 query 이후 render. 별도 서버 서비스 아님 |
| 라이브러리·DB engine | 상세의 실제 호출/manifest·lockfile | [패키지 구성](../package-configuration.md) | 외부 경계 — app의 query·adapter를 확인한 뒤 외부 구현에서 중단 |

## 4. 정상 단계와 부작용

1. username/email lookup과role변경은localdraft만바꾼다.
2. API는owner만허용하며uniqueMembers에서중복과owner를제거한다.
3. 선택적BFS하위membership교체뒤rootmembership교체와collectionupdate를실행하고rootlink의indexVersion을reset한다.

## 5. 실패·취소·재시도

transactioncallback안에서전역prisma를쓰므로전파전체가원자적이라고보장하지않는다. 실패시부분회원삭제가남을수있다. onSuccess는rootcache만교체하며모든하위cache동기화를보장하지않는다.

## 6. 근거·확인 한계

publicURL은localisPublic=true만으로표시되지만Save전실제서버공개상태는변하지않는다.

코드상 동작과 실행 증거를 구분한다. 서비스·DB를 띄워 이 시나리오를 실행하지 않았다. 정적 검사나 대표 샘플 통과를 이 시나리오의 의미 승인으로 대체하지 않는다. 실제 소스 심볼·호출 줄과 내부 그림은 §3에서 찾을 수 있다.
