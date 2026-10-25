# 개인 선택범위 주석 — TO-BE 유지 Navigation

> **목표 기준** 2026.10.25 · **AS-IS 대비** 유지. [이번 기준선 원본](../../../as-is/details/navigation/highlight.md)의 도표와 내부 계약을 목표에서도 유지한다. 아래 코드는 upstream 952ac454의 확인된 근거이며 목표 실행을 검증했다는 뜻이 아니다. [목표 핵심](../../system-design-to-be.md) C-05의 회귀 검증 대상이다.

> **DATE** 2026.10.25 · **기준** `952ac454` 소스 역추출. 실제 브라우저 관찰 전.
> [Job Flow](../jobflow/highlight.md) · [핵심 화면](../../system-design-to-be.md#7-화면--사용자는-어디를-오가나)

진입: Readable 본문에서 텍스트를 선택하거나 기존 highlight를 누른다.

```navigation
Preserved --> SelectionEditor : 텍스트 선택
SelectionEditor --> CommentEditor : 댓글 버튼
CommentEditor --> SelectionEditor : 취소 또는 저장
SelectionEditor --> Preserved : 바깥 클릭
Preserved --> HighlightDrawer : 주석 목록
HighlightDrawer --> Preserved : 닫기 또는 주석 위치 이동
```

| 화면·판단 | 주소·소유·Layout | 실제 근거·계약 |
|---|---|---|
| Preserved | [Layout](../layout/preserved.md) | ReadableView.handleMouseUp:93 |
| SelectionEditor/CommentEditor | [Layout](../layout/highlight-editor.md) | ReadableView:478–594 |
| HighlightDrawer | [Layout](../layout/highlight-drawer.md) | anchor#highlight-id,deletehandler |

색상저장/삭제cache갱신은화면이동이아니므로API노드를연결하지않았다. comment편집은주요popover모드로만표현한다. 오류로별도route에가지않고원래본문/메뉴에남는다. Back/새로고침은local선택범위를버린다. 현재collection권한과개인주석query권한차이는JobFlow원본을참조한다.
