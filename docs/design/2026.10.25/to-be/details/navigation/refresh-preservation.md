# 보존 재생성 확인 — TO-BE 유지 Navigation

> **목표 기준** 2026.10.25 · **AS-IS 대비** 유지. [이번 기준선 원본](../../../as-is/details/navigation/refresh-preservation.md)의 도표와 내부 계약을 목표에서도 유지한다. 아래 코드는 upstream 952ac454의 확인된 근거이며 목표 실행을 검증했다는 뜻이 아니다. [목표 핵심](../../system-design-to-be.md) C-05의 회귀 검증 대상이다.

> **DATE** 2026.10.25 · **기준** `952ac454` 소스 역추출. 실제 브라우저 관찰 전.
> [Job Flow](../jobflow/refresh-preservation.md) · [핵심 화면](../../system-design-to-be.md#7-화면--사용자는-어디를-오가나)

진입: 권한 있는 사용자가 상세의 refresh를 선택한다. 첫 그림은 목록 위 LinkDrawer에서 시작한 경우다.

```navigation
LinkDrawer --> RefreshConfirm : 보존 갱신
RefreshConfirm --> (/refresh_archive) : Confirm
(/refresh_archive) --> LinksPage : 요청 처리 후 확인창 닫기
RefreshConfirm --> LinksPage : Cancel
```

Preserved에서 시작한 경우는 아래 별도 경로이며 목록으로 이동하지 않는다.

```navigation
Preserved --> ViewerRefreshConfirm : 보존 메뉴의 갱신
ViewerRefreshConfirm --> (/viewer_refresh_archive) : Confirm
(/viewer_refresh_archive) --> Preserved : 요청 처리 후 확인창 닫기
ViewerRefreshConfirm --> Preserved : Cancel
```

| 화면·판단 | 주소·소유·Layout | 실제 근거·계약 |
|---|---|---|
| LinkDrawer/Preserved | [Drawer](../layout/link-drawer.md), [Viewer](../layout/preserved.md) | LinkActions updateArchive |
| RefreshConfirm/ViewerRefreshConfirm | [Layout](../layout/refresh-preservation.md) | ConfirmationModal:40–43 |
| LinksPage | [Layout](../layout/links.md) | 실제닫힘후부모route. Preserved에서열었다면그route를유지 |
| refresh_archive/viewer_refresh_archive | PUT archive reset | [API JF-10](../../../as-is/details/web-api.md#jf-10-보존-갱신-요청--links) |

그림의 LinksPage는 목록에서 시작한 경우의 부모다. Preserved에서 시작하면 확인창만 닫혀 Preserved를 유지한다. updateArchive가 오류를 catch하므로 성공/오류 모두 close에 도달할 수 있다. pending보존상태갱신은poll에의한같은화면표시이며이동이아니다.
