# Collection sharing/team — TO-BE 유지 Layout

> **목표 기준** 2026.10.25 · **AS-IS 대비** 유지. [이번 기준선 원본](../../../as-is/details/layout/collection-sharing.md)의 도표와 내부 계약을 목표에서도 유지한다. 아래 코드는 upstream 952ac454의 확인된 근거이며 목표 실행을 검증했다는 뜻이 아니다. [목표 핵심](../../system-design-to-be.md) C-05의 회귀 검증 대상이다.

> **DATE** 2026.10.25 · **기준** `952ac454` 소스 역추출. 브라우저 픽셀 관찰 전.
> **주소·식별자** `EditCollectionSharingModal` overlay · **소유** Browser
> [핵심 화면 색인](../../system-design-to-be.md#7-화면--사용자는-어디를-오가나) · [Navigation](../navigation/share-collection.md)


**크기 표기**: 도표의 가중치는 영역 관계를 읽기 위한 값이며 코드의 실제 폭이나 픽셀 비율이 아니다. 실제 flex/grid·고정 크기·반응형 조건은 아래 소스 근거를 따른다. 단, NewLink의 3:2와 1:1 열 관계처럼 명시한 grid 관계는 소스에서 확인한 사실이다.

```layout
Sharing V Title, Separator, PublicToggle, PublicURLConditional, OwnerSeparator, AddMember, MemberList, PropagateChoice, Save
AddMember > MemberIdentifier : 85, Add : 15
MemberList V OwnerRow, MemberRows
MemberRows > Person : 65, RoleAndRemove : 35
```

| 영역 | 입력·출력 | 상호작용·상태 | 근거 |
|---|---|---|---|
| PublicToggle | localcollection.isPublic | owner+private에서만toggle. 저장전URL표시가먼저바뀜 | `ModalContent/EditCollectionSharingModal.tsx:126–151` |
| PublicURL | 현재origin/public/collections/id | isPublic일때만copyrow, 긴URL가로스크롤 | :153–160 |
| AddMember | identifier | owner+private전용, Enter/버튼lookup후draft에append | :167–207, [Browser JF-6](../../../as-is/details/browser.md#jf-6-공유-dialog의-draft와-저장--submit--addmembertocollection) |
| MemberList | owner와members | members[0].user있을때만ownerrow도표시, roleviewer/contributor/admin,제거 | :209–268 이후 |
| Propagate/Save | boolean/draft | owner전용. server성공만close;실패draft유지 | :44/:50–75, 하단JSX |

publicroute나비owner의Team변형은PublicToggle/AddMember/권한편집/Save를숨기고공개URL·멤버읽기만남긴다. Modal은mobileverticalsheet/desktopcentral. API는owner만허용하며canUpdate회원의화면권한과혼동하지않는다. [API JF-8](../../../as-is/details/web-api.md#jf-8-공유-권한-변경과-하위-컬렉션-전파--updatecollection).
