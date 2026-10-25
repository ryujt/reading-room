# Link icon picker — TO-BE 유지 Layout

> **목표 기준** 2026.10.25 · **AS-IS 대비** 유지. [이번 기준선 원본](../../../as-is/details/layout/icon-picker.md)의 도표와 내부 계약을 목표에서도 유지한다. 아래 코드는 upstream 952ac454의 확인된 근거이며 목표 실행을 검증했다는 뜻이 아니다. [목표 핵심](../../system-design-to-be.md) C-05의 회귀 검증 대상이다.

> **DATE** 2026.10.25 · **기준** `952ac454` 소스 역추출. 브라우저 픽셀 관찰 전.
> **주소·식별자** `IconPopover` overlay · **소유** Browser
> [핵심 화면 색인](../../system-design-to-be.md#7-화면--사용자는-어디를-오가나) · [Navigation](../navigation/edit-link.md)


**크기 표기**: 도표의 가중치는 영역 관계를 읽기 위한 값이며 코드의 실제 폭이나 픽셀 비율이 아니다. 실제 flex/grid·고정 크기·반응형 조건은 아래 소스 근거를 따른다. 단, NewLink의 3:2와 1:1 열 관계처럼 명시한 grid 관계는 소스에서 확인한 사실이다.

```layout
IconPicker V IconSearch, SixColumnIconGrid, ColorAndWeight, Footer
ColorAndWeight > HexColorPicker : 50, WeightRadios : 50
Footer > ResetAction : 45, ClickOutsideHint : 55
```

| 영역 | 입력·출력 | 상호작용·상태 | 근거 |
|---|---|---|---|
| IconSearch/Grid | query, iconName, color, weight | 검색어는 local query, 선택은 parent setIconName | `components/IconPopover.tsx:41/:54–68` |
| ColorAndWeight | color/weight | 색상 picker와 2열 6개 radio. 각 parent setter를 호출 | :71–139 |
| Footer | reset, 안내 | reset은 parent fields 초기화, 바깥 클릭 시 적용 안내 | :141–147 |
| Popover shell | top/left/className | 고정22.5rem폭, grid높이11rem·세로scroll. top/left 둘다 있으면 body portal, 아니면 inline | :44–51/:61/:152–156 |

LinkDetails 호출은 top/left 없이 className top-12를 전달한다(:245–268). close callback은 local popup false 뒤 submit을 호출한다. desktop/mobile 별도 markup은 없으며 좁은 화면에서 22.5rem 고정폭의 실제 overflow는 브라우저 확인 전이다. API 실패시 inline error가 생기는 구조는 없고 update hook toast가 담당한다. [수정 계약](../jobflow/edit-link.md).
