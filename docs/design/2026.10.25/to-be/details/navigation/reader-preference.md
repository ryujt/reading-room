# 본문 표시 설정 — TO-BE 유지 Navigation

> **목표 기준** 2026.10.25 · **AS-IS 대비** 유지. [이번 기준선 원본](../../../as-is/details/navigation/reader-preference.md)의 도표와 내부 계약을 목표에서도 유지한다. 아래 코드는 upstream 952ac454의 확인된 근거이며 목표 실행을 검증했다는 뜻이 아니다. [목표 핵심](../../system-design-to-be.md) C-05의 회귀 검증 대상이다.

> DATE 2026.10.25 · [Job Flow](../jobflow/reader-preference.md)

```navigation
Preserved --> TextStyle : Readable의 표시 설정 열기
TextStyle --> TextStyle : 글꼴 크기 행간 폭 변경
TextStyle --> Preserved : 닫기
```

[Preserved Layout](../layout/preserved.md), [TextStyle Layout](../layout/text-style.md). URL은 바뀌지 않고 선택 즉시 preference mutation이 실행된다. 실패 시 전용 오류 route나 draft 복구 dialog는 없다. source `TextStyleDropdown.tsx:74`와 `packages/router/user.tsx:93–134`.
