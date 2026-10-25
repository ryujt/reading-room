# Register — TO-BE 유지 Layout

> **목표 기준** 2026.10.25 · **AS-IS 대비** 유지. [이번 기준선 원본](../../../as-is/details/layout/register.md)의 도표와 내부 계약을 목표에서도 유지한다. 아래 코드는 upstream 952ac454의 확인된 근거이며 목표 실행을 검증했다는 뜻이 아니다. [목표 핵심](../../system-design-to-be.md) C-05의 회귀 검증 대상이다.

> **DATE** 2026.10.25 · **기준** `952ac454` 소스 역추출. 브라우저 픽셀 관찰 전.
> **주소·식별자** `/register` · **소유** Browser
> [핵심 화면 색인](../../system-design-to-be.md#7-화면--사용자는-어디를-오가나) · [Navigation](../navigation/register.md)


**크기 표기**: 도표의 가중치는 영역 관계를 읽기 위한 값이며 코드의 실제 폭이나 픽셀 비율이 아니다. 실제 flex/grid·고정 크기·반응형 조건은 아래 소스 근거를 따른다. 단, NewLink의 3:2와 1:1 열 관계처럼 명시한 grid 관계는 소스에서 확인한 사실이다.

```layout
Register V Logo, Heading, Description, Form
Form V DisplayName, Identity, Password, PromotionalChoice, RegisterButton, ProviderSeparator, Providers, LegalLinks, LoginLink, SupportLink
```

그림의 전제는 등록 허용·Stripe 활성·외부 provider 존재다. Stripe가 꺼지면 PromotionalChoice/LegalLinks/SupportLink를 제거하고 설명을 일반 등록 안내로 바꾼다. provider가 없으면 separator와 provider 버튼도 제거한다. Identity는 EMAIL_PROVIDER에 따라 email 또는 username 하나다. 아래는 등록 불가 상태의 실제 대체 배치다.

```layout
RegisterDisabled V DisabledLogo, DisabledHeading, DisabledDescription, DisabledMessage
```

| 영역 | 입력·출력 | 동작·상태 | 소스 |
|---|---|---|---|
| Description | STRIPE 설정이면 trial안내, 그외일반안내 | 읽기 전용 | `apps/web/pages/register.tsx:149–157` |
| DisplayName/Identity/Password | name, email 또는 username, password | Identity는 EMAIL_PROVIDER에 따라 하나만 표시. password 최소8은 submit검증 | :167–214, :45–102 |
| PromotionalChoice | acceptPromotionalEmails | Stripe일 때만 checkbox | :216–230 |
| RegisterButton | submitLoader | pending disabled. response.ok 성공이면 email설정에 따라 confirmation 또는 login; 오류toast | :232–239, [Browser JF-3](../../../as-is/details/browser.md#jf-3-등록복구-요청--registeruser--submitrequest--submit) |
| ProviderSeparator/Providers/LoginLink | availableLogins | provider 있으면 separator와외부버튼, login link | :242 이후 |
| Disabled state | DISABLE_REGISTRATION | form 전체를 registration_disabled 문단 하나로 교체 | :160–164 |
| LegalLinks/SupportLink | Stripe 설정 | 약관·privacy 외부 링크, mailto 지원 링크 | :252–273/:287–298 |

익명 가입의 진입점이다. 등록 금지는 form과 로그인 링크까지 포함한 전체 children 분기를 바꾸며, logo/heading/description은 남는다. DisplayName에 autoFocus가 있고 email은 native email input이다. 빈 값·짧은 암호·서버의 non-ok 응답은 toast이며 draft는 유지된다. 전송 자체의 예외를 회수하는 catch/finally는 없어 pending 해제는 보장되지 않는다(:45–102). config 조회 중 전용 skeleton은 없으며 config가 없는 상태의 조건부 UI를 최종 설정 확인으로 해석하지 않는다.

CenteredForm은 `apps/web/components/CenteredForm.tsx:13`이 소유한다. :23의 min-h-screen·p5·중앙정렬 안에서 logo(:29), 조건부 heading(:37), 조건부 text(:42), children(:47) 순서다. 표의 화면 전용 form이 children에 들어간다. 별도 desktop/mobile markup은 없으며 min-width 20rem과 outer padding이 작은 폭에 미치는 실제 픽셀 결과는 아직 미검증이다. Toast는 form 내부 error 영역이 아닌 _app의 공통 overlay다.
