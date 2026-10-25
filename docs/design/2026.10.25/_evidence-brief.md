# 근거 브리프 — 2026.10.25 AS-IS 역추출

> 이 문서는 원본을 찾는 색인이다. 요약으로 원본 검증을 대신하지 않는다.
> **상태**: 새 원본 분석의 기준선 확정. 내부 JobFlow 샘플을 독립 검토한 뒤 범위 전체로 확장한다. AS-IS 완료 또는 후속 단계 승인을 뜻하지 않는다.

## 1. 기준선

| 항목 | 값 |
|---|---|
| DATE | 2026.10.25 |
| 소스 기준 커밋 | `952ac4540657cae3a67c3ca59433899d2fda8374` |
| 원본 맥락 | 2026-09-09T20:12:04-04:00, upstream Linkwarden PR #1834 병합 |
| 저장소 | `linkwarden/linkwarden`의 새 포크 `ryujt/reading-room` |
| 작업 트리 | 조사 시작 시 clean. 이 커밋은 분석 기준선 문서만 추가한다. |
| 관찰 방법 | 새 checkout 소스 본문, 선언과 호출 위치, Prisma schema, manifest와 yarn.lock 대조 |
| 실행 구분 | 서비스·DB·브라우저는 아직 실행하지 않았다. 런타임 서술은 코드상 예상이다. |
| 가이드 기준 | project-guides `c56f4909e3b6626e85f51bfa3a2fbce987a8c878`, 내부 추적 완료 기준 §6.4 포함 |

### 1.1 분석 범위

인증 및 기본 진입, 링크 목록·검색·저장·상세·수정·삭제, 컬렉션 공유와 공개 링크/보존물 조회, 보존 워커와 저장 adapter를 조사한다. 해당 경로의 페이지·컴포넌트·hook·API handler·controller·공유 함수·Prisma 호출을 추적한다. 개인 읽기 상태와 한 줄 감상은 현재 기능으로 가정하지 않는다. `User`, `Link`, `Highlight` 모델의 실제 필드를 구분한다.

조사 명령은 `rg --files apps/web packages apps/worker`, `rg -n '^model |^enum ' packages/prisma/schema.prisma`, 각 진입점의 `nl -ba <파일>`이다. 전체 화면 목록은 소스 조사 후 핵심 §7에서 확정한다.

### 1.2 제외한 것과 이유

| 경로 | 이유 | 근거 |
|---|---|---|
| apps/mobile, apps/browser-extension | 이번 웹 Reading Room 범위 밖. 공유 router의 mobile auth 인자는 계약 설명에만 포함 | `rg --files apps/mobile apps/browser-extension` |
| 결제 구매·관리 화면, AI 태깅·RSS·import의 독립 업무 | 읽기/저장/보존에 직접 연결된 가드와 등록 위치는 조사하되 해당 독립 제품 업무는 확장하지 않음 | `rg --files apps/web/pages apps/worker/workers` |
| 이전 작업 산출물과 DB | 사용자가 삭제한 작업을 재사용하지 않는 새 분석 | 현재 소스 기준 커밋과 새 문서 이력 |
| 제3자 라이브러리 내부·원문 서버 | 호출 adapter와 lockfile 버전에서 외부 경계로 분류. 내부 분석 완료에 합산하지 않음 | `rg -n 'resolution:' yarn.lock` |

### 1.3 문서 대조 기준선

가이드 사본은 이 저장소 안에 없으므로 파일명과 절로 참조한다. 아래 해시는 실제 읽은 파일의 SHA-256이다.

| 문서 | SHA-256 |
|---|---|
| `prompts/system-design-as-is-prompt.md` | `823728345bab1751f10838efeda270d794109161ad1e7ef098a167787fb359d3` |
| `guides/system-design-document-guide.md` | `e1e5dcb05a7f659ce9663f453f2d07f35578c041056d6c59b0b24883e2d139fb` |
| `guides/job-flow-diagram-guide.md` | `15900f183b470bc94c124aa1ba5f529d3a87ee4d0a1572ab997ddc8e4630fe02` |
| `guides/navigation-diagram-guide.md` | `94443026b9a42194b25cebc86a1489ea65725033c82e3aa25c6c5cf0f9e32f39` |
| `guides/screen-layout-guide.md` | `87b7e219ae23d6065a4bcfadae9210856e72942f5a14689497f37c7d98329b47` |

## 2. 경계 목록과 조사 산출물

| 조사 ID | 경계 | 포트 | 상세 문서 |
|---|---|---|---|
| B | Browser | Web의 동일 origin | `as-is/details/browser.md` 예정 |
| A | Web API/Auth | 설정된 Next HTTP 포트 | `as-is/details/web-api.md` 예정 |
| W | Worker | HTTP listener 없음 | `as-is/details/worker.md` 예정 |
| S | 공유 네트워크·저장 adapter | 프로세스 내 모듈 | `as-is/details/adapters.md` 예정 |

## 3. 이슈 색인

조사 중이다. 경계 상세 §8을 이슈 원본으로 두며 발견 사실과 변경 제안을 분리한다.

## 4. 재확인 명령

| 목적 | 명령 |
|---|---|
| 원본 확인 | `git show --no-patch --format=fuller 952ac4540657cae3a67c3ca59433899d2fda8374` |
| 호출 위치 | `rg -n 'mutateAsync|onClose' apps/web/components/ModalContent/NewLinkModal.tsx` |
| worker 등록 | `nl -ba apps/worker/worker.ts` |
| 문서 정적 검사 | `node <가이드 사본>/guides/tools/design-doc-check.mjs --strict docs/design/2026.10.25` — 전체 문서 작성 후 실행 예정 |

## 5. 검증 기록

- 정적: 소스 기준 커밋·작성자 설정·가이드 SHA-256 확인 (`사실·실행`). 아직 문서 검사기 실행 전이다.
- 렌더링: 실행하지 않았다. 샘플 작성 뒤 독립 검토자가 렌더러와 브라우저로 확인할 예정이다.
- 의미: 저장→보존의 성공 및 주요 실패를 L0→L1→필요한 L2로 검토할 계획이다. 파일 수나 정적 검사 결과로 의미 검토를 대체하지 않는다.

## 6. 검토 반영

독립 검토자가 제안 범위와 조기 샘플 방식을 수락했다. 사용자의 직접 설계 승인이 아니며 AS-IS 완료 게이트도 아니다. 구체적인 소스·그림 지적은 검토 후 기록한다.

## 7. 한계

현재는 분석 시작 기준선이다. 샘플과 전체 범위가 검토되기 전에는 미완료다. 서비스·보존 결과·권한을 실제 HTTP로 확인하지 않았으며, 이전 실행 결과를 이번 작업의 증거로 사용하지 않는다. TO-BE, frontend prototype, 제품 구현은 AS-IS 게이트 뒤 별도 단계다.
