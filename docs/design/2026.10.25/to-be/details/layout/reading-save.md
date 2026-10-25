# SaveReadingLink — TO-BE Layout

> DATE2026.10.25 · 신규UI,원본 POST유지 R-05/C-03·C-05. [Navigation](../navigation/save-reading-link.md) · [Job Flow](../jobflow/save-reading-link.md)

```layout
SaveReadingLink V SaveHeading, SaveDescription, URL, OptionalTitle, CollectionChoice, NewCollectionName, SaveError, SaveActions
SaveHeading > HeadingText : 85, SaveClose : 15
SaveActions > Cancel : 50, CreateLink : 50
```

URL은 필수 입력이며 첫 focus를 받는다. OptionalTitle은 원문의 제목을 바꾸고 싶을 때 입력한다. CollectionChoice는 현재 owner/canCreate 목록의 id를 선택하고, 별도 “Create a collection”을 선택했을 때만 NewCollectionName을 보여 준다. collection 목록이 없으면 새 이름 입력을 안내한다. API 기본값을 쓸 경우 Unorganized임을 표시한다. 기존 이름 텍스트를 기존 id 대신 보내지 않는다.

SaveDescription은“Save now. Preserved copies are prepared separately.”처럼원본 저장과 worker를 분리한다. CreateLink는 pending에서 중복 제출을 막고200일 때만 창을 닫는다.오류는 필드 아래 한 영역에 표시하고 focus를 복원한다. timeout은 결과 불명과 library 확인 안내를 표시한다. Cancel은 제출 전에 창을 닫으며, 진행 중에는 timeout 또는 결과를 기다린다.자동 POST retry없음. desktop max520px/mobile viewport - 32px,내부 scroll,44pxactions,label은14px 이상을 목표로 한다.원본legacy NewLinkModal은별도[유지Layout](new-link.md)이다.
