# Delete link confirmation — TO-BE 유지 Layout

> **목표 기준** 2026.10.25 · **AS-IS 대비** 유지. [이번 기준선 원본](../../../as-is/details/layout/delete-link.md)의 도표와 내부 계약을 목표에서도 유지한다. 아래 코드는 upstream 952ac454의 확인된 근거이며 목표 실행을 검증했다는 뜻이 아니다. [목표 핵심](../../system-design-to-be.md) C-05의 회귀 검증 대상이다.

> **DATE** 2026.10.25 · **기준** `952ac454` 소스 역추출. 브라우저 픽셀 관찰 전.
> **주소·식별자** `DeleteLinkModal` overlay · **소유** Browser
> [핵심 화면 색인](../../system-design-to-be.md#7-화면--사용자는-어디를-오가나) · [Navigation](../navigation/delete-link.md)


**크기 표기**: 도표의 가중치는 영역 관계를 읽기 위한 값이며 코드의 실제 폭이나 픽셀 비율이 아니다. 실제 flex/grid·고정 크기·반응형 조건은 아래 소스 근거를 따른다. 단, NewLink의 3:2와 1:1 열 관계처럼 명시한 grid 관계는 소스에서 확인한 사실이다.

```layout
DeleteLink V Title, Separator, ConfirmationText, ShiftTip, DeleteAction
```

| 영역 | 입력·출력 | 상호작용·상태 | 근거 |
|---|---|---|---|
| Title/ConfirmationText | 번역문 | link삭제위험안내. 링크별별도요약없음 | `components/ModalContent/DeleteLinkModal.tsx:42–47` |
| ShiftTip | infoalert | shift키로우회가능안내 | :49–54 |
| DeleteAction | link.id | mutateAsync미await→detail/preserved면dashboard→close, disabled/pending없음 | :28–37/:56–59, [Browser JF-5](../../../as-is/details/browser.md#jf-5-상세-query와-편집삭제-mutation--usegetlink--useupdatelink--usedeletelink) |

Modal desktop중앙/mobile90%bottomsheet는[NewLink shell](new-link.md)과같다. 취소는shellX/backdrop이며전용Cancel버튼없음. 오류시모달은이미닫혀있고hook이cache를복원한다.
