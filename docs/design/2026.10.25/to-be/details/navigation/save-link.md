# 링크 저장 — TO-BE 유지 Navigation

> **목표 기준** 2026.10.25 · **AS-IS 대비** 유지. [이번 기준선 원본](../../../as-is/details/navigation/save-link.md)의 도표와 내부 계약을 목표에서도 유지한다. 아래 코드는 upstream 952ac454의 확인된 근거이며 목표 실행을 검증했다는 뜻이 아니다. [목표 핵심](../../system-design-to-be.md) C-05의 회귀 검증 대상이다.

트리거는 이미 인증된 사용자가 `/links`의 Sidebar New link를 누르는 것이다. 직접 `/links` 진입의 인증 가드는 이번 저장 샘플 밖이며 전체 인증 시나리오에서 확장한다. 보존 상태의 갱신은 화면 이동이 아니다.

```navigation
LinksPage --> NewLinkModal : New link 클릭
NewLinkModal --> (validate_link) : Create 클릭
(validate_link) --> NewLinkModal : schema 오류
(validate_link) --> (start_mutation) : schema 성공
(start_mutation) --> LinksPage : 요청 시작 후 즉시 창 닫기
NewLinkModal --> LinksPage : 닫기 또는 바깥 영역 클릭
```

| 화면·처리 | 주소·소유 | Layout·근거 |
|---|---|---|
| LinksPage | `/links`, Browser | [목록 Layout](../layout/links.md), `apps/web/pages/links/index.tsx:14` |
| NewLinkModal | route 없는 Sidebar overlay | [추가 창 Layout](../layout/new-link.md), `Sidebar.tsx:362–363` |
| validate_link | submit의 PostLinkSchema.safeParse | `NewLinkModal.tsx:89–96` |
| start_mutation | addLink.mutateAsync 다음 onClose | `NewLinkModal.tsx:98–99`, [내부 JF-1](../../../as-is/details/browser.md#jf-1-추가-창-제출--newlinkmodalsubmit) |

POST 성공을 기다려 LinksPage로 이동하는 화살표는 없다. 창은 이미 닫혔고 success는 cache를 교체하며 error는 toast/rollback한다. schema 오류만 창을 유지한다. 모바일은 drawer close animation 종료 뒤 부모 toggle을 호출한다(`Modal.tsx:41–42`). desktop close와 backdrop은 toggle을 직접 호출한다(:70/:83).

새로고침은 로컬 draft를 보존하지 않는다. 제출 후 HTTP 요청을 중단하는 AbortSignal은 없다. [JobFlow](../jobflow/save-link.md)의 API/상태 계약과 함께 읽는다. 실제 브라우저 확인 전인 소스상 동작이다.
