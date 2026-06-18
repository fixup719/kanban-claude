# WORKFLOW.md

작업 히스토리. 요청 내용과 수행한 작업을 날짜별로 기록한다.

---

## 2026-06-18

---

### [1] 소스 동기화 방법 안내

**요청:** `kanban/` 디렉토리와 `~/work/kanban-claude/` 디렉토리 간 동기화 방법 문의

**작업:**
- 기존 `sync.sh` 파일 확인 및 사용법 안내
- `sync.sh`가 kanban/ → kanban-claude/ 파일 복사 + git 커밋 + GitHub Pages 배포를 자동 처리함을 설명

---

### [2] 변경사항 git 커밋 요청

**요청:** 변경사항을 git에 올려달라는 요청

**작업:**
- `git status` 확인 → 변경사항 없음(clean) 안내

---

### [3] GitHub Pages 로그인 화면 미표시 문제

**요청:** GitHub Pages 접속 시 로그인 창이 나타나지 않는 문제

**작업:**
- `app.js` 확인 → `ensureSession()`이 `signInAnonymously()`로 자동 익명 로그인 처리 중 (로그인 UI 없음)
- 로그인 방식 선택 → Google OAuth + 게스트 모드 둘 다 구현
- `index.html`: 로그인 오버레이(Google 버튼 + 게스트 버튼) 추가, 헤더에 사용자 정보 영역 추가
- `style.css`: 로그인 오버레이 스타일 추가
- `app.js`: 세션 유무에 따라 로그인 오버레이 표시 or 보드 진입 분기, `showLoginOverlay()` / `startBoard()` / `renderUserInfo()` 함수 추가

---

### [4] 변경사항 git 커밋 및 푸시

**요청:** 변경사항을 git에 올려달라는 요청

**작업:**
- `git add` → `git commit` → `git pull --no-rebase` → `git push` 수행
- 커밋 메시지: `feat(day03/kanban): 로그인 오버레이 추가 (Google OAuth + 게스트 모드)`

---

### [5] 로그인 화면 디자인 개선 및 버튼 동작 수정 + 배포

**요청:** 로그인 화면 디자인 개선, 버튼 클릭 시 반응 없는 문제 수정, git 커밋 및 배포 레포 동기화

**작업:**
- 버그 원인 파악: 버튼 클릭 실패 시 `console.error`만 출력하고 UI 피드백 없음
- `index.html`: 로그인 카드 마크업 재구성 (미니 칸반 컬럼 로고, 에러 메시지 영역 추가)
- `style.css`: 로그인 화면 전면 재디자인 — 슬라이드업 애니메이션, 글로우 효과, Google/게스트 버튼 계층 구분, 스피너 CSS
- `app.js`: 클릭 시 버튼 비활성화 + 스피너, 에러 메시지 UI 표시, 게스트 로그인 성공 시 페이드아웃 후 보드 전환
- `git commit` → `git push` → `sync.sh` 실행 (GitHub Pages 배포)

---

### [6] 게스트 로그인 실패 (Anonymous sign-ins are disabled)

**요청:** 게스트로 시작하기 클릭 시 "Anonymous sign-ins are disabled" 오류 발생

**작업:**
- 코드 문제 아님. Supabase 대시보드 설정 문제로 안내
- Supabase → kanban 프로젝트 → Authentication → Providers → "Allow anonymous sign-ins" ON → Save

---

### [7] Supabase 무료 플랜 프로젝트 전환 방법

**요청:** Supabase 무료 플랜 사용 중 todo-planner 프로젝트가 활성 상태여서 kanban 프로젝트가 일시정지(checking) 상태. 두 프로젝트를 전환하는 방법 문의

**작업:**
- Supabase 무료 플랜 제약 설명 (비활성 프로젝트 자동 일시정지)
- 안내:
  1. todo-planner → Settings → General → Pause project
  2. kanban 프로젝트 → Restore project
  3. 복구 후 Anonymous sign-ins 활성화

---

### [8] Google 로그인 액세스 차단 오류

**요청:** Google로 계속하기 클릭 시 "액세스 차단됨: 이 앱의 요청이 잘못되었습니다" 오류 발생

**작업:**
- Google OAuth 앱 미설정 상태로 판단, 설정 방법 안내
  1. Google Cloud Console → OAuth 2.0 클라이언트 ID 생성
  2. 승인된 리디렉션 URI에 `https://lbepkfydkfwvnvapzcrj.supabase.co/auth/v1/callback` 추가
  3. Supabase → Authentication → Providers → Google → Client ID/Secret 입력
  4. Supabase → Authentication → URL Configuration → Redirect URLs에 GitHub Pages URL 추가

---

### [9] Google OAuth 설정 후에도 오류 지속

**요청:** 설정을 완료했는데도 Google 로그인 오류가 계속 발생

**작업:**
- 추가 체크리스트 안내
  1. OAuth 동의 화면이 "테스트 중" 상태이면 테스트 사용자에 Gmail 추가 또는 앱 게시
  2. 리디렉션 URI 정확히 일치 여부 재확인

---

### [10] OAuth 동의 화면 상태 확인 방법

**요청:** Google Cloud Console에서 OAuth 동의 화면 상태값 확인 방법 문의

**작업:**
- Google Cloud Console → API 및 서비스 → OAuth 동의 화면 → 상단 "게시 상태" 확인 방법 안내
- "테스트 중" 상태일 경우 테스트 사용자 추가 방법 안내

---

### [11] 게스트 로그인 재시도 실패

**요청:** Google 로그인은 성공했으나 게스트 로그인이 "Anonymous sign-ins are disabled"로 여전히 실패

**작업:**
- Supabase 프로젝트 복구 후 익명 로그인 설정을 다시 활성화해야 함을 안내
- Supabase → kanban 프로젝트 → Authentication → Providers → "Allow anonymous sign-ins" ON → Save

---

### [14] 팀 공유 및 활동 로그 구현

**요청:** 가이드라인 기반으로 팀 공유 및 활동 로그 기능 구현

**작업:**
- `docs/migration_share_activity.sql` 생성 — Supabase SQL Editor에서 실행할 마이그레이션 스크립트
  - `boards.share_token` 컬럼 추가 (UUID, 고유값)
  - `boards` / `cards` RLS 정책 갱신 (공유 보드 읽기/쓰기 허용)
  - `activity_logs` 테이블 생성 및 RLS 정책 추가
- `index.html`: 헤더에 "링크 복사" / "활동 로그" 버튼 추가, 활동 로그 사이드 패널 추가, 토스트 알림 엘리먼트 추가
- `style.css`: 사이드 패널 슬라이드 애니메이션, 활동 항목 스타일, 토스트 스타일 추가
- `app.js` 주요 변경:
  - URL `?share=<token>` 파라미터로 공유 보드 진입 (`ensureBoard()` 분기)
  - `logActivity()` — 카드 추가/이동/삭제/보드 참여 시 `activity_logs`에 INSERT
  - `loadActivityLogs()` / `renderActivityLogs()` — 최근 50개 로그 로드 및 렌더링
  - `subscribeRealtime()` — `activity_logs` 채널 추가 (팀원 로그 실시간 수신)
  - `copyShareLink()` — `share_token` 기반 URL을 클립보드에 복사 + 토스트
  - `toggleActivityPanel()` — 사이드 패널 열기/닫기
  - `buildActivityItem()` / `actionLabel()` / `timeAgo()` — 로그 항목 렌더링 유틸

> **Supabase 설정 필요:** `docs/migration_share_activity.sql` 실행 후, Database → Replication에서 `activity_logs` 테이블 Realtime 활성화

---

### [13] 팀 공유 및 활동 로그 구현 가이드라인 요청

**요청:** 칸반 보드를 팀원과 공유하고 활동 로그를 기록하는 기능을 어떤 방향으로 구현할지 가이드라인 작성 요청

**작업:**
- 현재 DB 구조(`boards`, `cards`, `owner_id` 기반 1인 1보드) 분석
- `docs/SHARE_AND_ACTIVITY_GUIDE.md` 생성, 내용:
  - **팀 공유** — Option A(공유 링크/share_token, 권장) vs Option B(board_members 멤버십)
  - **활동 로그** — Option A(activity_logs 테이블 + Realtime, 권장) vs Option B(DB 트리거)
  - DB 스키마 예시, 앱 로직 코드 예시, RLS 정책 주의사항
  - 단계별 구현 로드맵 (Step 1~7)
- git 커밋 + push

---

### [12] WORKFLOW.md 생성 및 CLAUDE.md 갱신 규칙 추가

**요청:** 작업 히스토리를 WORKFLOW.md로 정리하고, 앞으로 작업 시 항상 WORKFLOW.md를 갱신하도록 CLAUDE.md에 반영

**작업:**
- `WORKFLOW.md` 생성 (이 파일)
- `CLAUDE.md`에 WORKFLOW.md 갱신 규칙 추가
- `sync.sh`에 `CLAUDE.md`, `WORKFLOW.md` 동기화 대상 추가
- git 커밋 + push + GitHub Pages 배포
