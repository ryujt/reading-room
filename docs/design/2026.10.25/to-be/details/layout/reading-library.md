# ReadingLibrary — TO-BE Layout

> DATE2026.10.25 · 신규 제안 R-02·R-06/C-03/D-03. `/reading-room` 보호 화면. [Navigation](../navigation/reading-library.md) · [계약](../web-api.md#2-공개-계약) · [화면 색인](index.md)

편집된 독서실처럼 읽을 글의 제목·출처·짧은 문장을 중심에 둔다. ivory 배경, forest ink, 얇은 warm gray rule, 절제한 coral dot을 사용한다. 큰 serif title과 sans UI를 대비하고 decorative mark는 CSS 또는 직접 작성 SVG로 만든다. 외부 이미지·font fetch에 의존하지 않는다. 아래 비율은 **목표 상대 가중치**이며 실제 픽셀 측정값이 아니다.

desktop ≥900px:

```layout
ReadingLibrary V Masthead, Intro, Shelves, LibraryBody, Footer
Masthead > Brand : 25, Search : 50, SaveAction : 15, Account : 10
Intro > EditorialTitle : 62, OnThisShelf : 38
EditorialTitle V Eyebrow, LargeHeading, Invitation
OnThisShelf V FeatureLabel, FeatureTitle, FeatureAction
Shelves > All : 25, Unread : 25, Reading : 25, Finished : 25
LibraryBody V ResultHeader, ArticleList, More
ResultHeader > ScopeLabel : 70, RecentLabel : 30
ArticleList V ArticleRow
ArticleRow > Index : 6, ArticleInfo : 66, ReadingBadge : 23, OpenArrow : 5
ArticleInfo V SourceAndCollection, ArticleTitle, ExcerptAndReflection, PreservationFormats
Footer > LinkwardenCredit : 70, LibraryCount : 30
```

mobile <900px, 검토 viewport390×844:

```layout
ReadingMobile V MobileMasthead, MobileSearch, MobileIntro, MobileShelves, MobileFeature, MobileResults, MobileMore
MobileMasthead > MobileBrand : 65, MobileSave : 35
MobileIntro V MobileEyebrow, MobileHeading, MobileInvitation
MobileShelves V ShelfTop, ShelfBottom
ShelfTop > MobileAll : 50, MobileUnread : 50
ShelfBottom > MobileReading : 50, MobileFinished : 50
MobileFeature V MobileFeatureLabel, MobileFeatureTitle, MobileFeatureAction
MobileResults V MobileResultLabel, MobileArticle
MobileArticle V MobileArticleMeta, MobileArticleTitle, MobileExcerpt, MobileArticleFoot
MobileArticleFoot > MobileFormats : 65, MobileStatus : 35
```

| 영역 | 입력·출력 | 상호작용·상태 |
|---|---|---|
| Brand/Account | product identity·현재 사용자 | 기존 Dashboard/Links와 Sign out 연결. fake는명시적Prototype 배지 |
| Search | query 초안 | Enter/Search 제출, clear. URL 변경 전 dirtyguard |
| EditorialTitle | “Your reading room.”와짧은설명 | desktop의 큰 serif, mobile “Your reading”/“room.” 의도적 줄바꿈 |
| OnThisShelf/Feature | **현재 표시된 결과**의 첫 Reading,없으면첫Unread | “On this shelf”로범위명시. 결과없으면 조용한empty안내,전역 상태추측금지 |
| Shelves | global all/unread/reading/finished counts | accessible pressed 상태·count·label, desktop4열/mobile2×2. 모두44px이상 |
| ResultHeader | 선택shelf·검색결과범위 | “Newest saved”는비조작label. 정의되지않은sortdropdown없음 |
| ArticleInfo | domain/collection,title,sharedexcerpt,자기reflection,formats | 제목이주영역;row클릭detail. 긴한글/URL은wrap,가로 넘침 금지 |
| ReadingBadge | 저장된개인status | 저장전draft를목록에성급히반영안함.색만으로구분안함 |
| More/Footer | cursor존재·원본credit | Load more,마지막page안내.기존데이터/라이선스출처표시 |

본문15–16px, secondary≥12px, interactive≥14px·최소44×44 target을 목표로 한다. skeleton은 title/rows 영역을 유지한다. 네트워크 오류는 Retry와 기존 내용의 stale 표시를, 검색 결과가 없을 때는 Clear filters를 보여 준다. 빈 library는 첫 링크 저장을 안내한다.403/401은실제 session가드로처리하며fake에서실제로그인으로이동하지않는다. 결과의 시각 완성도는 prototype gate에서 실제 1269×720·390×844 캡처로 판단할 예정이며 아직 실행하지 않았다.
