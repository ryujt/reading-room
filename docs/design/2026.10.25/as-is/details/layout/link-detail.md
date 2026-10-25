# Link detail page — AS-IS Layout

> **DATE** 2026.10.25 · **기준** `952ac454` 소스 역추출. 브라우저 픽셀 관찰 전.
> **주소·식별자** `/links/[id]`, `/public/links/[id]` · **소유** Browser
> [핵심 화면 색인](../../system-design-as-is.md#7-화면) · [Navigation](../navigation/inspect-link.md)


**크기 표기**: 도표의 가중치는 영역 관계를 읽기 위한 값이며 코드의 실제 폭이나 픽셀 비율이 아니다. 실제 flex/grid·고정 크기·반응형 조건은 아래 소스 근거를 따른다. 단, NewLink의 3:2와 1:1 열 관계처럼 명시한 grid 관계는 소스에서 확인한 사실이다.

```layout
StandaloneLink V Preview, OverlappingIcon, Title, URLRow, CollectionRow, TagsRow, Description, PreservedFormats, AddedDate
URLRow > URL : 88, Copy : 12
PreservedFormats V WebpageConditional, ScreenshotConditional, PDFConditional, ReadableConditional, PendingOrUnavailableConditional
```

| 영역 | 입력·출력 | 상호작용·상태 | 근거 |
|---|---|---|---|
| Page wrapper | useGetLink data | id없으면5skeleton, error전용표시없음. public여부 JSON문자열도 실제DOM에있음 | `pages/links/[id].tsx:19–35`, public route가같은구조재사용 |
| Preview/Icon | link.preview/icon | available→archivejpeg, unavailable→gray, pending→skeleton; icon이preview에겹침 | `components/LinkDetails.tsx:149–177/:272–274` |
| Title/URL/Collection | name/url/collection | URL새tab+copy, collection은public/private주소분기 | :278–285/:306–339/:343–388 |
| Tags/Description | shared link fields | publictags는plainchip, private는tagsroute. 빈값문구 | :394–459 |
| PreservedFormats | formatAvailable각field | available형식만row+separator. 대기/실패대체UI | :462–560, [보존읽기 계약](../jobflow/read-preserved.md) |

standalone은 sm:max-w-xl·m-auto·p5로 중앙, smborder/rounded. mobile은w-full, preview가negative margin으로가로끝까지. route 자체에 drawer상단View/Edit tab은없고 standalone기본mode=view다. 읽기상태/한줄감상은없다.
