# 상세 열기 — TO-BE 유지 Navigation

> **목표 기준** 2026.10.25 · **AS-IS 대비** 유지. [이번 기준선 원본](../../../as-is/details/navigation/inspect-link.md)의 도표와 내부 계약을 목표에서도 유지한다. 아래 코드는 upstream 952ac454의 확인된 근거이며 목표 실행을 검증했다는 뜻이 아니다. [목표 핵심](../../system-design-to-be.md) C-05의 회귀 검증 대상이다.

> **DATE** 2026.10.25 · **기준** `952ac454` 소스 역추출. 실제 브라우저 관찰 전.
> [Job Flow](../jobflow/inspect-link.md) · [핵심 화면](../../system-design-to-be.md#7-화면--사용자는-어디를-오가나)

진입: 목록에서 info를 선택하거나 `/links/:id` 또는 `/public/links/:id`를 직접 연다.

```navigation
LinksPage --> LinkDrawer : 상세 클릭
LinkDrawer --> LinksPage : 닫기
LinkDrawer --> LinkEdit : 편집 탭
LinkDrawer --> Preserved : 형식의 새 탭 열기
LinkDetail --> Preserved : 형식의 새 탭 열기
LinkDetail --> CollectionLinks : 컬렉션 링크
LinkDrawer --> DeleteConfirm : 삭제 메뉴
```

| 화면·판단 | 주소·소유·Layout | 실제 근거·계약 |
|---|---|---|
| LinksPage/CollectionLinks | [Links](../layout/links.md) | collection href는 public여부에 따라 분기 |
| LinkDrawer/LinkEdit | [Drawer](../layout/link-drawer.md) | LinkModal:48/:76–92 |
| LinkDetail | `/links/:id`, `/public/links/:id`, [Layout](../layout/link-detail.md) | useGetLink private/public선택 |
| Preserved | [Layout](../layout/preserved.md) | `PreserverdFormatRow.tsx:93–98` target=_blank |
| DeleteConfirm | [Layout](../layout/delete-link.md) | LinkModal.handleDelete:50 |

Standalone 상세의 query 실패는 별도 오류페이지 이동을 구현하지 않는다. drawer의닫기는 API응답과 무관한 localstate다. 편집 가능성은 UI permission에 따라 다르며 public에서는 수정탭을 숨긴다. 원문 URL 열기도 새 탭이며 본서비스 화면 범위 밖이다.
