# Reading Room 프론트엔드 프로토타입 검토

> 입력: [TO-BE](to-be/system-design-to-be.md) 확정 commit `f99c0447`. 현재 단계는 독립 React 프론트엔드이며 실제 backend 통합 전이다. [실행 방법](../../../apps/reading-room-prototype/README.md).

## 1. 검토 질문과 구현 대응

| 요구·설계 | 검토 질문과 행동 | 가짜 처리와 도착 상태 | 실제 구현 | 확인 상태 |
|---|---|---|---|---|
| R-02, C-03, [Library](to-be/details/layout/reading-library.md) | shelf·검색·글 선택을 쉽게 찾는가? | 전체 counts와 필터된 목록, 현재 보이는 글을 추천하는 On this shelf | ReadingRoomSession, useReadingRoom의 list effect, FakeReadingClient.list | CUA desktop·mobile 탐색과 counts 반영 통과 |
| R-03, [Save reading](to-be/details/jobflow/save-reading.md) | 상태와 한 줄을 한 행동으로 저장하는가? | 하나의 put으로 두 값과 version 변경; Saved 안내와 목록 갱신 | Detail, saveDraft, FakeReadingClient.put | 단위 검사와 CUA 상태·감상 동시 저장 통과 |
| R-04, C-04, [Leave draft](to-be/details/jobflow/leave-draft.md) | 저장 실패나 Back에서 생각과 목적지가 남는가? | Guard가 초안과 NavigationIntent 보존; 성공 후만 이동 | requestNavigation, resolveNavigation, createReadingNavigation | 단위 검사 및 CUA native Back→Guard→Discard, Keep editing 통과 |
| R-04, [Detail](to-be/details/layout/reading-detail.md) | 다른 탭의 값과 내 초안을 구분하는가? | fake가 새 version 생성 후409; 명시적 선택으로 복구 | FakeReadingClient.put, Detail conflict 영역, useServerValue | 단위 검사 및 CUA 비교 영역·명시적 overwrite 통과 |
| C-05, [Save link](to-be/details/jobflow/save-reading-link.md) | 기존 collection을 선택하고 저장 완료를 기다리는가? | create 완료 후 새 글 detail, Unread와 preservation pending | SaveLink, saveLink, loadCollections | reset·collection 오류 단위 검사 통과; CUA 새 링크 평가는 별도 추가 기록 |
| R-06, C-07, [Draft guard](to-be/details/layout/draft-guard.md) | 390px에서도 글·상태·선택지가 읽히는가? | 같은 React UI를390×844 iframe에서 렌더 | styles.css, public/__review/mobile.html | CUA390px 한글 제목·2×2 shelves·Save and leave 통과 |

## 2. 시각·행동 결정

- D-P-01: 아이보리 바탕, 숲색 강조, serif 제목과 sans-serif 입력을 사용한다. 책 형태의 작은 CSS 오브젝트와 행 번호·제목·감상·보존 정보·상태로 독서실의 편집된 목록을 표현한다. 외부 이미지·폰트 요청은 없다.
- D-P-02: 모바일 shelf는 네 항목을 2×2로 배치한다. 읽기 제목은 의도적으로 두 줄이고 상세는 전체 높이의 sheet다. 긴 한글 제목은 줄바꿈하며 입력·주요 선택은44px 이상을 목표로 한다. CSS 의도와 실제 CUA 측정은 구분한다.
- D-P-03: fake의 저장 수명은 메모리다. 새로고침은 초기화이며 reload 지속성은 실제 DB 단계의 수용 기준으로 남긴다. source/보존 버튼은 자체 sample reader로 끝나고 실제 파일을 보았다고 표시하지 않는다.
- D-P-04: prototype과 제품 UI는 표현·controller를 공유할 수 있지만 진입점과 client는 분리한다. 현재 main은 FakeReadingClient만 생성한다. 실제 NextAuth/config/background query는 포함하지 않는다.

## 3. 구현과 검증 경계

[ReadingRoomApp.tsx](../../../packages/reading-room-ui/ReadingRoomApp.tsx)는 입력과 Dialog focus를, [useReadingRoom.ts](../../../packages/reading-room-ui/useReadingRoom.ts)는 비동기 상태 수명과 목적지를 소유한다. TO-BE의 `loadShelf/select/saveDraft/loadCollections/saveLink` 제안은 각각 hook의 list effect/detail effect/saveDraft/loadCollections/saveLink로 실현했다. effect는 실제 익명 callback이며 이름 있는 서비스로 바꾸어 기록하지 않는다. [history.ts](../../../packages/reading-room-ui/history.ts)의 `createReadingNavigation`은 native history adapter다. 실제 PagesRouter의 `beforePopState`는 후속 통합에서 별도로 구현·검증한다.

`model.ts`의 `ReadingCounts`는 정확히 `{ALL, UNREAD, READING, FINISHED}` 키를 사용한다. list client는 `ReadingPage`를, get은 `ReadingLink`를, put은 `Reading`을 반환한다. 이 client 계약은 실제 HTTP envelope와 별개다. 실제 API는 TO-BE의 GET `{response:{link,reading}}`, PUT `{response:{reading}}`를 adapter에서 매핑할 예정이다.

| 검사 | 결과와 의미 | 한계 |
|---|---|---|
| TypeScript + Vite build | 통과. JSX는 workspace 전체에 automatic 변환을 명시 | 최초 빌드 성공 뒤 발견한 React undefined를 수정하고 CUA 재확인 통과(R-P-4). 빌드는 렌더 증거가 아님 |
| Vitest/jsdom10개 | 작성자와 독립 Critic이 각각10/10 통과 | 실제 브라우저 history·레이아웃·backend 보안은 증명하지 않음 |
| source/bundle audit | source8개와 built JS1개의 fetch/XHR/WebSocket/EventSource 및 backend/auth import 패턴0; CSP connect-src none; mobile wrapper 있음 | 패턴 검사와 구성 확인이며 HAR/network capture가 아님 |
| focused install | prototype/UI와 검사 도구만 설치; 기존 lock 해석 유지 | 기존 전체 workspace peer 경고는 별도 범위 |
| CUA 브라우저 | 부모가 실제1269×720 desktop과390×844 iframe을 조작했다. 상태+감상/카운트, Keep editing, native Back 보상+Discard, 충돌 overwrite, 모바일 한글 감상 Save&Leave를 확인 | fake 데이터이며 실제 API·DB·보존 증거가 아님 |

검사 명령은 [프로토타입 README](../../../apps/reading-room-prototype/README.md)에 모았다. 전체 Next 앱, 실제 DB, HTTP 서버나 worker는 이 단계에 기동하지 않았다. Vite preview는 정적 프론트엔드 제공만 담당한다.

## 4. 독립 검토와 수정

| ID·검토 입력 | 실제 문제와 근거 | 수정 | 재검토·결정 |
|---|---|---|---|
| R-P-1 Critic | 충돌 overwrite 요청 중 Load saved를 누르면 처리 중 PUT이 선택한 서버값을 다시 덮을 수 있음 | 버튼 disabled와 useServerValue 동기 pending 가드 | 지연 PUT 반례 테스트 통과; Critic 수정 확인 |
| R-P-2 Critic | actor A의 늦은 save/create 응답이 actor B 화면의 URL을 이동시킬 수 있음 | hook generation/alive cleanup과 성공 후 수명 검사, applyDestination 방어 | deferred Save&Leave/create 뒤 actor 교체 두 반례 통과; Critic 확인 |
| R-P-3 Critic | collection 조회 오류가 일반 저장 오류와 섞여 Save 활성 | collectionsError 분리, Retry, 실패 중 Save 비활성 | getCollections reject→create 차단→retry 테스트 통과; Critic 확인 |
| R-P-4 부모 CUA | 빌드가 통과했지만 브라우저는 빈 화면. 공유 TSX의 classic 변환이 React global을 요구 | Vite esbuild jsx automatic을 workspace 전체에 적용 | 수정 빌드 및 부모 CUA 렌더 재확인 통과 |
| R-P-5 부모 CUA | 초기1269×720에서 상단이 커 첫 글 제목이 접힌 화면 아래에 위치 | desktop header/hero/shelf의 높이와 여백을 줄이고 서체·책 오브젝트는 유지 | 첫 글의 완전한 한 행이 첫 화면에 보임을 부모가 재확인 |
| R-P-6 부모 CUA | 충돌 비교가 상세 스크롤 아래에 있고 sticky footer는 일반 Save를 계속 제시 | 비교 영역 scroll/focus, footer 충돌 안내, 일반 Save 비활성; Guard 충돌은 Keep editing으로 복구 | 현재값·초안·두 선택이 보이고 focus와 Save 비활성 상태를 부모가 재확인 |

독립 Critic은 R-P-1~3 수정 후 의미·fake 격리 검토를 통과시켰으며 열린 필수 지적0건을 보고했다. 부모는 R-P-4~6의 실제 CUA 재확인을 마치고 **프로토타입 디자인 gate를 수용**했다. D-P-01~04를 실제 제품의 출발점으로 유지하며, 이 단계 commit/push 후 실제 계약 구현을 진행한다. 이 결정은 사용자가 위임한 개발자 판단이며 사용자 직접 승인이나 최종 제품 승인이 아니다.

부모가 캡처한 실제 프로토타입 화면: [첫 화면](prototype-screenshots/home.jpg), [충돌 비교](prototype-screenshots/conflict.jpg). 두 화면 모두1269×720 desktop이며 mobile과 혼동하지 않는다.

## 5. 다음 단계의 수용 기준

프로토타입 gate 후 실제 Linkwarden backend에 개인 모델과 API를 추가한다. 실제 PostgreSQL에서 private owner/member 범위, 공개 응답 비노출, 권한 회수, CAS 경합, Int32 입력, cascade, snapshot과 pagination을 먼저 검증한다. 실제 HTTP 계약을 확인한 다음 Next 페이지와 인증·viewer return 경로를 연결한다. 보존 worker의 실제 파일과 viewer 본문은 별도로 확인한다. 이번 fake 결과를 실제 계약 성공으로 대체하지 않는다.
