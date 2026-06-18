# Database Design — Kanban Board

## 1. 현재 상태 (v1.0 — 인메모리)

현재는 백엔드 DBMS 없이 JavaScript 배열(`cards[]`)로 데이터를 관리한다.  
페이지 새로고침 시 초기 샘플 데이터로 리셋된다.

### 현재 데이터 구조

```js
// app.js — cards 배열
{
  id:       Number,   // 클라이언트 자동 증가 (nextId++)
  title:    String,   // 카드 제목
  desc:     String,   // 카드 설명 (빈 문자열 허용)
  priority: String,   // 'low' | 'medium' | 'high'
  status:   String,   // 'todo' | 'in-progress' | 'done'
}
```

---

## 2. 향후 RDB 설계 (v2.0 — MySQL 8.x / PostgreSQL 16)

### 2.1 설계 원칙

- 정규화 1~3NF 준수
- `created_at` / `updated_at` 타임스탬프 모든 테이블에 포함
- Soft Delete(`deleted_at`) 적용으로 데이터 복구 가능성 확보
- `position` 컬럼으로 같은 컬럼 내 카드 순서 관리
- 향후 다중 사용자 / 다중 보드 확장을 고려한 구조

---

### 2.2 ERD (Entity Relationship Diagram)

```
┌──────────────────┐         ┌──────────────────────┐
│      users       │         │       boards         │
├──────────────────┤         ├──────────────────────┤
│ PK id            │◄──┐     │ PK id                │
│    email         │   │     │ FK owner_id → users  │
│    password_hash │   │     │    title             │
│    created_at    │   │     │    created_at        │
│    updated_at    │   │     │    updated_at        │
└──────────────────┘   │     │    deleted_at        │
                        │     └──────────┬───────────┘
                        │                │ 1
                        │                │
                        │                ▼ N
                        │     ┌──────────────────────┐
                        │     │       columns        │
                        │     ├──────────────────────┤
                        │     │ PK id                │
                        │     │ FK board_id → boards │
                        │     │    name              │
                        │     │    status_key        │
                        │     │    position          │
                        │     │    created_at        │
                        │     │    updated_at        │
                        │     └──────────┬───────────┘
                        │                │ 1
                        │                │
                        │                ▼ N
                        │     ┌──────────────────────┐
                        └─────┤        cards         │
                              ├──────────────────────┤
                              │ PK id                │
                              │ FK column_id         │
                              │ FK created_by→ users │
                              │    title             │
                              │    description       │
                              │    priority          │
                              │    position          │
                              │    created_at        │
                              │    updated_at        │
                              │    deleted_at        │
                              └──────────────────────┘
```

---

### 2.3 테이블 정의

#### 2.3.1 `users`

```sql
CREATE TABLE users (
  id            BIGINT        UNSIGNED NOT NULL AUTO_INCREMENT,
  email         VARCHAR(255)  NOT NULL,
  password_hash VARCHAR(255)  NOT NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

> PostgreSQL 버전: `BIGSERIAL`, `TIMESTAMPTZ`, `gen_random_uuid()` 등 방언 차이 적용

---

#### 2.3.2 `boards`

```sql
CREATE TABLE boards (
  id         BIGINT       UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_id   BIGINT       UNSIGNED NOT NULL,
  title      VARCHAR(100) NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME     NULL,

  PRIMARY KEY (id),
  KEY idx_boards_owner (owner_id),
  CONSTRAINT fk_boards_owner FOREIGN KEY (owner_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

#### 2.3.3 `columns`

```sql
CREATE TABLE columns (
  id         BIGINT       UNSIGNED NOT NULL AUTO_INCREMENT,
  board_id   BIGINT       UNSIGNED NOT NULL,
  name       VARCHAR(50)  NOT NULL,
  status_key VARCHAR(30)  NOT NULL,         -- 'todo' | 'in-progress' | 'done'
  position   SMALLINT     UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_columns_board (board_id),
  CONSTRAINT fk_columns_board FOREIGN KEY (board_id) REFERENCES boards (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

#### 2.3.4 `cards`

```sql
CREATE TABLE cards (
  id          BIGINT        UNSIGNED NOT NULL AUTO_INCREMENT,
  column_id   BIGINT        UNSIGNED NOT NULL,
  created_by  BIGINT        UNSIGNED NOT NULL,
  title       VARCHAR(50)   NOT NULL,
  description VARCHAR(200)  NULL,
  priority    ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
  position    INT           UNSIGNED NOT NULL DEFAULT 0,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at  DATETIME      NULL,

  PRIMARY KEY (id),
  KEY idx_cards_column   (column_id),
  KEY idx_cards_creator  (created_by),
  KEY idx_cards_priority (priority),
  KEY idx_cards_deleted  (deleted_at),
  CONSTRAINT fk_cards_column  FOREIGN KEY (column_id)  REFERENCES columns (id),
  CONSTRAINT fk_cards_creator FOREIGN KEY (created_by) REFERENCES users   (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

### 2.4 카드 순서(position) 관리 전략

카드 순서 변경 시 전체 position을 업데이트하는 것은 비효율적이다.  
**Lexorank(분수 순위)** 또는 **float gap** 방식을 권장한다.

#### Float Gap 방식 (단순)
- 초기 삽입: 1000, 2000, 3000 … (간격 1000)
- 중간 삽입: 두 카드 position의 평균값
- 간격이 너무 좁아지면 (< 1) 전체 rebalance 수행

#### Lexorank 방식 (권장 — Jira 방식)
- `position` 컬럼을 `VARCHAR(255)` 문자열로 관리
- 항상 두 문자열의 중간 문자열 생성 → 재정렬 불필요
- 라이브러리: `lexorank` (npm) 또는 직접 구현

---

### 2.5 인덱스 전략

| 인덱스 | 목적 |
|--------|------|
| `idx_cards_column` | 컬럼별 카드 목록 조회 (`WHERE column_id = ?`) |
| `idx_cards_deleted` | Soft Delete 필터 (`WHERE deleted_at IS NULL`) |
| `idx_cards_priority` | 우선순위 필터 쿼리 지원 |
| `uq_users_email` | 이메일 중복 방지 + 로그인 조회 최적화 |

---

### 2.6 마이그레이션 계획 (v1.0 → v2.0)

| 단계 | 내용 |
|------|------|
| Step 1 | DB 스키마 생성 + 기본 컬럼 데이터 시드 (todo / in-progress / done) |
| Step 2 | 백엔드 REST API 구현 (Express + mysql2 또는 pg) |
| Step 3 | 프론트엔드 `cards[]` 배열 → API fetch 교체 |
| Step 4 | `localStorage` 캐시 레이어 추가 (오프라인 지원) |
| Step 5 | 인증(JWT) 추가 + 다중 보드 UI 구현 |

---

### 2.7 DB 방언 차이 (MySQL vs PostgreSQL)

| 항목 | MySQL 8.x | PostgreSQL 16 |
|------|-----------|---------------|
| 자동증가 | `AUTO_INCREMENT` | `BIGSERIAL` 또는 `GENERATED ALWAYS AS IDENTITY` |
| 타임스탬프 | `DATETIME` | `TIMESTAMPTZ` |
| Enum | `ENUM(...)` | `CREATE TYPE priority_enum AS ENUM(...)` |
| JSON 저장 | `JSON` 타입 | `JSONB` (인덱스 지원) |
| 전체 텍스트 검색 | `FULLTEXT INDEX` | `tsvector` + `GIN 인덱스` |
| On Update | `ON UPDATE CURRENT_TIMESTAMP` | 트리거로 구현 필요 |

