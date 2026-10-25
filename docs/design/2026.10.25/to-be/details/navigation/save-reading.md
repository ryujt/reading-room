# 개인 상태와 한 줄 저장 — TO-BE Navigation

> DATE2026.10.25 · R-03·R-04/C-03 제안. [Job Flow](../jobflow/save-reading.md)

```navigation
ReadingDetail --> ReadingDetail : status 또는 한 줄 draft 편집
ReadingDetail --> (/reading_put) : 일반 Save
(/reading_put) --> ReadingDetail : 일반 Save 성공 Saved
(/reading_put) --> ReadingDetail : 일반 Save 오류 초안 유지
ReadingDetail --> (conflict_choice) : READING_CONFLICT current 수신
(conflict_choice) --> ReadingDetail : 서버 값 불러오기
(conflict_choice) --> (/reading_put) : 검토 후 내 값으로 저장
```

화면은 [ReadingDetail Layout](../layout/reading-detail.md) 하나다. conflict_choice는 새 화면이 아니라 inline 비교와 두 action에 대한 판단 노드다. status만 바꿔도 Save 전에는 저장된 목록 counts가 바뀌지 않는다. 성공 후 Saved aria-live와 최신 counts를 보여 준다.409는 내 초안을 유지하고 서버 값과 구분한다. timeout은 결과 불명 안내와 명시적 retry를 제공한다. close/Back은 [별도 guard](leave-draft.md)로 연결하며 일반 PUT 성공과 Save&Leave 성공의 목적지를 혼동하지 않는다.

`VERSION_EXHAUSTED`409는 비교 선택 없이 같은 상세에 초안과 저장 불가 안내를 남긴다.
