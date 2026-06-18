# GitHub Pages 배포 가이드 — Kanban Board

배포 완료 후 접속 URL: **https://fixup719.github.io/kanban-claude/**

---

## 사전 준비

- GitHub 계정: `fixup719`
- `gh` CLI 설치 및 로그인 완료 (`gh auth status`로 확인)
- `git` 설치 완료

---

## Step 1. GitHub 저장소 생성

```bash
gh repo create kanban-claude --public --description "Vanilla JS Kanban Board with Supabase"
```

---

## Step 2. 저장소 Clone

```bash
cd ~/work
git clone https://github.com/fixup719/kanban-claude.git
cd kanban-claude
```

---

## Step 3. 소스 파일 복사

```bash
cp /home/ubuntu/work/kosa-vibecoding-2026-3rd/src/exercise/fixup719/day03/kanban/index.html .
cp /home/ubuntu/work/kosa-vibecoding-2026-3rd/src/exercise/fixup719/day03/kanban/style.css .
cp /home/ubuntu/work/kosa-vibecoding-2026-3rd/src/exercise/fixup719/day03/kanban/app.js .
cp /home/ubuntu/work/kosa-vibecoding-2026-3rd/src/exercise/fixup719/day03/kanban/config.js .
```

복사 후 파일 목록 확인:

```bash
ls
# index.html  style.css  app.js  config.js
```

---

## Step 4. Supabase 설정 업데이트

GitHub Pages에서 Supabase 익명 로그인이 동작하려면 허용 URL을 추가해야 한다.

1. [Supabase 대시보드](https://supabase.com/dashboard/project/lbepkfydkfwvnvapzcrj) 접속
2. **Authentication → URL Configuration** 메뉴 이동
3. 아래 값 설정:

| 항목 | 값 |
|------|----|
| Site URL | `https://fixup719.github.io/kanban-claude` |
| Redirect URLs | `https://fixup719.github.io/kanban-claude` 추가 |

4. **Save** 클릭

---

## Step 5. 커밋 & 푸시

```bash
git add index.html style.css app.js config.js
git commit -m "feat: Kanban board initial deploy"
git push origin main
```

---

## Step 6. GitHub Pages 활성화

```bash
gh api repos/fixup719/kanban-claude/pages \
  --method POST \
  --field source='{"branch":"main","path":"/"}' \
  --silent && echo "GitHub Pages 활성화 완료"
```

> CLI가 안 될 경우 대신 웹에서:  
> GitHub 저장소 → **Settings → Pages → Source: Deploy from a branch → main / (root) → Save**

---

## Step 7. 배포 확인

```bash
gh api repos/fixup719/kanban-claude/pages --jq '.html_url'
```

약 1~2분 후 아래 URL에서 접속 확인:

```
https://fixup719.github.io/kanban-claude/
```

---

## Supabase 테이블이 없을 경우

아직 Supabase에 테이블을 생성하지 않았다면 [SUPABASE.md](./SUPABASE.md)의 Step 1~3 SQL을 먼저 실행해야 한다.

[Supabase SQL Editor](https://supabase.com/dashboard/project/lbepkfydkfwvnvapzcrj/sql) 에서 아래 순서로 실행:

```sql
-- 1. ENUM 타입
CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high');
CREATE TYPE card_status    AS ENUM ('todo', 'in-progress', 'done');

-- 2. updated_at 트리거 함수
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. boards 테이블
CREATE TABLE boards (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT        NOT NULL CHECK (char_length(title) <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE TRIGGER boards_updated_at
  BEFORE UPDATE ON boards
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 4. cards 테이블
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
CREATE INDEX idx_cards_board_status   ON cards (board_id, status)    WHERE deleted_at IS NULL;
CREATE INDEX idx_cards_board_position ON cards (board_id, position)  WHERE deleted_at IS NULL;

-- 5. RLS 활성화 + 임시 전체 허용 정책
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards  ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_temp" ON boards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_temp" ON cards  FOR ALL USING (true) WITH CHECK (true);
```

그리고 **Authentication → Providers → Anonymous → Enable** 활성화.

---

## 배포 후 구조

```
kanban-claude/          ← GitHub 저장소 루트 (GitHub Pages 서빙)
├── index.html
├── style.css
├── app.js
└── config.js
```

---

## 소스 동기화 및 업데이트 배포

`day03/kanban` 소스를 수정한 뒤 `~/work/kanban-claude`에 반영하고 GitHub Pages에 배포하는 방법.

---

### 방법 A — sync.sh 스크립트 (권장)

소스 디렉토리에 `sync.sh`가 포함되어 있다.  
**최초 1회** 실행 권한을 부여한다:

```bash
chmod +x /home/ubuntu/work/kosa-vibecoding-2026-3rd/src/exercise/fixup719/day03/kanban/sync.sh
```

이후 소스를 수정할 때마다 아래 명령 하나로 동기화 + 커밋 + 푸시가 완료된다:

```bash
/home/ubuntu/work/kosa-vibecoding-2026-3rd/src/exercise/fixup719/day03/kanban/sync.sh
```

스크립트 동작 순서:
1. `index.html` `style.css` `app.js` `config.js` 를 `~/work/kanban-claude/`로 복사
2. 변경사항이 없으면 커밋 없이 종료
3. 변경사항이 있으면 `sync: YYYY-MM-DD HH:MM` 메시지로 자동 커밋 & 푸시

---

### 방법 B — 수동 동기화

```bash
SRC="/home/ubuntu/work/kosa-vibecoding-2026-3rd/src/exercise/fixup719/day03/kanban"

cp "$SRC/index.html" ~/work/kanban-claude/
cp "$SRC/style.css"  ~/work/kanban-claude/
cp "$SRC/app.js"     ~/work/kanban-claude/
cp "$SRC/config.js"  ~/work/kanban-claude/

cd ~/work/kanban-claude
git add index.html style.css app.js config.js
git commit -m "sync: $(date '+%Y-%m-%d %H:%M')"
git push origin main
```

---

`main` 브랜치에 push하면 GitHub Pages가 자동으로 재빌드된다.  
배포 상태는 저장소 **Actions** 탭에서 확인한다.
