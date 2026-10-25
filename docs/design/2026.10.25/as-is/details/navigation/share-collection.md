# 공유 설정 — AS-IS Navigation

> **DATE** 2026.10.25 · **기준** `952ac454` 소스 역추출. 실제 브라우저 관찰 전.
> [Job Flow](../jobflow/share-collection.md) · [핵심 화면](../../system-design-as-is.md#7-화면)

진입: 개인 collection의 공유 메뉴 또는 공개 collection의 team avatar를 누른다.

```navigation
CollectionLinks --> SharingDialog : 공유 메뉴
PublicCollection --> TeamDialog : 팀 아바타
SharingDialog --> (/save_collection) : 저장
(/save_collection) --> CollectionLinks : 저장 성공
(/save_collection) --> SharingDialog : 오류와 초안 유지
SharingDialog --> CollectionLinks : 취소 또는 닫기
TeamDialog --> PublicCollection : 닫기
```

| 화면·판단 | 주소·소유·Layout | 실제 근거·계약 |
|---|---|---|
| CollectionLinks | [Links](../layout/links.md) | collections/[id].tsx의sharing state |
| PublicCollection | [Layout](../layout/public-collection.md) | public collection:131 |
| SharingDialog/TeamDialog | [Layout](../layout/collection-sharing.md) | owner/private여부에따른변형 |
| save_collection | PUT collection | [API JF-8](../web-api.md#jf-8-공유-권한-변경과-하위-컬렉션-전파--updatecollection) |

공개 toggle과 AddMember는 저장 전 draft만 바꾼다. dialog는 server onSettled 성공에서만 닫힌다. 공개 URL 복사는 서버상태를 바꾸지 않으며 별도 URL 직접 진입은 [공개 읽기](view-public.md)다. 닫기에는 dirty guard가 없다.
