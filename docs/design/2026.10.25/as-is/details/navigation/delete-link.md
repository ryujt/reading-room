# 삭제 확인 — AS-IS Navigation

> **DATE** 2026.10.25 · **기준** `952ac454` 소스 역추출. 실제 브라우저 관찰 전.
> [Job Flow](../jobflow/delete-link.md) · [핵심 화면](../../system-design-as-is.md#7-화면)

진입: 개인 링크의 삭제 메뉴를 선택한다. Shift는 확인 창을 우회하는 별도 동작이다. 첫 그림은 목록 위 drawer에서 시작한 경우다.

```navigation
LinkDrawer --> DeleteConfirm : 삭제 메뉴
DeleteConfirm --> LinksPage : 확인 후 즉시 닫기
DeleteConfirm --> LinksPage : 닫기 취소
LinkDrawer --> LinksPage : Shift 삭제 후 닫기
```

직접 상세/보존 route에서 열면 확인 시 Dashboard로 이동하고 취소 시 그 route를 유지한다. CurrentDetail은 실제 `/links/:id` 또는 `/preserved/:id`이고 별도 새 화면이 아니다.

```navigation
CurrentDetail --> DetailDeleteConfirm : 삭제 메뉴
DetailDeleteConfirm --> Dashboard : 확인 후 즉시 이동
DetailDeleteConfirm --> CurrentDetail : 취소
```

| 화면·판단 | 주소·소유·Layout | 실제 근거·계약 |
|---|---|---|
| LinkDrawer | [Layout](../layout/link-drawer.md) | handleDelete:50–60 |
| DeleteConfirm/DetailDeleteConfirm | [Layout](../layout/delete-link.md) | submit:28–37 |
| CurrentDetail | [상세](../layout/link-detail.md), [Viewer](../layout/preserved.md) | DeleteLinkModal의 route 조건:31–35 |
| LinksPage/Dashboard | [Links](../layout/links.md), [Dashboard](../layout/dashboard.md) | route조건:31–35 |

DeleteConfirm은 mutateAsync를 await하지 않는다.200을 받은 뒤 돌아오는 이동이라고 그리면 틀리다. 오류는 닫힌 화면의 toast/rollback이며 삭제 확인창을 다시 열지 않는다. 목록 카드의 Shift handler는 await하지만 LinkModal의 Shift handler는 미await라는 차이가 있다.
