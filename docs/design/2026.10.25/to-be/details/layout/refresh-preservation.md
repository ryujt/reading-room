# Refresh preservation confirmation — TO-BE 유지 Layout

> **목표 기준** 2026.10.25 · **AS-IS 대비** 유지. [이번 기준선 원본](../../../as-is/details/layout/refresh-preservation.md)의 도표와 내부 계약을 목표에서도 유지한다. 아래 코드는 upstream 952ac454의 확인된 근거이며 목표 실행을 검증했다는 뜻이 아니다. [목표 핵심](../../system-design-to-be.md) C-05의 회귀 검증 대상이다.

> **DATE** 2026.10.25 · **기준** `952ac454` 소스 역추출. 브라우저 픽셀 관찰 전.
> **주소·식별자** `ConfirmationModal`의 refresh 변형 · **소유** Browser
> [핵심 화면 색인](../../system-design-to-be.md#7-화면--사용자는-어디를-오가나) · [Navigation](../navigation/refresh-preservation.md)


**크기 표기**: 도표의 가중치는 영역 관계를 읽기 위한 값이며 코드의 실제 폭이나 픽셀 비율이 아니다. 실제 flex/grid·고정 크기·반응형 조건은 아래 소스 근거를 따른다. 단, NewLink의 3:2와 1:1 열 관계처럼 명시한 grid 관계는 소스에서 확인한 사실이다.

```layout
Refresh V Title, Separator, Explanation, Actions
Actions > Cancel : 50, Confirm : 50
```

| 영역 | 입력·출력 | 상호작용·상태 | 근거 |
|---|---|---|---|
| Explanation | refresh확인문구 | 현재형식재생성을설명 | `LinkViews/LinkComponents/LinkActions.tsx:155–168` |
| Cancel | toggleModal | API없음,모달닫기 | `components/ConfirmationModal.tsx:31–36` |
| Confirm | onConfirmed | awaitcallback후close, 별도pendingdisabled없음. updateArchive가실패catch하므로실패도close | :40–43, [Browser JF-8](../../../as-is/details/browser.md#jf-8-보존물-로딩과-refresh--fetchlinkcontent--loadmonolith--updatearchive) |

Modal의desktop/mobile구조는[NewLink](new-link.md)와같다. Confirm성공은reset요청응답이며worker완료가아니다. 후속목록/상세poll에서형식이갱신된다.
