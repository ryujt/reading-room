# Login — AS-IS Layout

> **DATE** 2026.10.25 · **기준** `952ac454` 소스 역추출. 브라우저 픽셀 관찰 전.
> **주소·식별자** `/login` · **소유** Browser
> [핵심 화면 색인](../../system-design-as-is.md#7-화면) · [Navigation](../navigation/access.md)


**크기 표기**: 도표의 가중치는 영역 관계를 읽기 위한 값이며 코드의 실제 폭이나 픽셀 비율이 아니다. 실제 flex/grid·고정 크기·반응형 조건은 아래 소스 근거를 따른다. 단, NewLink의 3:2와 1:1 열 관계처럼 명시한 grid 관계는 소스에서 확인한 사실이다.

```layout
Login V Logo, Heading, Form
Form V DemoNotice, UsernameOrEmail, PasswordGroup, LoginButton, ProviderSeparator, ProviderButtons, RegistrationLink
PasswordGroup V Password, ForgotLink
```

그림은 credentials·email·외부 provider·registration이 활성이고, demo 설정과 demo 사용자·암호가 모두 있는 경우다. `displayLoginCredential()` 전체는 credentials 활성에만 나오며 DemoNotice는 위 demo 조건일 때만, ForgotLink는 email provider일 때만, ProviderSeparator는 credentials와 provider가 함께 있을 때만 나온다. 해당 조건이 꺼지면 그 영역을 제거하고 뒤 영역을 앞당긴다. Credentials가 **외부 provider 버튼보다 먼저**다.

| 영역 | 입력·출력 | 동작·상태 | 소스 |
|---|---|---|---|
| UsernameOrEmail/Password | form.username/password | onChange, form.submit→credentials 로그인. username 최초 focus. email설정은 placeholder와 안내에 영향 | `apps/web/pages/login.tsx:153–175` |
| LoginButton | submitLoader | pending disabled. 실패toast, Email not verified면 confirmation으로 이동 | :188–196, [Browser JF-2](../browser.md#jf-2-인증-입력과-화면-가드--loginuser--authredirect) |
| ForgotLink | email설정 | `/forgot` | :177–184 |
| ProviderButtons | server availableLogins.buttonAuths | loginUserButton(method), pending disabled, 외부provider로 이동 | :210–239 |
| RegistrationLink | 등록가능 설정 | `/register` | :242–257 |
| DemoNotice | demo환경 | 안내·외부 cloud 링크·demo 버튼. 버튼은 필드를 채운 뒤 credentials signIn도 즉시 호출 | :95–149 |

진입은 익명 로그인 과업이며 인증 상태에 따른 화면 유지·이동은 [Browser JF-2](../browser.md#jf-2-인증-입력과-화면-가드--loginuser--authredirect)와 연결된다. 일반 로그인 성공 후 별도 성공 카드가 추가되지 않는다. 빈 입력·인증 실패는 toast를 표시하고 필드는 유지한다. `loginUser`와 외부 버튼 handler에는 try/finally가 없어 signIn Promise 자체가 reject하면 loader 해제가 보장되지 않는다(:40–87).

CenteredForm은 `apps/web/components/CenteredForm.tsx:13`이 소유한다. :23의 min-h-screen·p5·중앙정렬 안에서 logo(:29), 조건부 heading(:37), 조건부 text(:42), children(:47) 순서다. 표의 form은 children이며 login의 max-width는28rem, min-width20rem, width100%다(:265). 별도 desktop/mobile markup은 없다. min-width와 outer padding이 작은 폭에 미치는 실제 픽셀 결과는 아직 미검증이다. Toast는 form 내부 error 영역이 아닌 _app의 공통 overlay다. 전역 AuthRedirect의 session loading 중에는 이 화면 대신 빈 fragment이며 별도 skeleton은 없다.
