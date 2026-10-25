# 보존 본문 표시 설정 — TO-BE 유지 Job Flow

> **목표 기준** 2026.10.25 · **AS-IS 대비** 유지. [이번 기준선 원본](../../../as-is/details/jobflow/reader-preference.md)의 도표와 내부 계약을 목표에서도 유지한다. 아래 코드는 upstream 952ac454의 확인된 근거이며 목표 실행을 검증했다는 뜻이 아니다. [목표 핵심](../../system-design-to-be.md) C-05의 회귀 검증 대상이다.

> DATE 2026.10.25 · 기준 `952ac454` · 소스 분석, 실행 전
> [핵심](../../system-design-to-be.md#5-흐름--경계끼리-어떻게-소통하나) · [Navigation](../navigation/reader-preference.md)

## 1. 목적·트리거·완료

- 트리거: TextStyleDropdown에서 글꼴·크기·행간·폭 선택.
- 완료: 개인 User preference를 저장하고 reader와 theme 표시를 갱신한다.
- Browser가 입력과 표시를, API가 해당 계약과 영속 결과를 소유한다.

## 2. 그림과 계약

```jobflow
scope: reader_preference
Object: Browser, API
Browser.changeTextStyle --> API.putPreference
API.putPreference.response --> Browser.receivePreference
```

| 노드 | 실제 계약 | AS-IS 대비 |
|---|---|---|
| Browser.changeTextStyle | 별도 Save 없이 mutate를 실행. onMutate는 user cache를 먼저 바꿈. | 유지 |
| API.putPreference | PUT `/api/v1/users/:id/preference`;200 자기 preference,400 id/demo/schema,401 인증/타인. | 유지 |
| Browser.receivePreference | 공개 API가 아닌 성공 응답 후 다음 동작. user cache 교체와 html theme 갱신. | 유지 |

## 3. 내부 추적

| 상위 노드 | 실제 진입·호출 근거 | 내부 Job Flow | 판정·중단 이유 |
|---|---|---|---|
| Browser.changeTextStyle | `apps/web/components/TextStyleDropdown.tsx:74` | [내부](../../../as-is/details/browser.md#jf-12-초기-읽기와-개인-표시-설정--useuser--useconfig--usecollections--useupdateuserpreference) | 펼침 — 실제 호출·조건·결과 소비 |
| API.putPreference | `apps/web/pages/api/v1/users/[id]/preference.tsx:5–26` | [내부](../../../as-is/details/web-api.md#jf-16-초기-읽기와-표시-설정--getuserbyid--getcollection--updateuserpreference) | 펼침 — 실제 호출·조건·결과 소비 |
| Browser.receivePreference | `packages/router/user.tsx:122–126` | [내부](../../../as-is/details/browser.md#jf-12-초기-읽기와-개인-표시-설정--useuser--useconfig--usecollections--useupdateuserpreference) | 펼침 — 실제 호출·조건·결과 소비 |

## 4. 정상 흐름

개인 User preference를 저장하고 reader와 theme 표시를 갱신한다. 각 노드의 입력 가드와 반환 소비자는 위 내부 그림의 실제 심볼에서 이어진다. 응답선은 원 요청자의 다음 동작을 나타내며 API가 React 함수를 직접 호출한다는 뜻이 아니다.

## 5. 실패·취소·재시도

현재 hook에는 onError rollback이 없어 서버 실패 뒤에도 낙관적 값이 cache에 남을 수 있다. 명시적인 fetch timeout이나 변경을 취소하는 draft guard도 없다.

## 6. 근거·한계

이 설정은 개인 읽기 단계나 링크별 한 줄 감상 데이터가 아니라 User의 표시 preference다. 실제 HTTP와 화면 결과는 아직 실행하지 않았다.
