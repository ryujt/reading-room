# 개인 선택범위 주석 — AS-IS Navigation

> **DATE** 2026.10.25 · **기준** `952ac454` 소스 역추출. 실제 브라우저 관찰 전.
> [Job Flow](../jobflow/highlight.md) · [핵심 화면](../../system-design-as-is.md#7-화면)

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
