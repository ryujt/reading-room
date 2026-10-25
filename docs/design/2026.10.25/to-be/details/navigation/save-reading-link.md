# 새 링크 저장 — TO-BE Navigation

> DATE2026.10.25 · R-05/C-03·C-05 제안. [Job Flow](../jobflow/save-reading-link.md)

```navigation
ReadingLibrary --> SaveReadingLink : Save a link
SaveReadingLink --> (/post_link) : 유효한 URL과 collection 제출
(/post_link) --> ReadingDetail : 200 실제id
(/post_link) --> SaveReadingLink : 실패 또는 결과불명 초안유지
SaveReadingLink --> ReadingLibrary : 제출 전 Cancel
ReadingDetail --> Preserved : 사용가능 형식과 clean 또는 Guard 승인
```

[Save Layout](../layout/reading-save.md)의 URL/name/collection은 local draft다. 기존 collection 선택은 id를 전송하며 새 이름 선택은 생성 의도를 드러낸다. 제출 중 중복 Save는 막되15초 이후 실패 복구가 가능하다. 성공200 후 [상세](../layout/reading-detail.md)는 Unread와 보존 pending을 각각 표시한다. 원본 [보존 Navigation](read-preserved.md)은 형식이 생긴 뒤 사용 가능하며 단순 저장을 보존 완료로 표시하지 않는다. POST timeout은 자동 retry하지 않고 사용자가 library를 확인하도록 안내한다.
