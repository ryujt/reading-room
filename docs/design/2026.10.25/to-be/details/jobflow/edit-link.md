# 링크 편집 — TO-BE 유지 Job Flow

> **목표 기준** 2026.10.25 · **AS-IS 대비** 유지. [이번 기준선 원본](../../../as-is/details/jobflow/edit-link.md)의 도표와 내부 계약을 목표에서도 유지한다. 아래 코드는 upstream 952ac454의 확인된 근거이며 목표 실행을 검증했다는 뜻이 아니다. [목표 핵심](../../system-design-to-be.md) C-05의 회귀 검증 대상이다.

> **DATE** 2026.10.25 · **기준** `952ac454` · 소스 역추출, 실제 HTTP/브라우저 실행 전.
> [핵심 흐름](../../system-design-to-be.md#5-흐름--경계끼리-어떻게-소통하나) · [Navigation](../navigation/edit-link.md) · [시스템 구성](../system-configuration.md)

## 1. 목적·트리거·완료

- 트리거: 권한있는사용자가 LinkDrawer Edit에서 필드를 바꾸고 Save
- 완료 사실: DB link metadata가 갱신되고 query가 무효화된다. UI는 요청 완료 전에 view로 전환
- Browser는 사용자 입력·query/mutation을, API는 인증과 업무 판단·DB 호출을 소유한다. 원격 라이브러리 내부는 외부 경계다.

## 2. 경계 흐름과 계약

```jobflow
scope: edit_link
Object: Browser, API
Browser.editLink --> API.updateLink
API.updateLink.response --> Browser.receiveResult
```

| 노드 | 입력·출력·실패 계약 | AS-IS 대비 |
|---|---|---|
| Browser.editLink | 권한있는사용자가 LinkDrawer Edit에서 필드를 바꾸고 Save. 실제 진입과 입력 가드는 §3에 연결한다. | 유지 |
| API.updateLink | PUT `/api/v1/links/:id`, UpdateLinkSchema 본문;200link,400schema/demo,401권한/대상collection/URL. member pin shortcut은별도조기반환. | 유지 |
| Browser.receiveResult | 공개 API가 아닌 **응답 후 다음 동작 노드**다. useUpdateLink onError:683 rollback/onSuccess:708 invalidation; submit은이미view전환 | 유지 |

응답선은 해당 요청 결과를 받는 실행을 요약한다. API가 React callback을 직접 호출하거나 query/mutation 등록을 HTTP로 보낸다는 뜻이 아니다. transport/JSON 오류는 Browser에서 생길 수 있다.

## 3. 상위 노드 내부 추적

| 상위 노드 | 실제 진입·호출 근거 | 내부 Job Flow | 판정·중단 이유 |
|---|---|---|---|
| Browser.editLink | `components/LinkDetails.tsx:112` submit→mutateAsync:122→setMode:124 | [Browser 내부](../../../as-is/details/browser.md#jf-5-상세-query와-편집삭제-mutation--usegetlink--useupdatelink--usedeletelink) | 펼침 — 입력/등록/HTTP/결과 수신을 구분 |
| API.updateLink | `pages/api/v1/links/[id]/index.ts:23`→updateLinkById(`controllers/links/linkId/updateLinkById.ts:11`) | [API 내부](../../../as-is/details/web-api.md#jf-7-개인-링크-상세수정삭제--getlinkbyid--updatelinkbyid--deletelink) | 펼침 — 권한/분기/Prisma·외부 호출을 추적 |
| Browser.receiveResult | useUpdateLink onError:683 rollback/onSuccess:708 invalidation; submit은이미view전환 | [응답 소비](../../../as-is/details/browser.md#jf-5-상세-query와-편집삭제-mutation--usegetlink--useupdatelink--usedeletelink) | 펼침 — 원 요청자 callback 또는 query 이후 render. 별도 서버 서비스 아님 |
| 라이브러리·DB engine | 상세의 실제 호출/manifest·lockfile | [패키지 구성](../package-configuration.md) | 외부 경계 — app의 query·adapter를 확인한 뒤 외부 구현에서 중단 |

## 4. 정상 단계와 부작용

1. localdraft가바뀐경우mutation을시작한다. onMutate가querysnapshot과낙관적patch를만든다.
2. API는schema·현재권한·targetcollection·move제약을판단한다. URL변경시old파일을먼저지우고DBformats를null로reset한다.
3. DB수정후collection변경이면파일이동을시작하고200을반환한다.

## 5. 실패·취소·재시도

실패시cache rollback은있지만편집mode/draft복원가드는없다. URL파일삭제와DB수정/파일이동은원자적이지않다. activeLink가바뀌면effect:62가draft를덮는다.

## 6. 근거·확인 한계

IconPicker close도같은submit을호출한다. 배너업로드·파일생성은독립파일관리업무로제외하며UI진입은Layout에기록한다.

코드상 동작과 실행 증거를 구분한다. 서비스·DB를 띄워 이 시나리오를 실행하지 않았다. 정적 검사나 대표 샘플 통과를 이 시나리오의 의미 승인으로 대체하지 않는다. 실제 소스 심볼·호출 줄과 내부 그림은 §3에서 찾을 수 있다.
