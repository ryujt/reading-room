# 화면 전수 색인 — AS-IS

> DATE2026.10.25 · source952ac454 · 소스 route·등록·사용자 과업 대조. 브라우저 실행 전.
> [핵심 §7](../../system-design-as-is.md#7-화면)

하나의 renderer를 공유하는 route와 상태는 같은 Layout 파일에서 조건을 설명한다. URL이 없는 주요 dialog도 포함한다. 아래 20개 Layout은 화면 상태·주소의 개수와 같지 않다.

| 화면 | 주소·식별자 | 소유 경계 | Layout | 관련 Navigation | 근거·상태 |
|---|---|---|---|---|---|
| VerifyBridge/VerifyChoice | `/auth/verify?token&email` | Browser | [verify](verify.md) | [access](../navigation/access.md) | 조건부 모바일 선택 UI 및 웹 redirect |
| Login | `/login` | Browser | [login](login.md) | [access](../navigation/access.md) | 각 Layout의 소스·상태·폭별 근거; 전체 의미 검토 전 |
| Register | `/register` | Browser | [register](register.md) | [register](../navigation/register.md) | 각 Layout의 소스·상태·폭별 근거; 전체 의미 검토 전 |
| Confirmation | `/confirmation` | Browser | [confirmation](confirmation.md) | [access](../navigation/access.md) | 각 Layout의 소스·상태·폭별 근거; 전체 의미 검토 전 |
| Forgot/Sent | `/forgot` | Browser | [forgot](forgot.md) | [request-reset](../navigation/request-reset.md) | 각 Layout의 소스·상태·폭별 근거; 전체 의미 검토 전 |
| ResetPassword/Success | `/auth/reset-password` | Browser | [reset-password](reset-password.md) | [reset-password](../navigation/reset-password.md) | 각 Layout의 소스·상태·폭별 근거; 전체 의미 검토 전 |
| Dashboard | `/dashboard` | Browser | [dashboard](dashboard.md) | [browse-links](../navigation/browse-links.md) | 각 Layout의 소스·상태·폭별 근거; 전체 의미 검토 전 |
| Links/Search/Pinned/Collection/Tag | `/links, /search, /links/pinned, /collections/:id, /tags/:id` | Browser | [links](links.md) | [browse-links](../navigation/browse-links.md) | 각 Layout의 소스·상태·폭별 근거; 전체 의미 검토 전 |
| PublicCollection | `/public/collections/:id` | Browser | [public-collection](public-collection.md) | [view-public](../navigation/view-public.md) | 각 Layout의 소스·상태·폭별 근거; 전체 의미 검토 전 |
| LinkDetail/PublicLinkDetail | `/links/:id, /public/links/:id` | Browser | [link-detail](link-detail.md) | [inspect-link](../navigation/inspect-link.md) | 각 Layout의 소스·상태·폭별 근거; 전체 의미 검토 전 |
| LinkDrawer/LinkEdit | `LinkModal overlay` | Browser | [link-drawer](link-drawer.md) | [inspect-link](../navigation/inspect-link.md) | 각 Layout의 소스·상태·폭별 근거; 전체 의미 검토 전 |
| NewLinkModal | `Sidebar overlay` | Browser | [new-link](new-link.md) | [save-link](../navigation/save-link.md) | 각 Layout의 소스·상태·폭별 근거; 전체 의미 검토 전 |
| DeleteConfirm | `DeleteLinkModal overlay` | Browser | [delete-link](delete-link.md) | [delete-link](../navigation/delete-link.md) | 각 Layout의 소스·상태·폭별 근거; 전체 의미 검토 전 |
| RefreshConfirm | `ConfirmationModal refresh variant` | Browser | [refresh-preservation](refresh-preservation.md) | [refresh-preservation](../navigation/refresh-preservation.md) | 각 Layout의 소스·상태·폭별 근거; 전체 의미 검토 전 |
| SharingDialog/TeamDialog | `EditCollectionSharingModal overlay` | Browser | [collection-sharing](collection-sharing.md) | [share-collection](../navigation/share-collection.md) | 각 Layout의 소스·상태·폭별 근거; 전체 의미 검토 전 |
| Preserved/PublicPreserved | `/preserved/:id, /public/preserved/:id` | Browser | [preserved](preserved.md) | [read-preserved](../navigation/read-preserved.md) | 각 Layout의 소스·상태·폭별 근거; 전체 의미 검토 전 |
| HighlightDrawer | `Readable highlight list overlay` | Browser | [highlight-drawer](highlight-drawer.md) | [highlight](../navigation/highlight.md) | 각 Layout의 소스·상태·폭별 근거; 전체 의미 검토 전 |
| SelectionEditor/CommentEditor | `Readable selection popover` | Browser | [highlight-editor](highlight-editor.md) | [highlight](../navigation/highlight.md) | 각 Layout의 소스·상태·폭별 근거; 전체 의미 검토 전 |
| TextStyle | `TextStyleDropdown overlay` | Browser | [text-style](text-style.md) | [read-preserved](../navigation/read-preserved.md) | 각 Layout의 소스·상태·폭별 근거; 전체 의미 검토 전 |
| IconPicker | `IconPopover overlay` | Browser | [icon-picker](icon-picker.md) | [edit-link](../navigation/edit-link.md) | 각 Layout의 소스·상태·폭별 근거; 전체 의미 검토 전 |

## 제외·비화면 판정

| 등록·진입점 | 판정 | 이유와 근거 |
|---|---|---|
| pages/index.tsx | 비화면 고정 redirect | effect:7–9가 /login push. AuthRedirect가 별도 판단하므로 access에 기록 |
| public/collections/[id]/rss.tsx | 비화면 XML 응답 | RSS 채널이며 React 화면을 만들지 않음. 공유 메뉴에서 외부 응답 링크로만 기록 |
| pages/auth/verify-email.tsx | 제외 업무 | 설정에서 이메일 변경 확인(sendChangeEmailVerificationRequest)의 별도 경로. 로그인 메일의 /auth/verify와 다름 |
| api/v1/auth/verify-email*, request-verification-email | API 처리 | 별도 화면이 아니며 Pages UI route로 세지 않음. NextAuth 웹 email signIn과 동일하다고 가정하지 않음 |
| subscribe/member-onboarding | 범위 밖 목적지 | AuthRedirect의 분기는 보존하되 유료 구매·초대 계정 설정 독립 업무는 이번 개인독서 범위 밖 |
| `/collections` 독립 collection 카드 목록 | 제외한 관리 탐색 화면 | `apps/web/pages/collections/index.tsx:21`의 owner별 카드·local sort·새 collection 진입. `/collections/:id`의 링크 읽기와 다른 컬렉션 관리 landing이며 이번 개인 링크 읽기 범위 밖. 초기 useCollections 계약만 공유 |
| admin/settings 전체, collection CRUD, bulk 편집·삭제, import/new file, RSS/AI 관리 | 제외 업무 | 화면의 존재·진입 메뉴는 source에서 확인. 개인 URL 저장·상세·공유·보존 읽기의 직접 과업에 필요한 계약만 확장 |
| banner upload·native file chooser | 제외 파일관리 동작 | LinkDetails에 조건부 input이 있지만 URL 저장의 필수 화면이 아님. native picker를 가짜 React 화면으로 만들지 않음 |
| apps/mobile, apps/extension | 제외 플랫폼 | 웹 Reading Room 범위. 공유 hooks의 auth 인자는 계약에서만 언급 |
| 외부 원문·SSO provider·SMTP 링크 클라이언트 | 외부 화면 | URL과 callback 접점만 분석; 외부사이트 Layout을 생성하지 않음 |

읽기상태 Unread/Reading/Finished와 링크별 한줄감상 화면은 원본에 없다. Highlight.comment를 그 기능의 기존 구현으로 표시하지 않는다.
