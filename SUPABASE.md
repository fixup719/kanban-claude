# Supabase 설정 가이드 — Kanban Board

## 1. 프로젝트 생성

1. [https://supabase.com](https://supabase.com) 접속 후 로그인
2. **New Project** 클릭
3. 프로젝트 이름: `kanban-board`
4. 데이터베이스 비밀번호 설정 (복잡한 비밀번호 사용, 안전하게 보관)
5. Region: `Northeast Asia (Seoul)` 선택
6. **Create new project** 클릭 (프로비저닝 약 1~2분 소요)

---

## 2. 환경 변수

프로젝트 생성 후 **Settings → API** 메뉴에서 아래 값을 확인한다.

```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=eyJ...  (anon / public)
```

`app.js` 상단에 직접 삽입하거나, 별도 `config.js`로 분리한다.

```js
// config.js (gitignore에 추가하지 말 것 — anon key는 공개해도 안전)
const SUPABASE_URL = 'https://<project-ref>.supabase.co';
const SUPABASE_ANON_KEY = 'eyJ...';
```

> **주의:** `service_role` 키는 절대 클라이언트에 노출하지 않는다.  
> `anon` 키는 RLS 정책이 적용되므로 공개해도 안전하다.

---

## 3. 테이블 구조

### 설계 원칙

- Supabase는 PostgreSQL을 사용하므로 MySQL 방언(`AUTO_INCREMENT`, `ENUM`) 대신 PostgreSQL 문법 사용
- `auth.users`는 Supabase Auth가 자동 관리 — 별도 `users` 테이블 불필요
- Row Level Security(RLS)로 데이터 접근 제어
- `position` 컬럼은 float gap 방식으로 순서 관리

---

### 3.1 ERD

```
auth.users (Supabase 관리)
    │
    │ 1:N
    ▼
┌──────────────────────┐
│        boards        │
├──────────────────────┤
│ PK id (uuid)         │
│ FK owner_id          │ → auth.users.id
│    title             │
│    created_at        │
│    updated_at        │
│    deleted_at        │
└──────────┬───────────┘
           │ 1:N
           ▼
┌──────────────────────┐
│        cards         │
├──────────────────────┤
│ PK id (uuid)         │
│ FK board_id          │ → boards.id
│ FK created_by        │ → auth.users.id
│    title             │
│    description       │
│    priority          │ 'low' | 'medium' | 'high'
│    status            │ 'todo' | 'in-progress' | 'done'
│    position          │ float8 (순서 관리)
│    created_at        │
│    updated_at        │
│    deleted_at        │
└──────────────────────┘
```

> v1 단계에서는 `boards` 테이블을 건너뛰고 `cards`만 사용해도 동작한다.  
> v2(다중 보드)로 확장할 때 `boards` 테이블을 추가한다.

---

### 3.2 SQL — Supabase SQL Editor에서 실행

**Supabase 대시보드 → SQL Editor → New query**에 아래 SQL을 붙여넣고 실행한다.

#### Step 1: ENUM 타입 생성

```sql
CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high');
CREATE TYPE card_status    AS ENUM ('todo', 'in-progress', 'done');
```

#### Step 2: boards 테이블

```sql
CREATE TABLE boards (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT        NOT NULL CHECK (char_length(title) <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER boards_updated_at
  BEFORE UPDATE ON boards
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

#### Step 3: cards 테이블

```sql
CREATE TABLE cards (
  id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id    UUID           NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  created_by  UUID           NOT NULL REFERENCES auth.users(id),
  title       TEXT           NOT NULL CHECK (char_length(title) BETWEEN 1 AND 50),
  description TEXT           CHECK (char_length(description) <= 200),
  priority    priority_level NOT NULL DEFAULT 'medium',
  status      card_status    NOT NULL DEFAULT 'todo',
  position    FLOAT8         NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ    NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE TRIGGER cards_updated_at
  BEFORE UPDATE ON cards
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 자주 사용하는 조회 패턴에 대한 인덱스
CREATE INDEX idx_cards_board_status   ON cards (board_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_cards_board_position ON cards (board_id, position) WHERE deleted_at IS NULL;
```

---

### 3.3 카드 순서(position) 관리 — Float Gap 방식

```
초기 삽입: 1000, 2000, 3000 ... (간격 1000)
중간 삽입: 두 카드 position의 평균 → (1000 + 2000) / 2 = 1500
간격 < 0.01 시 해당 board 전체 rebalance 수행
```

```js
// 새 카드를 맨 끝에 추가할 때
const lastPosition = cards.at(-1)?.position ?? 0;
const newPosition = lastPosition + 1000;

// 두 카드 사이에 삽입할 때
const newPosition = (beforeCard.position + afterCard.position) / 2;
```

---

## 4. Row Level Security (RLS)

RLS를 활성화해야 anon 키로 직접 접근해도 안전하다.

```sql
-- RLS 활성화
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards  ENABLE ROW LEVEL SECURITY;

-- boards 정책: 본인 보드만 CRUD
CREATE POLICY "boards_owner_all" ON boards
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- cards 정책: 본인 보드의 카드만 CRUD
CREATE POLICY "cards_board_owner" ON cards
  USING (
    board_id IN (SELECT id FROM boards WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    board_id IN (SELECT id FROM boards WHERE owner_id = auth.uid())
  );
```

> **v1 임시 정책 (인증 없이 전체 공개):**  
> 개발 초기 인증 없이 빠르게 테스트하려면 아래 정책을 사용한다.  
> 운영 배포 전에 반드시 위 정책으로 교체한다.
>
> ```sql
> CREATE POLICY "allow_all_temp" ON cards FOR ALL USING (true) WITH CHECK (true);
> CREATE POLICY "allow_all_temp" ON boards FOR ALL USING (true) WITH CHECK (true);
> ```

---

## 5. Supabase Auth 설정

**Authentication → Providers** 메뉴에서 활성화:

| Provider | 설정 |
|----------|------|
| Email | 활성화 (기본값) |
| Google | Client ID / Secret 입력 (선택) |
| GitHub | Client ID / Secret 입력 (선택) |

**Authentication → URL Configuration:**
- Site URL: `http://localhost:8787` (개발), `https://your-domain.com` (운영)
- Redirect URLs에 위 URL 추가

---

## 6. Supabase JS 클라이언트 연동

### 6.1 CDN 방식 (빌드 도구 없음)

```html
<!-- index.html <head> 에 추가 -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
<script src="config.js"></script>
```

```js
// app.js 상단
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

### 6.2 주요 API 패턴

```js
// 카드 목록 조회 (삭제되지 않은 것만, 순서대로)
const { data, error } = await supabase
  .from('cards')
  .select('*')
  .eq('board_id', boardId)
  .is('deleted_at', null)
  .order('position');

// 카드 추가
const { data, error } = await supabase
  .from('cards')
  .insert({ board_id, title, description, priority, status: 'todo', position, created_by: supabase.auth.getUser().data.user.id })
  .select()
  .single();

// 카드 상태 변경 (드래그 드롭)
const { error } = await supabase
  .from('cards')
  .update({ status: newStatus, position: newPosition })
  .eq('id', cardId);

// 카드 Soft Delete
const { error } = await supabase
  .from('cards')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', cardId);
```

### 6.3 실시간 구독 (Realtime)

**Supabase 대시보드 → Database → Replication**에서 `cards` 테이블의 INSERT/UPDATE/DELETE를 활성화한다.

```js
// 실시간 카드 변경 구독
const channel = supabase
  .channel('cards-changes')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'cards', filter: `board_id=eq.${boardId}` },
    (payload) => {
      // payload.eventType: 'INSERT' | 'UPDATE' | 'DELETE'
      // payload.new: 변경된 데이터
      syncCard(payload);
    }
  )
  .subscribe();

// 컴포넌트 해제 시 구독 취소
supabase.removeChannel(channel);
```

---

## 7. 초기 데이터 시드

SQL Editor에서 실행 (board_id와 created_by는 실제 값으로 교체):

```sql
-- 기본 보드 생성 (인증 후 실행)
INSERT INTO boards (owner_id, title)
VALUES (auth.uid(), '내 칸반 보드');

-- 샘플 카드 삽입
INSERT INTO cards (board_id, created_by, title, description, priority, status, position)
VALUES
  ('<board-uuid>', auth.uid(), '요구사항 분석', '프로젝트 요구사항을 수집하고 정리한다.', 'high',   'todo',        1000),
  ('<board-uuid>', auth.uid(), 'UI 디자인',    '와이어프레임 및 목업 작성',               'medium', 'todo',        2000),
  ('<board-uuid>', auth.uid(), 'API 설계',     'REST API 엔드포인트 정의',                'medium', 'in-progress', 1000),
  ('<board-uuid>', auth.uid(), '데이터베이스 스키마', 'ERD 설계 및 테이블 생성',           'low',    'done',        1000);
```

---

## 8. 마이그레이션 단계 (현재 → Supabase)

| 단계 | 작업 | 파일 |
|------|------|------|
| Step 1 | Supabase 프로젝트 생성 + SQL 실행 | — |
| Step 2 | `config.js` 생성 + CDN 스크립트 추가 | `index.html`, `config.js` |
| Step 3 | `app.js`의 `cards[]` 배열 → Supabase fetch로 교체 | `app.js` |
| Step 4 | 카드 추가/삭제/이동 함수를 Supabase API 호출로 교체 | `app.js` |
| Step 5 | Realtime 구독 추가 (다중 탭/사용자 동기화) | `app.js` |
| Step 6 | Supabase Auth 로그인 UI 추가 | `index.html`, `app.js` |

---

## 9. 로컬 개발 (Supabase CLI)

Supabase 클라우드 대신 로컬에서 개발하려면:

```bash
# Supabase CLI 설치
npm install -g supabase

# 프로젝트 초기화
supabase init

# 로컬 Supabase 스택 시작 (Docker 필요)
supabase start

# 로컬 접속 정보 확인
supabase status
# → API URL: http://localhost:54321
# → anon key: eyJ...
```

로컬 URL과 키를 `config.js`에 적용해 오프라인 개발 가능.

---

## 10. OAuth 소셜 로그인 설정

현재 앱은 익명 로그인을 사용한다. OAuth를 추가하면 Google·GitHub 계정으로 로그인할 수 있고,  
기기가 달라도 같은 보드에 접근할 수 있다.

---

### 10.1 Google OAuth

#### Google Cloud Console 설정

1. [https://console.cloud.google.com](https://console.cloud.google.com) 접속
2. 프로젝트 생성 (또는 기존 프로젝트 선택)
3. **APIs & Services → OAuth consent screen**
   - User Type: **External** 선택 → Create
   - App name: `Kanban Board`
   - User support email: 본인 이메일 입력
   - Developer contact: 본인 이메일 입력 → Save and Continue
   - Scopes: 기본값 유지 → Save and Continue
   - Test users: 본인 이메일 추가 → Save and Continue
4. **APIs & Services → Credentials → + CREATE CREDENTIALS → OAuth client ID**
   - Application type: **Web application**
   - Name: `Kanban Board`
   - Authorized redirect URIs에 아래 URL 추가:
     ```
     https://lbepkfydkfwvnvapzcrj.supabase.co/auth/v1/callback
     ```
   - **Create** 클릭
5. 생성된 **Client ID**와 **Client Secret** 복사

#### Supabase에 Google 등록

1. Supabase 대시보드 → **Authentication → Providers → Google**
2. **Enable** 토글 ON
3. Client ID / Client Secret 붙여넣기
4. **Save**

---

### 10.2 GitHub OAuth

#### GitHub OAuth App 생성

1. GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**
2. 아래와 같이 입력:

   | 항목 | 값 |
   |------|----|
   | Application name | `Kanban Board` |
   | Homepage URL | `https://fixup719.github.io/kanban-claude` |
   | Authorization callback URL | `https://lbepkfydkfwvnvapzcrj.supabase.co/auth/v1/callback` |

3. **Register application** 클릭
4. **Generate a new client secret** 클릭
5. **Client ID**와 **Client Secret** 복사

#### Supabase에 GitHub 등록

1. Supabase 대시보드 → **Authentication → Providers → GitHub**
2. **Enable** 토글 ON
3. Client ID / Client Secret 붙여넣기
4. **Save**

---

### 10.3 Supabase URL Configuration

**Authentication → URL Configuration** 메뉴에서:

| 항목 | 값 |
|------|----|
| Site URL | `https://fixup719.github.io/kanban-claude` |
| Redirect URLs | `https://fixup719.github.io/kanban-claude` |
| Redirect URLs | `http://localhost:8787` (로컬 개발용, 추가) |

---

### 10.4 RLS 정책 교체

OAuth 로그인을 적용하면 임시 `allow_all_temp` 정책을 삭제하고 본인 소유 데이터만 접근하도록 교체한다.

```sql
-- 임시 정책 삭제
DROP POLICY IF EXISTS "allow_all_temp" ON boards;
DROP POLICY IF EXISTS "allow_all_temp" ON cards;

-- boards: 본인 보드만 CRUD
CREATE POLICY "boards_owner_all" ON boards
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- cards: 본인 보드의 카드만 CRUD
CREATE POLICY "cards_board_owner" ON cards
  FOR ALL
  USING (board_id IN (SELECT id FROM boards WHERE owner_id = auth.uid()))
  WITH CHECK (board_id IN (SELECT id FROM boards WHERE owner_id = auth.uid()));
```

---

### 10.5 index.html — 로그인 UI 추가

`<header>` 안에 로그인 버튼과 사용자 정보 영역을 추가한다.

```html
<header>
  <h1>Kanban Board</h1>
  <div class="header-actions">
    <button id="add-card-btn">+ 카드 추가</button>
    <!-- 로그인 영역 -->
    <div id="auth-area">
      <span id="user-email" style="display:none"></span>
      <button id="btn-login-google" style="display:none">Google로 로그인</button>
      <button id="btn-login-github" style="display:none">GitHub로 로그인</button>
      <button id="btn-logout" style="display:none">로그아웃</button>
    </div>
  </div>
</header>
```

---

### 10.6 app.js — OAuth 코드 패턴

기존 `ensureSession()` (익명 로그인)을 아래 패턴으로 교체한다.

```js
/* ── Auth 초기화 ── */
async function initAuth() {
  // 페이지 로드 시 세션 복원 (OAuth 리다이렉트 후 자동 처리됨)
  const { data: { session } } = await db.auth.getSession();
  updateAuthUI(session?.user ?? null);

  // 세션 변경(로그인/로그아웃) 감지
  db.auth.onAuthStateChange((_event, session) => {
    updateAuthUI(session?.user ?? null);
    if (session) {
      ensureBoard().then(id => { boardId = id; loadCards().then(render); });
    } else {
      cards = [];
      boardId = null;
      render();
    }
  });
}

function updateAuthUI(user) {
  const emailEl   = document.getElementById('user-email');
  const btnGoogle = document.getElementById('btn-login-google');
  const btnGitHub = document.getElementById('btn-login-github');
  const btnLogout = document.getElementById('btn-logout');
  const addBtn    = document.getElementById('add-card-btn');

  if (user) {
    emailEl.textContent = user.email ?? '로그인됨';
    emailEl.style.display   = 'inline';
    btnGoogle.style.display = 'none';
    btnGitHub.style.display = 'none';
    btnLogout.style.display = 'inline';
    addBtn.style.display    = 'inline';
  } else {
    emailEl.style.display   = 'none';
    btnGoogle.style.display = 'inline';
    btnGitHub.style.display = 'inline';
    btnLogout.style.display = 'none';
    addBtn.style.display    = 'none';
  }
}

function bindAuthButtons() {
  const redirectTo = window.location.origin + window.location.pathname;

  document.getElementById('btn-login-google').addEventListener('click', () => {
    db.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
  });

  document.getElementById('btn-login-github').addEventListener('click', () => {
    db.auth.signInWithOAuth({ provider: 'github', options: { redirectTo } });
  });

  document.getElementById('btn-logout').addEventListener('click', async () => {
    await db.auth.signOut();
  });
}

/* ── init 수정 ── */
async function init() {
  bindAuthButtons();
  await initAuth();  // ensureSession() 대신 사용
}
```

> `redirectTo`를 `window.location.origin + pathname`으로 지정하면  
> 로컬(`http://localhost:8787`)과 GitHub Pages(`https://fixup719.github.io/kanban-claude/`) 모두 동작한다.

---

### 10.7 로컬 테스트 시 주의

Google/GitHub OAuth는 `localhost`에서도 동작하지만,  
Supabase URL Configuration의 **Redirect URLs**에 `http://localhost:8787`이 등록되어 있어야 한다.  
(10.3 참고)

---

## 11. 보안 체크리스트

- [ ] `service_role` 키가 클라이언트 코드에 없음
- [ ] 모든 테이블에 RLS 활성화
- [ ] `deleted_at IS NULL` 필터를 RLS 또는 뷰로 강제
- [ ] Auth 활성화 후 임시 `allow_all_temp` 정책 삭제
- [ ] Supabase 대시보드 → Auth → Rate Limits 확인
