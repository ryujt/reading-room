# 상세 편집 — TO-BE 유지 Navigation

> **목표 기준** 2026.10.25 · **AS-IS 대비** 유지. [이번 기준선 원본](../../../as-is/details/navigation/edit-link.md)의 도표와 내부 계약을 목표에서도 유지한다. 아래 코드는 upstream 952ac454의 확인된 근거이며 목표 실행을 검증했다는 뜻이 아니다. [목표 핵심](../../system-design-to-be.md) C-05의 회귀 검증 대상이다.

> **DATE** 2026.10.25 · **기준** `952ac454` 소스 역추출. 실제 브라우저 관찰 전.
> [Job Flow](../jobflow/edit-link.md) · [핵심 화면](../../system-design-to-be.md#7-화면--사용자는-어디를-오가나)

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
| submit_change | PUT mutation 시작 | [Browser JF-5](../../../as-is/details/browser.md#jf-5-상세-query와-편집삭제-mutation--usegetlink--useupdatelink--usedeletelink) |

server success 후 view로 이동하는 것이 아니다. 서버 실패시 이미 view이며 toast/cache rollback이 일어난다. draft navigation guard가 없어 닫기/뒤로가기/새로고침이 입력을 잃게 할 수 있다. iconpicker close도 같은 submit을 호출한다.
