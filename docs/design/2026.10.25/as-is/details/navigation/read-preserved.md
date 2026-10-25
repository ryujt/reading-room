# 보존물 보기 — AS-IS Navigation

> **DATE** 2026.10.25 · **기준** `952ac454` 소스 역추출. 실제 브라우저 관찰 전.
> [Job Flow](../jobflow/read-preserved.md) · [핵심 화면](../../system-design-as-is.md#7-화면)

진입: 상세 형식row의 새 탭 또는 preserved URL 직접 진입.

```navigation
LinkDetail --> Preserved : 사용가능 형식 새 탭
Preserved --> HighlightDrawer : Readable 주석 버튼
HighlightDrawer --> Preserved : 닫기
Preserved --> TextStyle : Readable 글꼴 버튼
TextStyle --> Preserved : 바깥 클릭
Preserved --> LinkDrawer : 링크 정보
LinkDrawer --> Preserved : 닫기
Preserved --> Dashboard : Navbar Back
```

| 화면·판단 | 주소·소유·Layout | 실제 근거·계약 |
|---|---|---|
| LinkDetail/LinkDrawer | [Detail](../layout/link-detail.md), [Drawer](../layout/link-drawer.md) | PreserverdFormatRow target=_blank |
| Preserved | `/preserved/:id` 또는 `/public/preserved/:id`, [Layout](../layout/preserved.md) | PageContent/Content |
| HighlightDrawer/TextStyle | [Highlights](../layout/highlight-drawer.md), [TextStyle](../layout/text-style.md) | Navbar:122–141 |
| Dashboard | [Layout](../layout/dashboard.md) | Navbar의고정href:118 |

format변경은query를shallowpush하지만같은viewer의본문만바꾸므로형식마다새페이지이동노드를만들지않았다. 파일/서명token오류는해당본문표시나로딩상태에남고새오류route가없다. Back은이전collection이나상세주소를기억하지않고dashboard로간다. publicviewer에서도같은Back이므로익명사용자는그뒤login으로가드될수있다.
