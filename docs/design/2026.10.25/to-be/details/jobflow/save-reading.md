# 개인 상태와 한 줄 저장 — TO-BE Job Flow

> DATE2026.10.25 · 신규 제안 R-01·R-03·R-04/C-01·C-02·C-03/D-01·D-02. [핵심 §5.21](../../system-design-to-be.md#521-개인-상태와-한-줄-저장) · [Navigation](../navigation/save-reading.md)

## 1. 목적과 범위

접근 가능한 상세에서 상태와 한 줄을 편집한 사용자가 Save를 누른다. read-only collection member도 자기 기록을 쓸 수 있다. status 클릭은 로컬 draft일 뿐이며 PUT은 status와 reflection을 한 묶음으로 보낸다.

## 2. 그림과 계약

```jobflow
scope: save_personal_reading
Object: Browser, API
Browser.submitReading --> API.putReading
API.putReading.result --> Browser.receiveReading
```

| 노드 | 실제 계약 | AS-IS 대비 |
|---|---|---|
| Browser.submitReading | (제안) draft+baseVersion, 중복 submit lock | 신규 |
| API.putReading | (제안) PUT links/:id/reading;200 current,400 invalid,404 access,409 conflict,500 | 신규 |
| Browser.receiveReading | (제안) 응답 다음 동작;200 Saved,409 conflict,통신실패 draft유지 | 신규 |

## 3. 내부 추적

| 상위 노드 | 제안 진입 심볼 | 내부 그림·근거 | 판정 |
|---|---|---|---|
| Browser.submitReading/receiveReading | useReadingRoom.saveDraft | [Browser JF-2](../browser.md#jf-2-초안-저장--savedraft) → [requestJson](../browser.md#jf-11-http-수명--requestjson) | 펼침(제안),atomic draft·focus·timeout |
| API.putReading | linkReading→putReading→commitReading | [API JF-3](../web-api.md#jf-3-개인-기록-저장--linkreading) → [CAS](../web-api.md#jf-31-version-쓰기--commitreading) → [conflict](../web-api.md#jf-32-충돌-재조회--resolveconflict) | 펼침(제안),접근·unique·version·결과 |
| parseReadingInput/matchesReadingPayload | model 순수함수 | [API §2](../web-api.md#2-공개-계약) | 말단 확인(제안),정확한필드값·단위 |
| Prisma transaction | 실제 adapter예정 | [API 검증계획](../web-api.md#7-검증-계획) | 외부 경계,실제CASrace검증필요 |

## 4. 정상 흐름의 단계별 설명

1. Controller는 현재 actor/link/epoch와 saved version을 capture하고 전체 draft를 검증한다. 유효할 때만15초 제한 PUT을 시작한다.
2. route가 인증·demo·body를 판단한다. commitReading은 접근 가능한 Link를 찾고 자기 row를 읽는다.
3. absence+version0은 unique create, 기존 row+일치version은 조건부 updateMany로 status/reflection/version을 함께 바꾼다. 반환 row는 DB commit 이후200으로 전달한다.
4. Controller는 선택이 여전히 같을 때만 base/draft를 응답으로 갱신한다. Saved를 표시하고 library/counts를 다시 읽는다.

## 5. 실패·취소·복구

CAS 경합·stale version은 현재 접근 권한을 다시 확인한 뒤 current를 반환한다. 동일 payload면현재값확인200,다르면409이며 이력 기반 idempotency가 아니다.409 UI는 내 초안을 남기고 서버 값 불러오기/검토 후 내 값 저장을 구분한다. timeout은 commit 여부 불명이며 명시retry만 가능하다. 권한404는 private current를 반환하지 않는다. 저장 진행 중 다른 쓰기를 막고 실패 후 focus와 controls를 복구한다.

## 6. 완료와 근거

200은 두 필드가 함께 저장됐거나 현재 값과 정확히 같음을 뜻한다. Finished는 사용자의 분류이며 실제 읽기 검증이 아니다. 성공·두탭·유실·회수·cascade 검증은 [API §7](../web-api.md#7-검증-계획), 시각·focus는 [Browser §7](../browser.md#7-검증-계획)에 계획했다. 구현 전이다.
