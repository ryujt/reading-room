# ReadingDetail — TO-BE Layout

> DATE2026.10.25 · 신규 R-01·R-03·R-04·R-05/C-03·C-04. `/reading-room?link=id`. [Navigation](../navigation/save-reading.md) · [state 소유](../browser.md#4-소유-상태데이터)

desktop은 library 오른쪽 최대560px panel과 dim backdrop, mobile은 전체 폭·100dvh sheet다. root page는 body scroll을 잠그고 panel 내부를 스크롤한다. Close는44px 이상이며 dialog 이름과 focus trap을 제공한다.

```layout
ReadingDetail V DetailTop, DetailScroll, DetailActions
DetailTop > PrivateLabel : 85, Close : 15
DetailScroll V Source, Title, Description, OpenContent, Rule, StatusLabel, StatusChoices, ReflectionLabel, ReflectionInput, PrivacyAndLimit, Feedback
OpenContent > Original : 40, PreservedFormats : 60
StatusChoices > UnreadChoice : 33, ReadingChoice : 34, FinishedChoice : 33
PrivacyAndLimit > Privacy : 70, Counter : 30
Feedback V ErrorOrSaved, ConflictComparison
ConflictComparison V ServerValue, LocalDraft, ConflictActions
ConflictActions > LoadServer : 50, KeepMine : 50
DetailActions > SaveNotice : 65, Save : 35
```

| 영역 | 입력·표시 | 동작·상태 |
|---|---|---|
| Source/Title/Description | 원본 LinkDTO,domain/collection/title/excerpt | 제목서체와줄간격을충분히두고긴한글줄바꿈,shareddescription편집아님 |
| Original/PreservedFormats | 원문URL,readable/HTML/PDF/image availability | 원문은외부link;보존형식은원본 viewer. pending/unavailable을disabled설명으로구분 |
| StatusChoices | draft enum | 로컬변경만,44pxradio-likebuttons. reflection과같이Save |
| ReflectionInput | 한 줄 280 UTF-16 units,trim규칙 | textarea모양은wrap가능하나줄바꿈입력불허. counter와privatehint,공유되지 않음 |
| Feedback | Saved/error/conflict | aria-live, 실패후Save/erroractionfocus. Saved는다음편집까지유지 |
| ConflictComparison | 서버값과내draft | 서버값불러오기=discard,내값저장=명시override와currentversion.자동병합없음 |
| Save/Close | dirty/pending | cleanSave비활성,저장중중복방지·15초한계. Close/Back은dirtyguard |

loading은detail skeleton,404는title/note를노출하지않고접근불가+Close,transport오류는Retry다. 모바일에서는 OpenContent를 세로로 쌓고 status3개가 너비 안에 들도록 padding을 조정하되 조작 크기를 줄이지 않는다. footer는 스크롤 영역 밖에 고정하여 Save가 보이며 키보드가 열려도 입력 영역을 스크롤할 수 있어야 한다. 프로토타입에서 실제 본문 대신 fixture를 쓰면 sample 표시를 별도로 한다.
