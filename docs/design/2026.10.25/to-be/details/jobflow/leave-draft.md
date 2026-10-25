# 초안이 있는 화면 이탈 — TO-BE Job Flow

> DATE2026.10.25 · 신규 제안 R-04/C-04/D-04. [핵심 §5.22](../../system-design-to-be.md#522-초안이-있는-화면-이탈) · [Navigation](../navigation/leave-draft.md)

## 1. 목적과 범위

dirty detail에서 다른 link·shelf·검색 URL·닫기·뒤로가기·원본 viewer로 나가려 할 때 draft와 목적지를 보존한다. Guard의 keep/discard는 Browser 내부 동작이며 서버 요청을 만들지 않는다. 아래 L0는 **Save and leave를 선택한 경우만**이다.

## 2. 그림과 계약

```jobflow
scope: guarded_save_and_leave
Object: Browser, API
Browser.resolveGuard --> API.putReading
API.putReading.result --> Browser.finishNavigation
```

| 노드 | 실제 계약 | AS-IS 대비 |
|---|---|---|
| Browser.resolveGuard | (제안) Save and leave action, captured destination+draft | 신규 |
| API.putReading | [상태 저장과 같은 PUT](save-reading.md#2-그림과-계약) | 신규 |
| Browser.finishNavigation | (제안) 단일 종결 입구.200은목적지,그외는Guard유지 | 신규 |

## 3. 내부 추적

| 상위 노드 | 제안 진입 심볼 | 내부 그림·근거 | 판정 |
|---|---|---|---|
| Browser.resolveGuard/finishNavigation | requestNavigation/resolveNavigation | [Browser JF-3](../browser.md#jf-3-이탈-판단--requestnavigationresolvenavigation), [history](../browser.md#jf-31-브라우저-뒤로가기--subscribepopstate) | 펼침(제안),목적지·보상·suppression |
| API.putReading | linkReading/putReading | [API JF-3](../web-api.md#jf-3-개인-기록-저장--linkreading) | 펼침(제안),일반 Save와동일계약 |
| beforeunload/history | browser platform | Browser JF-3.1 | 외부 경계,document종료시native경고한계 |

## 4. 정상 흐름의 단계별 설명

1. requestNavigation은 clean이면 즉시 이동하고 dirty이면 destination 하나를 저장한다.
2. keep는 Guard를 닫고 기존 입력으로 focus를 돌린다. discard는 초안을 버린 뒤 목적지를 실행한다.
3. save는 같은 saveDraft를 await한다.200에만 destination을 한 번 실행하고 pending을 비운다.
4. popstate는 이미 이동한 browser entry를 보상한 후 같은 Guard를 열고, 결정 후 원래 delta를 적용한다.

## 5. 실패·취소·복구

409/timeout/500은 draft와 destination을 그대로 둔다. Guard 안에서 retry·discard·keep를 다시 선택한다. 추가 클릭은 목적지를 덮어쓰지 않는다. 새 탭 종료/브라우저 강제종료는 custom guard를 보장할 수 없어 beforeunload 한계를 명시한다. read API abort는 서버에 쓰기 rollback을 요청하지 않는다.

## 6. 완료와 근거

사용자가 선택한 처리 이후 이동했거나 원래 초안으로 돌아온 것이 완료다. prototype 실제 Back·실패→retry를 root CUA로 검증한 뒤 최종 history adapter를 확정한다. 구현·브라우저 검증 전이다.
