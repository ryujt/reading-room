# Highlight drawer — TO-BE 유지 Layout

> **목표 기준** 2026.10.25 · **AS-IS 대비** 유지. [이번 기준선 원본](../../../as-is/details/layout/highlight-drawer.md)의 도표와 내부 계약을 목표에서도 유지한다. 아래 코드는 upstream 952ac454의 확인된 근거이며 목표 실행을 검증했다는 뜻이 아니다. [목표 핵심](../../system-design-to-be.md) C-05의 회귀 검증 대상이다.

> **DATE** 2026.10.25 · **기준** `952ac454` 소스 역추출. 브라우저 픽셀 관찰 전.
> **주소·식별자** `HighlightDrawer` overlay · **소유** Browser
> [핵심 화면 색인](../../system-design-to-be.md#7-화면--사용자는-어디를-오가나) · [Navigation](../navigation/highlight.md)


**크기 표기**: 도표의 가중치는 영역 관계를 읽기 위한 값이며 코드의 실제 폭이나 픽셀 비율이 아니다. 실제 flex/grid·고정 크기·반응형 조건은 아래 소스 근거를 따른다. 단, NewLink의 3:2와 1:1 열 관계처럼 명시한 grid 관계는 소스에서 확인한 사실이다.

```layout
Highlights V Heading, Separator, HighlightEntries
HighlightEntries V QuotedText, CommentConditional, Date
```

| 영역 | 입력·출력 | 상호작용·상태 | 근거 |
|---|---|---|---|
| Entries | currentuser/linkhighlight query | 색상border/quotedbackground,comment있을때본문,date | `components/HighlightDrawer.tsx:34–79` |
| Entry action | highlight.id | anchor #highlight-id, hoverdelete는preventDefault후mutation | :46/:81–88 |
| Empty | data없거나length0 | no_notes_highlights. loading/error도별도구분없이같은분기 | :96–98 |

Desktop는directionleft drawer, mobile은direction과무관하게bottom90%sheet (`Drawer.tsx:35–74`). reader본문옆별도pane이며닫기는overlay/swipe다. [highlight API](../jobflow/highlight.md)는조회권한과쓰기권한이같지않다.
