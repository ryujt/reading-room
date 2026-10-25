# Web API/Auth (Next HTTP) — AS-IS 상세

> **대상**: `apps/web/pages/api/v1/links/index.ts`, `apps/web/lib/api/controllers/links/postLink.ts`와 직접 협력자 · **기준**: `952ac454`·2026.10.25
> **근거 색인**: [브리프](../../_evidence-brief.md) · **상태**: 범위 내 소스 분석 후보. 전체 의미 게이트와 실행 검증 전이다.

## 1. 책임 / 비책임

- 책임: 사용자 검증, 저장 입력·컬렉션 생성 권한·중복·용량 판단, link와 tag 관계 저장.
- 비책임: worker를 직접 호출하거나 보존 완료를 기다리는 것.
- 아무도 하지 않는 것: `postLink` 전체를 감싸는 DB/파일 단일 트랜잭션. A-01.

## 2. 공개 계약

각 공개 계약의 전체 입력·응답·실패는 아래 드릴다운 지도에서 연결한 시나리오 §2가 원본이다. 이 표는 대표 저장 계약을 먼저 보여 준다.

| 메서드·경로 | 입력 | 출력 | 오류 | 구현 |
|---|---|---|---|---|
| POST `/api/v1/links` | PostLinkSchemaType JSON, cookie/bearer | 200 `{response: Link+tags+collection}` | 인증 401/404, demo 400, schema/collection/용량 400, duplicate 409, 처리되지 않은 예외 | `apps/web/pages/api/v1/links/index.ts:9`, POST 분기:32 |

## 3. 내부 Job Flow — 드릴다운

**결론**: `links`가 인증과 HTTP 응답을 맡고, `postLink`가 저장 정책을 조율한다. 컬렉션 결정·용량 검사·원문 조회는 실제 별도 함수이며, DB 쓰기는 controller 안에도 직접 존재한다.

상위 [저장 시나리오](jobflow/save-link.md)의 API 노드를 아래에서 연다. 외부 `Database`는 생성된 Prisma client delegate에 대한 호출에서 연결한다.

| 상위 §5 노드 | L1 그림 | L2 이하 |
|---|---|---|
| [API.postLink](jobflow/save-link.md#2-그림과-계약) | [JF-1](#jf-1-post-분기--links) | [JF-1.1](#jf-11-사용자-검증--verifyuser), [JF-1.2](#jf-12-저장-정책과-영속화--postlink), [JF-1.2.1](#jf-121-컬렉션-결정과-생성-권한--setcollection), [JF-1.2.2](#jf-122-용량-판단--haspassedlimit) |

**표기**: module 별칭의 뒤는 실제 함수명이다. `prismaUser/Collection/Link/AccessToken/Subscription`은 각각 `prisma.user/collection/link/accessToken/subscription` delegate다. `res.json`은 `res.status(...).json(...)`의 마지막 실제 메서드다. 값 포트(valid/denied 등)는 아래 표의 코드 조건을 설명하는 이름이며 새로운 함수가 아니다. 모든 줄은 기준 커밋의 파일 기준이다.


**확장 시나리오 드릴다운 지도** — 각 시나리오 §3의 전수 판정과 연결한다. 같은 hook을 공유하는 변형은 같은 내부 그림을 재사용한다.

| 상위 §5 노드 | L1 그림 | L2 이하 |
|---|---|---|
| [API.authenticate](jobflow/access.md#3-상위-노드-내부-추적) | [API 내부](#jf-2-인증-provider와-callback--auth--authorize--callbacks) | 상세의 호출·분기·말단 표 |
| [API.searchLinks](jobflow/browse-links.md#3-상위-노드-내부-추적) | [API 내부](#jf-6-검색과-접근-가능한-컬렉션--searchlinks--getaccessiblecollectionids) | 상세의 호출·분기·말단 표 |
| [API.getDashboard](jobflow/browse-links.md#3-상위-노드-내부-추적) | [API JF-13](#jf-13-dashboard-section별-조회--getdashboarddata) | 상세의 호출·분기·말단 표 |
| [API.getTag](jobflow/browse-links.md#3-상위-노드-내부-추적) | [API JF-15](#jf-15-태그별-목록-metadata--gettagbyid--gettags) | 상세의 호출·분기·말단 표 |
| [API.deleteLink](jobflow/delete-link.md#3-상위-노드-내부-추적) | [API 내부](#jf-7-개인-링크-상세수정삭제--getlinkbyid--updatelinkbyid--deletelink) | 상세의 호출·분기·말단 표 |
| [API.updateLink](jobflow/edit-link.md#3-상위-노드-내부-추적) | [API 내부](#jf-7-개인-링크-상세수정삭제--getlinkbyid--updatelinkbyid--deletelink) | 상세의 호출·분기·말단 표 |
| [API.writeHighlight](jobflow/highlight.md#3-상위-노드-내부-추적) | [API 내부](#jf-12-개인-highlight--postorupdatehighlight--getlinkhighlights) | 상세의 호출·분기·말단 표 |
| [API.getHighlights / API.deleteHighlight](jobflow/highlight.md#3-상위-노드-내부-추적) | [API JF-12](#jf-12-개인-highlight--postorupdatehighlight--getlinkhighlights) | 상세의 호출·분기·말단 표 |
| [API.getSelfUser](jobflow/initial-data.md#3-내부-추적) | [내부](#jf-16-초기-읽기와-표시-설정--getuserbyid--getcollection--updateuserpreference) | 상세의 호출·분기·말단 표 |
| [API.getConfig](jobflow/initial-data.md#3-내부-추적) | [내부](#jf-16-초기-읽기와-표시-설정--getuserbyid--getcollection--updateuserpreference) | 상세의 호출·분기·말단 표 |
| [API.getCollections](jobflow/initial-data.md#3-내부-추적) | [내부](#jf-16-초기-읽기와-표시-설정--getuserbyid--getcollection--updateuserpreference) | 상세의 호출·분기·말단 표 |
| [API.getLink](jobflow/inspect-link.md#3-상위-노드-내부-추적) | [API 내부](#jf-7-개인-링크-상세수정삭제--getlinkbyid--updatelinkbyid--deletelink) | 상세의 호출·분기·말단 표 |
| [API.getArchive](jobflow/read-preserved.md#3-html-별도-host-경로) | [API JF-11](#jf-11-보존-파일-접근-정책과-직접-전송--handleget--resolveaccessiblearchive) | 상세의 호출·분기·말단 표 |
| [API.issueToken](jobflow/read-preserved.md#3-html-별도-host-경로) | [API JF-11.1](#jf-111-서명-url-발급과-별도-host-조회--handler--createpreservedformaturl) | 상세의 호출·분기·말단 표 |
| [ContentHost.view](jobflow/read-preserved.md#3-html-별도-host-경로) | [API JF-11.1](#jf-111-서명-url-발급과-별도-host-조회--handler--createpreservedformaturl) | 상세의 호출·분기·말단 표 |
| [API.putPreference](jobflow/reader-preference.md#3-내부-추적) | [내부](#jf-16-초기-읽기와-표시-설정--getuserbyid--getcollection--updateuserpreference) | 상세의 호출·분기·말단 표 |
| [API.refreshArchive](jobflow/refresh-preservation.md#3-상위-노드-내부-추적) | [API 내부](#jf-10-보존-갱신-요청--links) | 상세의 호출·분기·말단 표 |
| [API.registerUser](jobflow/register.md#3-상위-노드-내부-추적) | [API 내부](#jf-3-가입과-선택적-기존-사용자-조회--postuser--isauthenticatedrequest) | 상세의 호출·분기·말단 표 |
| [API.requestPasswordReset](jobflow/request-reset.md#3-상위-노드-내부-추적) | [API 내부](#jf-4-비밀번호-재설정-요청과-실제-발송--forgotpassword--sendpasswordresetrequest) | 상세의 호출·분기·말단 표 |
| [API.resetPassword](jobflow/reset-password.md#3-상위-노드-내부-추적) | [API 내부](#jf-5-비밀번호-재설정-소비--resetpassword) | 상세의 호출·분기·말단 표 |
| [API.postLink](jobflow/save-link.md#3-내부-추적) | [API JF-1](#jf-1-post-분기--links) · [postLink](#jf-12-저장-정책과-영속화--postlink) · [setCollection](#jf-121-컬렉션-결정과-생성-권한--setcollection) · [capacity](#jf-122-용량-판단--haspassedlimit) | 상세의 호출·분기·말단 표 |
| [API.updateCollection](jobflow/share-collection.md#3-상위-노드-내부-추적) | [API 내부](#jf-8-공유-권한-변경과-하위-컬렉션-전파--updatecollection) | 상세의 호출·분기·말단 표 |
| [Auth.emailCallback](jobflow/verify-email-link.md#3-내부-추적) | [내부](#jf-2-인증-provider와-callback--auth--authorize--callbacks) | 상세의 호출·분기·말단 표 |
| [API.getPublicCollection](jobflow/view-public.md#3-상위-노드-내부-추적) | [API 내부](#jf-9-공개-링크와-공개-컬렉션--getpubliccollection--getlinkbyid) | 상세의 호출·분기·말단 표 |
| [API.searchPublicLinks](jobflow/view-public.md#3-상위-노드-내부-추적) | [API JF-9](#jf-9-공개-링크와-공개-컬렉션--getpubliccollection--getlinkbyid) · [JF-6](#jf-6-검색과-접근-가능한-컬렉션--searchlinks--getaccessiblecollectionids) | 상세의 호출·분기·말단 표 |
| [API.getPublicLink](jobflow/view-public.md#3-상위-노드-내부-추적) | [API JF-9](#jf-9-공개-링크와-공개-컬렉션--getpubliccollection--getlinkbyid) | 상세의 호출·분기·말단 표 |

### JF-1 POST 분기 — links

공통 구간에서 `verifyUser`의 결과는 user 또는 null뿐이다. demo 여부는 **Route.links**가 인증 후 환경변수로 판단한다.

```jobflow
orchestrator: Route
Object: Route, Auth
Route.links --> Auth.verifyUser
Auth.verifyUser.null
Auth.verifyUser.user
```

**쓰기 구간의 전제**: 앞 구간에서 user를 받았고, `req.method === POST`, `NEXT_PUBLIC_DEMO !== true`이다. 판단 위치는 Route.links:32–39다.

```jobflow
orchestrator: Route
Object: Route, Controller, res
Route.links --> Controller.postLink
Controller.postLink.result --> res.json
```

**demo 거절 구간의 전제**: user를 받았고 POST이며 `NEXT_PUBLIC_DEMO === true`다. 같은 Route.links가 `postLink`를 생략하고400을 쓴다.

```jobflow
orchestrator: Route
Object: Route, res
Route.links --> res.json
```

세 그림의 Route.links는 같은 handler의 조건별 구간이다. 실제 재호출을 뜻하지 않는다.

| 노드 | 코드 | 비고 |
|---|---|---|
| Route.links | `apps/web/pages/api/v1/links/index.ts:9` | Next pages file routing의 default export. POST 요청에서 시작 |
| Auth.verifyUser | `apps/web/pages/api/v1/links/index.ts:10` | await, null이면 handler도 return:11. 인증 오류 응답은 verifyUser가 이미 작성 |
| Controller.postLink | `apps/web/pages/api/v1/links/index.ts:39` | `req.body,user.id` 전달. 쓰기 구간의 환경 조건은 Route.links가 판단:32–39 |
| res.json | `apps/web/pages/api/v1/links/index.ts:40`, `:34` | controller의 status/response를 HTTP에 전달. demo는 400. 두 가지 경로는 택일이며 한 요청에서 한 응답 |

- 성공은 200 응답이다. 보존 상태를 확인하는 호출·worker 알림·큐 publish는 이 handler/controller에 없다.
- controller가 throw하면 이 handler에는 catch가 없다. 프레임워크 오류 경로로 빠지며 `{response: ...}` envelope를 보장하지 않는다. 브라우저의 JSON parsing도 실패할 수 있다.

### JF-1.1 사용자 검증 — verifyUser

**이 그림의 전제**: `NEXT_PUBLIC_EMAIL_PROVIDER !== true`, `STRIPE_SECRET_KEY` 없음. 샘플의 self-host 인증 경로다. 해당 설정을 켠 경로를 이 그림이 포괄하지 않는다.

```jobflow
orchestrator: Auth
Object: Auth, Token, prismaUser, res
Auth.verifyUser --> Token.verifyToken
Token.verifyToken.errorString --> res.json
Token.verifyToken.jwt --> prismaUser.findUnique
prismaUser.findUnique.missing --> res.json
prismaUser.findUnique.missingUsername --> res.json
prismaUser.findUnique.userWithUsername --> Auth.verifyUser.result
```

```jobflow
orchestrator: Token
Object: Token, RequestToken, prismaAccessToken
Token.verifyToken --> RequestToken.getTokenFromRequest
RequestToken.getTokenFromRequest.missingOrExpired --> Token.verifyToken.result
RequestToken.getTokenFromRequest.valid --> prismaAccessToken.findFirst
prismaAccessToken.findFirst.revoked --> Token.verifyToken.result
prismaAccessToken.findFirst.missing --> Token.verifyToken.result
```

| 노드 | 코드 | 비고 |
|---|---|---|
| Auth.verifyUser | `apps/web/lib/api/verifyUser.ts:14` | `verifyToken`:18, token 문자열이면 401+null:20–22 |
| prismaUser.findUnique | `apps/web/lib/api/verifyUser.ts:27` | subscriptions/parentSubscription 포함. 없으면404:37, username 없거나 EMAIL_PROVIDER 조건의 미인증 email이면401:42–57 |
| Subscription.verifySubscription | `apps/web/lib/api/verifyUser.ts:61` | STRIPE_SECRET_KEY 존재 시만 호출. 본문 `billing/verifySubscription.ts:16`, trial/parent active:28, Stripe sync:37, store sync:86. [JF-14](#jf-14-api-구독-가드--verifysubscription)에서 웹 가드의 결과 소비와 오류 변환을 펼침. 독립 store 구매/receipt 내부는 범위 제외 |
| res.json | `apps/web/lib/api/verifyUser.ts:21`, `:38`, `:43`, `:53`, `:64` | 이 함수가 오류 응답을 직접 소유하고 null 반환. handler는 재응답하지 않음 |
| RequestToken.getTokenFromRequest | `apps/web/lib/api/verifyToken.ts:13` | 실제 adapter 본문 `getTokenFromRequest.ts:9`. Bearer 있으면 빈 cookies로 getToken:15, 없으면 req 그대로:19 |
| prismaAccessToken.findFirst | `apps/web/lib/api/verifyToken.ts:25` | jti+revoked 조회. 없거나 만료인 token:16–22는 조회하지 않음. revoked면 오류 문자열, 아니면 JWT:32–36 |

- getTokenFromRequest는 bearer 우선이라는 단일 위임 규칙을 확인한 말단이다. 외부 `next-auth/jwt.getToken` 4.24.15(`yarn.lock:20244`)으로 연결된다.
- `jwt`, `errorString`, `missingOrExpired`는 실제 분기 의미다. query 실패는 catch 없이 상위로 throw된다.
- 샘플 검토 대상의 정상 경로는 STRIPE_SECRET_KEY가 없는 self-host 설정이다. 이 전제를 실제 실행 환경 확인으로 오인하지 않는다. 전체 auth 분석에서 billing guard의 범위와 중단 지점을 확정한다.

### JF-1.2 저장 정책과 영속화 — postLink

다음 A와 B는 같은 `postLink` 실행의 연속이다. A의 용량 통과 이후 B가 실행되며 실제 중간 API/함수는 추가하지 않는다. B의 진입에 같은 함수명을 다시 표시한 것은 별도 호출/재시도가 아니라 읽기 위한 그림 분할이다.

#### JF-1.2A 검사와 컬렉션 결정

**그림 전제**: URL이 있는 입력이다. URL이 없는 입력은 `PostLinkSchema.safeParse` 성공 뒤 SSRF 호출 없이 `shouldPreserveUrl=false`를 두고 `setCollection`부터 같은 검사를 진행한다:27–32. URL 없는 대체 경로의 쓰기 구간은 B의 두 번째 그림에 있다.

```jobflow
orchestrator: Controller
Object: Controller, PostLinkSchema, SSRF, Collection, prismaUser, prismaLink, Capacity
Controller.postLink --> PostLinkSchema.safeParse
PostLinkSchema.safeParse.invalid --> Controller.postLink.result
PostLinkSchema.safeParse.valid --> SSRF.isUrlSafeForServerSideFetch
SSRF.isUrlSafeForServerSideFetch.result --> Collection.setCollection
Collection.setCollection.missing --> Controller.postLink.result
Collection.setCollection.found --> prismaUser.findUnique
prismaUser.findUnique.preventDuplicates --> prismaLink.findFirst
prismaLink.findFirst.exists --> Controller.postLink.result
prismaLink.findFirst.missing --> Capacity.hasPassedLimit
prismaUser.findUnique.allowDuplicates --> Capacity.hasPassedLimit
Capacity.hasPassedLimit.true --> Controller.postLink.result
Capacity.hasPassedLimit.false
```

#### JF-1.2B 메타데이터와 DB·디렉터리 쓰기

**B1 전제**: A의 검사와 용량을 통과했고 `link.url && shouldPreserveUrl`이다. metadata를 호출하는 조건은 Controller.postLink:79가 소유한다.

```jobflow
orchestrator: Controller
Object: Controller, Metadata, prismaLink, Files
Controller.postLink --> Metadata.fetchTitleAndHeaders
Metadata.fetchTitleAndHeaders.result --> prismaLink.create
prismaLink.create.result --> prismaLink.update
prismaLink.update --> Files.createFolder
Files.createFolder --> Controller.postLink.result
```

**B2 전제**: A의 검사와 용량을 통과했지만 URL이 없거나 `shouldPreserveUrl=false`이다. Controller.postLink:79가 metadata 호출을 생략한다. URL이 있는 unsafe 입력이면 create data에 unavailable/lastPreserved가 추가된다:138–147.

```jobflow
orchestrator: Controller
Object: Controller, prismaLink, Files
Controller.postLink --> prismaLink.create
prismaLink.create.result --> prismaLink.update
prismaLink.update --> Files.createFolder
Files.createFolder --> Controller.postLink.result
```

B1/B2는 같은 `prismaLink.create`:104부터 합류하는 택일 경로다. 한 요청에서 create는 한 번이다.

| 노드 | 코드 | 비고 |
|---|---|---|
| Controller.postLink / PostLinkSchema.safeParse | `apps/web/lib/api/controllers/links/postLink.ts:12`, `:16` | invalid이면400:18–24. 공유 schema 선언 `packages/lib/schemaValidation.ts:126`은 URL/type/문자열 길이/tag 입력 규칙 말단 |
| SSRF.isUrlSafeForServerSideFetch | `apps/web/lib/api/controllers/links/postLink.ts:29` | URL 있을 때만 호출. false여도 저장을 거절하지 않음. URL 없으면 false로 두고 다음 단계. [adapter JF-1](adapters.md#jf-1-url-안전성--isurlsafeforserversidefetch) |
| Collection.setCollection | `apps/web/lib/api/controllers/links/postLink.ts:32` | userId/id/name 전달. null이면400:38, 그 전 생성된 collection은 뒤 실패에서 rollback하지 않음 |
| prismaUser.findUnique / prismaLink.findFirst | `apps/web/lib/api/controllers/links/postLink.ts:41`, `:53` | preventDuplicateLinks일 때 www 변형 URL, collection.ownerId=userId에 한정. exists409:62, 없으면 다음 검사. 실제 duplicate 분기와 allowDuplicates 분기는 택일 합류 |
| Capacity.hasPassedLimit | `apps/web/lib/api/controllers/links/postLink.ts:69` | 1개 추가 용량. true면400. false는 그림 A의 종결이 아니라 B로 계속되는 지점 |
| Metadata.fetchTitleAndHeaders | `apps/web/lib/api/controllers/links/postLink.ts:79` | 안전한 URL 있을 때만 호출. 없거나 unsafe면 `{}`를 사용하고 create로 직접 진행. [adapter JF-2](adapters.md#jf-2-제목-조회와-안전한-redirect--fetchtitleandheaders) |
| prismaLink.create | `apps/web/lib/api/controllers/links/postLink.ts:104` | createBy와 collection connect, collection.ownerId 기준 tag connectOrCreate, name/type 계산:81–100. unsafe URL은 lastPreserved와 모든 format=unavailable:138–147 |
| prismaLink.update | `apps/web/lib/api/controllers/links/postLink.ts:153` | 선택적 image path 후속 update. 200에 반환하는 값은 이전 create의 newLink:166이며 update 결과는 버림 |
| Files.createFolder | `apps/web/lib/api/controllers/links/postLink.ts:164` | **동기** `fs.mkdirSync` 또는 S3 no-op. [adapter JF-3](adapters.md#jf-3-디렉터리와-파일-쓰기--createfoldercreatefile). throw하면 이전 create/update는 이미 남음 |
| Controller.postLink.result | `apps/web/lib/api/controllers/links/postLink.ts:166` | `{response:newLink,status:200}`. 저장 완료이며 보존 성공을 의미하지 않음 |

- 안전한 URL의 `lastPreserved` 기본 null은 worker 선택 조건이다. unsafe URL은 저장 시 lastPreserved를 채워 worker 선택에서 제외된다. URL 자체는 DB에 남는다.
- 각 Prisma 호출은 독립적이다. collection 생성→중복/용량 실패, link create→image update 실패, link write→mkdir throw에는 보상 작업이 없다. A-01.
- metadata timeout/fetch 실패는 adapter가 빈 title/headers로 바꾼다. 이름은 입력명→title→URL의 순서로 결정되어 저장은 계속된다.

### JF-1.2.1 컬렉션 결정과 생성 권한 — setCollection

**C1 전제**: collectionId가 truthy다:16. 반환 collection의 owner/members를 해석하는 주체는 setCollection:30–35다.

```jobflow
orchestrator: Collection
Object: Collection, prismaCollection, Permission
Collection.setCollection --> prismaCollection.findUnique
prismaCollection.findUnique.missing --> Collection.setCollection.result
prismaCollection.findUnique.exists --> Permission.getPermission
Permission.getPermission.denied --> Collection.setCollection.result
Permission.getPermission.ownerOrCanCreate --> Collection.setCollection.result
```

**C2 전제**: id 없고 collectionName이 Unorganized다:41–43. 기존 row가 없을 때만 새로 만들며 이름이 명시되었으므로 collectionOrder를 갱신한다.

```jobflow
orchestrator: Collection
Object: Collection, prismaCollection, prismaUser
Collection.setCollection --> prismaCollection.findFirst
prismaCollection.findFirst.exists --> Collection.setCollection.result
prismaCollection.findFirst.missing --> prismaCollection.create
prismaCollection.create.result --> prismaUser.update
prismaUser.update --> Collection.setCollection.result
```

**C3 전제**: id 없고 이름이 truthy이며 Unorganized가 아니다. **findFirst를 호출하지 않는다.** 동명 collection이 있어도 create:58로 간다.

```jobflow
orchestrator: Collection
Object: Collection, prismaCollection, prismaUser
Collection.setCollection --> prismaCollection.create
prismaCollection.create.result --> prismaUser.update
prismaUser.update --> Collection.setCollection.result
```

**C4 전제**: id와 이름이 모두 없다:79. 기본 Unorganized를 조회/생성하지만 collectionOrder update는 없다.

```jobflow
orchestrator: Collection
Object: Collection, prismaCollection
Collection.setCollection --> prismaCollection.findFirst
prismaCollection.findFirst.exists --> Collection.setCollection.result
prismaCollection.findFirst.missing --> prismaCollection.create
prismaCollection.create.result --> Collection.setCollection.result
```

**getPermission 하위 구간**: 이 샘플의 collectionId 입력은 id AND owner/member query 하나로 Collection+members 또는 null을 반환한다. 반환 이후 canCreate 해석은 위 C1의 setCollection이 한다.

```jobflow
orchestrator: Permission
Object: Permission, prismaCollection
Permission.getPermission --> prismaCollection.findFirst
prismaCollection.findFirst.result --> Permission.getPermission.result
```

| 노드 | 코드 | 비고 |
|---|---|---|
| Collection.setCollection | `apps/web/lib/api/setCollection.ts:11` | C1/C2/C3/C4는 원본 if 분기의 상호배타 구간 |
| prismaCollection.findUnique | `apps/web/lib/api/setCollection.ts:18` | missing null. exists는 getPermission에 id 전달:25 |
| Permission.getPermission | `apps/web/lib/api/setCollection.ts:25` | owner 또는 현재 member의 canCreate 검사:30–35. 단순 membership만으로 생성 허용하지 않음 |
| Permission의 findFirst | `apps/web/lib/api/getPermission.ts:28` | collectionId 경로에서 id AND owner/member 조건, include members. linkId 경로:15는 user predicate 없이 collection을 반환하므로 호출자가 권한 판단해야 함. 이 저장 경로는 collectionId 사용 |
| prismaCollection.findFirst | `apps/web/lib/api/setCollection.ts:45`, `:80` | 이름 Unorganized일 때만 기존 최상위 개인 collection 재사용. **다른 이름은 이 조회 생략 후 create:58** |
| prismaCollection.create | `apps/web/lib/api/setCollection.ts:58`, `:92` | named는 trim(name), owner/creator. default는 Unorganized+parent null |
| prismaUser.update | `apps/web/lib/api/setCollection.ts:67` | 이름을 명시해 새로 만들 때 collectionOrder push. default 생성:92에는 이 update 없음 |

- C1–C4는 택일이다. C3는 기존 row 조회를 건너뛰고 C4는 순서 update를 건너뛴다. 반환 객체에 이름 분기 정보를 가짜 값 포트로 붙이지 않았다.
- 결과는 Collection 또는 null이며 postLink로 반환된다. create 뒤 user.update 오류는 그대로 throw, 새 collection은 남는다.
- Permission의 하위 query는 결과를 바꾸는 조건과 members projection을 본문까지 확인한 단일 Prisma query이므로 더 분해하지 않는다. Prisma engine은 외부 경계다.

### JF-1.2.2 용량 판단 — hasPassedLimit

**그림 전제**: `STRIPE_SECRET_KEY`가 없고 조회한 user의 subscriptions.provider가 STRIPE가 아닌 self-host 경로:21. 환경변수 판단은 Capacity.hasPassedLimit이 소유한다. 아래 그림은 이 경로의 용량 거절 반례까지 포함한다.

```jobflow
orchestrator: Capacity
Object: Capacity, prismaUser, prismaLink
Capacity.hasPassedLimit --> prismaUser.findUnique
prismaUser.findUnique --> prismaLink.count
prismaLink.count.result --> Capacity.hasPassedLimit.result
```

count 결과에서 `MAX_LINKS_PER_USER - (numberOfImports + totalLinks) < 0`:28을 Capacity가 계산해 boolean을 반환한다. 아래 표의 구독·조직 대체 경로는 소스 위치를 확보했지만 아직 내부 그림을 펼치지 않은 범위이며 샘플 완료에 포함하지 않는다.

| 노드 | 코드 | 비고 |
|---|---|---|
| Capacity.hasPassedLimit / prismaUser.findUnique | `packages/lib/verifyCapacity.ts:8`, `:12` | parentSubscriptionId/subscription(quantity/provider)/createdAt 읽음 |
| 개인/체험 count | `packages/lib/verifyCapacity.ts:22`, `:42` | Stripe 미설정이며 provider STRIPE 아님 또는 REQUIRE_CC=false 체험일 남음. createdById 기준 count |
| prismaSubscription.findUnique | `packages/lib/verifyCapacity.ts:56` | user.subscription.quantity가 없을 때만 fallback 조회. 이미 quantity 있으면 조회 생략. id/quantity 없으면 true:63 |
| prismaUser.count | `packages/lib/verifyCapacity.ts:66` | child 사용자는 부모 구독 인원 수 검사. !childCount 또는 childCount+1>quantity면 true:70 |
| 조직/개인 count | `packages/lib/verifyCapacity.ts:82`, `:101` | 조직은 creator의 parent/subscription 관계로 count, capacity=quantity*MAX_LINKS_PER_USER. 개인은 MAX_LINKS_PER_USER |
| Capacity.hasPassedLimit.result | `packages/lib/verifyCapacity.ts:28`, `:48`, `:99`, `:107` | `capacity-(1+count)<0` boolean. count 뒤 다른 요청의 create를 막는 transaction/lock 없음 |

- 함수 내부에 결과를 바꾸는 요금·체험·조직 분기가 있어 단순 helper 말단으로 처리하지 않았다.
- user 없음의 true 반환:31–33은 Stripe 경로에서만 해당한다. 구독·조직 조건은 이 표의 실제 query와 환경 전제에 따라 구분하며, DB read 이후 create를 잠그는 구조는 아니다.

### JF-2 인증 provider와 callback — auth / authorize / callbacks

`apps/web/pages/api/v1/auth/[...nextauth].ts:194`의 default auth handler는 NextAuth:200에 provider/options를 넘긴다. credentials, email, OAuth는 택일 진입이며 아래 그림을 한 로그인의 연속 단계로 읽지 않는다.

**Credentials authorize 정상 실행 전제** — credentials provider가 활성이고 사용자가 credentials로 로그인했으며, 조회한 user가 존재하고 이메일 검증이 요구되는 환경에서는 emailVerified가 채워져 있다. user 없음/이메일 미검증은 아래 bcrypt 호출 전 예외로 끝난다.

```jobflow
orchestrator: Credentials
Object: Credentials, prismaUser, bcrypt
Credentials.authorize --> prismaUser.findFirst
prismaUser.findFirst.user --> bcrypt.compareSync
bcrypt.compareSync.matches --> Credentials.authorize.result
bcrypt.compareSync.notMatches --> Credentials.authorize.result
```

| 노드 | 실제 정의·호출 | 판단·결과 |
|---|---|---|
| Credentials.authorize | `[...nextauth].ts:61`, 등록:58 | credentials username을 email/username 조건:70에 넣음 |
| prismaUser.findFirst | 같은 파일:70 | 없음:87 error, email설정+미인증:88 error. **그 분기에서는 bcrypt 생략** |
| bcrypt.compareSync | :95 | true는 `{id}`:99, false는 null. bcrypt 라이브러리 외부 경계 |

**Email sendVerificationRequest callback** — email provider 등록:106에서 실행하는 function property:113.

```jobflow
orchestrator: EmailProvider
Object: EmailProvider, prismaVerification, Email
EmailProvider.sendVerificationRequest --> prismaVerification.count
prismaVerification.count.belowLimit --> Email.sendVerificationRequest
```

count:115는 최근 5분 동일 email, count≥4는 throw:124로 발송 생략한다. helper 호출:127은 **await하지 않는다**. helper `apps/web/lib/api/sendVerificationRequest.ts:13`은 fs.readFileSync:21→Handlebars.compile:26→transporter.sendMail:32를 await하고 rejected/pending:44면 throw한다. provider callback이 helper promise를 기다리지 않으므로 외부 SMTP의 실패와 callback 완료를 동일시하지 않는다. NextAuth token 생성·메일 링크 소비/JWT 암복호화는 라이브러리 경계며 PrismaAdapter 설정은 :44다.

```jobflow
orchestrator: VerificationMail
Object: VerificationMail, fs, Handlebars, transporter
VerificationMail.sendVerificationRequest --> fs.readFileSync
fs.readFileSync.template --> Handlebars.compile
Handlebars.compile --> transporter.sendMail
```

**NextAuth callbacks**의 실제 등록과 조건부 저장은 다음 표에서 이어진다. 외부 provider별 원격 OAuth 서버 구현은 범위 밖이다.

| 실제 callback | 소스·내부 협력 | 종료·한계 |
|---|---|---|
| signIn | `[...nextauth].ts:224`; email verification callback의 parent subscription:228→prisma.subscription.findUnique:230/user.count:237→조건부 addSeats:258. noncredentials:266→prisma.account.findFirst:268, 신규SSO차단:274; email기존user:280→조건부 emailVerified update:290→account.create:294 | return true:313 또는 false. 초대 seat 구매 자체는 결제 범위 밖; auth 통과 분기에 영향만 기록 |
| jwt | :315; token.id:318; trigger signup:320 user.findUnique:321→accounts있으면 user.update:332; username/name 보정:364/375. trigger signIn:380 user.findUnique:381→토큰 이름 갱신 | token:405. signup과 signIn 분기는 동시에 필수 실행 아님 |
| session | :407 token.id를 session.user:408에 복사. STRIPE 설정 시만 user.findUnique:411→verifySubscription:423 | verifySubscription 반환값을 사용하지 않고 session:427 반환. API verifyUser와 달리 null을 거절값으로 해석하지 않음 |

NextAuth가 실행하는 session callback의 **Stripe 설정이 있는 경우**와 JWT signup의 **user가 있고 accounts가 있는 경우**를 분리한다. callback들은 options 객체의 실제 함수 property이며 외부 NextAuth가 각 trigger에서 실행한다.

```jobflow
scope: nextauth_session_callback
Object: Callbacks, prismaUser, Billing
Callbacks.session --> prismaUser.findUnique
Callbacks.session --> Billing.verifySubscription
```

```jobflow
scope: nextauth_signup_callback
Object: Callbacks, prismaUser
Callbacks.jwt --> prismaUser.findUnique
Callbacks.jwt --> prismaUser.update
```

| 노드 | 코드 | 비고 |
|---|---|---|
| Callbacks.session | `apps/web/pages/api/v1/auth/[...nextauth].ts:407` | Stripe일 때 findUnique:411, verifySubscription:423; 반환 null을 거절로 소비하지 않고 session 반환:427. helper reject는 전파 |
| Callbacks.jwt | `apps/web/pages/api/v1/auth/[...nextauth].ts:315` | signup findUnique:321, accounts가 있을 때 nested dashboard/emailVerified update:332. username:364/name:375 보정은 별도 조건부 쓰기이며 무조건 실행 아님. signIn trigger:380은 별도 findUnique:381 |


### JF-3 가입과 선택적 기존 사용자 조회 — postUser / isAuthenticatedRequest

```jobflow
scope: registration_calls
Object: Route, Users, Auth, Schema, prismaUser, bcrypt
Route.users --> Users.postUser
Users.postUser --> Auth.isAuthenticatedRequest
Users.postUser --> Schema.safeParse
Users.postUser --> prismaUser.findFirst
Users.postUser --> bcrypt.hashSync
Users.postUser --> prismaUser.create
```

그림의 후반 find/hash/create는 **등록 허용·schema valid·invite 조건 통과·기존 user 없음**인 경로다. 중간 reject는 아래 표의 지점에서 종료한다. 화살표는 각 실제 caller를 표시하고 이전 함수의 반환값을 다음 함수 인자로 전달한다고 가정하지 않는다.

| 심볼·근거 | 입력·판단·부작용 | 내부 상태 |
|---|---|---|
| Route.users | `pages/api/v1/users/index.ts:6`, POST demo:8 거절, postUser:14 |201 또는400/401. 비인증 가입도 가능 |
| postUser | `lib/api/controllers/users/postUser.ts:17`, isAuthenticatedRequest:21, admin:22, 등록차단:25, schema:29 | 부모 계정은 invite/admin 판정용. invite 환경/부모/provider 조건:44–54 |
| isAuthenticatedRequest | `lib/api/isAuthenticatedRequest.ts:11`→getTokenFromRequest:12→accessToken.findFirst:24→user.findFirst:35 | token없음/만료/revoked/Stripe인데 subscription없음은 null. 일반 verifyUser와 반환·가드 다름 |
| prismaUser.findFirst / bcrypt.hashSync / create | postUser:69/88/90 | normalized username/email 중복이면400:160. create는 User와 기본 DashboardSection createMany:121을 한 nested write에 포함;201에서 password 제외:157 |

```jobflow
orchestrator: Auth
Object: Auth, Token, prismaAccessToken, prismaUser
Auth.isAuthenticatedRequest --> Token.getTokenFromRequest
Token.getTokenFromRequest.valid --> prismaAccessToken.findFirst
prismaAccessToken.findFirst.notRevoked --> prismaUser.findFirst
prismaUser.findFirst.result --> Auth.isAuthenticatedRequest.result
```

valid는 반환 token의 id/exp를 함수가 검사한 조건:15/19의 약칭이고 새 인증 메서드가 아니다. 조회 후 subscription 환경판단:44는 Auth 본문 소유이며 prismaUser 반환 자체의 상태 이름으로 붙이지 않았다. create 중 유니크 오류/DB 예외를 잡는 catch는 없다.


### JF-4 비밀번호 재설정 요청과 실제 발송 — forgotPassword / sendPasswordResetRequest

**POST·non-demo·schema valid** 경로다.

```jobflow
orchestrator: Forgot
Object: Forgot, Schema, prismaReset, prismaUser, Mail
Forgot.forgotPassword --> Schema.safeParse
Schema.safeParse.valid --> prismaReset.count
prismaReset.count.belowLimit --> prismaUser.findFirst
prismaUser.findFirst.emailUser --> Mail.sendPasswordResetRequest
```

`pages/api/v1/auth/forgot-password.ts:6`, schema:17, 5분 count:29, ≥3이면400:39, user조회:45, 없으면400:51, helper:57 **미await**,200:59. 발송 완료를 의미하는 200이 아니다.

```jobflow
orchestrator: ResetMail
Object: ResetMail, crypto, prismaReset, fs, Handlebars, transporter
ResetMail.sendPasswordResetRequest --> crypto.randomBytes
crypto.randomBytes.token --> prismaReset.create
prismaReset.create --> fs.readFileSync
fs.readFileSync.template --> Handlebars.compile
Handlebars.compile --> transporter.sendMail
```

`lib/api/sendPasswordResetRequest.ts:8`, randomBytes32바이트:12, DB token 24시간:14–20, template:24, compile:29, **sendMail:31 미await**. DB 생성 후 template 실패 또는 SMTP 실패에도 API 응답을 되돌리지 않는다. URL은 BASE_URL/auth/reset-password?token. raw token 저장이며 소비 시 만료를 기록한다.


| 노드 | 코드 | 비고 |
|---|---|---|
| Forgot.forgotPassword / Schema / Prisma | `apps/web/pages/api/v1/auth/forgot-password.ts:6` | safeParse:17, reset count:29, user find:45, Mail helper:57. schema/frequency/user 실패는 HTTP400 |
| ResetMail.sendPasswordResetRequest / crypto / Prisma / fs / Handlebars / transporter | `apps/web/lib/api/sendPasswordResetRequest.ts:8` | randomBytes:12→token.create:14→readFileSync:24→compile:29→sendMail:31. API와 이 helper의 SMTP 호출 모두 미await 경계 |


### JF-5 비밀번호 재설정 소비 — resetPassword

```jobflow
orchestrator: Reset
Object: Reset, Schema, bcrypt, prismaReset, prismaUser
Reset.resetPassword --> Schema.safeParse
Schema.safeParse.valid --> bcrypt.hash
bcrypt.hash --> prismaReset.findFirst
prismaReset.findFirst.validToken --> prismaUser.update
prismaUser.update --> prismaReset.update
prismaReset.update --> prismaReset.deleteMany
```

`pages/api/v1/auth/reset-password.ts:6`, POST/non-demo에서 schema:17→hash10rounds:32→token+expires>now find:35. invalid token:44는400이며 이후 쓰기 생략. user password update:53, token expires now update:62, 5분 이전 token cleanup:72 후200:81. hash는 조회 전 수행하지만 token query에 hash를 전달하지 않는다. 따라서 hash 뒤 선은 결과 전달이 없는 순서 선이다. 이 세 DB 쓰기는 transaction이 아니며 user update 뒤 실패하면 비밀번호는 바뀐 채 token이 재사용 가능할 수 있다. 실제 장애 재현은 하지 않았다.


| 노드 | 코드 | 비고 |
|---|---|---|
| Reset.resetPassword / Schema.safeParse / bcrypt.hash | `apps/web/pages/api/v1/auth/reset-password.ts:6` | schema:17 유효한 입력에서 hash:32. token 확인보다 hash가 앞 |
| prismaReset.findFirst / prismaUser.update / prismaReset.update / deleteMany | `apps/web/pages/api/v1/auth/reset-password.ts:35` | 유효 token 없으면400:44; password update:53→token 만료:62→과거 token 삭제:72→200:81. 개별 query이며 오류 catch 없음 |


### JF-6 검색과 접근 가능한 컬렉션 — searchLinks / getAccessibleCollectionIds

**라우트 그림 전제**: GET 요청이고 verifyUser가 user를 반환했다. null이면 searchLinks를 호출하지 않는다.

```jobflow
scope: search_route
Object: Route, Auth, Search
Route.search --> Auth.verifyUser
Route.search --> Search.searchLinks
```

`pages/api/v1/search/index.ts:6` search→verifyUser:10, null 종료; GET query변환:15→searchLinks:30→statusCode/json:35. 검색어·sort·collection/tag/pinned/cursor를 전달한다. Browser query의 consumer는 [Browser JF-4](browser.md#jf-4-목록-query-등록실행과-페이지-합치기--uselinks--usefetchlinks)다.

**공통 access 시작** — userId 있을 때만. publicOnly 요청은 userId가 없어서 이 함수 호출을 생략하고 isPublic filter를 쓴다.

```jobflow
orchestrator: Access
Object: Access, prismaCollection, prismaMembership, Promise
Access.getAccessibleCollectionIds --> prismaCollection.findMany
Access.getAccessibleCollectionIds --> prismaMembership.findMany
Access.getAccessibleCollectionIds --> Promise.all
Promise.all.rows --> Access.getAccessibleCollectionIds.result
```

`lib/api/getAccessibleCollectionIds.ts:16`, owned쿼리:18, membership쿼리:22, Promise.all:17, Set dedupe:34. 단일 트랜잭션 snapshot은 아니다. Search의 :27에서 Promise를 먼저 만들고 :30 catch는 unhandled rejection 억제용이며 실제 소비 `resolveAccessCondition`:32/34는 여전히 reject된다.

**Meili 설정 + nonempty searchQueryString** 경로, hit가 있을 때만 hydration을 실행한다.

```jobflow
orchestrator: Search
Object: Search, QueryBuilder, meiliIndex, prismaLink
Search.searchLinks --> QueryBuilder.parseSearchTokens
QueryBuilder.parseSearchTokens.tokens --> QueryBuilder.buildMeiliQuery
Search.searchLinks --> QueryBuilder.buildMeiliFilters
Search.searchLinks --> meiliIndex.search
meiliIndex.search --> Search.resolveAccessCondition
Search.resolveAccessCondition.access --> prismaLink.findMany
prismaLink.findMany.links --> Search.searchLinks.result
```

`controllers/search/searchLinks.ts:17`, parse:67/buildQuery:68/buildFilters:70, search:79, nohits:96은 `{data:[]}`로 조기200. hits의 id:105와 access조건:107, collection/public/tag/pinned를 prisma.findMany:109에 함께 넣는다. 최종 권한은 Meili가 아닌 이 DB query에서 재검사한다. nextCursor는 **원래 hits.length===limit이면 offset+limit**:141, 최종 허용 link 수 기준이 아니다. 반환 links는 DB orderBy:138을 적용한다.

**Meili가 없거나 검색어가 없는 fallback**.

```jobflow
orchestrator: Search
Object: Search, prismaLink
Search.searchLinks --> Search.resolveAccessCondition
Search.resolveAccessCondition.access --> prismaLink.findMany
prismaLink.findMany.links --> Search.searchLinks.result
```

searchConditions 구성:154–189 후 resolve:191, findMany:193은 take(default50), cursor `{id}`+skip1:195–196. query의 OR 중첩:201–209에 pinnedCondition/searchConditions가 들어가므로 모든 필터의 단순 AND라는 설명은 틀리다. 반환은 textContent omit:214, tags/collection/current-user pinnedBy include:217, nextCursor 마지막 id:234. QueryBuilder 순수 tokenizer/filter escaping 구현은 추가 L2 근거에서 확인하며 원문 검색 엔진은 외부 경계다.

### JF-7 개인 링크 상세·수정·삭제 — getLinkById / updateLinkById / deleteLink

공통 handler는 `pages/api/v1/links/[id]/index.ts:7` links이며 verifyUser:8 이후 GET:12/PUT:23/DELETE:39로 분기한다. PUT/DELETE는 각각 demo 환경 가드를 통과해야 한다. 아래 GET은 권한이 있는 정상 입력, PUT은 **member pin shortcut이 아닌 일반 수정**, DELETE는 owner/canDelete의 정상 경로다.

```jobflow
orchestrator: Detail
Object: Detail, Permission, prismaLink
Detail.getLinkById --> Permission.getPermission
Permission.getPermission.collection --> prismaLink.findUnique
```

`controllers/links/linkId/getLinkById.ts:5`, getPermission:12 반환 collection의 owner:18 또는 **아무 member**:14를 판단:20한다. canUpdate는 조회 요건이 아니다. 허용이면 findUnique:26, pinnedBy는 현재 user:34만,200:45. `getPermission(linkId)`는 `lib/api/getPermission.ts:15`의 collection 조회에 user조건이 없으므로 이 caller 조건을 제거하면 의미가 바뀐다.

```jobflow
orchestrator: Update
Object: Update, Schema, Permission, prismaLink
Update.updateLinkById --> Schema.safeParse
Schema.safeParse.valid --> Permission.getPermission
Update.updateLinkById --> Permission.getPermission
Update.updateLinkById --> prismaLink.findUnique
Update.updateLinkById --> prismaLink.update
```

| 실제 구간 | 호출·판단 근거 | 빠지는 호출과 남는 상태 |
|---|---|---|
| schema/현재 권한 | `controllers/links/linkId/updateLinkById.ts:11`, safeParse:17, 현재 link getPermission:30, isCollectionOwner:32 | schema실패400. member이며 nonempty pinnedBy:41이면 **pin만 prisma.link.update:42하고200:64 조기 종료**, 아래 target조회/일반수정 없음 |
| 일반 수정 권한 | target collection getPermission:67, member.canUpdate:72, targetMatches:76, 비소유자 collection 이동 금지:88–101 | 거절401, oldLink 조회/쓰기는 없음 |
| 일반 저장 | oldLink findUnique:103, uniqueTags:109–118, connectOrCreate:120, update:146 | URL이 같으면 file삭제 생략. URL변경이 valid면 아래 제거 구간, invalid면401:140 |
| URL 변경 보존물 제거 | `isValidUrl`:137→await removeFiles:139→update:146의 format/lastPreserved null:157–162 | 파일 제거가 DB변경보다 먼저이며 원자적이지 않음 |
| 컬렉션 이동 | update성공 후 collection id가 달라졌을 때만 moveFiles:196 | DB변경 뒤 실제 파일 이동 실패를 되돌리지 않음 |

```jobflow
orchestrator: Update
Object: Update, URLCheck, Files, prismaLink
Update.updateLinkById --> URLCheck.isValidUrl
URLCheck.isValidUrl.true --> Files.removeFiles
Files.removeFiles --> prismaLink.update
```

위 하위 그림은 **oldLink 존재 + URL이 변경되고 data.url truthy**인 구간이다. false면401로 끝난다. URLCheck는 `lib/shared/isValidUrl.ts:1`의 URL constructor 기반 syntactic 검사이며 저장 때의 SSRF 안전성 검사와 다르다. URL 변경 후 worker가 별도로 SSRF를 판단한다.

**삭제 그림 전제**: owner/canDelete 판단을 통과했고 Meili client가 존재한다. client가 없으면 deleteDocument를 생략한다.

```jobflow
orchestrator: Delete
Object: Delete, Permission, prismaLink, Files, meiliIndex
Delete.deleteLink --> Permission.getPermission
Permission.getPermission.collection --> prismaLink.delete
prismaLink.delete --> Files.removeFiles
Files.removeFiles --> meiliIndex.deleteDocument
```

`controllers/links/linkId/deleteLinkById.ts` 파일의 **실제 함수명은 deleteLink:7**. getPermission:10→caller가 owner 또는 canDelete:12–20→DB delete:22. removeFiles:28은 미await, Meili client가 있을 때만 deleteDocument:30을 await한다. 그림의 마지막 선은 file 작업 완료나 결과 전달을 뜻하지 않는다. Meili가 없으면 그 호출은 생략하고200:32. 파일 실패/Meili 실패 후 DB row를 복원하지 않는다. file helper의 await도 local unlink callback 완료를 보장하지 않는다는 점은 [Adapter JF-4](adapters.md#jf-4-파일-조회존재삭제이동--readfile--fileexists--removefiles--movefiles)를 함께 읽는다.

### JF-8 공유 권한 변경과 하위 컬렉션 전파 — updateCollection

**라우트 그림 전제**: PUT 요청, verifyUser가 user를 반환하고 non-demo 환경이다. null이면 controller를 호출하지 않는다.

```jobflow
scope: share_route
Object: Route, Auth, Collection
Route.collections --> Auth.verifyUser
Route.collections --> Collection.updateCollection
```

`pages/api/v1/collections/[id].ts:7`, verifyUser:11, PUT non-demo:21–28에서 실제 함수 `controllers/collections/collectionId/updateCollectionById.ts:8 updateCollection`을 호출한다. **owner만** 공유 변경 가능(:29 getPermission, :34 owner비교). 이름과 파일명 차이를 실제 심볼로 구분한다.

```jobflow
orchestrator: Collection
Object: Collection, Schema, Permission, prisma, prismaLink
Collection.updateCollection --> Schema.safeParse
Schema.safeParse.valid --> Permission.getPermission
Collection.updateCollection --> prisma.$transaction
prisma.$transaction.updatedCollection --> prismaLink.updateMany
```

prisma.$transaction은 실제 메서드:67이며 prismaLink는 prisma.link delegate, updateMany의 호출 위치는 :192다. 위 결과는 반환된 collection.links에서 뽑은 linkIds:190으로 후속 indexVersion reset에 쓰인다. **parentId가 있고 root가 아닌 경우만** `prisma.collection.findUnique`:39와 소유자/parent조건:49가 추가된다. 실패403이면 transaction 등록까지 가지 않는다. 일반 공유 dialog 입력은 기존 parentId를 유지한다.

```jobflow
orchestrator: ShareCallback
Object: ShareCallback, prismaMembership, prismaCollection
ShareCallback.execute --> prismaMembership.deleteMany
prismaMembership.deleteMany --> prismaCollection.update
prismaCollection.update.collection --> ShareCallback.execute.result
```

ShareCallback.execute는 **익명 함수 식별용 별칭 — 원문 이름 아님**. `$transaction(async () => {...})` 등록:67, 본문:68–185, 실행 주체 Prisma transaction API. 위 그림은 propagate=false의 본문이며 deleteMany:123→collection.update:131 nested members.create:154 순서다. **callback은 tx 인자를 받지 않고 전역 prisma를 사용한다**. 따라서 callback 안이라는 이유로 DB 회원 제거와 재생성이 실제 단일 transaction이라고 보장할 수 없다. A-07.

**전파 그림 전제**: propagate=true이고, 현재 반복 중인 child의 subMembers.length>0이다. 빈 배열인 child는 deleteMany만 실행하고 createMany를 생략한다.

```jobflow
orchestrator: ShareCallback
Object: ShareCallback, Collection, prismaMembership
ShareCallback.execute --> Collection.getAllSubCollections
Collection.getAllSubCollections.subCollections --> prismaMembership.deleteMany
prismaMembership.deleteMany --> prismaMembership.createMany
```

이 하위 그림은 **propagate=true**일 때 :98–120에서 본체 deleteMany:123보다 먼저 실행된다. getAllSubCollections는 같은 callback의 **실제 named async closure:69**다. frontier를 초기parentId로 시작하고 while:78에서 `prisma.collection.findMany`:79 parentId in frontier→seen Set:86–89→다음 frontier:92. 각 반환 child에 대해 membership.deleteMany:101, **subMembers.length>0인 경우만** createMany:110. 소유자 자신은 :105에서 제외한다. isPublic을 하위 collection에 전파하는 write는 없다. 이름·isPublic·members는 root collection.update에만 적용된다. 오류는 handler에 catch없이 reject되며 frontend onSettled가 초안을 유지한다.

### JF-9 공개 링크와 공개 컬렉션 — getPublicCollection / getLinkById

```jobflow
scope: public_read
Object: Route, Public, prismaLink
Route.link --> Public.getLinkById
Public.getLinkById --> prismaLink.findFirst
```

`pages/api/v1/public/links/[id].ts:4` link→controller:10. `controllers/public/links/linkId/getLinkById.ts:3` invalidid401:4, findFirst:10 **collection.isPublic=true**.200:23은 row가 없어도 response:null이다. verifyUser를 호출하지 않는다.

공개 collection metadata는 `pages/api/v1/public/collections/[id].ts:4`→getPublicCollection:15→`controllers/public/collections/getPublicCollection.ts:3` findFirst:4 isPublic true, members.user에서 username/name/image만 select:14–16; 있으면200:28,없으면400:30이다. 공개 목록은 `pages/api/v1/public/collections/links/index.ts:5` collectionId검사:25 후 `searchLinks({query, publicOnly:true})`:31이다. [JF-6](#jf-6-검색과-접근-가능한-컬렉션--searchlinks--getaccessiblecollectionids)의 publicOnly 조건과 Meili/DB branch를 재사용하며 private user의 accessible query를 실행하지 않는다.

```jobflow
scope: public_collection_calls
Object: Route, Public, prismaCollection, Search
Route.collection --> Public.getPublicCollection
Public.getPublicCollection --> prismaCollection.findFirst
Route.collections --> Search.searchLinks
```

두 Route 진입은 별도 HTTP 요청이다. 이 그림은 metadata 응답으로 목록 요청을 자동 호출한다는 뜻이 아니다. 공개 user lookup(`pages/api/v1/public/users/[id].ts`→`controllers/public/users/getPublicUser.ts`)은 공유 dialog의 사람 식별 보조 계약으로 user의 공개 필드만 선택한다. 실제 반환 필드는 [JF-17](#jf-17-공개-사용자-lookup과-메일-url-생성--getpublicuser--sendverificationrequest)에 확인했다.


| 노드 | 코드 | 비고 |
|---|---|---|
| Route.link / Public.getLinkById / prismaLink.findFirst | `apps/web/pages/api/v1/public/links/[id].ts:4` | controller 호출:10; controllers/public/links/linkId/getLinkById.ts:10의 isPublic predicate |
| Route.collection / Public.getPublicCollection / prismaCollection.findFirst | `apps/web/pages/api/v1/public/collections/[id].ts:4` | controller 호출:15; controllers/public/collections/getPublicCollection.ts:4 |
| Route.collections / Search.searchLinks | `apps/web/pages/api/v1/public/collections/links/index.ts:5` | collectionId 검사:25, searchLinks:31 publicOnly=true |


### JF-10 보존 갱신 요청 — links

```jobflow
orchestrator: Route
Object: Route, Auth, prismaLink, Permission, Files
Route.links --> Auth.verifyUser
Auth.verifyUser.user --> prismaLink.findUnique
prismaLink.findUnique.link --> Permission.getPermission
Route.links --> prismaLink.update
prismaLink.update --> Files.removeFiles
```

`pages/api/v1/links/[id]/archive/index.ts:9`, verify:10, link:13없으면404, getPermission collectionId:25, owner/canUpdate:30–37 없으면401. **PUT/non-demo/valid URL**일 때 update:51 resets formats,lastPreserved,indexVersion,clientSide:55–63→await removeFiles:67→200:69. invalid URL는 **200 "Invalid URL."**:46–49이며 reset/파일제거가 없다. 요청이 worker를 직접 호출하지 않는다. reset한 null marker를 worker가 다음 poll에서 찾는다. removeFiles 실패를 응답에 일관되게 반영하는 계약은 없고 특히 local helper는 비동기 unlink 완료를 기다리지 않는다.


| 노드 | 코드 | 비고 |
|---|---|---|
| Route.links / Auth.verifyUser / prismaLink.findUnique / Permission.getPermission | `apps/web/pages/api/v1/links/[id]/archive/index.ts:9` | verify:10→link query:13→permission:25. owner/canUpdate 여부는 route 판단:30–37 |
| prismaLink.update / Files.removeFiles | `apps/web/pages/api/v1/links/[id]/archive/index.ts:51` | 그림의 쓰기 전제는 PUT/non-demo/valid URL. reset:55–63 후 파일 제거:67, 응답:69 |


### JF-11 보존 파일 접근 정책과 직접 전송 — handleGet / resolveAccessibleArchive

```jobflow
orchestrator: Archive
Object: Archive, Token, Access, Files, response
Archive.handleGet --> Token.verifyToken
Archive.handleGet --> Access.resolveAccessibleArchive
Access.resolveAccessibleArchive.allowed --> Files.readFile
Files.readFile.file --> response.send
```

`pages/api/v1/archives/[linkId].ts:85` handleGet. HTML+USER_CONTENT_DOMAIN+Bearer없음은403:94–101이며 위 token/파일 경로 전 종료다. token:105의 오류 문자열은 userId undefined로 바뀐다:106. 따라서 공개 collection은 비인증으로 읽을 수 있다. resolve:108 status≠200은 그대로반환:115. file:122→ContentType/cache/nosniff:123–127, HTML이면CSP sandbox:129→send:131. file read의 반환status를 그대로 전송한다.

```jobflow
orchestrator: Access
Object: Access, Suffix, prismaCollection
Access.resolveAccessibleArchive --> Suffix.getSuffixFromFormat
Suffix.getSuffixFromFormat.suffix --> Access.getAccessibleCollection
Access.getAccessibleCollection --> prismaCollection.findFirst
```

`lib/api/archives/resolveAccessibleArchive.ts:47` resolver→suffix:53, invalidid/suffix401:55. getAccessibleCollection:30 호출:62, findFirst:31은 link.id와 OR owner(userId||-1)/member/public:39–41. 미허용401:63; 허용은 collectionId/linkId/suffix로 **경로를 계산**:70하고200:75. DB의 readable/pdf 등 path필드가 available인지 검증하는 함수는 아니다. suffix 변환은 지원 enum별 string mapping 순수 말단이다.


| 노드 | 코드 | 비고 |
|---|---|---|
| Archive.handleGet / Token.verifyToken / Access.resolveAccessibleArchive | `apps/web/pages/api/v1/archives/[linkId].ts:85` | token:105→access:108→file:122→send:131. HTML+별도domain+bearer없음은403:94–101 |
| Access.resolveAccessibleArchive / Suffix.getSuffixFromFormat / getAccessibleCollection | `apps/web/lib/api/archives/resolveAccessibleArchive.ts:47` | suffix:53→collection access:62. helper getAccessibleCollection:30→prisma.collection.findFirst:31. owner/member/public OR |
| Files.readFile / response.send | `apps/web/pages/api/v1/archives/[linkId].ts:122` | file status와 MIME/header 검사 뒤:131 응답. storage 구현은 Adapter JF-4 |


### JF-11.1 서명 URL 발급과 별도 host 조회 — handler / createPreservedFormatUrl

**token GET**은 USER_CONTENT_DOMAIN 설정이 있을 때만.

```jobflow
orchestrator: TokenRoute
Object: TokenRoute, Token, Access, Files, SignedURL
TokenRoute.handler --> Token.verifyToken
TokenRoute.handler --> Access.resolveAccessibleArchive
Access.resolveAccessibleArchive.allowed --> Files.fileExists
Files.fileExists.true --> SignedURL.createPreservedFormatUrl
```

`pages/api/v1/preserved/token.ts:13` handler, method405:17,설정400:21, verify:28→resolve:34(status실패40)→fileExists:47(false404)→createURL:51. 200 response.url:58와 no-store:57; catch500:59. token error여도 공개 collection이면 resolver가 허용 가능하다.

```jobflow
orchestrator: SignedURL
Object: SignedURL, JWT
SignedURL.createPreservedFormatUrl --> SignedURL.getPreservedTokenSecret
SignedURL.getPreservedTokenSecret.secret --> JWT.encode
```

`lib/api/preserved/createPreservedFormatUrl.ts:46`, domain/format검사:55/60, secret:18→encode:66. scope=`preserved-format`, linkId/filePath/format/iat/exp/JTI, TTL300초:7. URL은 별도host `/api/v1/preserved/view?token=...`:81. 외부 next-auth JWT암복호화 내부는 라이브러리 경계다.

```jobflow
orchestrator: ViewRoute
Object: ViewRoute, Host, SignedURL, Files, response
ViewRoute.handler --> Host.getRequestHost
ViewRoute.handler --> SignedURL.decodePreservedFormatToken
SignedURL.decodePreservedFormatToken.valid --> Files.readFile
Files.readFile.file --> response.send
```

`pages/api/v1/preserved/view.ts:97`, GET405:101/domain없음400:105. configured URL newURL:112는 try밖. host normalization:15/defaultport:32, getRequestHost:53는 x-forwarded-host→Forwarded→Host순서:54–67, 허용host아니면403:119. token없음401:127, decode:132와 scope/exp:134–140 invalid401. **현재 DB 권한 재조회 없이 token.filePath read:143**. file status실패반환:145, private no-store/noindex/nosniff:150–157, HTML CSP 또는download disposition:160–171, send:174,catch500:175. token 발급 후 공유가 취소되어도 만료 전 DB가드를 다시 실행하지 않는 코드상 특성이다. A-08.


| 노드 | 코드 | 비고 |
|---|---|---|
| TokenRoute.handler / Token / Access / Files / SignedURL | `apps/web/pages/api/v1/preserved/token.ts:13` | verify:28→resolve:34→exists:47→signedURL:51. 설정/method/input/권한 실패는 선행 종료 |
| SignedURL.createPreservedFormatUrl / getPreservedTokenSecret / JWT.encode | `apps/web/lib/api/preserved/createPreservedFormatUrl.ts:46` | secret helper:18, token encode:66, URL:81. TTL300초:7. decode helper:86/87→shape 검사:26 |
| ViewRoute.handler / Host / SignedURL / Files / response.send | `apps/web/pages/api/v1/preserved/view.ts:97` | host:119→decode:132→scope/exp:134→read:143→send:174. 같은 함수가 조건을 판단하며 helper 반환값의 이름으로 환경 분기를 발명하지 않음 |


### JF-12 개인 highlight — postOrUpdateHighlight / getLinkHighlights

**GET route 그림 전제**: GET 요청이고 verifyUser가 user를 반환했다. null이면 controller를 호출하지 않는다.

**조회**와 **쓰기**의 권한이 다르다. 이 모델의 comment는 특정 텍스트 선택 범위에 붙은 개인 주석이지 링크별 읽기 상태/한 줄 감상이 아니다.

```jobflow
scope: highlights_calls
Object: Route, Auth, Highlights, prismaHighlight
Route.highlights --> Auth.verifyUser
Route.highlights --> Highlights.getLinkHighlights
Highlights.getLinkHighlights --> prismaHighlight.findMany
```

GET `pages/api/v1/links/[id]/highlights/index.ts:5` verify:9→controller:13. `controllers/links/linkId/highlight/getLinkHighlights.ts:3` findMany:10의 where는 linkId/userId뿐이다. collection 접근을 다시 검사하지 않는다.

```jobflow
orchestrator: Highlights
Object: Highlights, prismaCollection, prismaHighlight
Highlights.postOrUpdateHighlight --> prismaCollection.findFirst
prismaCollection.findFirst.collection --> prismaHighlight.findFirst
prismaHighlight.findFirst.exists --> prismaHighlight.update
prismaHighlight.findFirst.absent --> prismaHighlight.create
```

`controllers/highlights/postOrUpdateHighlight.ts:4` collection조회:9→**owner/canUpdate**:22–31 거절400→동일 user/link/offset find:33→existing update:43 또는create:60. 없는 row만 생성한다는 판정과 쓰기가 transaction/upsert가 아니며 동시쓰기 중복을 보장하지 않는다. update는 color/comment만:48–49. DELETE `deleteHighlightById.ts:3`는 id/userId로 delete:10, current collection권한은 재조회하지 않는다. API 라우트의 verifyUser/schema/demo는 전체 highlight 계약표에 분리한다.


| 노드 | 코드 | 비고 |
|---|---|---|
| Route.highlights / Highlights.getLinkHighlights / prismaHighlight.findMany | `apps/web/pages/api/v1/links/[id]/highlights/index.ts:5` | verify:9→controller:13; controllers/links/linkId/highlight/getLinkHighlights.ts:10은 user/link predicate |
| Highlights.postOrUpdateHighlight / Prisma delegates | `apps/web/lib/api/controllers/highlights/postOrUpdateHighlight.ts:4` | collection:9→owner/canUpdate:22–31→same offsets find:33→update:43/create:60. 현재 접근 허용 전제에서만 highlight find/write |
| deleteHighlightById | `apps/web/lib/api/controllers/highlights/deleteHighlightById.ts:3` | id validation:7, prisma.highlight.delete:10 where id/user. 단일 DB delegate 작업이므로 말단 확인 |


### JF-13 Dashboard section별 조회 — getDashboardData

**라우트 그림 전제**: GET 요청이고 verifyUser가 user를 반환했다. null이면 controller를 호출하지 않는다.

```jobflow
scope: dashboard_route
Object: Route, Auth, Dashboard, Access
Route.dashboard --> Auth.verifyUser
Route.dashboard --> Dashboard.getDashboardData
Dashboard.getDashboardData --> Access.getAccessibleCollectionIds
```

`pages/api/v2/dashboard/index.ts:7` verify:11→GETcontroller:20. import이름은 getDashboardDataV2지만 실제 default함수는 `controllers/dashboard/getDashboardDataV2.ts:5 getDashboardData`다. 접근 가능 id:8을 받은 뒤 section/통계 query를 병렬 실행한다.

```jobflow
orchestrator: Dashboard
Object: Dashboard, prismaSection, prismaLink, prismaTag, Promise
Dashboard.getDashboardData --> prismaSection.findMany
Dashboard.getDashboardData --> prismaLink.count
Dashboard.getDashboardData --> prismaTag.count
Dashboard.getDashboardData --> Promise.all
```

| 노드 | 코드 | 비고 |
|---|---|---|
| prismaSection.findMany | `getDashboardDataV2.ts:25` | userId로sections. 반환 type들로viewPinned:39/viewRecent:42/collectionSections:45 계산 |
| prismaLink.count / prismaTag.count | :26/:34 | 접근collection+currentuserpinned, tags는owner 또는 membercollection에속한link |
| Promise.all | :24 | 서로 독립 query promise 합류. counts가 같은 snapshot이라고 보장하지 않음 |

아래 구간은 **해당 section이 켜진 것만** 호출하며 꺼졌을 때는 `Promise.resolve([])`로 대체한다. 조회가 없는 section을 필수 API 호출로 그리지 않는다.

```jobflow
orchestrator: Dashboard
Object: Dashboard, prismaLink, Promise
Dashboard.getDashboardData --> prismaLink.findMany
Dashboard.getDashboardData --> Promise.all
```

findMany는 pinned:60/recent:82/collection:106 각각 다른 입력의 호출이다. pinned/recent는accessible IDs와take16, collection은 **accessibleCollectionIdSet.has(colId)**:105일 때만 take16. Promise.all:125가 이 배열들을 모으고 collectionLinks매핑:131, recent+pinned id dedupe:136–141를 거쳐200data:143을 반환한다. section없음:49는 links[] 조기반환. 외부DB query를 제외한 합치기/선별은 본문을 읽은 순수말단이다.

### JF-14 API 구독 가드 — verifySubscription

API verifyUser의 STRIPE_SECRET_KEY 조건 아래 호출하는 `lib/api/billing/verifySubscription.ts:16`의 조건을 분리한다. **user없음 null:19**, parent active 또는trial허용은user:28, 현재subscription active+미만료는user:115이며 원격sync를 생략한다.

```jobflow
orchestrator: Billing
Object: Billing, Stripe, prismaSubscription
Billing.verifySubscription --> Stripe.checkStripeSubscriptionByEmail
Stripe.checkStripeSubscriptionByEmail.validSubscription --> prismaSubscription.upsert
```

그림은 **subscription inactive/expired이고 provider=STRIPE**(:32–36)만. helper:37의 반환 필수필드가 없으면null:41–48. upsert:59는catchlog:84로 오류를 삼키고 원래user:115를 반환한다. 반환user의 subscription을 새row로 교체하지 않는다. helper는 `billing/checkStripeSubscriptionByEmail.ts:5` stripeSDK:8→customers.list:11 emaillower+expand, 첫customer/첫subscription/첫item:16–20를 골라 active/status/period/quantity:22를 돌려준다. 외부Stripe API 내부는 외부 경계다.

```jobflow
orchestrator: Billing
Object: Billing, Store
Billing.verifySubscription --> Store.syncStoreSubscription
```

Stripe helper의 customers.list(`apps/web/lib/api/billing/checkStripeSubscriptionByEmail.ts:11`) 예외는 catch 없이 verifySubscription:37을 거쳐 verifyUser 또는 NextAuth session callback으로 reject된다. 반면 upsert 오류는 로그로 소비하고 store sync는 catch에서 null로 바꾼다. validSubscription 포트는 필수 필드가 있다는 뜻이며 active=true 보장이 아니다. active:false도 필수 필드가 있으면 upsert한 뒤 원래 user를 반환한다.

두 번째 그림은 같은 inactive/expired 조건에서 provider≠STRIPE일 때만이다. :86 synccatch→null:88. 결과active아니면:91, null+기존active+기간종료3일이내:101–107이면user유지, 그외null:110. mobile store 구매/복원/receipt 검증 업무는 이번 범위 밖이므로 이 의존의 **반환 소비·grace·실패 변환**까지 조사하고 store 내부는 제외 경계로 분류한다. 웹 auth 판정을 store가 무조건허용한다는 뜻은 아니다. 결제구매 화면도 별도 외부범위 목적지다.



| 노드 | 코드 | 비고 |
|---|---|---|
| Billing.verifySubscription / Stripe.checkStripeSubscriptionByEmail | `apps/web/lib/api/billing/verifySubscription.ts:16` | inactive/expired+STRIPE일 때 helper:37, helper 내부 SDK customers.list:11은 외부 Stripe 계약 |
| prismaSubscription.upsert | `apps/web/lib/api/billing/verifySubscription.ts:59` | 필수 필드가 있으면 실행, catch:84 로그 후 계속 |
| Store.syncStoreSubscription | `apps/web/lib/api/billing/verifySubscription.ts:86` | nonSTRIPE 분기, catch→null:88. 결과 active와 grace 판단:91–110. 구매/receipt 내부는 제외 경계 |


### JF-15 태그별 목록 metadata — getTagById / getTags

**GET, verifyUser가 user를 반환하고 유효한 tagId가 있는 입력**의 current 계약이다. 인증 실패는 verifyUser가 응답 후 null로 끝내므로 controller에 도달하지 않는다.

```jobflow
scope: tag_metadata_read
Object: Route, Auth, Tags, Access, prismaTag
Route.tags --> Auth.verifyUser
Route.tags --> Tags.getTagById
Tags.getTagById --> Access.getAccessibleCollectionIds
Tags.getTagById --> prismaTag.findFirst
```

| 노드 | 코드 | 비고 |
|---|---|---|
| Route.tags | `apps/web/pages/api/v1/tags/[id].ts:7` | verify:8, invalid id400:13, GET controller:19→status/json:20 |
| Tags.getTagById | `apps/web/lib/api/controllers/tags/tagId/getTagById.ts:4` | 직접호출 invalid id401:5, access:8, findFirst:10. owner 또는 memberCollection에 속한 link를 가진 tag만 허용:13–21 |
| Access.getAccessibleCollectionIds | `apps/web/lib/api/getAccessibleCollectionIds.ts:16` | [JF-6](#jf-6-검색과-접근-가능한-컬렉션--searchlinks--getaccessiblecollectionids)와 같은 owner/member 조회. 이 caller는 member IDs만 소비 |
| prismaTag.findFirst | `apps/web/lib/api/controllers/tags/tagId/getTagById.ts:10` | link count include:24–29, 없음404:33, 있음200:35. throw는 route로 전파 |

**config가 낮은 버전 또는 없는 Browser fallback**은 `/api/v1/tags` 한 page를 읽는다. 현재 서버에 이 요청이 오면 다음 userId 분기를 실행한다. collectionId 전용 branch는 public tag 목록 계약이며 공개 목록 query의 보조 정보다.

```jobflow
scope: legacy_tag_read
Object: Route, Auth, Tags, prismaMembers, prismaTag, prismaLink, prisma
Route.tags --> Auth.verifyUser
Route.tags --> Tags.getTags
Tags.getTags --> prismaMembers.findMany
Tags.getTags --> prismaTag.findMany
Tags.getTags --> Tags.withLinkCounts
Tags.withLinkCounts --> prismaLink.count
Tags.withLinkCounts --> prisma.$transaction
```

| 노드 | 코드 | 비고 |
|---|---|---|
| Route.tags / Tags.getTags | `apps/web/pages/api/v1/tags/index.ts:9`, `:21`; `apps/web/lib/api/controllers/tags/getTags.ts:19` | verify:10, query변환:14–19. default page50:38, normalized search:28, sort:51–61 |
| prismaMembers.findMany / prismaTag.findMany | `apps/web/lib/api/controllers/tags/getTags.ts:64`, `:78` | owner 또는 member collection의 link가 있는 tag; id cursor+skip. user branch를 전제로 한 그림 |
| Tags.withLinkCounts | `apps/web/lib/api/controllers/tags/getTags.ts:5` | tags 빈 배열이면즉시[]:8; **비어있지 않을 때만** 각 link.count:12 Promise를 배열 $transaction:10에 전달. raw count는 tag 연결 전체이며 caller별 link 접근 필터는 없음 |
| 반환 | `apps/web/lib/api/controllers/tags/getTags.ts:109` | `{data:{tags,nextCursor},statusCode,success,message}`. Browser fallback은 현재 page에서 id를 못 찾으면 query error가 된다 |

### JF-16 초기 읽기와 표시 설정 — getUserById / getCollection / updateUserPreference

**웹 session token 유효 + 자기 userId 조회 GET**일 때 사용자 조회는 다음 호출을 한다. 이 경로는 verifyUser가 아니라 verifyToken을 사용하므로 inactive subscription 사용자의 guard용 사용자 정보를 읽을 수 있다.

```jobflow
scope: self_user_read
Object: Route, Auth, Users, prismaUser, prismaAccount
Route.users --> Auth.verifyToken
Route.users --> prismaUser.findUnique
Route.users --> Users.getUserById
Users.getUserById --> prismaUser.findUnique
Users.getUserById --> prismaAccount.count
```

| 노드 | 코드 | 비고 |
|---|---|---|
| Route.users | `apps/web/pages/api/v1/users/[id]/index.ts:13` | verifyToken:14, invalid query400:18, token error401:22, requester조회:27/admin판단:33. GET 권한:38–39; 호출:41은 queryId 아닌 **token userId** |
| Users.getUserById | `apps/web/lib/api/controllers/users/userId/getUserById.ts:6` | Promise.all:12 안 user.findUnique:13 + account.count:38, user없음404:51 |
| 반환 말단 | `apps/web/lib/api/controllers/users/userId/getUserById.ts:53–74` | password 제외, hasPassword/hasOAuthAccount와 subscription 요약 포함. AuthRedirect가 후속 분기를 판단 |
| Config.handler/getEnvData | `apps/web/pages/api/v1/config/index.ts:4`, `:8` | 환경값을 공개 config로 정규화하여200:5. 별도 DB/원격호출 없음; 이 두 함수는 말단 확인. secret 값 대신 설정 유무만 반환하는 항목과 공개 demo 값 구분 |

**인증 GET collections**는 Sidebar와 NewLink의 선택지를 읽는다. 이 경로는 컬렉션 신규 생성·삭제 업무와 구분한다.

```jobflow
scope: collection_choices
Object: Route, Auth, Collections, prismaUser, prismaCollection
Route.collections --> Auth.verifyUser
Route.collections --> Collections.getCollection
Collections.getCollection --> prismaUser.findUnique
Collections.getCollection --> prismaCollection.findMany
```

| 노드 | 코드 | 비고 |
|---|---|---|
| Route.collections | `apps/web/pages/api/v1/collections/index.ts:6` | verifyUser:10, GET의 getCollections import를:14에서 호출. 실제 default 심볼은 아래 getCollection |
| Collections.getCollection | `apps/web/lib/api/controllers/collections/getCollections.ts:3` | Promise.all:4로 user.collectionOrder:5와 owner/member collections:9를 읽음 |
| 조건부 prisma.link.groupBy | `apps/web/lib/api/controllers/collections/getCollections.ts:40` | collections가 비어있지 않을 때만 count. 아래 Map과 sort:49–79는 orderIndex 우선, 나머지createdAt/id 정렬의 순수 말단,200:81 |

**PUT preference, user.id=queryId, non-demo, schema valid**일 때의 쓰기다. invalid id400/타인401/demo400/schema400은 user.update를 실행하지 않는다.

```jobflow
scope: reader_preferences
Object: Route, Auth, Preferences, Schema, prismaUser
Route.users --> Auth.verifyUser
Route.users --> Preferences.updateUserPreference
Preferences.updateUserPreference --> Schema.safeParse
Preferences.updateUserPreference --> prismaUser.update
```

| 노드 | 코드 | 비고 |
|---|---|---|
| Route.users | `apps/web/pages/api/v1/users/[id]/preference.tsx:5` | verify:6, id:11, 동일user:15, PUT:18/demo:19, controller:25 |
| Preferences.updateUserPreference | `apps/web/lib/api/controllers/users/userId/updateUserPreference.ts:7` | safeParse:11 invalid400:13–20, user.update:24 |
| prismaUser.update | `apps/web/lib/api/controllers/users/userId/updateUserPreference.ts:24` | theme/readableFontFamily/Size/LineHeight/Width/dismissedAnnouncementId:29–35. 반환은password제외:49 이후; DB throw는 catch 없이 전달 |

### JF-17 공개 사용자 lookup과 메일 URL 생성 — getPublicUser / sendVerificationRequest

**GET public users**는 회원 추가 입력과 공개 collection의 owner 표시가 쓰는 보조 계약이다. verifyUser 없이 username/email 또는 숫자id를 조회하되 아래 공개 필드만 응답한다.

```jobflow
scope: public_user_lookup
Object: Route, PublicUser, prismaUser
Route.users --> PublicUser.getPublicUser
PublicUser.getPublicUser --> prismaUser.findFirst
```

| 노드 | 코드 | 비고 |
|---|---|---|
| Route.users | `apps/web/pages/api/v1/public/users/[id].ts:4` | 모든 문자가 숫자인지:8, GET:10, controller:11→status/json:12 |
| PublicUser.getPublicUser | `apps/web/lib/api/controllers/public/users/getPublicUser.ts:3` | findFirst:7, id 또는 username/email OR; 없음404:24 |
| 반환 말단 | `apps/web/lib/api/controllers/public/users/getPublicUser.ts:28–38` | id/name/username/image/archiveAsScreenshot/Monolith/PDF만 반환. password/email 전체 user 객체를 반환하지 않음 |

이메일 signIn provider가 호출하는 helper의 실제 메일 URL은 웹 bridge다. provider callback이 helper Promise를 await하지 않는 것은 [JF-2](#jf-2-인증-provider와-callback--auth--authorize--callbacks)에 기록한 별도 실패 경계다.

```jobflow
orchestrator: VerificationMail
Object: VerificationMail, fs, Handlebars, transporter
VerificationMail.sendVerificationRequest --> fs.readFileSync
fs.readFileSync.template --> Handlebars.compile
Handlebars.compile --> transporter.sendMail
```

| 노드 | 코드 | 비고 |
|---|---|---|
| VerificationMail.sendVerificationRequest | `apps/web/lib/api/sendVerificationRequest.ts:13` | template read:21, compile:26; BASE_URL/auth/verify URL:29–31 |
| transporter.sendMail | `apps/web/lib/api/sendVerificationRequest.ts:32` | 이 helper 내부는 await. rejected/pending 검사:45–47 후 throw. 호출 provider의 미await와 혼동하지 않음 |
| Browser Verify | `apps/web/pages/auth/verify.tsx:35` | 메일 클릭 후 [Browser JF-10](browser.md#jf-10-이메일-링크의-웹-bridge--verify). SMTP와 NextAuth 토큰 검증 내부는 외부 경계 |

## 4. 소유 상태·데이터

| 표 | 주요 열 | 비고 |
|---|---|---|
| User | preventDuplicateLinks, collectionOrder | 정책 읽기와 컬렉션 순서 쓰기 |
| Collection, UsersAndCollections | ownerId, members.canCreate | 기존 collection 생성 권한 |
| Link | url/name/description/type, format fields, lastPreserved | 개인 읽기 상태/감상 필드는 없음 |
| Tag | name,ownerId | collection 소유자 기준 connectOrCreate |

## 5. 의존 — 나가는 방향

| 상대 | 쓰는 계약 | 배선·설정 | 타임아웃 | 결합 |
|---|---|---|---|---|
| Prisma | delegate queries | `packages/prisma/index.ts:5`, DATABASE_URL | 이 경로 명시 없음 | schema 관계 |
| 원문 fetch adapter | fetchTitleAndHeaders | safeFetch | 제목 Promise.race 10초 | 실패 빈 결과 |
| filesystem | createFolder | STORAGE_FOLDER / S3 설정 | 동기 mkdir | 예외 상위 전달 |

## 6. 실패 경계

| 항목 | 기본값 | 설정 키 | 위치 |
|---|---|---|---|
| 저장 개수 한도 | 30000 | MAX_LINKS_PER_USER | verifyCapacity.ts:3 |
| 제목 조회 대기 | 10초 | 없음 | fetchTitleAndHeaders.ts:15 |
| 저장 transaction | 없음 | 없음 | postLink.ts:32–164 |

## 7. 검증 경계

| 테스트 | 무엇을 보장하나 | 실행 결과 |
|---|---|---|
| 저장 success/duplicate/denied/unsafe/mkdir 오류 소스 대조 | 상태 변경과 응답 소유자 | 소스 확인, 실행 아님 |
| `packages/lib/ssrf.test.ts` | 안전한 fetch 정책 단위 테스트 | 존재 확인, 아직 실행하지 않음 |

관련 기존 테스트는 `apps/web/lib/api/archives/resolveAccessibleArchive.test.ts:14`, `apps/web/lib/api/preserved/createPreservedFormatUrl.test.ts:14`, `apps/web/pages/api/v1/preserved/token.test.ts:50`, `apps/web/pages/api/v1/preserved/view.test.ts:46`에 있다. owner/public 접근·거절·없는 파일·host/token 검증 사례와 mock을 읽었으며 실행하지 않았다. 실제 DB 권한 회수 race·SMTP·별도 host 배포 결과를 이 테스트 존재만으로 보장하지 않는다.

## 8. 이슈

| ID | 분류 | 내용 | 근거 | 영향 |
|---|---|---|---|---|
| A-01 | 정합성 | collection 생성부터 link·image·folder까지 단일 transaction/보상이 없음 | postLink.ts:32/:104/:153/:164 | 뒤 실패에도 앞의 저장이 남음 |
| A-02 | 계약공백 | 200은 링크 저장이며 보존 요청 완료 알림이 아님 | postLink.ts:166, worker selector lastPreserved null | UI 저장 완료와 archive 상태를 구분해야 함 |
| A-04 | 비동기 계약 | 비밀번호 재설정 helper를 API가 await하지 않고200을 반환 | `apps/web/pages/api/v1/auth/forgot-password.ts:57–59` | SMTP 실패가 UI 성공 뒤 발생 가능 |
| A-05 | 권한 차이 | getPermission은 collection을 조회하며 실제 owner/member/canUpdate/canDelete 판단은 caller별로 다름 | `apps/web/lib/api/getPermission.ts:9`, link controllers | 읽기 허용을 쓰기 허용으로 대체할 수 없음 |
| A-06 | 개인 주석 정책 | highlight 쓰기는 현재 권한을 검사하지만 GET/DELETE는 user/link 또는 user/id만 검사 | `apps/web/lib/api/controllers/highlights/postOrUpdateHighlight.ts:22`, `controllers/links/linkId/highlight/getLinkHighlights.ts:10` | 권한 회수 후 각 계약의 결과가 다를 수 있음 |
| A-07 | 정합성 | 공유 transaction callback에서 전역 Prisma를 사용 | `apps/web/lib/api/controllers/collections/collectionId/updateCollectionById.ts:67` | delete/create 전부의 원자성을 단정할 수 없음 |
| A-08 | 접근 수명 | signed view는 host/token만 확인한 뒤 현재 DB 권한을 다시 읽지 않음 | `apps/web/pages/api/v1/preserved/view.ts:132–143` | 공개 취소와 기존 token expiry 사이 시간차 |
| A-09 | 기존 기능 부재 | User/Link별 독서 상태·한 줄 감상 모델 없음 | `packages/prisma/schema.prisma:168`, `:276` | Highlight.comment나 공유 description은 별도 의미 |

## 9. 미확인·한계

1. 인증·검색·공유·조회와 초기 읽기까지 소스 분석 후보를 작성했다. 전체 의미 게이트 판정은 대기 중이다.
2. 결제 가드의 웹 호출·결과·grace는 JF-14에서 조사했다. Stripe SDK와 mobile store 구매/receipt 내부는 제외 경계다.
3. DB와 HTTP 실패를 실행으로 검증하지 않았다.
