# NewLinkModal — TO-BE 유지 Layout

> **목표 기준** 2026.10.25 · **AS-IS 대비** 유지. [이번 기준선 원본](../../../as-is/details/layout/new-link.md)의 도표와 내부 계약을 목표에서도 유지한다. 아래 코드는 upstream 952ac454의 확인된 근거이며 목표 실행을 검증했다는 뜻이 아니다. [목표 핵심](../../system-design-to-be.md) C-05의 회귀 검증 대상이다.

주소 없는 Sidebar overlay다. 소유 코드는 `apps/web/components/ModalContent/NewLinkModal.tsx:23`, 공통 shell은 `components/Modal.tsx:16`이다. [저장 Navigation](../navigation/save-link.md), [저장 JobFlow](../jobflow/save-link.md)와 연결한다. 실제 브라우저 렌더링은 아직 확인하지 않았다.

**desktop 기본 상태, width≥640, optionsExpanded=false**. root는 modal 안의 콘텐츠이며 Close는 shell의 우상단 absolute overlay다. 가로3:2는 실제 sm:grid-cols-5의 span3/span2다.


**크기 표기**: 도표의 가중치는 영역 관계를 읽기 위한 값이며 코드의 실제 폭이나 픽셀 비율이 아니다. 실제 flex/grid·고정 크기·반응형 조건은 아래 소스 근거를 따른다. 단, NewLink의 3:2와 1:1 열 관계처럼 명시한 grid 관계는 소스에서 확인한 사실이다.

```layout
NewLink V TitleBar, Separator, PrimaryFields, Actions
TitleBar > Heading : 90, Close : 10
PrimaryFields > URLField : 60, CollectionField : 40
Actions > MoreOptions : 60, Create : 40
```

**desktop 확장 상태**: 기본 필드 뒤에 Name/Tags2열, Description 전체폭이 삽입된다.

```layout
NewLinkExpanded V TitleBarExpanded, SeparatorExpanded, PrimaryFieldsExpanded, OptionalFields, Description, ActionsExpanded
TitleBarExpanded > HeadingExpanded : 90, CloseExpanded : 10
PrimaryFieldsExpanded > URLExpanded : 60, CollectionExpanded : 40
OptionalFields > Name : 50, Tags : 50
ActionsExpanded > HideOptions : 60, CreateExpanded : 40
```

**mobile width<640, 확장 상태**: drawer90% 높이, 내부 scroll, 상단 slider. shell의 X 버튼은 mobile branch에 없다. grid는 각 필드 한 열이다.

```layout
MobileDrawer V Slider, HeadingMobile, SeparatorMobile, URLMobile, CollectionMobile, NameMobile, TagsMobile, DescriptionMobile, ActionsMobile
ActionsMobile > HideOptionsMobile : 60, CreateMobile : 40
```

| 영역 | 입력·표시 | 상호작용·출력 | 상태·반응형 근거 |
|---|---|---|---|
| Heading/Close | create_new_link 번역 | desktop close→parent state false | NewLinkModal:104, Modal:79–91. title 행의 weights는 대표 표현이며 close는 실제 absolute |
| URL | link.url | onChange setLink, 최초 focus | NewLinkModal:84–86/:111–117, sm span3 |
| Collection | 현재 collection 또는 Unorganized | 선택→id/name. 새 옵션은 id undefined | :48–53/:63–82/:119–129, sm span2 |
| Name/Tags | optional 입력 | local state, selected tags를 name 배열로 변환 | optionsExpanded false 기본:44, 조건부 grid:132–151 |
| Description | unescaped description | textarea state | :152–161, sm span2 전체폭, h32 |
| More/Hide | optionsExpanded에 따른 문구 | 펼치기만 바꾸고 draft 유지 | :165–174 |
| Create | create_link | submit→schema 검사→mutation→close | :175. disabled/busy 조건 없음 |
| mobile shell | slider+children | swipe/backdrop close animation 후 toggle | Modal:37–61, drawer90%, overflow-y-auto |

schema 실패는 toast이며 inline error region이 아니다. 서버 실패 시 이 창은 이미 제거되어 있다. 모바일 기본 상태는 Name/Tags/Description만 제외한 위 tree다. 동일한 카드 블록을 반복해 다른 상태를 표현하지 않는다.
