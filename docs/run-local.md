# 로컬 실행과 종료

저장소 루트에서 실행한다. Node 22 이상, Corepack/Yarn 4.12.0, Docker, Chromium과 Monolith가 필요하다. 이번 검증은 macOS arm64, Node 22.19.0, PostgreSQL 16, Monolith 2.11.6에서 수행했다. 원본 AGPL-3.0 라이선스와 Linkwarden 출처를 유지한다.

## 처음 준비

```sh
YARN_ENABLE_SCRIPTS=false corepack yarn workspaces focus linkwarden @linkwarden/reading-room-prototype @linkwarden/web @linkwarden/worker @linkwarden/prisma
node scripts/reading-room.mjs native
node scripts/reading-room.mjs init
node scripts/reading-room.mjs generate
node scripts/reading-room.mjs migrate
```

Focused install은 web·worker와 필요한 workspace를 설치한다. 기존 mobile/extension 개발 의존성은 설치 대상이 아니다. root workspace의 postinstall은 원본 Chromium 설치와 patch-package를 실행한다. 의존성 scripts를 끈 설치에서 bcrypt native 파일이 빠지므로 `native` 명령이 원본 node-pre-gyp 설치를 수행한다. Yarn lockfile은 교체하지 않는다. 원본 peer dependency 경고는 설치 결과와 별도로 남아 있다.

`init`은 새 `reading-room-r2-db` 컨테이너, `reading-room-r2-postgres` 볼륨, `127.0.0.1:54721` PostgreSQL을 만든다. 같은 이름의 기존 자원이 있으면 재사용하지 않고 중단한다. 이미 초기화한 이 checkout은 `init` 대신 `db-start`를 사용한다. 기존 자원이나 다른 프로젝트의 DB는 삭제하지 않는다.

기본 private 폴더는 저장소의 형제 폴더인 `../.local-rebuild/reading-room-r2`다. `READING_ROOM_HOME` 환경변수로 다른 절대 경로를 선택할 수 있다. 생성된 `runtime.env`는 0600이고 DB 암호와 NextAuth secret은 자동 생성한다. 값은 Git에 넣지 않는다. [설정 예시](../examples/reading-room/runtime.env.example)는 실제 secret이 없는 설명용 파일이다. 보존 파일도 이 폴더의 `storage`에 둔다. 원본 filesystem의 cwd 규칙에 맞춰 STORAGE_FOLDER는 저장소 기준 상대 경로로 생성한다.

Monolith는 PATH에 설치하거나 private 폴더의 `bin/monolith`로 제공한다. [공식 소스](https://github.com/Y2Z/monolith)와 [2.11.6 릴리스](https://github.com/Y2Z/monolith/releases/tag/v2.11.6)를 기준으로 자신의 플랫폼에 맞춰 설치한다. Cargo를 사용하는 경우 아래처럼 private 폴더에 설치할 수 있다. 이번 실행은 이미 설치된 arm64 2.11.6 실행 파일을 private bin에 연결했다. 과거 DB나 보존 자료를 가져오지 않았다.

```sh
cargo install monolith --version 2.11.6 --locked --root ../.local-rebuild/reading-room-r2
```

## 실제 서비스

```sh
node scripts/reading-room.mjs dev
```

다른 터미널에서 worker를 시작한다.

```sh
node scripts/reading-room.mjs worker
```

[실제 서비스](http://127.0.0.1:4721/reading-room)에서 원본 회원가입·로그인을 사용할 수 있다. 선택적으로 `node examples/reading-room/seed.mjs`를 실행하면 이번 rebuild 전용 계정 세 개와 실제 글 여섯 개를 만든다. 계정 정보는 private 폴더의 0600 `fixtures.json`에만 저장한다. 이미 seed를 마친 파일이 있으면 다시 개인 기록을 덮지 않는다.

빌드 후 실행할 때는 dev를 먼저 종료한다.

```sh
node scripts/reading-room.mjs build
node scripts/reading-room.mjs start
```

실행 터미널의 Ctrl-C는 해당 web 또는 worker 프로세스 그룹만 종료한다. DB는 `node scripts/reading-room.mjs db-stop`, 다시 시작은 `db-start`다. DB 볼륨·파일은 보존한다. worker는 원본 Docker와 같은 `worker.ts` entry를 직접 실행하므로 원본 supervisor의 자동 재시작은 사용하지 않는다.

## 독립 프론트엔드 프로토타입

```sh
corepack yarn workspace @linkwarden/reading-room-prototype build
corepack yarn workspace @linkwarden/reading-room-prototype preview
```

[4720 프로토타입](http://127.0.0.1:4720)은 별도 React entry, 결정적 메모리 대역, `connect-src 'none'`을 사용한다. DB·NextAuth·업무 서버가 필요 없다. 실제 제품은 4721에서 원본 backend를 사용한다. 가상 표시는 실제 보존 성공 증거가 아니다.

## 재검증

```sh
corepack yarn workspace @linkwarden/reading-room-prototype test
corepack yarn workspace @linkwarden/reading-room-prototype audit
corepack yarn workspace @linkwarden/web exec tsc --noEmit --incremental false
corepack yarn workspace @linkwarden/worker exec tsx --test ../../examples/reading-room/transport.test.ts ../../examples/reading-room/worker-input.test.ts
node examples/reading-room/contracts.mjs
node examples/reading-room/archives.mjs
```

contracts는 위 전용 fixture와 DB에서만 임시 링크를 만들어 검사하고 원본 API로 정리한다. archives는 현재 파일과 원본 archive HTTP를 읽는다. `--refresh`는 여섯 fixture의 보존을 실제로 초기화하므로 일반 확인에는 붙이지 않는다. 브라우저 검증은 [검증 기록](design/2026.10.25/verification.md)의 실제 CUA 범위를 참조한다. `/__review/navigation`은 loopback에서만 열리는 Next history 검토 경로이고 `/__review/mobile.html`은 실제 서비스 390px iframe 검토 도구다.
