# Reader text style menu — TO-BE 유지 Layout

> **목표 기준** 2026.10.25 · **AS-IS 대비** 유지. [이번 기준선 원본](../../../as-is/details/layout/text-style.md)의 도표와 내부 계약을 목표에서도 유지한다. 아래 코드는 upstream 952ac454의 확인된 근거이며 목표 실행을 검증했다는 뜻이 아니다. [목표 핵심](../../system-design-to-be.md) C-05의 회귀 검증 대상이다.

> **DATE** 2026.10.25 · **기준** `952ac454` 소스 역추출. 브라우저 픽셀 관찰 전.
> **주소·식별자** `TextStyleDropdown` overlay · **소유** Browser
> [핵심 화면 색인](../../system-design-to-be.md#7-화면--사용자는-어디를-오가나) · [Navigation](../navigation/read-preserved.md)


**크기 표기**: 도표의 가중치는 영역 관계를 읽기 위한 값이며 코드의 실제 폭이나 픽셀 비율이 아니다. 실제 flex/grid·고정 크기·반응형 조건은 아래 소스 근거를 따른다. 단, NewLink의 3:2와 1:1 열 관계처럼 명시한 grid 관계는 소스에서 확인한 사실이다.

```layout
TextStyle V FontSubmenu, SizeSubmenu, LineHeightSubmenu, WidthSubmenu
```

| 영역 | 입력·출력 | 상호작용·상태 | 근거 |
|---|---|---|---|
| Font | readableFontFamily | nestedcheckbox options,선택시useUpdateUserPreference.mutate | `components/TextStyleDropdown.tsx:74–120` 이후 |
| Size/LineHeight/Width | userreaderpreferences | sizes12–50px:23,lineheight1–3:46,widthenum:70;각submenu선택 | 같은파일배열·JSX |
| Menu | readableformat에만trigger | min-w64,leftalign,desktop/mobile동일dropdown. outsideclose | :80–86, `PreservationNavbar.tsx:122–123` |

본문style는ReadableView의userpreference effect(:306–341)가적용한다. 사용자표시설정저장API는원본preference업무를참조하며읽기진행도저장으로간주하지않는다. 현재문서범위는읽기UI에미치는입력·결과이며모든accountsettings업무는제외한다.
