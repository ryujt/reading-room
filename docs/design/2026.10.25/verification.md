# Reading Room 실제 계약·통합 검증

프로토타입 gate와 commit `eeafc4eb` 이후 시작한 검증 우선 구현이다. 필요한 실제 계약을 먼저 확인하고, 통과한 제품 모듈을 새 페이지에 연결한다. 기존 기본 진입점은 실제 전 구간 통과 전까지 유지한다.

## 검증 단위

| ID·질문·근거 | 통과 기준 | 필요 증거·선행 | 실행 증거·결과 | 재사용·조립 | 남은 일 |
|---|---|---|---|---|---|
| V-01 R-01·C-01 개인 소유·권한·수명 | owner/read-only member는 자기 row만 읽고 씀. outsider404, body userId400. revoke 후 기존 row도404, Link/User 삭제 cascade | 새 PostgreSQL과 실제 Next HTTP. 선행 없음 | 작성자 실제 HTTP/SQL 13개 검사 및 독립 HTTP 12개 검사 통과. [계약 결과](evidence/contracts.json), [독립 결과](evidence/independent-http.json) | Prisma ReadingProgress, readingPolicy, getReading/putReading | 통과 |
| V-02 R-03·04·D-02 CAS와 응답 확인 | 동시 다른 payload 중 한 성공/한409, 최초 create 경합 row1개, 동일 stale payload200/version 불변, version 상한 거절 | 실제 PostgreSQL·HTTP, V-01 | 실제 최초 생성·기존 row 경합, 동일값 응답 확인 통과 | putReading/commitReading/resolveConflict | 통과 |
| V-03 R-02 snapshot·pagination | 총합 일치/Unread 음수 없음,31개 이상에서30개와 다음 cursor, 중복 없는 id 내림차순, 검색에도 global counts | 실제 PostgreSQL·HTTP, V-01 | 34개 임시 링크 페이지와 20개 동시 변경/조회에서 통과 | listReadingLinks/readSnapshot | 통과 |
| V-04 R-01 public 비노출·입력 | 공개/원본 Link JSON에 다른 사람 reflection/row 없음. 과대 id/cursor/version400, 인증 없는401 | 실제 Next HTTP, V-01 | 원본 private/public 응답과 입력 경계에서 통과 | 새 route와 기존 public route | 통과 |
| V-05 R-05 원본 저장·보존 | 실제 register/login→POST Link→DB row→worker가 파일 생성→original viewer 본문 | 실제 Next/worker/Chromium·전용 저장소, V-01 | 미실행 | 기존 postLink/archiveHandler/viewer | 선택 URL의 형식별 결과 확인 |
| V-06 R-04 timeout·취소·actor 수명 | 실제 transport 지연은 유한 시간에 종료, draft 유지, explicit PUT 재시도. 자동 POST 재시도 없음 | 로컬 실제 HTTP 상대; V-01·02 | 미실행 | RealReadingClient, useReadingRoom | transport 구현·지연 응답 실행 |
| V-07 R-04·05 Next history·viewer | legacy Dashboard→Room→dirty Back Guard. known-index도 보호. return hint 검증 후 detail/library 복귀 | 실제 PagesRouter와 CUA, V-01~06 | 미실행 | Next navigation adapter, preserved return | fake history와 다른 실제 Next 동작 확인 |
| V-08 R-03·05·06 전 구간 | 실제 계정→상태+감상 저장→reload 지속→보존 읽기→복귀. 새 링크·mobile·기본 로그인 진입 확인 | 실제 서비스 CUA와 독립 HTTP, V-01~07 | 미실행 | 실제 Reading Room 페이지 | 통합 후 기본 진입 전환 및 캡처 |

제품 구현은 `apps/web/lib/api`·기존 Prisma·공유 UI 한 곳에 둔다. 검증 스크립트는 `examples/reading-room`에서 공개 HTTP 경로를 사용한다. 고경계 DB 상태가 필요할 때만 fixture 준비·결과 관찰을 SQL로 수행하고 API 우회 성공과 구분한다. 원본 외부 서비스·이전 DB·이전 private 자료를 재사용하지 않는다.

## 자원과 실행 범위

새 컨테이너 `reading-room-r2-db`, 포트 `127.0.0.1:54721`, 별도 볼륨과 외부 private 폴더 `reading-room-r2`를 사용한다. 제품은 `127.0.0.1:4721`, prototype은 `127.0.0.1:4720`이다. 비밀은 저장소 밖0600 파일이며 로그·문서·commit에 값을 남기지 않는다. 준비·기동·종료 명령과 실행 결과는 구현 후 이 표에 연결한다.

V-01~04의 실제 계약 검증은 통과했다. V-05의 브라우저 읽기, V-06~08의 통합 검증은 아직 남아 있다. 프로토타입의 가상 저장·권한·보존 표시를 실제 계약 증거로 사용하지 않는다.

## 검증 중 발견과 수정

- 원본 `bcrypt` native binding은 scripts를 끈 focused install에서 생성되지 않았다. 원본 패키지의 `node-pre-gyp install --fallback-to-build`로 설치한 뒤 실제 credentials 로그인에 성공했다.
- 첫 worker 실행은 Monolith가 PATH에 없어 HTML 보존에 실패했다. 전용 private `bin`에 설치된 Monolith 2.11.6을 연결하고, 원본 archive refresh API를 통해 재시도했다. 이전 프로젝트의 DB나 문서·파일은 사용하지 않았다.
- 초기 fixture의 `keep.html`은 짧은 오류 문서를 반환했다. 링크 4만 원본 PUT으로 `greatwork.html`로 교정하여 재보존했다. 개인 상태와 감상은 바꾸지 않았다. 파일 존재는 원문의 올바른 본문을 자동으로 증명하지 않으므로 viewer 본문은 별도 브라우저 검증 대상으로 둔다.
- 독립 검토자의 원본 dashboard 캡처는 이번 rebuild의 새 fixture를 사용했다. 기존 사용자 자료가 아니다. [원본 화면](../../screenshots/as-is/dashboard.jpg)
