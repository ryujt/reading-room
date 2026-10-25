# 보존물 읽기 — TO-BE 변경 Job Flow

> **목표 기준** 2026.10.25 · **AS-IS 대비** 변경. 원본 viewer와 파일 계약은 유지하고 return hint만 추가한다. [이번 기준선 원본](../../../as-is/details/jobflow/read-preserved.md)의 도표와 내부 계약을 목표에서도 유지한다. 아래 코드는 upstream 952ac454의 확인된 근거이며 목표 실행을 검증했다는 뜻이 아니다. [목표 핵심](../../system-design-to-be.md) C-05의 회귀 검증 대상이다.

> **DATE** 2026.10.25 · **기준** `952ac454` 소스 역추출. [핵심](../../system-design-to-be.md#5-흐름--경계끼리-어떻게-소통하나) · [Navigation](../navigation/read-preserved.md)

## 1. 트리거·완료

사용자가 보존 형식을 선택하거나 preserved URL로 직접 진입한다. 완료는 실제 파일이 readable 본문/iframe/img에 표시되는 것이며 link metadata조회200만으로 완료가 아니다. public/private route가 같은 viewer를 사용한다.

## 2. 직접 파일 경로

```jobflow
scope: archive_direct
Object: Browser, API
Browser.selectFormat --> API.getArchive
API.getArchive.response --> Browser.renderFormat
```

## 3. HTML 별도 host 경로

USER_CONTENT_DOMAIN이 설정되고 HTML을 선택한 경우만 아래 경로다. Browser는 token응답에서 받은 URL을 iframe src로 사용하며API가view를대신호출하지않는다.

```jobflow
scope: archive_signed
Object: Browser, API, ContentHost
Browser.selectMonolith --> API.issueToken
API.issueToken.url --> Browser.loadIframe
Browser.loadIframe --> ContentHost.view
ContentHost.view.response --> Browser.renderFormat
```

| 상위 노드 | 계약·실제 심볼·근거 | 내부 추적 | 판정 |
|---|---|---|---|
| Browser.selectFormat/renderFormat | ReadableView.fetchLinkContent(:66) 또는 Content.renderFormat(:161)의iframe/img src. title/body표시·sanitize | [Browser JF-8](../../../as-is/details/browser.md#jf-8-보존물-로딩과-refresh--fetchlinkcontent--loadmonolith--updatearchive) | 펼침 — 입력·로딩·cancel소유자 |
| API.getArchive | GET `/api/v1/archives/:id?format&preview`, handleGet:85. contentType/status/file,401접근불가,HTML별도domain/noBearer403 | [API JF-11](../../../as-is/details/web-api.md#jf-11-보존-파일-접근-정책과-직접-전송--handleget--resolveaccessiblearchive) | 펼침 — token선택적검증→resolve권한→readFile |
| Browser.selectMonolith/loadIframe | Content effect:85–157 익명callback→getPreservedFormatUrl:124,iframeurlstate. loadIframe는다음동작별칭 | [Browser JF-8](../../../as-is/details/browser.md#jf-8-보존물-로딩과-refresh--fetchlinkcontent--loadmonolith--updatearchive) | 펼침 — effectcleanup은표시억제뿐 |
| API.issueToken | GET `/api/v1/preserved/token?linkId&format`, handler:13→resolve:34/fileExists:47/signURL:51.200URL,401권한,404파일,400설정,405method,500예외 | [API JF-11.1](../../../as-is/details/web-api.md#jf-111-서명-url-발급과-별도-host-조회--handler--createpreservedformaturl) | 펼침 — filePath/tokenTTL300초 |
| ContentHost.view | GET `/api/v1/preserved/view?token&download`, handler:97 host검사:119/decode:132/read:143.401token,403host,405method,500예외 | [API JF-11.1](../../../as-is/details/web-api.md#jf-111-서명-url-발급과-별도-host-조회--handler--createpreservedformaturl) | 펼침 — 별도host이나같은Next코드, 현재DB권한재조회없음 |
| Files.readFile/fileExists | local/S3변형과오류반환 | [Adapter JF-4](../../../as-is/details/adapters.md#jf-4-파일-조회존재삭제이동--readfile--fileexists--removefiles--movefiles) | 펼침 — 실제파일IO와callback수명 |
| iframe/img/DOMPurify/JWT/DBengine | browser표준및라이브러리 | [패키지](../package-configuration.md) | 외부경계 — adapter까지확인 |

## 4. 단계·오류·되돌림

1. useGetLink로 metadata를읽고 format query를정한다. 형식 선택은shallowrouter.push이며보존worker를호출하지않는다.
2. 직접GET은token의사용자또는public조건으로collection을조회한다. DB format필드와무관하게경로를계산하고파일을읽는다.
3. 별도host HTML은발급때권한+파일존재를검사하고서명URL을만든다. view는host/token/scope/expiry검사뒤파일을읽고DB권한은다시읽지않는다.
4. Readable은JSON.content를sanitize한다. HTML iframe은sandbox,PDF/image는해당뷰어로표시한다. Navbar Back은 유효한 hint의 link 유무에 따라 ReadingDetail 또는 ReadingLibrary로 돌아간다. 기존 진입이나 invalid hint는 Dashboard를 유지한다.

파일없음·S3오류·권한오류의status는동일하지않다. token발급후공유취소는토큰을즉시무효화하지않으며300초expiry가수명을정한다. HTML effect는isCancelled를검사하지만Readable fetch에는같은guard가없다. download는직접GET확인후anchorclick으로다시요청할수있다. 실행검증전소스상관찰이다.


## 목표 복귀 계약

C-06 제안: Reading Room의 사용 가능한 format action은 clean 또는 Guard 승인 뒤 현재 탭에서 원본 viewer를 열며 허용된 `/reading-room?link=id` return hint를 전달한다. 형식 변경에도 hint를 보존한다. [Browser JF-5](../browser.md#jf-5-원본-viewer-왕복--safereadingreturnto)의 allowlist를 통과하지 못하면 기존 Dashboard로 돌아간다. [ReadingDetail Layout](../layout/reading-detail.md)과 [개인 탐색 Navigation](../navigation/reading-library.md)을 참조한다. 원본 archive/token HTTP와 HTML sandbox는 변경하지 않는다.
