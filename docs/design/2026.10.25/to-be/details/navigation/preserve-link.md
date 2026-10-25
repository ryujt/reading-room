# 링크 보존 — TO-BE 유지 Navigation

> **목표 기준** 2026.10.25 · **AS-IS 대비** 유지. [이번 기준선 원본](../../../as-is/details/navigation/preserve-link.md)의 도표와 내부 계약을 목표에서도 유지한다. 아래 코드는 upstream 952ac454의 확인된 근거이며 목표 실행을 검증했다는 뜻이 아니다. [목표 핵심](../../system-design-to-be.md) C-05의 회귀 검증 대상이다.

UI 비대상이다. 트리거는 worker loop의 DB 조회이며 사용자가 보는 화면 전환을 만들지 않는다. 완료는 lastPreserved와 format path/unavailable 기록이다. 실패·timeout도 marker가 기록될 수 있다.

목록 hook이 보존 대기 상태를 polling하여 같은 화면의 표시를 갱신하는 것은 navigation이 아니다. preserved viewer를 여는 사용자 과업은 전체 조회 시나리오에서 별도로 다룬다. 내부 동작과 조건은 [보존 JobFlow](../jobflow/preserve-link.md)를 따른다.
