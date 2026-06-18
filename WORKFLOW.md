# WORKFLOW.md

작업 히스토리. 프롬프트는 원문 그대로, 작업 내용은 요약.

---

## 2026-06-18

---

### [1] `~/work/kosa-vibecoding-2026-3rd/src/exercise/fixup719/day03/kanban/ 아래 소스랑 ~/work/kanban-claude/ 아래소스 동기화 방법 알려죠`

- 기존 `sync.sh` 파일 확인 및 사용법 안내
- `sync.sh`가 kanban/ → kanban-claude/ 파일 복사 + git 커밋 + GitHub Pages 배포를 자동 처리함을 설명

---

### [2] `변경사항 git에 올려죠`

- `git status` 확인 → 변경사항 없음(clean) 안내

---

### [3] `github 페이지로 접속하면 로그인 창이 안뜨는데?`

- `app.js` 확인 → `ensureSession()`이 `signInAnonymously()`로 자동 익명 로그인 처리 중 (로그인 UI 없음)
- `index.html` 확인 → 로그인 마크업 없음
- 로그인 방식 선택 질문 → 사용자가 "게스트 모드 + Google OAuth 둘 다" 선택
- **구현 내용:**
  - `index.html`: 로그인 오버레이(Google 버튼 + 게스트 버튼) 추가, 헤더에 `user-info` 영역 추가
  - `style.css`: 로그인 오버레이 스타일 추가, 헤더 우측 영역 스타일 추가
  - `app.js`: `init()` → 세션 유무에 따라 로그인 오버레이 표시 or 보드 진입으로 분기, `showLoginOverlay()` / `startBoard()` / `renderUserInfo()` 함수 추가

---

### [4] `변경사항 git에 올려줘`

- `git add` → `git commit` → `git pull --no-rebase` → `git push` 수행
- 커밋 메시지: `feat(day03/kanban): 로그인 오버레이 추가 (Google OAuth + 게스트 모드)`

---

### [5] `버튼은 생겼는데 디자인이 구리네..;; 처음진입할때 로그인 선택창 뜨고 로그인하면 칸반보드가 뜨게 해줘. 그리고 로그인창 눌러도 반응이 없는데 그것도 확인해주고, 다 변경되면 git에 커밋하고 배포용 레포지토리 소스랑도 동기화 부탁해~`

- **버그 원인:** 버튼 클릭 시 실패해도 UI 피드백 없이 `console.error`만 출력
- **구현 내용:**
  - `index.html`: 로그인 카드 마크업 재구성 (미니 칸반 컬럼 로고, 에러 메시지 영역 추가)
  - `style.css`: 로그인 화면 전면 재디자인 — 슬라이드업 애니메이션, 글로우 효과, Google/게스트 버튼 계층 구분, 스피너 CSS
  - `app.js`: `setSpinning()` (클릭 시 버튼 비활성화 + 스피너), `showError()` (에러 메시지 UI 표시), 게스트 로그인 성공 시 페이드아웃 애니메이션 후 보드 전환
- `git commit` → `git push` → `sync.sh` 실행 (GitHub Pages 배포)

---

### [6] `음 일단 게스트로시잦ㄱ하기누르면 게스트 접속 실패: Anonymous sign-ins are disabled 이렇게떠`

- 코드 문제 아님. Supabase 대시보드 설정 문제
- 안내: Supabase → kanban 프로젝트 → Authentication → Providers → "Allow anonymous sign-ins" ON → Save

---

### [7] `내가 supabase 무료버전 쓰고있어서 이미 todo-planner에서 쓰고있어서 kanban프로젝트는 status 상태가 checking이야. todo-planner 프로젝트 status는 끄고, kanban프로젝트를 살리는 방법이 있을까?`

- Supabase 무료 플랜 제약 설명 (비활성 프로젝트 자동 일시정지)
- 안내:
  1. todo-planner 프로젝트 → Settings → General → Pause project
  2. kanban 프로젝트 → Restore project
  3. kanban 복구 후 Anonymous sign-ins 활성화

---

### [8] `google로 계속하기 누르면 액세스 차단됨: 이 앱의 요청이 잘못되었습니다 이렇게떠`

- Google OAuth 앱 미설정 상태
- 안내:
  1. Google Cloud Console → OAuth 2.0 클라이언트 ID 생성
  2. 승인된 리디렉션 URI에 `https://lbepkfydkfwvnvapzcrj.supabase.co/auth/v1/callback` 추가
  3. Supabase → Authentication → Providers → Google → Client ID/Secret 입력
  4. Supabase → Authentication → URL Configuration → Redirect URLs에 GitHub Pages URL 추가

---

### [9] `다 설정헀는데?`

- 추가 체크리스트 안내:
  1. OAuth 동의 화면이 "테스트 중" 상태면 테스트 사용자에 Gmail 추가 또는 앱 게시
  2. 리디렉션 URI 정확히 일치 여부 재확인

---

### [10] `oauth 동의화면에서 상태값을 어떻게 봐`

- 안내: Google Cloud Console → API 및 서비스 → OAuth 동의 화면 → 상단 "게시 상태" 확인
- "테스트 중"이면 테스트 사용자 추가 방법 안내

---

### [11] `오오 구글 로그인은 이제 된다. 게스트로 시작하기는 왜 안되지? 게스트 접속 실패: Anonymous sign-ins are disabled`

- 안내: Supabase → kanban 프로젝트 → Authentication → Providers → "Allow anonymous sign-ins" ON → Save

---

### [12] `잘 됐어 ㅎㅎ 지금까지 내가 전달한 프롬프트와 그에 상응해서 네가 한 작업을 정리해서 WORKFLOW.md로 저장해줘. 프롬프트는 그대로 써야하고 작업은 요약해서 작성해주면 돼. 이 내용을 CLAUDE.md에 반영해서 앞으로는 작업시 항상 WORKFLOW.md를 갱신하게 해줘.`

- `WORKFLOW.md` 생성 (이 파일)
- `CLAUDE.md`에 WORKFLOW.md 갱신 규칙 추가
