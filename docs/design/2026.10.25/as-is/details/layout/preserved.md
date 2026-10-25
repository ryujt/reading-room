# Preserved viewer — AS-IS Layout

> **DATE** 2026.10.25 · **기준** `952ac454` 소스 역추출. 브라우저 픽셀 관찰 전.
> **주소·식별자** `/preserved/[id]`, `/public/preserved/[id]`, query.format · **소유** Browser
> [핵심 화면 색인](../../system-design-as-is.md#7-화면) · [Navigation](../navigation/read-preserved.md)


**크기 표기**: 도표의 가중치는 영역 관계를 읽기 위한 값이며 코드의 실제 폭이나 픽셀 비율이 아니다. 실제 flex/grid·고정 크기·반응형 조건은 아래 소스 근거를 따른다. 단, NewLink의 3:2와 1:1 열 관계처럼 명시한 grid 관계는 소스에서 확인한 사실이다.

```layout
Preserved V FixedNavbar, FormatViewport
FixedNavbar > BackAndTools : 30, FormatPicker : 40, ThemeAndActions : 30
FormatViewport V SelectedFormat
```

```layout
ReadableBody V ArticleTitle, OriginalURLConditional, AddedDate, Separator, SanitizedArticle, SelectionPopoverConditional
```

| 영역 | 입력·출력 | 상호작용·상태 | 근거 |
|---|---|---|---|
| FixedNavbar | link/format/config | Back항상dashboard, readable이면textstyle+highlight,그외download,availableformat메뉴,theme/linkactions | `Preservation/PreservationNavbar.tsx:110–250` |
| SelectedFormat | query.format | readable→ReadableView,HTML→sandboxiframe,PDF→iframe,image→img. 하나만선택 | `Preservation/PreservationContent.tsx:161` switch |
| ArticleTitle/URL/Date | linkmetadata | 원문새tab,본문은DOMPurify후HTML표시 | `Preservation/ReadableView.tsx:417–459` |
| Loading/error | formatloadflag/monolithError | HTMLconfig/URL에러문구,형식별skeleton; readablefile대기안내. 미허용link는detailquery오류뒤내용없음 | Content:85–157, ReadableView:460–617 |

PageContent는navbar높이3.1rem을제외한calc(100vh-3.1rem) viewport다. readable내부overflow scroll,iframe/img의원본비율·loadflag는format별다르다. desktop/mobile같은navbarrow를사용하며작은폭대체탭없음. [Browser JF-8](../browser.md#jf-8-보존물-로딩과-refresh--fetchlinkcontent--loadmonolith--updatearchive)와[파일권한](../web-api.md#jf-11-보존-파일-접근-정책과-직접-전송--handleget--resolveaccessiblearchive)을구분한다.

Content의 최종 분기(`apps/web/components/Preservation/PreservationContent.tsx:253–280`)는 별도 상태를 소유한다. formatAvailable이면 선택 형식을 렌더하고, 해당 필드가 정확히 `unavailable`이면 중앙에 404와 “Format not available...”를 표시한다. 그 외 미생성 상태는 BeatLoader와 preservation_in_queue/check_back_later 안내를 표시한다. 이 대기 안내는 네트워크 fetch 중 skeleton과 다르며 link polling 결과로 달라질 수 있다. Navbar는 `PreservationNavbar.tsx:110–116`의 flex justify-between이고 도표의 30/40/30은 실제 CSS 비율이 아니다.
