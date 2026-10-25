# 근거 브리프 — 2026.10.25 AS-IS 역추출

> 이 문서는 원본을 찾는 색인이다. 요약으로 원본 검증을 대신하지 않는다.
> **상태**: 대표 작성 방식 검토 후 전체 AS-IS 후보를 작성했다. 전체 의미 게이트 판정 전이며 TO-BE·프로토타입·구현은 시작하지 않았다.

## 1. 기준선

| 항목 | 값 |
|---|---|
| DATE | 2026.10.25 |
| 소스 기준 커밋 | `952ac4540657cae3a67c3ca59433899d2fda8374` |
| 원본 맥락 | 2026-09-09T20:12:04-04:00, upstream Linkwarden PR #1834 병합 |
| 저장소 | `linkwarden/linkwarden`의 새 포크 `ryujt/reading-room` |
| 작업 트리 | 조사 시작 시 clean. 초기 기준선 d62c9b7e는 분석 문서만 추가했다. 현재는 전체 AS-IS 문서 후보를 검토 중이다. |
| 관찰 방법 | 새 checkout 소스 본문, 선언과 호출 위치, Prisma schema, manifest와 yarn.lock 대조 |
| 실행 구분 | 서비스·DB·브라우저는 아직 실행하지 않았다. 런타임 서술은 코드상 예상이다. |
| 가이드 기준 | project-guides `c56f4909e3b6626e85f51bfa3a2fbce987a8c878`에서 시작. 게이트 f2c22e0, 반례 수정 f30e11b, 익명 함수 식별 62cc50b, Layout 크기 근거 구분 46c09f5까지 적용 |

### 1.1 분석 범위

인증 및 기본 진입, 링크 목록·검색·저장·상세·수정·삭제, 컬렉션 공유와 공개 링크/보존물 조회, 보존 워커와 저장 adapter를 조사한다. 해당 경로의 페이지·컴포넌트·hook·API handler·controller·공유 함수·Prisma 호출을 추적한다. 개인 읽기 상태와 한 줄 감상은 현재 기능으로 가정하지 않는다. `User`, `Link`, `Highlight` 모델의 실제 필드를 구분한다.

조사 명령은 `rg --files apps/web packages apps/worker`, `rg -n '^model |^enum ' packages/prisma/schema.prisma`, 각 진입점의 `nl -ba <파일>`이다. 전체 화면 목록은 소스 조사 후 핵심 §7에서 확정한다.

### 1.2 제외한 것과 이유

| 경로 | 이유 | 근거 |
|---|---|---|
| apps/mobile, apps/extension | 이번 웹 Reading Room 범위 밖. 공유 router의 mobile auth 인자는 계약 설명에만 포함 | `rg --files apps/mobile apps/extension` |
| 결제 구매·관리 화면, AI 태깅·RSS·import의 독립 업무 | 읽기/저장/보존에 직접 연결된 가드와 등록 위치는 조사하되 해당 독립 제품 업무는 확장하지 않음 | `rg --files apps/web/pages apps/worker/workers` |
| 이전 작업 산출물과 DB | 사용자가 삭제한 작업을 재사용하지 않는 새 분석 | 현재 소스 기준 커밋과 새 문서 이력 |
| 제3자 라이브러리 내부·원문 서버 | 호출 adapter와 lockfile 버전에서 외부 경계로 분류. 내부 분석 완료에 합산하지 않음 | `rg -n 'resolution:' yarn.lock` |

### 1.3 문서 대조 기준선

가이드 사본은 이 저장소 안에 없으므로 파일명과 절로 참조한다. 아래 첫 표는 분석을 시작할 때 실제 읽은 c56f490 파일의 SHA-256이다. 수정 지침의 추가 기준은 표 뒤에 구분한다.

| 문서 | SHA-256 |
|---|---|
| `prompts/system-design-as-is-prompt.md` | `823728345bab1751f10838efeda270d794109161ad1e7ef098a167787fb359d3` |
| `guides/system-design-document-guide.md` | `e1e5dcb05a7f659ce9663f453f2d07f35578c041056d6c59b0b24883e2d139fb` |
| `guides/job-flow-diagram-guide.md` | `15900f183b470bc94c124aa1ba5f529d3a87ee4d0a1572ab997ddc8e4630fe02` |
| `guides/navigation-diagram-guide.md` | `94443026b9a42194b25cebc86a1489ea65725033c82e3aa25c6c5cf0f9e32f39` |
| `guides/screen-layout-guide.md` | `87b7e219ae23d6065a4bcfadae9210856e72942f5a14689497f37c7d98329b47` |


### 1.4 샘플 재작성 지침

현재 적용 버전은 `46c09f58b7bf28f7a6f67222cb4cab070fd99e45`다. f2c22e0은 작성 방식/전수 완료 게이트 구분, f30e11b는 조건 소유자·호출 생략·직접 호출과 조율 배선, 62cc50b는 실제 익명 callback 식별을, 46c09f5는 실제 CSS와 도해용 가중치의 구분을 명확히 했다.

| 수정 지침 | 현재 SHA-256 |
|---|---|
| `prompts/system-design-as-is-prompt.md` | `dad50eb94f8fc21784a4ac46df74829ad3ee7dfab2026726588937fd21afd617` |
| `guides/system-design-document-guide.md` | `78dde3389b2c71e9d5f7e7c0f2c81bee937b8e7b531324b8fde4f06a4c1c04cc` |
| `guides/job-flow-diagram-guide.md` | `91cd0d96002f99614649cb44b094f575fe697e5074a484c54203439d32c0f8cd` |

Layout guide 현재 SHA-256은 `08191452ae9a9d20d61d670792b10bb7f9a59e668d9fbb1b4048b0650c4c6c73`이며 AS-IS prompt의 현재 hash는 위 표와 같다. 시작 기준선의 hash를 현재 값으로 덮어쓰지 않았다.

## 2. 경계 목록과 조사 산출물

| 조사 ID | 경계 | 포트 | 상세 문서 |
|---|---|---|---|
| B | Browser | Web의 동일 origin | [Browser](as-is/details/browser.md) |
| A | Web API/Auth | 설정된 Next HTTP 포트 | [API](as-is/details/web-api.md) |
| W | Worker | HTTP listener 없음 | [Worker](as-is/details/worker.md) |
| S | 공유 네트워크·저장 adapter | 프로세스 내 모듈 | [Adapter](as-is/details/adapters.md) |

## 3. 이슈 색인

경계 상세 §8을 이슈 원본으로 두고 핵심 §9는 교차 뷰로 사용한다. 현재 기능을 변경한 이력이 아니다.

| ID | 핵심 사실 | 원본 |
|---|---|---|
| B-01~05 | 즉시 닫기·낙관적 표시·실패 회수·UI 권한 수명 | [Browser §8](as-is/details/browser.md#8-이슈) |
| A-01/02/04~09 | 부분 쓰기·저장/보존 구분·발송·권한·token 수명·개인 독서 기능 부재 | [API §8](as-is/details/web-api.md#8-이슈) |
| W-01~03 | marker와 자동 재선택·중복 worker·try 이전 실패 | [Worker §8](as-is/details/worker.md#8-이슈) |
| S-01~03 | 파일 false 반환·timeout 범위·callback 완료 | [Adapter §8](as-is/details/adapters.md#8-이슈) |

A-03은 할당하지 않았으며 기존 ID를 연속 번호로 만들려고 재번호하지 않는다.

## 4. 재확인 명령

| 목적 | 명령 |
|---|---|
| 원본 확인 | `git show --no-patch --format=fuller 952ac4540657cae3a67c3ca59433899d2fda8374` |
| 호출 위치 | `rg -n 'mutateAsync|onClose' apps/web/components/ModalContent/NewLinkModal.tsx` |
| worker 등록 | `nl -ba apps/worker/worker.ts` |
| 문서 정적 검사 | `node <가이드 사본>/guides/tools/design-doc-check.mjs --strict docs/design/2026.10.25` — 대표 후보 검사 완료, 전체본 작성 뒤 재검사 |

## 5. 검증 기록

- 정적: 소스 기준 커밋·작성자 설정·가이드 SHA-256 확인 (`사실·실행`). 대표 후보 10개 파일, 52개 jobflow 블록, 77개 링크 검사: FAIL 0, WARN 0 (`사실·실행`). DNS 보완 전 수치이며 전수 검사는 다시 실행한다.
- 렌더링: 부모 검토자가 대표 후보의 52개 SVG를 생성하고 대표 6개 PNG를 시각 검토했다. 호출·값 칸 잘림은 발견하지 않았다. Navigation 1개/6 edges와 Layout 4개 HTML 변환도 성공했다. Layout의 브라우저 픽셀 확인은 아직 하지 않았다. 검토자 보고를 기록하며 작성자의 실행 결과로 바꾸지 않는다.
- 의미: 대표 저장·Readable 보존 샘플의 기존 R-SEM-1~3, response.ok 소유자, callback 수명, 조건부 호출, selector 데이터 출처 수정은 독립 검토자가 확인했다. 부모는 작성 방식이 적합하다고 판단하여 전체 AS-IS 확장을 허용했다. DNS callback 하위 전개는 이후 독립 검토자가 보완을 확인했다. 이 판정은 전체 범위 승인 또는 실행 검증이 아니다.

추가 실행 기록: 작성자는 `design-doc-check.mjs --strict docs/design/2026.10.25/as-is`로 전체 후보 64개 파일, 167개 JobFlow 블록, 735개 링크를 검사하여 FAIL 0/WARN 0을 확인했다(최종 보완 전 스냅샷). 명시적 apps/packages 경로 399개는 존재·줄 범위 검사에서 오류가 없었다. 생략 경로나 심볼 의미까지 자동 증명한 결과는 아니다. 부모는 이전 확장본 75개 SVG와 대표 5개 PNG를 추가 확인했으며, UI DSL snapshot의 Layout 28개/Navigation 14개 변환·트리 검사도 통과했다고 보고했다. 이후 Verify 등이 추가되어 전체 최종 수치는 재검사한다. 제품 픽셀·HTTP·DB 증거는 여전히 없다.

## 6. 검토 반영

독립 검토자는 사용자가 위임한 개발자 검토자다. 사용자 직접 승인으로 기록하지 않는다.

| 의도·검토 입력 | 부족한 결과·근거 | 가이드/프롬프트 수정 | 다시 작성한 범위 | 재검토 결과 | 후속 단계 판정 |
|---|---|---|---|---|---|
| 내부 코드로 저장 성공/실패와 worker 보존 이해 | 최초 범위·방식 제안 | 해당 없음 | source baseline과 대표 경로 선정 | 범위·조기 샘플 방식 수락 | AS-IS 미완료 |
| R-SEM-1 demo 분기 | Auth 반환값에 Route 환경판단을 붙여 소유자 혼동 | f30e11b 조건 출처 | API JF-1을 auth 공통/쓰기/demo 구간으로 분리 | 독립 검토자와 부모가 기존 의미 지적 해소 확인 | AS-IS 미완료 |
| R-SEM-2 unsafe/noURL | metadata가 공통 필수 호출처럼 보임 | f30e11b 호출 생략 | API JF-1.2B의 안전 URL/우회 구간 | 독립 검토자와 부모가 기존 의미 지적 해소 확인 | AS-IS 미완료 |
| R-SEM-3 named collection | Unorganized 외 이름도 findFirst를 거치는 그림 | f30e11b 조건 출처 | API JF-1.2.1 C1–C4 실제 if 분리 | 독립 검토자와 부모가 기존 의미 지적 해소 확인 | AS-IS 미완료 |
| HTTP response.ok, worker callback/format/browser reuse | 다른 객체 반환값에 환경/입력 조건 혼합, 선택 호출을 필수 체인으로 표시 | f30e11b +62cc50b | Browser mutation 구간, Worker RouteCallback, Readable 전제, ensureBrowser reuse | 독립 검토자와 부모가 기존 의미 지적 해소 확인 | AS-IS 미완료 |
| batch query 데이터 출처 | id query→round query→full query를 잘못된 결과 전달로 연결 | f30e11b 직접 호출/결과 구분 | Worker JF-1.1을 3구간으로 분리, linkUserMap과 pickedSet의 소비자 명시 | 독립 검토자와 부모가 기존 의미 지적 해소 확인 | AS-IS 미완료 |
| DNS callback 수명 | 기본 local/no-proxy의 등록·실행·오류 전달을 prose만으로 설명 | 기존 62cc50b 익명 함수 식별 적용 | Adapter JF-2.1 등록과 socket 실행을 분리 | 독립 검토자 보완 확인; 전체 게이트와 별도 | 전체 AS-IS 확장만 허용 |
| scope의 반환값→다음 호출 혼합 | Browser fetch/JSON/sanitize의 실제 caller가 흐려짐 | 기존 f30e11b 적용 | Forgot/Readable/URL helper가 각 함수를 직접 호출하도록 수정 | 독립 Critic 재확인 통과 | TO-BE 보류 |
| Layout 임의 비율 | 실제 flex 배치를 30/40/30 구현 비율로 오해할 수 있음 | 46c09f5 | 모든 Layout에 가중치 출처와 실제 CSS 근거 구분. Announcement fixed overlay도 본문 트리에서 분리 | 새 guide 적용 및 독립 Critic 검토 통과; 부모 렌더 확인 대기 | TO-BE 보류 |
| verify bridge·tag·collections landing | 메일 내부 route와 tag 탐색 누락, 관리 landing 제외 불명확 | 기존 전수 범위 기준 적용 | Verify Layout/JobFlow/Nav, tag metadata와 legacy query, collections 관리 landing 제외 판정 | 독립 Critic의 최종 의미·범위 검토 통과 | TO-BE 보류 |
| Worker 형식별 확장 | Readable 외 Preview/Capture/Monolith/직접 파일 처리 필요 | 기존 내부 추적 기준 적용 | Worker JF-2~6.2, sanitizer/proxy/익명 callback 수명 | 함수명·경로·반환·옵션 의미 수정 후 독립 Critic 통과; 부모 검토와 합산 예정 | TO-BE 보류 |
| 전체 후보 | 상위 노드별 실제 진입과 범위 전수 대조 필요 | f2c22e0 전체 게이트 | 18개 시나리오, 20개 Layout, 경계·구성 상세와 source audit | 독립 Critic의 source 의미·범위 검토 통과, 열린 필수 지적 0건. 부모의 최종 게이트 대기 | 아직 AS-IS 확정 아님 |

대표 샘플을 통과해도 작성 방식 확인일 뿐이다. 이후 모든 시나리오·화면·구성 문서와 의미 검토가 끝나야 AS-IS 확정이다. TO-BE/프로토타입/구현은 시작하지 않았다.

## 7. 한계

현재 전체 후보는 소스 분석 결과이며 전체 의미 게이트가 남아 있다. 서비스·보존 결과·권한을 실제 HTTP로 확인하지 않았으며, 이전 실행 결과를 이번 작업의 증거로 사용하지 않는다. TO-BE, frontend prototype, 제품 구현은 AS-IS 게이트 뒤 별도 단계다.

최종 Critic 보고: source AS-IS 의미·범위 검토 통과, 열린 필수 지적 0건. 이는 부모의 최종 게이트 및 서비스 실행 검증과 구분한다. 전체 확정 전까지 TO-BE는 보류한다.
