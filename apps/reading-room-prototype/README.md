# Reading Room 프론트엔드 프로토타입

Reading Room의 탐색, 개인 독서 상태, 한 줄 감상과 이탈 복구를 직접 조작하는 독립 React 앱이다. 실제 회원·API·DB·보존 worker는 실행하지 않는다. [설계 대응과 검토 기록](../../docs/design/2026.10.25/prototype.md)이 단계 판정의 기준이다.

## 실행

저장소 루트에서 Node 22.19 이상과 저장소에 지정된 Yarn 4를 사용한다.

```sh
YARN_ENABLE_SCRIPTS=false corepack yarn workspaces focus @linkwarden/reading-room-prototype
corepack yarn workspace @linkwarden/reading-room-prototype test
corepack yarn workspace @linkwarden/reading-room-prototype build
corepack yarn workspace @linkwarden/reading-room-prototype audit
corepack yarn workspace @linkwarden/reading-room-prototype preview
```

`http://127.0.0.1:4720/`에서 열고, 실행 터미널의 Ctrl+C로 종료한다. `http://127.0.0.1:4720/__review/mobile.html`은 390×844 iframe으로 같은 UI를 보여 주는 검토 전용 페이지다. `connect-src 'none'`인 빌드 결과를 정적 preview로 제공하므로 실제 업무 요청과 HMR WebSocket이 없다. `dev` 대신 위 build/preview 명령으로 평가한다.

집중 설치는 prototype과 공유 UI 및 검사 도구만 설치한다. 기존 전체 workspace의 peer 경고를 해결하기 위해 다른 앱 버전을 바꾸지 않았다. Yarn lockfile은 기존 해석 결과를 유지하고 두 workspace 항목만 추가했다.

## 체험 순서

1. 기본 6개 글에서 Reading/Unread/Finished shelf를 선택하고 검색한다. 숫자는 전체 library의 개수이며 검색은 아래 목록만 좁힌다.
2. 글을 열어 status와 한 줄 감상을 바꾸고 **Save note**를 누른다. 상세·목록·shelf counts가 같은 가상 값으로 바뀐다.
3. 수정한 뒤 Close 또는 브라우저 Back을 누른다. **Keep editing**, **Discard changes**, **Save and leave**를 각각 확인한다.
4. 왼쪽 아래 **Prototype · Browser data only**에서 **Fail next save**를 선택한다. 초안 작성 후 Save and leave가 실패해도 초안과 목적지가 남는지 확인하고 다시 저장한다.
5. 같은 검토 도구에서 **Conflict on next save**를 선택한다. 충돌 후 내 초안과 저장된 값을 비교하고 **Load saved value** 또는 **Save my draft instead**를 선택한다. **Timeout on next save**는 1.5초 후 확인 불가 오류를 반환하는 가상 시나리오다. 실제 15초 HTTP timeout은 제품 통합 때 검증한다.
6. **Save a link**에서 URL과 기존 collection을 선택한다. 새 글은 Unread이며 보존은 pending이다. 새 collection은 명시적으로 선택한 때만 만든다.
7. **Show empty library**와 **Reset six articles**로 빈 화면 및 초기 상태를 반복한다. 검토용 reset은 현재 초안을 포함한 가상 세션을 초기화한다.

데이터는 메모리에만 존재한다. 새로고침하면 초기 6개 글로 돌아가며 URL의 shelf/query/link만 해석한다. 실제 서비스에서의 reload 지속성을 이 결과로 주장하지 않는다. **Open source / Readable / PDF / HTML**은 가짜 URL을 요청하지 않고 명시된 로컬 sample reader로 이동한다. 실제 파일 내용이나 original viewer를 검증하는 단계는 뒤에 온다.

## 코드 경계

- [main.tsx](src/main.tsx): fake client와 navigation을 주입하고 검토 도구 및 자체 sample reader를 소유한다.
- [fakeClient.ts](src/fakeClient.ts): 6개 fixture, 지연·실패·충돌·추가·reset의 단일 가상 쓰기 소유자다.
- [공유 UI](../../packages/reading-room-ui/ReadingRoomApp.tsx): 표현·입력·focus trap. 서버나 인증 패키지를 import하지 않는다.
- [useReadingRoom](../../packages/reading-room-ui/useReadingRoom.ts): 목록/상세 수명, 초안, 저장, 오류와 목적지 보존을 조율한다.
- [history](../../packages/reading-room-ui/history.ts): 현재 프로토타입의 native history 보상. 실제 Next beforePopState adapter는 아직 구현하지 않았다.
- [반례 테스트](src/reading.test.tsx): actor 변경 후 늦은 쓰기 응답, 충돌 중 중복 행동, 컬렉션 조회 오류, 저장 실패 복구 및 DTO 검증을 확인한다.

부모 검토자의 실제 브라우저 평가와 개발자 결정은 설계 폴더의 검토 문서에 기록한다. 이 프로토타입은 실제 접근 권한·CAS 경합·공개 응답 비노출·보존 성공의 증거가 아니다.
