# 보존물 보기 — TO-BE 변경 Navigation

> **목표 기준** 2026.10.25 · **AS-IS 대비** 변경. 원본 viewer와 파일 계약은 유지하고 return hint만 추가한다. [이번 기준선 원본](../../../as-is/details/navigation/read-preserved.md)의 도표와 내부 계약을 목표에서도 유지한다. 아래 코드는 upstream 952ac454의 확인된 근거이며 목표 실행을 검증했다는 뜻이 아니다. [목표 핵심](../../system-design-to-be.md) C-05의 회귀 검증 대상이다.

> **DATE** 2026.10.25 · **기준** `952ac454` 소스 역추출. 실제 브라우저 관찰 전.
> [Job Flow](../jobflow/read-preserved.md) · [핵심 화면](../../system-design-to-be.md#7-화면--사용자는-어디를-오가나)

진입: 상세 형식row의 새 탭 또는 preserved URL 직접 진입.

```navigation
LinkDetail --> Preserved : 사용가능 형식 새 탭
ReadingDetail --> (reading_dirty_check) : 사용가능 형식 현재탭
(reading_dirty_check) --> Preserved : clean
(reading_dirty_check) --> DraftGuard : dirty
DraftGuard --> Preserved : 저장 성공 또는 명시적 버리기
DraftGuard --> ReadingDetail : 계속 편집
Preserved --> HighlightDrawer : Readable 주석 버튼
HighlightDrawer --> Preserved : 닫기
Preserved --> TextStyle : Readable 글꼴 버튼
TextStyle --> Preserved : 바깥 클릭
Preserved --> LinkDrawer : 링크 정보
LinkDrawer --> Preserved : 닫기
Preserved --> (return_hint) : Navbar Back
(return_hint) --> ReadingDetail : 유효한 hint와 link id
(return_hint) --> ReadingLibrary : 유효한 hint에 link 없음
(return_hint) --> Dashboard : hint 없음 또는 invalid
```

| 화면·판단 | 주소·소유·Layout | 실제 근거·계약 |
|---|---|---|
| LinkDetail/LinkDrawer | [Detail](../layout/link-detail.md), [Drawer](../layout/link-drawer.md) | PreserverdFormatRow target=_blank |
| Preserved | `/preserved/:id` 또는 `/public/preserved/:id`, [Layout](../layout/preserved.md) | PageContent/Content |
| HighlightDrawer/TextStyle | [Highlights](../layout/highlight-drawer.md), [TextStyle](../layout/text-style.md) | Navbar:122–141 |
| Dashboard | [Layout](../layout/dashboard.md) | 기존 Navbar href:118의 fallback 유지, C-06 allowlist 분기 추가 |
| ReadingDetail/ReadingLibrary | [Detail](../layout/reading-detail.md), [Library](../layout/reading-library.md) | C-06 제안, 유효한 return hint를 link 유무로 구분 |
| DraftGuard/reading_dirty_check | [Guard](../layout/draft-guard.md), [이탈 Navigation](leave-draft.md) | C-04 제안. save 실패는 Guard 유지, 상세 분기는 이탈 문서가 원본 |

format변경은query를shallowpush하지만같은viewer의본문만바꾸므로형식마다새페이지이동노드를만들지않았다. 파일/서명token오류는해당본문표시나로딩상태에남고새오류route가없다. Back은 유효한 Reading Room return hint를 보존하고, 그 외 기존 진입은 dashboard로 간다. publicviewer에서도같은Back이므로익명사용자는그뒤login으로가드될수있다.


## 목표 복귀 계약

C-06 제안: Reading Room의 사용 가능한 format action은 clean 또는 Guard 승인 뒤 현재 탭에서 원본 viewer를 열며 허용된 `/reading-room?link=id` return hint를 전달한다. 형식 변경에도 hint를 보존한다. [Browser JF-5](../browser.md#jf-5-원본-viewer-왕복--safereadingreturnto)의 allowlist를 통과하지 못하면 기존 Dashboard로 돌아간다. [ReadingDetail Layout](../layout/reading-detail.md)과 [개인 탐색 Navigation](../navigation/reading-library.md)을 참조한다. 원본 archive/token HTTP와 HTML sandbox는 변경하지 않는다.
