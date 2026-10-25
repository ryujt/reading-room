# 패키지 구성 — AS-IS

> 기준일: 2026.10.25 · 원본 소스: `952ac4540657cae3a67c3ca59433899d2fda8374` · 범위: 웹·보존 worker와 직접 사용하는 shared workspace. 소스 조사이며 빌드·실행 성공을 뜻하지 않는다.

[핵심 설계](../system-design-as-is.md) · [시스템 구성](system-configuration.md) · [Browser](browser.md) · [Web API](web-api.md) · [Worker](worker.md) · [공유 adapter](adapters.md)

## 1. 소스 트리와 책임

```text
apps/
  web/
    pages/                 화면 라우트와 pages/api의 HTTP handler
    layouts/ components/   화면 shell·입력·목록·주요 modal
    hooks/                 초기 조회·화면 상태
    lib/api/               인증·controller·권한·보존물 응답
    lib/shared/            공유 helper: 순수 URL 검사·서버 metadata 조회 등
  worker/
    index.ts               workspace 실행의 child supervisor
    worker.ts              실제 worker 조립
    workers/               polling·색인·tagging·migration 실행
    lib/                   archive·공정 batch·browser·format 처리
  mobile/ extension/       다른 클라이언트; 이번 UI 분석 범위 밖
packages/
  router/                  React query/mutation hooks와 fetch 계약
  lib/                     검증·SSRF·safeFetch·검색 client 등 공통 함수
  prisma/                  schema·migration·PrismaClient export
  filesystem/              local/S3 파일 adapter
  types/                   소비자들이 공유하는 DTO와 type
```

`router`라는 폴더 이름은 서버의 HTTP route 등록기를 뜻하지 않는다. 실제 `/api/v1/links` handler는 `apps/web/pages/api/v1/links/index.ts`이고, `packages/router/links.tsx`는 그 endpoint를 호출하는 React hook이다. 이름이 비슷해도 실행 위치·소유 상태가 다르다.

## 2. 공개 접점·내부 구현·의존 방향

| 단위 | 다른 단위가 쓰는 진입점 | 내부·조립 위치 | 나가는 의존과 중단 경계 |
|---|---|---|---|
| Web 화면 | Next page export, component props | `_app.tsx:49–54`의 QueryClient/SessionProvider, `:78–109`의 AuthRedirect/getLayout | hooks와 UI용 lib/types. 브라우저가 서버 controller를 직접 호출하는 구조가 아님 |
| Web API | `pages/api/v1/**`의 default handler | `lib/api/verifyUser.ts`, `lib/api/controllers/**`, 인증 설정 | Prisma, filesystem, lib, 선택적 외부 서비스. HTTP 계약은 [Web API](web-api.md) |
| Router hooks | `@linkwarden/router/links`의 `useAddLink` 등 파일별 export | `links.tsx:394` 이후 mutation callback·cache 변환. 별도 HTTP 서버 없음 | fetch/NextAuth/TanStack Query와 lib/types. schema type·Prisma type 참조를 SQL 실행으로 오인하지 않음 |
| Worker | `worker.ts`의 `init`에서 workers 함수 호출 | `workers/linkProcessing.ts` → `lib/getLinkBatchFairly.ts` / `lib/archiveHandler.ts` / format handlers | Prisma/filesystem/lib/types, Playwright, 선택적 index/AI provider. entry→format→파일/DB 추적은 [Worker](worker.md) |
| Prisma | `@linkwarden/prisma`의 `prisma`, `@linkwarden/prisma/client`의 generated client/types | `index.ts:5–14`, `schema.prisma`, `migrations/`; `prisma generate`가 client 생성 | `@prisma/client`·PostgreSQL. DB 모델을 여러 프로세스가 공유하며 단일 서비스만 쓰는 구조로 교정하지 않음 |
| Filesystem | `index.ts`가 재노출하는 create/read/remove/move 함수 | 각 함수에서 local/S3 선택, `s3Client.ts`에서 client 구성 | Node fs / AWS SDK. DB 권한은 이 모듈의 책임이 아니므로 API caller에서 먼저 판단 |
| Shared lib | `@linkwarden/lib/ssrf`, `/safeFetch`, `/schemaValidation` 등 파일별 export | 검증·HTTP agent·기타 기능별 함수 | prisma/filesystem/types를 실제 필요 함수에서 사용. 모든 lib가 브라우저에 안전하거나 순수하다고 가정하지 않음 |
| Types | `@linkwarden/types/global`, `/inputSelect` | Prisma 모델의 type와 API DTO 구성 | schema/type 결합이 있음. type import는 런타임 service 호출과 구분 |

위 의존은 기준 소스에서 관찰한 것이다. 새 목표 아키텍처의 허용 규칙이 아니다. 특히 `packages/lib`는 UI 유틸리티와 서버 네트워크·저장 기능을 함께 담으며 `packages/router/package.json`에도 Prisma 의존 선언이 있다. 독립 레이어로 정리돼 있다고 가정하지 않고 실제 import와 호출을 확인해야 한다.

## 3. 실행·패키지 경계의 대응

| 산출/실행 | 구성 | 근거 |
|---|---|---|
| Browser bundle | web pages/components/layouts + 사용한 router/lib/types 코드 | `_app.tsx`, `next.config.js`; Next가 client/server 코드를 빌드. 패키지 폴더 전체가 통째로 브라우저에서 실행된다는 뜻이 아님 |
| Next server | web API/SSR + 사용한 prisma/filesystem/lib 코드 | `apps/web/package.json`의 `next build`/`next start` |
| Node worker | worker entry/body + 해당 shared workspace | `apps/worker/package.json`의 `tsx index.ts`; Docker는 `tsx worker.ts` 직접 실행 |
| shared workspace | 실행 프로세스 안에서 import된 모듈 | 자체 listener·독립 배포 서비스로 선언돼 있지 않음. Web/worker 프로세스마다 module instance가 생김 |

root workspace는 `apps/*`, `packages/*`, package manager는 Yarn4.12.0이다(`package.json`). `.yarnrc.yml`은 node-modules linker와 hardlinks-local을 선택한다. Docker build는 root/web/worker에 workspace focus를 적용하고 Prisma client 생성 후 web을 빌드한다(`Dockerfile:24–45`). 모바일·확장 앱이 monorepo에 있다는 이유로 해당 고객 화면을 이 AS-IS 범위에 포함하거나 모든 workspace 설치가 필요한 것으로 단정하지 않는다.

## 4. 변경 지점을 찾는 읽기 경로

| 질문 | 공개 진입점부터 읽을 순서 | 상세 원본 |
|---|---|---|
| 저장 후 왜 창이 먼저 닫히는가 | NewLinkModal.submit → useAddLink.mutationFn/callbacks → HTTP handler | [저장 Job Flow](jobflow/save-link.md), [Browser JF-1](browser.md#jf-1-추가-창-제출--newlinkmodalsubmit) |
| metadata 조회·collection 생성은 누가 하는가 | links route → postLink → setCollection/fetchTitleAndHeaders → Prisma/filesystem | [Web API JF-1](web-api.md#jf-1-post-분기--links), [adapter](adapters.md) |
| 저장된 링크가 언제 보존되는가 | worker init → linkProcessing → batch selector → archiveHandler → 선택 format handler | [보존 Job Flow](jobflow/preserve-link.md), [Worker](worker.md) |
| DB와 파일 쓰기는 하나인가 | API/worker caller → Prisma 쓰기와 filesystem 함수 각각 추적 | [adapter §4](adapters.md#4-소유-상태데이터), [시스템 구성 §3](system-configuration.md#3-저장소설정외부-의존) |

## 5. 테스트·검증 위치

| 위치·기존 명령 | 대상 | 이번 작성 시 증거 수준 |
|---|---|---|
| root `vitest.config.mts`, `yarn test` / `yarn coverage` | `@`를 apps/web으로 매핑, e2e/dist/node_modules 제외 | 설정·파일 존재 조사. 재실행하지 않았으므로 통과로 표시하지 않음 |
| `packages/lib/ssrf.test.ts` | SSRF URL/DNS 규칙 | 테스트 본문 실행 전 |
| `packages/filesystem/removeFile.test.ts` | filesystem 삭제 함수 | 테스트 실행 전 |
| `apps/web/lib/api/archives/resolveAccessibleArchive.test.ts`, preserved 관련 tests | 보존물 접근·URL/토큰 계약 | 테스트 실행 전 |
| `apps/web/pages/api/v1/archives/[linkId].test.ts`, preserved view/token tests | API 응답 경로 | 테스트 실행 전 |
| `apps/web/e2e/tests/public/login.spec.ts`, web `e2e` script | 로그인 브라우저 흐름 | 구성·위치만 확인. 브라우저 동작 검증으로 세지 않음 |

기본 테스트 명령이 존재한다는 사실과 신규 독서 경험을 검증한다는 주장은 다르다. AS-IS에는 사용자별 독서 단계·한 줄 기록 기능이 아직 없으므로 그 기능의 성공 증거도 없다.

## 6. 확인 범위와 한계

직접 import/entrypoint와 source 설정을 대조했으며, 모든 package의 전체 API·mobile·extension·유료 구독·관리자 운영을 전수 분석한 문서는 아니다. 외부 Next/TanStack/Prisma/Playwright/SDK의 내부 구현은 적용 버전과 호출 계약에서 멈춘다. 그 안의 실행 동작에 의존하는 주장은 후속 검증에서 별도로 확인해야 한다.
