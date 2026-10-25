# Highlight selection editor — AS-IS Layout

> **DATE** 2026.10.25 · **기준** `952ac454` 소스 역추출. 브라우저 픽셀 관찰 전.
> **주소·식별자** `ReadableView` selection popover · **소유** Browser
> [핵심 화면 색인](../../system-design-as-is.md#7-화면) · [Navigation](../navigation/highlight.md)


**크기 표기**: 도표의 가중치는 영역 관계를 읽기 위한 값이며 코드의 실제 폭이나 픽셀 비율이 아니다. 실제 flex/grid·고정 크기·반응형 조건은 아래 소스 근거를 따른다. 단, NewLink의 3:2와 1:1 열 관계처럼 명시한 grid 관계는 소스에서 확인한 사실이다.

```layout
SelectionMenu > ColorChoices : 60, CommentAction : 20, DeleteConditional : 20
```

```layout
CommentEditor V CommentTextarea, CommentActions
CommentActions > CancelComment : 50, SaveComment : 50
```

| 영역 | 입력·출력 | 상호작용·상태 | 근거 |
|---|---|---|---|
| SelectionMenu | selectionInfo/menuPosition |4색선택→handleHighlightSelection,comment모드로전환,기존id면delete | `Preservation/ReadableView.tsx:537–590` |
| CommentEditor | selectionInfo.comment | textarea변경,취소/저장. 별도route없음 | :489–533 |
| Position/close | mouseupselectionrect | readablecontainer상대좌표,ClickAway→menuclose/reset, 모바일별도tree없음 | :93–145/:399–413/:478 |

owner/canUpdate와private조건에맞는본문선택에쓰기메뉴를표시한다. 메뉴저장오류전용inline표시는없고mutationerror처리는hook계약이다. [Browser JF-9](../browser.md#jf-9-highlight-선택-범위와-개인-주석--handlehighlightselection). 이comment는선택범위에붙으며link별reflection은아니다.
