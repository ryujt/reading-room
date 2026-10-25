# Reset password — AS-IS Layout

> **DATE** 2026.10.25 · **기준** `952ac454` 소스 역추출. 브라우저 픽셀 관찰 전.
> **주소·식별자** `/auth/reset-password?token=...` · **소유** Browser
> [핵심 화면 색인](../../system-design-as-is.md#7-화면) · [Navigation](../navigation/reset-password.md)


**크기 표기**: 도표의 가중치는 영역 관계를 읽기 위한 값이며 코드의 실제 폭이나 픽셀 비율이 아니다. 실제 flex/grid·고정 크기·반응형 조건은 아래 소스 근거를 따른다. 단, NewLink의 3:2와 1:1 열 관계처럼 명시한 grid 관계는 소스에서 확인한 사실이다.

```layout
Reset V Logo, Heading, Form
Form V Instruction, NewPassword, UpdateButton
```

```layout
ResetSuccess V LogoSuccess, HeadingSuccess, SuccessForm
SuccessForm V SuccessMessage, BackToLogin
```

| 영역 | 입력·출력 | 동작·상태 | 소스 |
|---|---|---|---|
| NewPassword | password, 최초query.token은 화면에 보이지 않는 React state | autoFocus, submit POST, pending button disabled | `apps/web/pages/auth/reset-password.tsx:21–24/:71–94` |
| SuccessMessage/BackToLogin | requestSent | 성공이면입력전체제거, `/login` 링크표시 | :95–105 |
| Error | API의 non-ok 응답 또는 transport | non-ok는 toast+form유지; transport실패는cleanup부족 | [Browser JF-3](../browser.md#jf-3-등록복구-요청--registeruser--submitrequest--submit) |

복구 메일의 token query를 가진 익명 사용자가 진입한다. 유효 token 여부는 화면 배치로 확인되지 않으며 실제 판단은 서버 계약에 있다. token은 초기 useState에서 읽고 화면 input으로 노출하지 않는다. 소스의 `form.token !== ""` 조건을 엄격한 token 존재/유효성 검사라고 바꾸어 설명하지 않는다. URL query 변경 뒤 state 동기화 effect도 없다(:21–24). 새로고침 시 password와 requestSent는 초기화되며, 성공 상태에서만 로그인 링크가 나타난다. 완료 후 자동 로그인은 이 화면의 동작이 아니다.

CenteredForm은 `apps/web/components/CenteredForm.tsx:13`이 소유한다. :23의 min-h-screen·p5·중앙정렬 안에서 logo(:29), 조건부 heading(:37), 조건부 text(:42), children(:47) 순서다. 표의 화면 전용 form이 children에 들어간다. 별도 desktop/mobile markup은 없으며 min-width 20rem과 outer padding이 작은 폭에 미치는 실제 픽셀 결과는 아직 미검증이다. Toast는 form 내부 error 영역이 아닌 _app의 공통 overlay다.
