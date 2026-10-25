# 화면 초기 데이터 읽기 — AS-IS Job Flow

> DATE 2026.10.25 · 기준 `952ac454` · 소스 분석, 실행 전
> [핵심](../../system-design-as-is.md#5-흐름) · [Navigation](../navigation/initial-data.md)

## 1. 목적·트리거·완료

- 트리거: AuthRedirect와 Sidebar의 hook mount.
- 완료: 자기 사용자·공개 config·허용 collections가 각 cache에 들어가 가드와 입력 선택지를 제공한다.
- Browser가 입력과 표시를, API가 해당 계약과 영속 결과를 소유한다.

## 2. 그림과 계약

```jobflow
scope: initial_data
Object: Browser, API
Browser.mountUser --> API.getSelfUser
API.getSelfUser.response --> Browser.receiveUser
Browser.mountConfig --> API.getConfig
API.getConfig.response --> Browser.receiveConfig
Browser.mountCollections --> API.getCollections
API.getCollections.response --> Browser.receiveCollections
```

| 노드 | 실제 계약 |
|---|---|
| Browser.mountUser / mountConfig / mountCollections | 각 hook의 독립 query 등록/실행. user/collections는 인증 가드, config는 웹 비인증에도 실행. |
| API.getSelfUser | GET `/api/v1/users/:id`;400 invalid id,401 token/타인,200 자기 정보,404 user 없음. 요청 id와 token id의 차이는 상세에 기록. |
| API.getConfig | GET `/api/v1/config`;200 공개 환경 설정. DB 호출 없음. |
| API.getCollections | GET `/api/v1/collections`; 인증된 owner/member 목록과 count/order,200. |
| Browser.receiveUser / receiveConfig / receiveCollections | 공개 API가 아닌 각 query 결과의 cache/render 다음 동작. 하나가 다른 query를 직접 호출하지 않음. |

## 3. 내부 추적

| 상위 노드 | 실제 진입·호출 근거 | 내부 Job Flow | 판정·중단 이유 |
|---|---|---|---|
| Browser.mountUser / mountConfig / mountCollections | `packages/router/user.tsx:24`, `config.tsx:63`, `collections.tsx:86` | [내부](../browser.md#jf-12-초기-읽기와-개인-표시-설정--useuser--useconfig--usecollections--useupdateuserpreference) | 펼침 — 실제 호출·조건·결과 소비 |
| API.getSelfUser | `apps/web/pages/api/v1/users/[id]/index.ts:13–42` | [내부](../web-api.md#jf-16-초기-읽기와-표시-설정--getuserbyid--getcollection--updateuserpreference) | 펼침 — 실제 호출·조건·결과 소비 |
| API.getConfig | `apps/web/pages/api/v1/config/index.ts:4–51` | [내부](../web-api.md#jf-16-초기-읽기와-표시-설정--getuserbyid--getcollection--updateuserpreference) | 펼침 — 실제 호출·조건·결과 소비 |
| API.getCollections | `apps/web/pages/api/v1/collections/index.ts:6–18` | [내부](../web-api.md#jf-16-초기-읽기와-표시-설정--getuserbyid--getcollection--updateuserpreference) | 펼침 — 실제 호출·조건·결과 소비 |
| Browser.receiveUser / receiveConfig / receiveCollections | `packages/router/user.tsx:43`, `config.tsx:78`, `collections.tsx:99` | [내부](../browser.md#jf-12-초기-읽기와-개인-표시-설정--useuser--useconfig--usecollections--useupdateuserpreference) | 펼침 — 실제 호출·조건·결과 소비 |

## 4. 정상 흐름

자기 사용자·공개 config·허용 collections가 각 cache에 들어가 가드와 입력 선택지를 제공한다. 각 노드의 입력 가드와 반환 소비자는 위 내부 그림의 실제 심볼에서 이어진다. 응답선은 원 요청자의 다음 동작을 나타내며 API가 React 함수를 직접 호출한다는 뜻이 아니다.

## 5. 실패·취소·재시도

각 요청은 독립적이며 세 결과가 하나의 snapshot이라는 보장은 없다. user query 오류는 error state가 되고 config hook에는 response.ok 검사가 없다. useInitialData라는 이름의 별도 hook은 local settings만 읽으며 서버 초기화 API가 아니다.

## 6. 근거·한계

유료 결제 구매, 계정 편집·삭제, collection 생성·삭제 관리 자체는 이 초기 읽기와 구분하여 제외한다. 실제 HTTP와 화면 결과는 아직 실행하지 않았다.
