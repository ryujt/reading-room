# 공유 네트워크·저장 adapter (프로세스 내 모듈) — AS-IS 상세

> **대상**: `packages/lib/ssrf.ts`, `safeFetch.ts`, `packages/filesystem`, `packages/prisma/index.ts`, 제목 조회 helper · **기준**: `952ac454`·2026.10.25
> **근거 색인**: [브리프](../../_evidence-brief.md) · **상태**: 범위 내 URL·보존·조회 협력자의 소스 분석 후보. 별도 서버 경계가 아니라 호출 프로세스 안의 실제 모듈이다.

## 1. 책임 / 비책임

- 책임: URL/DNS 안전성, redirect별 재검증, 파일/S3 쓰기·디렉터리 생성.
- 비책임: 링크 권한과 파일 경로가 DB에 반영되는 시점.
- 아무도 하지 않는 것: createFile의 false 반환과 DB format path를 원자적으로 결합하는 처리. S-01.

## 2. 공개 계약

| 메서드·경로 | 입력 | 출력 | 오류 | 구현 |
|---|---|---|---|---|
| isUrlSafeForServerSideFetch | string URL | boolean | UnsafeUrlError만 false, 다른 오류 throw | `packages/lib/ssrf.ts:331` |
| assertUrlIsSafeForServerSideFetch | URL, optional lookup/private flag | URL 객체 | invalid URL/blocked/lookup 오류 | `packages/lib/ssrf.ts:306` |
| safeFetch | URL, RequestInit+maxRedirects | node-fetch Response | blocked/network/redirect limit throw | `packages/lib/safeFetch.ts:98` |
| fetchTitleAndHeaders | URL, optional content | title,headers | catch에서 빈 title/null headers | `apps/web/lib/shared/fetchTitleAndHeaders.ts:3` |
| createFolder | filePath | void | local mkdirSync 예외 | `packages/filesystem/createFolder.ts:5` |
| createFile | filePath,data,isBase64 | Promise<boolean> | 쓰기 오류는 false | `packages/filesystem/createFile.ts:7` |

## 3. 내부 Job Flow — 드릴다운

**결론**: 공유 모듈 내부에도 DNS 조회·redirect·파일 쓰기와 오류 변환이 있다. SDK 이름만으로 분석을 끊지 않고 실제 adapter 함수까지 펼친다.

| 상위 §5 노드 | L1 그림 | L2 이하 |
|---|---|---|
| [API.postLink](jobflow/save-link.md#2-그림과-계약)의 내부 협력자 | [서버 JF-1.2](web-api.md#jf-12-저장-정책과-영속화--postlink) | [JF-1](#jf-1-url-안전성--isurlsafeforserversidefetch), [JF-2](#jf-2-제목-조회와-안전한-redirect--fetchtitleandheaders), [JF-3](#jf-3-디렉터리와-파일-쓰기--createfoldercreatefile) |
| [Worker.archive](jobflow/preserve-link.md#2-그림과-계약)의 내부 협력자 | [worker JF-1.2](worker.md#jf-12-보존-실행과-실패-회수--archivehandler) | JF-1/2/3을 공유 |

**표기**: 객체는 파일 모듈을 구획한 이름이다. 후행 함수/메서드는 소스에 존재한다. Node 표준 API와 외부 SDK는 버전을 기록한 외부 경계에서 멈춘다. 공유 모듈은 Web/worker 안에서 호출되며 네트워크 홉으로 오인하지 않는다.


**확장 시나리오 드릴다운 지도** — 각 시나리오 §3의 전수 판정과 연결한다. 같은 hook을 공유하는 변형은 같은 내부 그림을 재사용한다.

| 상위 §5 노드 | L1 그림 | L2 이하 |
|---|---|---|
| [Files.readFile/fileExists](jobflow/read-preserved.md#3-html-별도-host-경로) | [Adapter JF-4](#jf-4-파일-조회존재삭제이동--readfile--fileexists--removefiles--movefiles) | 상세의 호출·분기·말단 표 |

### JF-1 URL 안전성 — isUrlSafeForServerSideFetch

```jobflow
orchestrator: SSRF
Object: SSRF
SSRF.isUrlSafeForServerSideFetch --> SSRF.assertUrlIsSafeForServerSideFetch
SSRF.assertUrlIsSafeForServerSideFetch.safe --> SSRF.isUrlSafeForServerSideFetch.result
SSRF.assertUrlIsSafeForServerSideFetch.unsafe --> SSRF.isUrlSafeForServerSideFetch.result
SSRF.assertUrlIsSafeForServerSideFetch.otherError
```

**assert 검증 구간 전제**: http(s) URL이며 options.allowPrivateNetworkAccess와 환경 ALLOW_PRIVATE_NETWORK_ACCESS가 허용하지 않는다. URL constructor의 protocol 오류는 별도 throw이며 환경값을 constructor 반환 포트에 붙이지 않는다.

```jobflow
orchestrator: SSRF
Object: SSRF, URL
SSRF.assertUrlIsSafeForServerSideFetch --> URL.constructor
URL.constructor.http --> SSRF.resolveHostnameForServerSideFetch
URL.constructor.otherProtocol
SSRF.resolveHostnameForServerSideFetch --> SSRF.assertUrlIsSafeForServerSideFetch.result
```

**assert 우회 구간 전제**: http(s) URL이고 options 또는 환경이 private access를 허용한다:319–323. URL을 반환하는 말단이며 resolver 호출은 없다.

```jobflow
orchestrator: SSRF
Object: SSRF, URL
SSRF.assertUrlIsSafeForServerSideFetch --> URL.constructor
URL.constructor.http --> SSRF.assertUrlIsSafeForServerSideFetch.result
URL.constructor.otherProtocol
```

**resolver 공통 구간**: hostname blacklist 검사 결과는 boolean이다. true이면 UnsafeUrlError를 throw하고, false이면 아래 입력형별 구간으로 이어진다.

```jobflow
orchestrator: SSRF
Object: SSRF
SSRF.resolveHostnameForServerSideFetch --> SSRF.isHostnameBlockedForServerSideFetch
SSRF.isHostnameBlockedForServerSideFetch.true
SSRF.isHostnameBlockedForServerSideFetch.false
```

**resolver IP 구간 전제**: 앞 검사를 통과했고 normalize한 입력이 isIP로4 또는6이다:269. DNS 호출을 생략한다.

```jobflow
orchestrator: SSRF
Object: SSRF
SSRF.resolveHostnameForServerSideFetch --> SSRF.isIpAddressBlockedForServerSideFetch
SSRF.isIpAddressBlockedForServerSideFetch.false --> SSRF.resolveHostnameForServerSideFetch.result
SSRF.isIpAddressBlockedForServerSideFetch.true
```

**resolver hostname 구간 전제**: 앞 검사를 통과했고 literal IP가 아니다. default lookup을 사용하는 샘플이며 결과 주소 각각을 IP 정책에 넣는다. 빈 결과/lookup 오류는 UnsafeUrlError다:283–293.

```jobflow
orchestrator: SSRF
Object: SSRF
SSRF.resolveHostnameForServerSideFetch --> SSRF.defaultHostnameLookup
SSRF.defaultHostnameLookup.addresses --> SSRF.isIpAddressBlockedForServerSideFetch
SSRF.isIpAddressBlockedForServerSideFetch.false --> SSRF.resolveHostnameForServerSideFetch.result
SSRF.isIpAddressBlockedForServerSideFetch.true
```

**lookup 하위 구간**: 실제 DNS 위임과 family4/6 필터링 후 주소배열 반환이다.

```jobflow
orchestrator: SSRF
Object: SSRF, dns
SSRF.defaultHostnameLookup --> dns.lookup
dns.lookup.result --> SSRF.defaultHostnameLookup.result
```

| 노드 | 코드 | 비고 |
|---|---|---|
| isUrlSafeForServerSideFetch | `packages/lib/ssrf.ts:331` | assert 호출:339. safe=true:340, UnsafeUrlError=false:342, 기타 throw:346 |
| assertUrlIsSafeForServerSideFetch / URL.constructor | `packages/lib/ssrf.ts:306`, `:313` | http(s) 외는 UnsafeUrlError:315. private 허용:319–323이면 DNS 생략. 호출자 URL은 원본 그대로 보존 |
| resolveHostnameForServerSideFetch | `packages/lib/ssrf.ts:259`, 호출 `:326` | normalize:263, hostname block:265, literal IP:269, DNS:282, 빈 결과:291, 어떤 결과라도 blocked면 거절:295 |
| isHostnameBlockedForServerSideFetch | `packages/lib/ssrf.ts:193` | set/suffix/single-label 체크. hostname 검사 false 이후 resolver 자신의 `isIP`:269가 입력형을 가른다 |
| defaultHostnameLookup / dns.lookup | `packages/lib/ssrf.ts:245`, `:246` | dns/promises lookup all+verbatim. resolver는 options.lookup을 주입받을 수 있으나 이 샘플 호출은 default. throw를 UnsafeUrlError로 변환:283 |
| isIpAddressBlockedForServerSideFetch | `packages/lib/ssrf.ts:204` | IPv4/IPv4-mapped IPv6와 IPv6 CIDR 차단. parseIPv4:98, extractIPv4FromMappedIPv6:184, parseIPv6:129, ipv6MatchesPrefix:225는 주소 숫자 변환/비트 비교의 순수 말단 |

- 첫 두 그림에서 `unsafe/otherError`는 후속 호출 없이 예외 종료한다. 호출자 boolean wrapper만 UnsafeUrlError를 false로 바꾼다.
- lookup 하위 그림에서 실제 DNS 호출과 변환을 분리했다. defaultHostnameLookup의 주소 배열은 resolver가 검사하고, 최종 반환은 그 주소 배열이다. IP check boolean 자체를 주소 배열로 반환한다는 뜻이 아니다.
- DNS 자체는 Node 외부 API, 주소 parser는 본문 확인한 변환 말단이다. 테스트 위치 `packages/lib/ssrf.test.ts`, 실행 전.

### JF-2 제목 조회와 안전한 redirect — fetchTitleAndHeaders

```jobflow
orchestrator: Metadata
Object: Metadata, SafeFetch, Promise, response
Metadata.fetchTitleAndHeaders --> SafeFetch.safeFetch
SafeFetch.safeFetch.promise --> Promise.race
Promise.race.response --> response.text
response.text.result --> Metadata.fetchTitleAndHeaders.result
Promise.race.timeoutOrError --> Metadata.fetchTitleAndHeaders.result
```

**safeFetch 구간**: redirect 판정의 boolean과 header의 location 존재 여부를 각각 실제 반환 데이터에 연결한다. 호출자의 환경은 createAgent 내부 구간에서 따로 설명한다.

```jobflow
orchestrator: SafeFetch
Object: SafeFetch, SSRF, nodeFetch, headers, URL
SafeFetch.safeFetch --> SSRF.assertUrlIsSafeForServerSideFetch
SSRF.assertUrlIsSafeForServerSideFetch.result --> SafeFetch.createAgent
SafeFetch.createAgent.result --> nodeFetch.fetch
nodeFetch.fetch.result --> SafeFetch.isRedirectStatus
SafeFetch.isRedirectStatus.false --> SafeFetch.safeFetch.result
SafeFetch.isRedirectStatus.true --> headers.get
headers.get.missing --> SafeFetch.safeFetch.result
headers.get.location --> URL.constructor
URL.constructor.result --> SSRF.assertUrlIsSafeForServerSideFetch
```

headers는 직전 response.headers이며 get의 인자는 location이다:122. 위의 종료 분기에서 반환하는 값은 **직전 fetch의 Response**이고 boolean 또는 header 문자열을 그대로 반환하는 것이 아니다. URL constructor 뒤 다음 loop에서 다시 안전성을 검사한다. 실제 반복이며 매회 최대 redirects 조건을 적용한다.

| 노드 | 코드 | 비고 |
|---|---|---|
| Metadata.fetchTitleAndHeaders / SafeFetch.safeFetch | `apps/web/lib/shared/fetchTitleAndHeaders.ts:3`, `:11` | optional content 있으면 fetch 생략. 이 POST 경로는 URL만 전달 |
| Promise.race | `apps/web/lib/shared/fetchTitleAndHeaders.ts:18` | responsePromise와10초 reject:12–16. AbortSignal이 없어 timeout이 원문 요청을 취소하지 않음 |
| response.text | `apps/web/lib/shared/fetchTitleAndHeaders.ts:26` | regex title:32, headers:29 반환. race 이후 body read는 위10초 race에 포함되지 않음 |
| SafeFetch.safeFetch | `packages/lib/safeFetch.ts:98` | for loop 최대 maxRedirects=5:102–106. redirect별 assert:107 |
| SafeFetch.createAgent | `packages/lib/safeFetch.ts:59`, 호출 `:114` | PROXY 있으면 HTTP/Socks agent:60–72. 없으면 private허용 여부에 따라 safe lookup:75–78, protocol별 http/https agent:80–91 |
| SafeFetch.isRedirectStatus | `packages/lib/safeFetch.ts:94`, 호출 `:118` | 300≤status<400 단일 규칙 말단. location:122, 상대 redirect URL:128 |
| nodeFetch.fetch | `packages/lib/safeFetch.ts:108` | redirect manual, agent, caller options. 최종 raw Response 반환 |

- redirect 화살표는 **실제 loop 재호출**이다. 각 응답에 location이 있으면 새 URL을 검사하고 다시 fetch, 한도 초과:131은 throw. replay의 부작용을 자동 보상하지 않는다.
- createAgent의 `createSafeLookup`:16은 socket DNS callback을 정의한다. `resolveHostnameForServerSideFetch`:37의 결과를 family/all 옵션에 맞게 callback:40/49에 전달하고 오류는 callback(error):52. 이 adapter는 정책을 다시 적용하므로 사용자 지정 DNS와 단순 문서 목록으로 생략하지 않는다.
- 제목 helper는 모든 catch를 `{title:'',headers:null}`로 바꾼다:40–42. store 작업은 그 결과를 받아 URL fallback을 사용한다.

### JF-2.1 socket DNS callback 등록과 실행 — createSafeLookup

이 절은 **PROXY가 없고 ALLOW_PRIVATE_NETWORK_ACCESS가 true가 아닌 경로**다. proxy 경로는 자체 agent를 만들고, private 허용 경로는 lookup을 undefined로 넘기므로 아래 callback을 등록하지 않는다. URL 사전 검사와 socket 연결 시 검사는 서로 다른 실행이다.

```jobflow
orchestrator: SafeFetch
Object: SafeFetch, HttpAgent
SafeFetch.createAgent --> SafeFetch.createSafeLookup
SafeFetch.createSafeLookup.lookup --> HttpAgent.constructor
HttpAgent.constructor.result --> SafeFetch.createAgent.result
```

HttpAgent는 target.protocol에 따라 실제 `new http.Agent({lookup})`:81 또는 `new https.Agent({lookup,...})`:84다. 생성은 callback을 호출하지 않는다. `createSafeLookup`:16은 함수식 `lookup`:17–54를 반환:56한다. 이 agent를 fetch:114에 넘기고, Node 네트워크 계층이 연결을 위해 callback을 호출할 때 아래 실행이 시작된다.

```jobflow
orchestrator: LookupCallback
Object: LookupCallback, SSRF, Node
LookupCallback.lookup --> SSRF.resolveHostnameForServerSideFetch
SSRF.resolveHostnameForServerSideFetch.addresses --> Node.callback
SSRF.resolveHostnameForServerSideFetch.throws --> Node.callback
```

| 노드·수명 | 실제 근거 | 데이터·오류 수신자 |
|---|---|---|
| LookupCallback.lookup | **익명 함수 식별용 별칭 — 원문 이름 아님**. 함수식의 변수명은 lookup, `packages/lib/safeFetch.ts:17–54`, 등록용 반환:56, agent 등록:78/81/85. 실행 주체는 Node socket의 lookup 호출 | hostname/options/callback을 Node가 전달. 정규화와 family 선택은 본문:28–35 |
| SSRF.resolveHostnameForServerSideFetch | 호출:37, 구현 `packages/lib/ssrf.ts:259`, defaultHostnameLookup 인자 | 차단 hostname/IP/DNS 결과는 reject. [JF-1](#jf-1-url-안전성--isurlsafeforserversidefetch)의 resolver 검사를 재사용 |
| Node.callback | 실제 인자 callback 호출 `safeFetch.ts:40/:49/:52` | all이면 `(null, resolved[])`; 아니면 family 일치 주소 또는 첫 주소를 선택해 `(null,address,family)`. 실패면 `(error)` |

여기 Node는 callback 인자를 전달한 호출자를 표시하고 `Node.callback`의 실제 함수 인자 이름은 callback이다. callback의 수신자는 Node 연결 계층이다. resolver Promise를 lookup이 return/await하지 않으며 `.then(...).catch(...)`로 연결 결과를 보고한다. socket 오류는 node-fetch의 요청 실패로 전파되고 safeFetch는 잡지 않는다. 제목 조회의 catch 또는 worker 호출자의 catch가 마지막 오류 수신자다. 이 등록/실행 구분은 소스에서 확인했고 DNS rebinding이나 socket 오류를 실행한 증거는 아니다.

### JF-3 디렉터리와 파일 쓰기 — createFolder/createFile

**local createFolder 전제**: s3Client가 없다. S3 설정 경로는 no-op:6–7이며 mkdir를 호출하지 않는다.

```jobflow
orchestrator: Files
Object: Files, fs
Files.createFolder --> fs.mkdirSync
```

**local createFile 전제**: s3Client가 없다. mkdir 또는 writeFile 오류는 같은 catch에서 false로 변환된다.

```jobflow
orchestrator: Files
Object: Files, fs
Files.createFile --> fs.mkdir
fs.mkdir --> fs.writeFile
fs.mkdir.throws --> Files.createFile.result
fs.writeFile.success --> Files.createFile.result
fs.writeFile.throws --> Files.createFile.result
```

**S3 createFile 전제**: s3Client가 있다. local mkdir/write를 호출하지 않는다.

```jobflow
orchestrator: Files
Object: Files, s3Client
Files.createFile --> s3Client.send
s3Client.send.success --> Files.createFile.result
s3Client.send.throws --> Files.createFile.result
```

| 노드 | 코드 | 비고 |
|---|---|---|
| Files.createFolder / fs.mkdirSync | `packages/filesystem/createFolder.ts:5`, `:17` | S3면 아무 일 없음:6. local은 cwd/../.. /STORAGE_FOLDER(default data)/filePath를 path.join. 동기 예외를 잡지 않음 |
| Files.createFile | `packages/filesystem/createFile.ts:7` | string/base64/Buffer 변환:16–23. S3/local은 상호배타 분기 |
| fs.mkdir / fs.writeFile | `packages/filesystem/createFile.ts:59`, `:60` | 재귀 mkdir 후 await write. catch:62–64에서 false; mkdir 실패도 같은 catch로 false. 성공true |
| s3Client.send | `packages/filesystem/createFile.ts:43` | PutObjectCommand bucket/key/body/MD5. catch false:45–47. local과 동시 쓰기 아님 |

- createFolder와 createFile은 별도 공개 함수이므로 한 실행의 연속처럼 읽지 않는다. 전자는 저장 controller/worker setup, 후자는 format handler가 호출한다.
- `createFile=false`는 rejection이 아니다. [Readable handler](worker.md#jf-122-readable-생성--handlereadability)는 boolean을 검사하지 않고 DB path를 update한다. S-01.
- Prisma 인스턴스는 `packages/prisma/index.ts:5–14`의 전역 재사용과 constructor 설정 말단이다. generated delegate와 DB engine은 `@prisma/client`6.10.1(`yarn.lock:6715`), schema의 PostgreSQL provider에서 외부 경계로 분류한다. 애플리케이션 query predicate/transaction은 호출자 상세에서 분석한다.

### JF-4 파일 조회·존재·삭제·이동 — readFile / fileExists / removeFiles / moveFiles

모든 경로는 앞 절과 같은 local/S3 선택이며 동시에 두 저장소를 사용하지 않는다. 아래는 **local** 경로다.

```jobflow
orchestrator: Files
Object: Files, fs
Files.readFile --> fs.existsSync
fs.existsSync.true --> fs.readFileSync
```

`packages/filesystem/readFile.ts:19`, local path:82–87, suffix contentType:89–100, exists:102 false404, readFileSync:109 true200. local permission/read오류는 catch없어 throw. S3 경로는 :38 HeadObject→성공 시만 :50 GetObject→streamToBuffer:53. Head실패는400:42–46, outercatch:71는 status없는 object:75를 반환한다. 이를 정상 404와 같다고 가정하지 않는다.

```jobflow
orchestrator: Files
Object: Files, s3Client
Files.readFile --> s3Client.send
s3Client.send.response --> Files.streamToBuffer
```

위 그림은 HeadObject 성공 후 GetObject 구간의 send 호출만 표시한다. 앞선 HeadObject는 같은 메서드의 별도 호출이며 실제 `s3Client.send(new HeadObjectCommand(...))`:38 / `send(new GetObjectCommand(...))`:50이다. streamToBuffer:116는 Promise executor:118에 stream.on(data:119/error:120/end:121)을 등록하며 error reject, end Buffer.concat resolve. executor와 stream callback은 별도실행이다.

```jobflow
orchestrator: Files
Object: Files, fs
Files.removeFile --> fs.unlink
Files.moveFile --> fs.existsSync
fs.existsSync.true --> fs.rename
```

removeFile `packages/filesystem/removeFile.ts:6`의 local unlink:27는 callback등록 후 함수가 끝난다. callback은 err가 ENOENT가 아니면 log:28만 한다. moveFile `moveFile.ts:6` local exists:33→rename:34도 callback log:35이며 완료를 기다리지 않는다. `removeFiles`가 await해도 unlink 완료를 보장하지 않는다. S3 remove는 send DeleteObject:14 await/catchlog:16; move는 copyObject callback:17에서 성공했을 때 removeFile:21, copy등록 반환을 await하지 않는다.

| 공개 함수 | 실제 본문 | 종료 판정 |
|---|---|---|
| fileExists | `packages/filesystem/fileExists.ts:6`, S3 Head:9 success true/catch false, localexists:25 | 말단 확인 — 단일IO와 boolean 변환; 오류를 false로 숨길 수 있음 |
| removeFiles | `packages/filesystem/manageFiles.ts:4` | 각 확장자별 removeFile을 await하는 반복 조율. 파일 이름은 pdf/png/jpeg/jpg/html/preview/readability:6–28 |
| moveFiles | `packages/filesystem/manageFiles.ts:33` | 7개 moveFile을 await하지만 각 local callback 완료와 별개 |
| localfs/S3 SDK | import fs / AWS SDK | 외부 경계 — OS/원격 저장소 내부는 분석하지 않음 |


## 4. 소유 상태·데이터

| 데이터 | 경로 | 쓰기 주체 | 생명주기·보존 | 원자성 |
|---|---|---|---|---|
| archive 파일 | archives/collectionId/linkId 확장자 | createFile | local 또는 S3 | DB와 원자성 없음 |
| folder | cwd/../../STORAGE_FOLDER | createFolder | 저장소 디렉터리 | sync mkdir |

## 5. 의존 — 나가는 방향

| 상대 | 쓰는 계약 | 배선·설정 | 타임아웃 | 결합 |
|---|---|---|---|---|
| DNS/원문 HTTP | lookup/fetch | private/proxy/TLS 설정 | safeFetch 자체 명시 없음 | URL/IP 정책 |
| local fs/S3 | write/PutObject | STORAGE_FOLDER/S3 설정 | 이 함수 명시 없음 | 경로 문자열 |

## 6. 실패 경계

| 항목 | 기본값 | 설정 키 | 위치 |
|---|---|---|---|
| redirect | 최대5 | 호출 maxRedirects | safeFetch.ts:102 |
| title race | 10초 | 없음 | fetchTitleAndHeaders.ts:15 |
| private network | 차단 | ALLOW_PRIVATE_NETWORK_ACCESS | ssrf.ts:321 |

## 7. 검증 경계

| 테스트 | 무엇을 보장하나 | 실행 결과 |
|---|---|---|
| ssrf.test.ts | URL/IP/DNS 차단 정책 | URL/IP/DNS 테스트 본문 확인, 실행 전 |
| file false 반환의 호출자 대조 | 오류가 DB path에 반영되지 않는 위치 | 소스 대조, 실행 아님 |

## 8. 이슈

| ID | 분류 | 내용 | 근거 | 영향 |
|---|---|---|---|---|
| S-01 | 정합성 | 파일 쓰기 false를 Readable handler가 검사하지 않음 | createFile.ts:62, handleReadability.ts:48–53 | 파일이 없어도 path가 DB에 기록될 수 있음 |
| S-02 | 계약공백 | title의10초 race는 body 읽기와 요청 취소를 포괄하지 않음 | fetchTitleAndHeaders.ts:18/:26 | 총 대기시간 상한으로 해석하면 틀림 |
| S-03 | 비동기 완료 | local unlink/rename과 S3 copy callback 완료를 wrapper의 await가 기다리지 않음 | `packages/filesystem/removeFile.ts:27`, `moveFile.ts:17/:34`, `manageFiles.ts:4` | DB 응답과 파일 정리 완료 사이 시간차가 존재 |

## 9. 미확인·한계

1. local/S3 장애는 실행하지 않았다. 외부 라이브러리 내부와 원문 서버는 외부 경계다.
2. readFile/removeFiles/S3의 실제 호출·반환·callback을 JF-4에서 확인했다. 실제 스토리지와 네트워크 장애 주입은 하지 않았다.
