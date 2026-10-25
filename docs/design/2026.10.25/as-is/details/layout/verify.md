# 이메일 링크 bridge — AS-IS Layout

> DATE 2026.10.25 · 기준 `952ac454` · 소스 분석, 브라우저 실행 전
> 주소 `/auth/verify?token&email` · [Navigation](../navigation/access.md) · [Browser JF-10](../browser.md#jf-10-이메일-링크의-웹-bridge--verify)

다음 화면은 모바일 UA이고 config.MOBILE_APP_REDIRECT_ENABLED가 true일 때만 표시된다. 나머지는 redirect 처리 또는 내용 없는 초기 상태이며 독립 성공 화면이 아니다.

```layout
VerifyScreen V CenteredForm
CenteredForm V VerifyHeading, AppButton, BrowserButton
```

| 영역 | 입력·출력 | 상호작용·상태 | 소스 |
|---|---|---|---|
| CenteredForm | token/email/config/mobile | verify_your_email 제목과 두 버튼. app href를 자동 지정한 뒤 수동 선택도 남음 | `apps/web/pages/auth/verify.tsx:54–74` |
| AppButton | appUrl() | linkwarden scheme으로 다시 이동. native 앱 내부는 범위 제외 | :58–63 |
| BrowserButton | webUrl | `/api/v1/auth/callback/email`로 이동 | :64–69 |
| 내용 없는 상태 | router/config 대기 또는 web 분기 | missing token/email→login, web→location.replace. 오류 전용 화면/자동 fallback timer 없음 | :35–51/:72 |

버튼 컨테이너는 max-w-[30rem]·min-w-80·w-full·mx-auto·flex-col·gap-3(:56)다. 같은 두 버튼 구조를 사용하고 화면폭별 재배치 분기는 없다. CenteredForm의 공통 배치와 padding은 [Login](login.md)을 재사용한다. DSL은 포함·순서만 표시하며 실제 픽셀 측정이 아니다.
