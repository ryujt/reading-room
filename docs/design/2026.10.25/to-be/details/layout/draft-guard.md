# DraftGuard — TO-BE Layout

> DATE2026.10.25 · 신규 R-04/C-04/D-04. [Navigation](../navigation/leave-draft.md) · [Browser JF-3](../browser.md#jf-3-이탈-판단--requestnavigationresolvenavigation)

```layout
DraftGuard V GuardTitle, GuardExplanation, DestinationLabel, GuardFeedback, GuardActions
GuardActions V SaveAndLeave, DiscardChanges, KeepEditing
```

제목 “Keep your note?”와 설명은 저장하지 않은 status/reflection이 있음을 알린다. DestinationLabel은예를들어“Continue to Finished shelf”처럼 보관한 목적지를 읽을 수 있게 보여 주며 민감 정보를 추가 노출하지 않는다. SaveAndLeave는 주 행동이며 Discard를 명확히 구분한다. KeepEditing은 기존 입력으로 돌아간다.3개 action은 모바일과 desktop에서 모두 세로44px 이상으로오클릭을 줄인다.

pending은 Save 문구와 spinner를 표시한다. 오류는 aria-live로 안내하고 기존 목적지를 유지한다. 충돌은 detail에서 내 초안과 서버 값을 검토할 수 있도록 KeepEditing을 제공한다.실패 후 retry가 가능하며 focus를 SaveAndLeave로 복원한다. Escape/backdrop은 KeepEditing과 같으며 진행 중에는 닫기를 막는다. 실제 URL 보상과 재이동은 Controller가 소유하고 이 dialog는 사용자 선택만 반환한다. beforeunload의 브라우저 기본 경고는 이 Layout으로 바꿀 수 없다.
