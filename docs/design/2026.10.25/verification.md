# Reading Room 실제 계약·통합 검증

프로토타입 gate와 commit `eeafc4eb` 이후 시작한 검증 우선 구현이다. 필요한 실제 계약을 먼저 확인하고, 통과한 제품 모듈을 새 페이지에 연결한다. 기존 기본 진입점은 실제 전 구간 검증 때까지 유지했고 통과 후 Reading Room으로 전환했다.

## 검증 단위

| ID·질문·근거 | 통과 기준 | 필요 증거·선행 | 실행 증거·결과 | 재사용·조립 | 남은 일 |
|---|---|---|---|---|---|
| V-01 R-01·C-01 개인 소유·권한·수명 | owner/read-only member는 자기 row만 읽고 씀. outsider404, body userId400. revoke 후 기존 row도404, Link/User 삭제 cascade | 새 PostgreSQL과 실제 Next HTTP. 선행 없음 | 작성자 실제 HTTP/SQL 13개 검사 및 독립 HTTP 12개 검사(행동9개·원복3개) 통과. [계약 결과](evidence/contracts.json), [독립 결과](evidence/independent-http.json) | Prisma ReadingProgress, readingPolicy, getReading/putReading | 통과 |
| V-02 R-03·04·D-02 CAS와 응답 확인 | 동시 다른 payload 중 한 성공/한409, 최초 create 경합 row1개, 동일 stale payload200/version 불변, version 상한 거절 | 실제 PostgreSQL·HTTP, V-01 | 실제 최초 생성·기존 row 경합, 동일값 응답 확인 통과 | putReading/commitReading/resolveConflict | 통과 |
| V-03 R-02 snapshot·pagination | 총합 일치/Unread 음수 없음,31개 이상에서30개와 다음 cursor, 중복 없는 id 내림차순, 검색에도 global counts | 실제 PostgreSQL·HTTP, V-01 | 34개 임시 링크 페이지와 20개 동시 변경/조회에서 통과 | listReadingLinks/readSnapshot | 통과 |
| V-04 R-01 public 비노출·입력 | 공개/원본 Link JSON에 다른 사람 reflection/row 없음. 과대 id/cursor/version400, 인증 없는401 | 실제 Next HTTP, V-01 | 원본 private/public 응답과 입력 경계에서 통과 | 새 route와 기존 public route | 통과 |
| V-05 R-05 원본 저장·보존 | 실제 register/login→POST Link→DB row→worker가 파일 생성→original viewer 본문 | 실제 Next/worker/Chromium·전용 저장소, V-01 | 실제 등록·로그인·원본 POST/worker·24개 형식 파일 및 archive HTTP 200 통과. [형식별 증거](evidence/archives.json) | 기존 postLink/archiveHandler/viewer | 실제 Linked Data Readable 본문과 복귀 CUA 통과 |
| V-06 R-04 timeout·취소·actor 수명 | 실제 transport 지연은 유한 시간에 종료, draft 유지, explicit PUT 재시도. 자동 POST 재시도 없음 | 로컬 실제 HTTP 상대; V-01·02 | 실제 로컬 TCP 상대에서 timeout/Abort/명시 재시도/POST 1회 통과. [결과](evidence/transport-worker.json) | RealReadingClient, useReadingRoom | 통과, UI 초안 보존은 프로토타입 검증과 최종 CUA 연결 |
| V-07 R-04·05 Next history·viewer | legacy Next entry→Room detail→dirty Back Guard. known-index도 보호. return hint 검증 후 detail/library 복귀 | 실제 PagesRouter와 CUA, V-01~06 | 실제 CUA: known Back Keep/Discard, 실제 Next Link의 unknown Back Keep/Discard, Readable 본문과 detail 복귀 통과 | Next navigation adapter, preserved return | 통과 |
| V-08 R-03·05·06 전 구간 | 실제 계정→상태+감상 저장→reload 지속→보존 읽기→복귀. 새 링크·mobile·기본 로그인 진입 확인 | 실제 서비스 CUA와 독립 HTTP, V-01~07 | 실제 CUA: 한글 감상과 reload, 실제 HTTP 경합 후 충돌 비교/명시 덮어쓰기, 새 링크 id41, 검색/global counts, mobile390 저장 통과 | 실제 Reading Room 페이지 | production build·새 로그인 진입 통과. 기존 viewer markup 보정 후 production 재확인 통과 |

제품 구현은 `apps/web/lib/api`·기존 Prisma·공유 UI 한 곳에 둔다. 검증 스크립트는 `examples/reading-room`에서 공개 HTTP 경로를 사용한다. 고경계 DB 상태가 필요할 때만 fixture 준비·결과 관찰을 SQL로 수행하고 API 우회 성공과 구분한다. 원본 외부 서비스·이전 DB·이전 private 자료를 재사용하지 않는다.

## 자원과 실행 범위

새 컨테이너 `reading-room-r2-db`, 포트 `127.0.0.1:54721`, 별도 볼륨과 외부 private 폴더 `reading-room-r2`를 사용한다. 제품은 `127.0.0.1:4721`, prototype은 `127.0.0.1:4720`이다. 비밀은 저장소 밖0600 파일이며 로그·문서·commit에 값을 남기지 않는다. 준비·기동·종료는 [로컬 실행 문서](../../run-local.md)에 정리했다.

V-01~04의 실제 계약 검증은 통과했다. V-05의 브라우저 본문과 V-06~08의 통합도 개발 서버에서 통과했다. production 빌드와 새 로그인 확인도 통과했으며 아래에 기록했다. 프로토타입의 가상 저장·권한·보존 표시를 실제 계약 증거로 사용하지 않는다.

## 검증 중 발견과 수정

- 원본 `bcrypt` native binding은 scripts를 끈 focused install에서 생성되지 않았다. 원본 패키지의 `node-pre-gyp install --fallback-to-build`로 설치한 뒤 실제 credentials 로그인에 성공했다.
- 첫 worker 실행은 Monolith가 PATH에 없어 HTML 보존에 실패했다. 전용 private `bin`에 설치된 Monolith 2.11.6을 연결하고, 원본 archive refresh API를 통해 재시도했다. 이전 프로젝트의 DB나 문서·파일은 사용하지 않았다.
- 초기 fixture의 `keep.html`은 짧은 오류 문서를 반환했다. 링크 4만 원본 PUT으로 `greatwork.html`로 교정하여 재보존했다. 개인 상태와 감상은 바꾸지 않았다. 파일 존재는 원문의 올바른 본문을 자동으로 증명하지 않으므로 viewer 본문은 별도 브라우저 검증 대상으로 둔다.
- 독립 검토자의 원본 dashboard 캡처는 이번 rebuild의 새 fixture를 사용했다. 기존 사용자 자료가 아니다. [원본 화면](../../screenshots/as-is/dashboard.jpg)

- 원본 worker 실행 중 generic `Socket`의 EPIPE가 발생했다. stack만으로 정확한 socket을 확정하지 않았으며 proxy 원인이라고 단정하지 않는다. 별도 소스 조사에서 `handleMonolith`의 child.stdin write에 error listener가 없음을 발견했다. 조기 종료 및 stdin만 닫고 생존하는 자식으로 재현한 뒤 error→SIGKILL→reject, close의 파일 쓰기 생략을 추가했다. 독립 검토자도 재현 테스트를 통과시켰다. 기존 AS-IS는 baseline 관찰로 유지한다.
- 실제 Next 통합 최초 compile에서 존재하지 않는 UI package subpath를 발견했다. 공개 package entry import로 수정했고 HTTP 200과 전체 web TypeScript를 확인했다. 브라우저 성공은 별도로 판정한다.
- R-I-1: 기존 저장 URL은 신규 Save 폼 검증을 거쳤다고 가정할 수 없다. Open source는 http/https URL만 활성화하고 실제 이동 직전에도 같은 정책으로 확인한다. javascript/data/file/빈 URL 거절 검사를 통과했다.

## 실제 브라우저 관찰

브라우저 검토자는 1269×720 desktop과 390×844 iframe에서 실제 계정과 이번 fixture를 사용했다. Dashboard Sidebar→Reading Room, link6 Reading+한글 감상 저장/Saved/reload, 실제 HTTP 경합→409 비교→명시적 내 초안 저장을 확인했다. Readable6은 원본 viewer 본문을 렌더했고 Back to Reading Room은 같은 detail과 감상으로 돌아왔다.

known-index Back은 Keep editing에서 초안을 유지하고 다시 Back→Discard에서 목록으로 돌아갔다. unknown-index는 `/__review/navigation`의 실제 Next Link로 detail6에 직접 진입해 검증했다. Back→Keep은 현재 detail을 보존하고 별도 새 진입의 Back→Discard는 검토 페이지로 돌아갔다. 이는 DOM history 주입 테스트가 아니다.

mobile390에서는 link5의 긴 한글 제목과 한글 입력, Close→Guard→Save and leave를 확인했다. 새 링크 Axioms.html은 원본 POST로 id41이 됐고 개인 감상 저장 후 전체7/Unread3/Reading3/Finished1, Finished 필터1개, Axioms 검색1개와 global counts 유지가 관찰됐다. worker가 이후 보존 상태를 갱신했다. 새 링크 이후 다시 seed하지 않았다.

[실제 충돌 화면](../../screenshots/actual/conflict.jpg)과 [원본 viewer 본문](../../screenshots/actual/preserved.jpg)은 개발 모드의 실제 서비스 캡처다. 최종 대표 캡처는 아래 production 판정에 별도로 연결했다.

## 최종 코드 지도 검토

[실제 source map](final/source-map.md)의13개 JobFlow·7개 링크는 자동 변환 실패 0, 재등장 경고 4였다. 경고는 같은 함수가 helper 결과를 받아 계속하는 실제 순서에 해당하며 각 그림 옆에 근거를 남겼다. 엄격 검사 경고0이라고 주장하지 않는다. 검토자가 snapshot/권한/CAS/Guard 네 PNG를 열어 겹침·잘림과 호출 순서를 확인했다.

## Production 빌드

`node scripts/reading-room.mjs build`는 web 타입검사, optimized compile, 60개 static 생성, trace 수집을 완료했다. Reading Room route는 first-load JS 179kB로 보고됐다. production start4721이 Ready 상태다. 오래된 dev wrapper가 남아 첫 start에서 EADDRINUSE가 났으므로 해당 저장소의 PID와 포트 소유를 확인해 종료한 뒤 시작했다. 다른 프로젝트 프로세스는 종료하지 않았다. 현재 wrapper는 분리된 자식 프로세스 그룹에 SIGINT/SIGTERM을 전달한다.

runtime.env와 fixtures.json의 0600 권한을 확인했다. 의존성 기존 peer 경고와 원본 Next Image의 Next16 예고 경고는 새 기능의 타입·빌드 실패와 구분한다.

## Production 브라우저 판정

원본 Logout→실제 Login→기본 `/reading-room` 진입이 통과했다. 새 링크41의 저장된 한글 감상과 보존 버튼도 유지됐다. [대표 화면](../../screenshot.jpg)은 production의 실제 viewport 1280×720(content scrollWidth 1265), [모바일 감상](../../screenshots/actual/mobile-note.jpg)은 production 390×844 iframe이다. 앞선 prototype/dev 관찰의1269px 기록과 이 최종 viewport를 구분한다.

production 확인 이후 새로운 console warning/error는 0이었다. 다만 검토자는 이전 개발 서버에서 원본 Readable viewer의 중첩 button hydration error 2개를 관찰했다. baseline952ac454의 `TextStyleDropdown.tsx:81`은 DropdownMenuTrigger 안에 Button을 넣으면서 asChild를 지정하지 않았다. 이번 viewer 접점에서 발견한 기존 오류로 분류하고 Trigger에 asChild 한 속성을 추가했다. 새 Reading Room page 오류로 기록하지 않는다. 수정 후 production 재빌드와 실제 viewer 재확인도 통과했다.


최종 production viewer에서 appearance 메뉴의 Font Style/Size/Line Height/Width가 정상 열렸다. 읽기 전용 DOM 검사에서 `button button`은0개였고 이번 재시작 이후 새 console warning/error는 없었다. Escape 후 Back to Reading Room은 link6와 저장된 한글 감상으로 돌아왔다. [실제 production viewer 메뉴](../../screenshots/actual/viewer-menu.jpg)는 이 최종 실행의 캡처다. `659b0a66`의 한 속성 수정 뒤 확인했으며 모든 신규 기능의 소스 의미 검토는 열린 필수 지적0건이다.
