# Link drawer — AS-IS Layout

> **DATE** 2026.10.25 · **기준** `952ac454` 소스 역추출. 브라우저 픽셀 관찰 전.
> **주소·식별자** `LinkModal` overlay; view/edit mode · **소유** Browser
> [핵심 화면 색인](../../system-design-as-is.md#7-화면) · [Navigation](../navigation/inspect-link.md)


**크기 표기**: 도표의 가중치는 영역 관계를 읽기 위한 값이며 코드의 실제 폭이나 픽셀 비율이 아니다. 실제 flex/grid·고정 크기·반응형 조건은 아래 소스 근거를 따른다. 단, NewLink의 3:2와 1:1 열 관계처럼 명시한 grid 관계는 소스에서 확인한 사실이다.

```layout
LinkDrawer V OverlayToolbar, Preview, OverlappingIcon, DetailFields
OverlayToolbar > Close : 15, ViewEditTabs : 55, MenuAndOriginal : 30
DetailFields V TitleOrNameInput, URLOrInput, CollectionOrSelect, TagsOrSelect, DescriptionOrTextarea, FormatsOrSave
```

| 영역 | 입력·출력 | 상호작용·상태 | 근거 |
|---|---|---|---|
| OverlayToolbar | permission/public/mode | Xclose; owner/canUpdate+private일때만tabs, public에서menu숨김, URL있으면원문새tab | `components/ModalContent/LinkModal.tsx:68–170` |
| Menu | pin, refresh,delete | refresh는url+canUpdate,delete는canDelete. shiftdelete는confirm우회 | :113–150, [편집](../jobflow/edit-link.md), [삭제](../jobflow/delete-link.md) |
| Preview/Icon | link | bannerupload와iconpicker는private+canUpdate+nonstandalone에서만. viewer상태에서도icon변경가능 | `components/LinkDetails.tsx:179–269` |
| DetailFields | localdraft | view순서는[standalone](link-detail.md)와같음. edit에서name/url/select/textarea로치환하고format목록을빼고save표시 | :288–303/:323–338/:379–388/:425–458, [Browser JF-5](../browser.md#jf-5-상세-query와-편집삭제-mutation--usegetlink--useupdatelink--usedeletelink) |

Desktop는 오른쪽w2/5·min30rem·max6xl·h-full, scroll (`Drawer.tsx:60–85`). mobile<640은90%높이bottomsheet·slider·overflow-y-auto(:35–55). toolbar는absolute overlay이고순서상preview위에중첩된다. mode전환/닫기에는dirtyguard없고 submit은서버응답전view로돌아간다. 서버에러toast가떠도입력화면을자동복원하지않는다.
