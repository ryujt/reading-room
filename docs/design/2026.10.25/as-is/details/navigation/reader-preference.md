# 본문 표시 설정 — AS-IS Navigation

> DATE 2026.10.25 · [Job Flow](../jobflow/reader-preference.md)

```navigation
Preserved --> TextStyle : Readable의 표시 설정 열기
TextStyle --> TextStyle : 글꼴 크기 행간 폭 변경
TextStyle --> Preserved : 닫기
```

[Preserved Layout](../layout/preserved.md), [TextStyle Layout](../layout/text-style.md). URL은 바뀌지 않고 선택 즉시 preference mutation이 실행된다. 실패 시 전용 오류 route나 draft 복구 dialog는 없다. source `TextStyleDropdown.tsx:74`와 `packages/router/user.tsx:93–134`.
