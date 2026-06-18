# TASKS — Kanban Board

## 현재 버전: v1.0.0

---

## Phase 1 — MVP (v1.0) ✅ 완료

### 기반 설정
- [x] 프로젝트 디렉토리 구조 생성 (`index.html`, `style.css`, `app.js`)
- [x] 한국어 로케일 설정 (`lang="ko"`, 한글 레이블)

### 보드 UI
- [x] 헤더 컴포넌트 구현 (타이틀 + 카드 추가 버튼)
- [x] 3컬럼 레이아웃 구현 (TO-DO / IN-PROGRESS / DONE)
- [x] 컬럼별 헤더 색상 차별화 (황금 / 하늘 / 초록)
- [x] 컬럼별 카드 수 배지 표시

### 카드 기능
- [x] 카드 데이터 모델 정의 (id, title, desc, priority, status)
- [x] 카드 렌더링 함수 구현 (`createCardEl`)
- [x] 우선순위별 좌측 보더 색상 표시
- [x] 우선순위 배지 텍스트 표시 (높음/보통/낮음)
- [x] 카드 삭제 기능 (`✕` 버튼)
- [x] XSS 방지 `escapeHtml` 처리

### 카드 추가 모달
- [x] 모달 오픈/클로즈 구현
- [x] 제목 입력 (필수, 최대 50자)
- [x] 설명 입력 (선택, 최대 200자)
- [x] 우선순위 선택 콤보박스 (낮음/보통/높음)
- [x] 제목 미입력 시 유효성 검사 (빨간 테두리)
- [x] Enter 키로 확인, Escape 키로 닫기
- [x] 오버레이 클릭으로 닫기
- [x] 새 카드 TO-DO 컬럼 맨 아래 삽입

### 드래그 앤 드롭
- [x] HTML5 Native DnD API 적용 (라이브러리 없음)
- [x] 카드 드래그 시 반투명 처리 (opacity 0.4)
- [x] 드롭 대상 컬럼 하이라이트 (.drag-over)
- [x] 드롭 플레이스홀더 (점선 박스) 표시
- [x] `getDragAfterElement` — 마우스 Y 기준 삽입 위치 계산
- [x] 컬럼 간 이동 (status 변경)
- [x] 같은 컬럼 내 순서 변경

### 스타일 / 반응형
- [x] 다크 테마 전체 적용
- [x] 모바일 반응형 (768px 이하 세로 레이아웃)
- [x] 버튼/카드/입력 hover 전환 애니메이션

### 설계 문서
- [x] PRD.md 작성
- [x] TRD.md 작성
- [x] USER_FLOW.md 작성
- [x] DATABASE.md 작성 (RDB 전환 계획 포함)
- [x] DESIGN.md 작성
- [x] DESIGN_SYSTEM.md 작성
- [x] TASKS.md 작성

---

## Phase 2 — 데이터 영속성 (v1.1) 🔲 예정

### localStorage 저장
- [ ] 카드 추가/삭제/이동 시 `localStorage.setItem('kanban-cards', JSON.stringify(cards))` 저장
- [ ] 앱 초기화 시 `localStorage.getItem('kanban-cards')` 복원
- [ ] 데이터 버전 필드 추가 (`__version`) — 스키마 변경 시 마이그레이션 처리
- [ ] "데이터 초기화" 버튼 추가 (옵션)

---

## Phase 3 — 카드 편집 (v1.2) 🔲 예정

- [ ] 카드 클릭 시 편집 모달 오픈
- [ ] 편집 모달: 제목, 설명, 우선순위 수정 가능
- [ ] 편집 완료 시 카드 재렌더 (위치 유지)
- [ ] 카드에 "편집" 아이콘 버튼 추가 (삭제 버튼 옆)

---

## Phase 4 — 백엔드 연동 (v2.0) 🔲 예정

### 데이터베이스
- [ ] MySQL 8.x 또는 PostgreSQL 16 스키마 생성 (DATABASE.md 참조)
- [ ] 초기 시드 데이터 스크립트 작성 (컬럼 3개, 샘플 카드 4개)
- [ ] DB 마이그레이션 도구 설정 (Flyway 또는 Liquibase / prisma migrate)

### 백엔드 API
- [ ] Node.js (Express) 또는 FastAPI 프로젝트 초기화
- [ ] `GET /api/cards` — 전체 카드 목록
- [ ] `POST /api/cards` — 카드 생성
- [ ] `PATCH /api/cards/:id` — 카드 상태/순서/내용 변경
- [ ] `DELETE /api/cards/:id` — 카드 소프트 삭제
- [ ] 입력 유효성 검사 미들웨어
- [ ] CORS 설정

### 프론트엔드 연동
- [ ] `cards[]` 배열 → API fetch 교체
- [ ] 낙관적 업데이트 (드래그 드롭 즉시 UI 반영, 실패 시 롤백)
- [ ] 로딩 스피너 / 스켈레톤 UI 추가
- [ ] 에러 토스트 알림 추가

### 사용자 인증
- [ ] 회원가입 / 로그인 UI
- [ ] JWT Access Token + Refresh Token 구현
- [ ] 보호된 라우트 미들웨어
- [ ] 로그아웃 기능

---

## Phase 5 — 멀티 보드 & 협업 (v2.1+) 🔲 장기

- [ ] 다중 보드 생성 / 전환 UI
- [ ] 보드 공유 링크 생성
- [ ] 카드 담당자 지정 기능
- [ ] 마감일(Due Date) 설정 및 D-day 표시
- [ ] 카드 댓글(Comment) 기능
- [ ] WebSocket 기반 실시간 동기화
- [ ] 활동 로그 (Activity Log)
- [ ] 보드 아카이브 / 복원

---

## 버그 & 기술 부채

| # | 내용 | 우선순위 | 상태 |
|---|------|---------|------|
| B-01 | 드래그 중 외부 창으로 이동 시 `dragend` 미발생 → `draggedCard` 초기화 누락 | Medium | 🔲 |
| B-02 | 모바일 터치 이벤트 미지원 (Touch DnD 별도 구현 필요) | High | 🔲 |
| B-03 | 카드 삭제 시 확인 없이 즉시 삭제 — Undo 기능 없음 | Low | 🔲 |
| T-01 | Full Re-render 방식 → 카드 50개 이상 시 성능 저하 가능 | Low | 🔲 |
| T-02 | CSS Custom Properties로 색상 토큰 변수화 필요 | Low | 🔲 |
