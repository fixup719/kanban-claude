# TRD — Technical Requirements Document

## 1. 기술 스택

| 영역 | 현재 (v1.0) | 향후 (v2.0+) |
|------|------------|-------------|
| Frontend | Vanilla HTML5 / CSS3 / ES6+ | React 18 + TypeScript |
| Backend | — (클라이언트 전용) | Node.js (Express) 또는 FastAPI |
| Database | 인메모리 JS 배열 | MySQL 8.x 또는 PostgreSQL 16 |
| 인증 | — | JWT (Access + Refresh Token) |
| 배포 | 정적 파일 호스팅 | Docker + Nginx + Cloud(GCP/AWS) |
| 빌드 도구 | — | Vite 5 |

---

## 2. 현재 아키텍처 (v1.0 — 클라이언트 전용)

```
kanban/
├── index.html       # 마크업: 헤더, 보드, 모달
├── style.css        # 전역 스타일, 컴포넌트 스타일, 반응형
├── app.js           # 상태 관리 + 렌더링 + 이벤트 바인딩
└── docs/            # 설계 문서
```

### 데이터 흐름

```
사용자 액션
    │
    ▼
이벤트 핸들러 (app.js)
    │
    ▼
cards[] 배열 직접 변이
    │
    ▼
render() → DOM 전체 재생성
```

> 현재는 서버 없이 브라우저 메모리에서 상태를 관리한다.  
> 새로고침 시 `cards` 초기값으로 리셋된다.

---

## 3. 모듈 구조 (app.js)

| 함수 | 역할 |
|------|------|
| `init()` | 앱 진입점: `render()` + `bindModal()` 호출 |
| `render()` | 모든 컬럼을 순회하며 DOM 재생성 + 카드 수 갱신 |
| `createCardEl(card)` | 카드 DOM 요소 생성, 삭제 버튼 이벤트 바인딩 |
| `bindCardDrag(el, card)` | `dragstart` / `dragend` 이벤트 등록 |
| `bindColumnDrop(column, list)` | `dragover` / `dragleave` / `drop` 이벤트 등록 |
| `ensurePlaceholder()` | 드롭 플레이스홀더 DOM 생성 (싱글턴) |
| `removePlaceholder()` | 플레이스홀더 제거 + drag-over 클래스 초기화 |
| `getDragAfterElement(list, y)` | 마우스 Y 기준 삽입 위치 계산 |
| `deleteCard(id)` | 배열에서 카드 제거 후 재렌더 |
| `bindModal()` | 모달 열기/닫기, 폼 제출, 키보드 단축키 바인딩 |
| `escapeHtml(str)` | XSS 방지 HTML 이스케이프 |
| `priorityLabel(p)` | 우선순위 영문 키 → 한글 레이블 변환 |

---

## 4. 카드 데이터 모델 (현재)

```js
{
  id:       Number,   // 자동 증가 정수 (nextId++)
  title:    String,   // 1~50자, 필수
  desc:     String,   // 0~200자, 선택
  priority: String,   // 'low' | 'medium' | 'high'
  status:   String,   // 'todo' | 'in-progress' | 'done'
}
```

---

## 5. 렌더링 전략

현재는 **Full Re-render** 방식을 사용한다.

- 매 상태 변경마다 `render()`가 각 컬럼의 `innerHTML`을 초기화 후 전체 재생성한다.
- 카드 수가 많지 않은 MVP 범위에서는 성능 문제 없음.
- v2.0 전환 시 React의 Virtual DOM diffing으로 교체 예정.

---

## 6. 드래그 앤 드롭 구현 상세

- 브라우저 Native **HTML5 Drag and Drop API** 사용 (외부 라이브러리 없음)
- `draggedCard`: 현재 드래그 중인 카드 객체를 클로저 변수로 보관
- `getDragAfterElement`: 비드래그 카드들의 중간점과 마우스 Y 좌표 비교로 삽입 위치 결정
- 드롭 시 `cards` 배열에서 카드를 제거 후 목표 위치에 `splice` 삽입 → `render()`

---

## 7. 보안 요구사항

| 위협 | 대응 |
|------|------|
| XSS (Stored) | `escapeHtml()` — `&`, `<`, `>`, `"` 이스케이프 처리 후 DOM 삽입 |
| Prototype Pollution | 외부 JSON 입력 없음 (현재 클라이언트 전용) |
| CSRF | 서버 없음 (현재 해당 없음); v2.0에서 SameSite Cookie + CSRF Token 적용 |

---

## 8. 성능 요구사항

| 항목 | 목표 |
|------|------|
| 초기 로드 (LCP) | < 500ms (외부 리소스 없음) |
| 카드 렌더링 | 카드 50개 기준 < 16ms (60fps 유지) |
| 드래그 반응성 | `dragover` 이벤트 핸들러 < 1ms |

---

## 9. 향후 기술 전환 계획 (v2.0)

### 9.1 API 설계 원칙
- RESTful API (JSON 기반)
- 상태 코드: 200 OK / 201 Created / 400 Bad Request / 404 Not Found / 500 Internal Server Error

### 9.2 주요 엔드포인트 (예정)

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/api/cards` | 전체 카드 목록 조회 |
| `POST` | `/api/cards` | 카드 생성 |
| `PATCH` | `/api/cards/:id` | 카드 상태/순서 변경 |
| `DELETE` | `/api/cards/:id` | 카드 삭제 |

### 9.3 프론트엔드 상태 관리 전환
- `cards[]` 배열 → React `useState` + `useReducer`
- API 호출: `fetch` → `axios` 또는 `TanStack Query`
- 낙관적 업데이트(Optimistic Update)로 드래그 응답성 유지
