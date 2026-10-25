# 공개 읽기 — AS-IS Navigation

> **DATE** 2026.10.25 · **기준** `952ac454` 소스 역추출. 실제 브라우저 관찰 전.
> [Job Flow](../jobflow/view-public.md) · [핵심 화면](../../system-design-as-is.md#7-화면)

진입: 공유URL을 직접 열며 auth_guard의 public허용 분기로 들어온다.

```navigation
PublicCollection --> TeamDialog : 팀 보기
TeamDialog --> PublicCollection : 닫기
PublicCollection --> LinkDrawer : 링크 정보
LinkDrawer --> PublicCollection : 닫기
PublicCollection --> PublicPreserved : 보존 형식 열기
PublicLinkDetail --> PublicPreserved : 보존 형식 새 탭
PublicCollection --> Dashboard : metadata 400
Dashboard --> Login : 비인증 보호 경로
```

| 화면·판단 | 주소·소유·Layout | 실제 근거·계약 |
|---|---|---|
| PublicCollection | [Layout](../layout/public-collection.md) | metadataeffect:73–83 |
| TeamDialog | [Layout](../layout/collection-sharing.md) | 읽기전용변형 |
| LinkDrawer/PublicLinkDetail | [Drawer](../layout/link-drawer.md), [Detail](../layout/link-detail.md) | publicflags |
| PublicPreserved | `/public/preserved/:id`, [Layout](../layout/preserved.md) | viewer공유 |
| Dashboard/Login | [Dashboard](../layout/dashboard.md), [Login](../layout/login.md) | metadata400과AuthRedirect의연속 |

공개 목록의 검색/tag/sort는 같은publicroute의query를 바꾼다. 공개 상세 API가200null일때 오류 전용 경로를 만들지 않는다. RSS 링크는 XML응답이며 사용자화면 Layout은 없다. 공개 상태를 읽는 각 API의 조건은 JobFlow에서 추적한다.
