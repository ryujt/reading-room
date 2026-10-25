# 공개 읽기 — TO-BE 유지 Navigation

> **목표 기준** 2026.10.25 · **AS-IS 대비** 유지. [이번 기준선 원본](../../../as-is/details/navigation/view-public.md)의 도표와 내부 계약을 목표에서도 유지한다. 아래 코드는 upstream 952ac454의 확인된 근거이며 목표 실행을 검증했다는 뜻이 아니다. [목표 핵심](../../system-design-to-be.md) C-05의 회귀 검증 대상이다.

> **DATE** 2026.10.25 · **기준** `952ac454` 소스 역추출. 실제 브라우저 관찰 전.
> [Job Flow](../jobflow/view-public.md) · [핵심 화면](../../system-design-to-be.md#7-화면--사용자는-어디를-오가나)

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
