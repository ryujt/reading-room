# 초안이 있는 이탈 — TO-BE Navigation

> DATE2026.10.25 · R-04/C-04 제안. [Job Flow](../jobflow/leave-draft.md)

```navigation
ReadingDetail --> (dirty_check) : 닫기 다른글 shelf 검색 Back viewer
(dirty_check) --> IntendedDestination : clean
(dirty_check) --> DraftGuard : dirty 목적지 보관
DraftGuard --> ReadingDetail : Keep editing
DraftGuard --> IntendedDestination : Discard
DraftGuard --> (/reading_put) : Save and leave
(/reading_put) --> IntendedDestination : 이탈 저장 성공
(/reading_put) --> DraftGuard : 이탈 저장 실패 또는409
DraftGuard --> (/reading_put) : 명시적 Retry save and leave
```

| 화면·판단 | Layout·주소 | 결과 |
|---|---|---|
| ReadingDetail | [detail](../layout/reading-detail.md) | draft의 원래 장소 |
| DraftGuard | [guard](../layout/draft-guard.md),주소없음 | 목적지를 덮어쓰지 않고 save/discard/keep 선택 |
| IntendedDestination | [library](../layout/reading-library.md),다른detail,[viewer](../layout/preserved.md),기존Dashboard/Links | 새 임의외부주소가 아니라 요청 시 capture한 허용 목적지 |
| dirty_check | Controller 판단 | same-value edit는dirty아님; pending save중 중복이동차단 |

브라우저 Back은 이미 바뀐 URL을 known history index로 보상한 후 이 흐름을 적용한다. Keep editing이면 원래 URL과 입력 focus, Discard면 원래 Back 목적지, Save 실패면 Guard와초안이남아야한다. document 종료는 beforeunload 기본 경고의 제한을 받으며 이 custom dialog로 바꿀 수 없다. 구현과 실제 browser Back 검증은 아직 전이다.
