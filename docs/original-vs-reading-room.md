# Linkwarden에서 Reading Room으로

Reading Room은 저장한 링크마다 개인의 읽기 상태와 한 줄 감상을 남기는 독서실이다. 원본 Linkwarden의 수집·보존·공유·인증을 사용하면서, 각 사용자의 개인 기록을 공유 metadata와 분리했다. 원본은 `linkwarden/linkwarden` commit `952ac4540657cae3a67c3ca59433899d2fda8374`이며 이 저장소는 `ryujt/reading-room`으로 새로 fork했다. 이전 rebuild의 DB나 생성 문서는 가져오지 않았다.

## 원본과 변경

| 영역 | 원본 | 이번 변경 | 실제 코드·근거 |
|---|---|---|---|
| 첫 화면 | Dashboard의 pinned/recent/collections | 편집된 독서실 형태의 library, 4개 shelf, 검색, 목록, 개인 상세 | `apps/web/pages/reading-room.tsx`, [최종 지도](design/2026.10.25/final/source-map.md) |
| 읽기 상태 | 개인 Unread/Reading/Finished 모델 없음 | user+link별 ReadingProgress, 없는 row는 Unread | Prisma schema/migration, [실제 계약](design/2026.10.25/real-contract.md) |
| 한 줄 감상 | Link.description은 공유 내용, Highlight.comment는 별도 주석 | 280자 한 줄 reflection과 status를 같은 PUT으로 저장 | `useReadingRoom.saveDraft`→`putReading` |
| 소유·공유 | collection owner/member와 public 권한 | owner/read-only member가 자기 기록만 저장. public-only 접근은 개인 API에서404. 공개 응답에 개인 기록 없음 | 실제 HTTP/SQL 13개와 독립 HTTP 12개 |
| 경합·실패 | 새 개인 기록 계약 없음 | version CAS, 현재 값 확인, 충돌 비교, 초안/목적지 유지, 15초 timeout와 명시 재시도 | [검증 기록](design/2026.10.25/verification.md) |
| 목록·수량 | 기존 링크 조회와 검색 | 최대30개 id cursor, 전체 shelf counts를 같은 RepeatableRead snapshot에서 계산 | `listReadingLinks/readSnapshot` |
| 링크 저장 | 원본 POST와 collection 권한·metadata | 새 Save dialog에서 같은 POST 사용. 기존 collection 선택 또는 명시적 새 collection 생성 | `createRealReadingClient.createLink` |
| 보존·읽기 | 원본 worker가 JPEG/PDF/Readable/HTML 생성, 원본 viewer | 원본 기능 유지. Reading Room에서 viewer 진입·정규화된 returnTo로 복귀 | 6개 글의 24개 형식 파일 및 원본 archive HTTP 검증 |
| 보존 오류 수명 | child.stdin 오류가 처리되지 않는 경계 | EPIPE를 reject로 소비하고 생존 자식을 종료. 실패 입력/신호 종료에 파일 쓰기 생략 | 실제 subprocess 반례2개 |
| 원문 URL | 기존 저장값에 다양한 URL 가능 | 새 Open source는 http/https만 활성화하고 이동 직전 재확인 | sourceArticleURL 정책 검사 |
| 기존 기능 | Dashboard, Links, collection 공유, highlights 등 | 기존 화면으로 이동할 수 있으며 원본 코드 경로 재사용 | AS-IS 전수 색인과 유지/변경 표 |

읽기 상태는 사용자가 고른 기록이다. Finished를 눌렀다는 이유로 원문을 실제로 읽은 시간·분량을 측정했다고 주장하지 않는다. 보존 완료도 읽기 상태와 독립적이다.

## 요구와 검토가 만든 변경

| 단계·요구 | 검토·발견 | 반영한 변경 | 증거·커밋 |
|---|---|---|---|
| R-01~06 원본 내부 코드부터 이해 | API 경계만으로 부족, auth/demo 조건과 metadata 우회·collection 생성 소유자 혼동 | AS-IS L0→L1→worker/adapter L2와 실제 source call-site를 전수 연결 | [AS-IS](design/2026.10.25/as-is/system-design-as-is.md), `d62c9b7e`→`21001b7c`→`4703808c` |
| AS-IS가 의도와 다르면 후속 중단 | 대표 샘플 검토를 전체 승인으로 오인할 수 있음 | guide `f2c22e0`: 대표 작성 방식/전체 gate 분리, 브리프 단계 표 | [_evidence-brief](design/2026.10.25/_evidence-brief.md) |
| R-SEM-1~3 실제 조건·호출 주체 | Auth 반환에 demo 조건 혼입, unsafe metadata 필수처럼 표시, named collection 조회 오독 | guide `f30e11b`: 조건 출처·호출 생략·scope 조율 혼합 규칙. 반례별 재작성·독립 재검토 | 같은 브리프§6, 해당 API/Browser/worker 상세 |
| callback 수명과 실제 이름 | 익명 callback을 가짜 서비스 이름으로 표현할 위험 | guide `62cc50b`: 등록 위치·본문·실행 주체와 문서 별칭을 구분 | worker/proxy/DNS callback 전개 |
| AS-IS 실제 layout과 도해 수치 | 구조용 가중치가 CSS 비율처럼 읽힘 | guide `46c09f5`: 도해용 수치와 실제 CSS 근거 구분 | layout 공통 설명과 개별 CSS 근거 |
| R-TB-1 history 초안 보호 | unknown legacy Next pop에 beforeunload는 보장되지 않음 | beforePopState 위임, known 보상, unknown state 복원 후 명시 승인 | [TO-BE](design/2026.10.25/to-be/system-design-to-be.md), `f99c0447` |
| R-TBP-1/2·R-TB-2/3 계약 정렬 | callback 호출 주체, Int32, viewer/mail 목적지,409 유형 | callback 그림 분리, DB 범위 입력, return hint, VERSION_EXHAUSTED 소비 구분 | 같은 TO-BE·브리프 |
| 제품 수준 frontend-only 판단 | R-P-1~3 pending 충돌·actor 수명·collection 실패 | pending guard, generation 무효화, 별도 조회 오류/Retry | prototype 10개 검사·독립 소스 검토, `eeafc4eb` |
| 실제 브라우저 시각 평가 | R-P-4 build만 성공/React runtime실패, R-P-5 첫 글 fold밖, R-P-6 충돌 숨김 | JSX automatic, desktop 공간 조정, 충돌 scroll/focus와 footer 상태 | [prototype 결정](design/2026.10.25/prototype.md), CUA1269×720/390×844 |
| verify-first 실제 계약 | 권한·공개 노출·CAS·snapshot을 mock으로 증명할 수 없음 | 새 실제 Prisma 모델/API, 원본 인증을 거친 HTTP/SQL 검사 | [계약](design/2026.10.25/real-contract.md), `747e1835` |
| 원본 worker 실제 실행 | Monolith PATH 누락, 잘못된 fixture URL, generic EPIPE | private bin, 원본 PUT으로 URL 교정, stdin error 수명 보정 | [형식별 결과](design/2026.10.25/evidence/archives.json), worker 재현 검사, `febbd8a2` |
| 실제 통합과 기본 진입 | 원본 backend를 쓰는 UI에서 Next history·충돌·viewer 검증 필요 | 실제 client·페이지·safe returnTo·Sidebar와 기본 인증 진입 연결 | production build 및 CUA, `76af87b9` |
| 실제 viewer markup | baseline TextStyleDropdown의 Trigger/Button 중첩이 hydration 오류를 만듦 | 해당 Trigger에 asChild 추가, 기존 화면 접점만 보정 | production 재빌드와 viewer DOM 확인, `659b0a66` |
| R-I-1 기존 저장값 신뢰 금지 | 신규 Save 검증만으로 기존 javascript/data URL을 막지 못함 | Open source 비활성화와 실제 이동 정책 | transport/URL 검사, 최종 구현 지도 |

가이드는 별도 `project-guides` 저장소에서 검토자가 수정했다. 이 저장소의 작성자는 새 규칙을 적용해 AS-IS를 재분석하고 반례 재검토를 받은 뒤 다음 단계로 진행했다. 검토 결과는 위임받은 개발자·독립 검토자의 판정이며 사람이 직접 디자인을 승인했다고 기록하지 않는다.

## 프로토타입과 실제 구현

4720은 독립 React entry와 memory fake만 사용한다. CSP `connect-src 'none'`과 source/bundle audit로 업무 API/인증/DB 경로가 들어오지 않도록 했다. 이 단계의 저장 성공과 보존 표시는 가상이다.

4721은 원본 NextAuth, 원본 Link API, 새 개인 기록 API, 기존 Prisma/PostgreSQL, 원본 archive worker와 viewer를 사용한다. pure model·presentation·draft hook만 prototype과 공유하고 실제 HTTP/Next navigation adapter는 web 안에 둔다. [실행 방법](run-local.md)에서 두 기동 방법을 구분한다.

## 확인한 한계

권한은 각 요청의 접근 확인 시점을 기준으로 한다. 동시 membership 철회를 모든 요청과 직렬화하지 않는다. 같은 payload의200은 현재 저장값 확인이며 요청 idempotency key나 exactly-once 보장이 아니다. 브라우저 종료 경고는 브라우저 정책을 따른다. unknown Next history는 승인 후 문서 교체하는 제한된 정책이다.

로컬 검증은 credentials 로그인과 로컬 PostgreSQL/Chromium/파일 보존을 사용했다. OAuth·이메일·구독·S3·remote browser·mobile/extension 앱 내부는 실행하지 않았다. 외부 웹사이트의 일시 오류·접근 제한은 원본 보존 상태에 반영되며 모든 URL을 항상 보존한다고 약속하지 않는다. AGPL-3.0과 원본 저작권·출처는 유지한다.
