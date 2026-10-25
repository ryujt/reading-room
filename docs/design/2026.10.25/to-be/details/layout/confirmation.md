# Email confirmation — TO-BE 유지 Layout

> **목표 기준** 2026.10.25 · **AS-IS 대비** 유지. [이번 기준선 원본](../../../as-is/details/layout/confirmation.md)의 도표와 내부 계약을 목표에서도 유지한다. 아래 코드는 upstream 952ac454의 확인된 근거이며 목표 실행을 검증했다는 뜻이 아니다. [목표 핵심](../../system-design-to-be.md) C-05의 회귀 검증 대상이다.

> **DATE** 2026.10.25 · **기준** `952ac454` 소스 역추출. 브라우저 픽셀 관찰 전.
> **주소·식별자** `/confirmation?email=...` · **소유** Browser
> [핵심 화면 색인](../../system-design-to-be.md#7-화면--사용자는-어디를-오가나) · [Navigation](../navigation/access.md)


**크기 표기**: 도표의 가중치는 영역 관계를 읽기 위한 값이며 코드의 실제 폭이나 픽셀 비율이 아니다. 실제 flex/grid·고정 크기·반응형 조건은 아래 소스 근거를 따른다. 단, NewLink의 3:2와 1:1 열 관계처럼 명시한 grid 관계는 소스에서 확인한 사실이다.

```layout
Confirmation V Logo, Heading, Details
Details V Explanation, EmailAddress, ResendButton
```

| 영역 | 입력·출력 | 동작·상태 | 소스 |
|---|---|---|---|
| Explanation/EmailAddress | route.query.email | 비어 있지 않은 string인 경우만 이메일 문단 표시, break-all | `apps/web/pages/confirmation.tsx:39–47` |
| ResendButton | submitLoader | email없음/진행 중이면 handler가 반환. 버튼 자체는 disabled로 바뀌지 않음. signIn email 후 toast, 같은 화면 | :17–35/:49 이후 |

새로고침은 query로 이메일을 재표시하며 password/token을 화면에 표시하지 않는다. 성공toast는 signIn의 res.ok를 확인하지 않고 발생한다. [Browser JF-3](../../../as-is/details/browser.md#jf-3-등록복구-요청--registeruser--submitrequest--submit).

그림은 비어 있지 않은 string email query가 있는 입력이다. query가 없으면 EmailAddress 영역만 제거되고 ResendButton은 그대로 보인다. 이 버튼은 handler에서 아무 작업 없이 반환한다. 가입 또는 미인증 email 로그인에서 진입하며, 실제 메일 검증 완료 여부를 자동 polling해 이 페이지에서 완료 표시로 바꾸는 로직은 없다. signIn 자체 reject 시 loader를 정리하는 catch/finally도 없다.

CenteredForm은 `apps/web/components/CenteredForm.tsx:13`이 소유한다. :23의 min-h-screen·p5·중앙정렬 안에서 logo(:29), 조건부 heading(:37), 조건부 text(:42), children(:47) 순서다. 표의 화면 전용 영역이 children에 들어간다. 별도 desktop/mobile markup은 없으며 min-width 20rem과 outer padding이 작은 폭에 미치는 실제 픽셀 결과는 아직 미검증이다. Toast는 form 내부 error 영역이 아닌 _app의 공통 overlay다.
