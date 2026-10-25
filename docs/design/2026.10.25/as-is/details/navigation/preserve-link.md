# 링크 보존 — AS-IS Navigation

UI 비대상이다. 트리거는 worker loop의 DB 조회이며 사용자가 보는 화면 전환을 만들지 않는다. 완료는 lastPreserved와 format path/unavailable 기록이다. 실패·timeout도 marker가 기록될 수 있다.

목록 hook이 보존 대기 상태를 polling하여 같은 화면의 표시를 갱신하는 것은 navigation이 아니다. preserved viewer를 여는 사용자 과업은 전체 조회 시나리오에서 별도로 다룬다. 내부 동작과 조건은 [보존 JobFlow](../jobflow/preserve-link.md)를 따른다.
