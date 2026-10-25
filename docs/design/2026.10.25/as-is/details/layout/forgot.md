# Forgot password — AS-IS Layout

> **DATE** 2026.10.25 · **기준** `952ac454` 소스 역추출. 브라우저 픽셀 관찰 전.
> **주소·식별자** `/forgot` · **소유** Browser
> [핵심 화면 색인](../../system-design-as-is.md#7-화면) · [Navigation](../navigation/request-reset.md)


**크기 표기**: 도표의 가중치는 영역 관계를 읽기 위한 값이며 코드의 실제 폭이나 픽셀 비율이 아니다. 실제 flex/grid·고정 크기·반응형 조건은 아래 소스 근거를 따른다. 단, NewLink의 3:2와 1:1 열 관계처럼 명시한 grid 관계는 소스에서 확인한 사실이다.

```layout
Forgot V Logo, Heading, Form
Form V Explanation, EmailInput, SendButton, BackToLogin
```

```layout
ForgotSent V SentLogo, SentHeading, SentForm
SentForm V SentExplanation, SentBackToLogin
```

첫 그림은 isEmailSent=false, 둘째는 API의 response.ok 뒤 true가 된 동일 URL의 상태다. 별도 성공 페이지 이동이 아니며 메일이 수신함에 도착했다는 실행 증거도 아니다.

| 영역 | 입력·출력 | 동작·상태 | 소스 |
|---|---|---|---|
| Explanation/EmailInput/SendButton | form.email | nonempty이면POST. email에 autoFocus, pending button disabled | `apps/web/pages/forgot.tsx:62–89` |
| Sent state | isEmailSent | 앞의 3영역을 sent 안내문으로 교체, heading도 email_sent. Back 유지 | :62/:65/:91–98 |
| BackToLogin | `/login` | 저장 draft가드 없음 | :95–98 |

실패는 toast이며 form유지. transport exception에서 loadercleanup이 없다는 한계는 [Browser JF-3](../browser.md#jf-3-등록복구-요청--registeruser--submitrequest--submit)다.

로그인의 ForgotLink 또는 직접 주소로 들어오는 익명 과업이다. email 설정에 따라 로그인 링크가 숨겨지는 것과 이 route가 소스에 존재하는 것은 구분한다. draft와 sent flag는 컴포넌트 state라 새로고침 시 초기화된다. 성공 뒤 같은 화면의 재전송 버튼은 없으며 BackToLogin은 입력/성공 상태 모두 남는다.

CenteredForm은 `apps/web/components/CenteredForm.tsx:13`이 소유한다. :23의 min-h-screen·p5·중앙정렬 안에서 logo(:29), 조건부 heading(:37), 조건부 text(:42), children(:47) 순서다. 표의 화면 전용 form이 children에 들어간다. 별도 desktop/mobile markup은 없으며 min-width 20rem과 outer padding이 작은 폭에 미치는 실제 픽셀 결과는 아직 미검증이다. Toast는 form 내부 error 영역이 아닌 _app의 공통 overlay다.
