# 상세 편집 — AS-IS Navigation

> **DATE** 2026.10.25 · **기준** `952ac454` 소스 역추출. 실제 브라우저 관찰 전.
> [Job Flow](../jobflow/edit-link.md) · [핵심 화면](../../system-design-as-is.md#7-화면)

진입: LinkDrawer Edit 탭이나 메뉴에서 편집 모드로 진입.

```navigation
LinkDrawer --> LinkEdit : Edit 탭
LinkEdit --> (submit_change) : 저장
(submit_change) --> LinkDrawer : mutation 시작 후 view 전환
LinkEdit --> LinkDrawer : View 탭
LinkEdit --> LinksPage : 닫기
LinkDrawer --> IconPicker : 아이콘 선택
IconPicker --> LinkDrawer : 바깥 클릭과 submit
```

| 화면·판단 | 주소·소유·Layout | 실제 근거·계약 |
|---|---|---|
| LinkDrawer/LinkEdit | [Layout](../layout/link-drawer.md) | LinkDetails.submit:112–124 |
| IconPicker | [Layout](../layout/icon-picker.md) | LinkDetails:245–268 |
| LinksPage | [Layout](../layout/links.md) | 부모overlaystate |
| submit_change | PUT mutation 시작 | [Browser JF-5](../browser.md#jf-5-상세-query와-편집삭제-mutation--usegetlink--useupdatelink--usedeletelink) |

server success 후 view로 이동하는 것이 아니다. 서버 실패시 이미 view이며 toast/cache rollback이 일어난다. draft navigation guard가 없어 닫기/뒤로가기/새로고침이 입력을 잃게 할 수 있다. iconpicker close도 같은 submit을 호출한다.
