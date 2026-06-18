# Design System — Kanban Board

## 1. 개요

이 디자인 시스템은 Kanban Board 프로젝트의 시각적 언어를 정의한다.  
다크 테마 기반, 우선순위 색상 체계, 컴포넌트 토큰으로 구성된다.  
향후 React 전환 시 CSS Custom Properties(변수) 또는 Tailwind Config로 이전을 고려한다.

---

## 2. 색상 팔레트

### 2.1 Background Scale (배경 레이어)

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--bg-base` | `#1a1a2e` | 페이지 최하단 배경 (body) |
| `--bg-surface` | `#16213e` | 헤더, 컬럼, 모달 배경 |
| `--bg-card` | `#0f3460` | 카드 배경, 입력 필드 배경 |
| `--bg-hover` | `#1d2a4a` | drag-over 컬럼 배경 |
| `--bg-input-focus` | `#1a3a6e` | 입력 필드 포커스 테두리 |

### 2.2 Brand Color (액션 강조)

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--brand-primary` | `#e94560` | CTA 버튼, 타이틀, 드래그 테두리, 오류 상태 |
| `--brand-primary-hover` | `#c73652` | CTA 버튼 hover |
| `--brand-primary-subtle` | `rgba(233,69,96,0.07)` | 드롭 플레이스홀더 배경 |
| `--brand-primary-subtle-hover` | `rgba(233,69,96,0.1)` | 삭제 버튼 hover 배경 |

### 2.3 Priority Colors (우선순위)

| 우선순위 | 토큰 | 색상값 | 배지 배경 | 용도 |
|---------|------|--------|---------|------|
| High | `--priority-high` | `#e94560` | `#4a1020` | 좌측 보더 / 배지 |
| Medium | `--priority-medium` | `#f0a500` | `#4a3500` | 좌측 보더 / 배지 |
| Low | `--priority-low` | `#66bb6a` | `#1b4d2e` | 좌측 보더 / 배지 |

### 2.4 Column Header Colors (상태 식별)

| 상태 | 토큰 | 색상값 |
|------|------|--------|
| TO-DO | `--status-todo` | `#f0a500` |
| IN-PROGRESS | `--status-in-progress` | `#4fc3f7` |
| DONE | `--status-done` | `#66bb6a` |

### 2.5 Text Scale (텍스트)

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--text-primary` | `#e0e0e0` | 본문, 카드 제목, 입력 텍스트 |
| `--text-secondary` | `#9e9e9e` | 카드 설명, 폼 레이블, 취소 버튼 |
| `--text-muted` | `#555` | 삭제 버튼 기본 |

### 2.6 Border Scale (테두리)

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--border-base` | `#0f3460` | 헤더 하단, 컬럼 헤더 하단, 배지 카운트 배경 |
| `--border-surface` | `#1a3a6e` | 입력 필드 기본 테두리 |

---

## 3. 타이포그래피

**Font Family:** `'Segoe UI', Tahoma, Geneva, Verdana, sans-serif` (시스템 폰트 스택)

| 토큰 | 크기 | 두께 | 용도 |
|------|------|------|------|
| `--text-title` | `1.8rem` | 700 | 헤더 앱 타이틀 |
| `--text-modal-heading` | `1.1rem` | — | 모달 제목 |
| `--text-column-header` | `0.95rem` | 700 | 컬럼 헤더 이름 |
| `--text-card-title` | `0.95rem` | 600 | 카드 제목 |
| `--text-card-desc` | `0.82rem` | — | 카드 설명 |
| `--text-badge` | `0.72rem` | 700 | 우선순위 배지 |
| `--text-count` | `0.8rem` | 600 | 카드 수 배지 |
| `--text-body` | `0.9rem` | — | 폼 입력, 버튼 |
| `--text-label` | `0.85rem` | — | 폼 레이블 |
| `--text-btn` | `0.95rem` | 600 | CTA 버튼 |

**Letter Spacing:**
- 앱 타이틀: `2px`
- 컬럼 헤더: `1.5px` + `text-transform: uppercase`
- 우선순위 배지: `0.5px` + `text-transform: uppercase`

---

## 4. 간격 시스템 (Spacing)

8px 기반 간격 시스템을 사용한다.

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--space-1` | `4px` | 최소 간격 (배지 패딩, 버튼 소형 패딩) |
| `--space-2` | `8px` | 입력 패딩 수직 |
| `--space-3` | `12px` | 카드 패딩, 모달 아이템 gap, 카드 푸터 상단 마진 |
| `--space-4` | `16px` | 컬럼 패딩, 카드 리스트 gap, 컬럼 헤더 하단 패딩 |
| `--space-5` | `20px` | 헤더 수직 패딩 |
| `--space-6` | `24px` | 보드 컬럼 gap |
| `--space-7` | `28px` | 모달 패딩 |
| `--space-8` | `32px` | 헤더 수평 패딩, 보드 패딩 |

---

## 5. 보더 반경 (Border Radius)

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--radius-sm` | `4px` | 삭제 버튼 |
| `--radius-md` | `8px` | 버튼, 입력 필드 |
| `--radius-lg` | `10px` | 카드, 드롭 플레이스홀더 |
| `--radius-xl` | `12px` | 컬럼 |
| `--radius-2xl` | `14px` | 모달 |
| `--radius-pill` | `20px` | 배지 (카드 수, 우선순위) |

---

## 6. 그림자 (Shadow)

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--shadow-header` | `0 2px 12px rgba(0,0,0,0.4)` | 헤더 하단 |
| `--shadow-card` | `0 2px 8px rgba(0,0,0,0.3)` | 카드 |
| `--shadow-modal` | `0 8px 32px rgba(0,0,0,0.5)` | 모달 |

---

## 7. 전환 / 애니메이션 (Transition)

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--transition-fast` | `0.15s ease` | 카드 드래그, 플레이스홀더 |
| `--transition-base` | `0.2s ease` | 버튼 hover, 컬럼 drag-over, 입력 포커스, 삭제 버튼 |

---

## 8. 컴포넌트 토큰 요약

### Button — Primary (CTA)

```css
background:    var(--brand-primary);        /* #e94560 */
color:         #fff;
padding:       10px 22px;
border-radius: var(--radius-md);            /* 8px */
font-size:     var(--text-btn);             /* 0.95rem */
font-weight:   600;
transition:    background var(--transition-base);
/* hover */
background:    var(--brand-primary-hover);  /* #c73652 */
transform:     translateY(-1px);
```

### Button — Secondary (취소)

```css
background:    var(--bg-card);              /* #0f3460 */
color:         var(--text-secondary);       /* #9e9e9e */
padding:       10px 22px;
border-radius: var(--radius-md);
/* hover */
background:    var(--bg-input-focus);       /* #1a3a6e */
```

### Input / Textarea / Select

```css
background:    var(--bg-card);              /* #0f3460 */
border:        1px solid var(--border-surface); /* #1a3a6e */
border-radius: var(--radius-md);            /* 8px */
color:         var(--text-primary);         /* #e0e0e0 */
padding:       10px 12px;
font-size:     0.9rem;
/* focus */
border-color:  var(--brand-primary);        /* #e94560 */
```

---

## 9. 다크 테마 철학

1. **배경 깊이(Depth):** 3단계 배경색으로 계층 표현 (`#1a1a2e` → `#16213e` → `#0f3460`)
2. **색상 절약:** 브랜드 컬러(`#e94560`)는 액션 요소와 오류 상태에만 사용
3. **우선순위 색상:** 상태 컬럼 색상과 우선순위 색상을 분리해 시각적 충돌 방지
4. **텍스트 대비:** 주요 텍스트 `#e0e0e0` (명도비 약 8:1 on `#0f3460`)

---

## 10. 향후 확장 고려 (CSS Custom Properties)

```css
:root {
  /* Background */
  --bg-base:     #1a1a2e;
  --bg-surface:  #16213e;
  --bg-card:     #0f3460;

  /* Brand */
  --brand-primary:       #e94560;
  --brand-primary-hover: #c73652;

  /* Priority */
  --priority-high:   #e94560;
  --priority-medium: #f0a500;
  --priority-low:    #66bb6a;

  /* Text */
  --text-primary:   #e0e0e0;
  --text-secondary: #9e9e9e;

  /* Radius */
  --radius-md: 8px;
  --radius-lg: 10px;
  --radius-xl: 12px;
}
```

CSS Custom Properties 방식으로 전환하면 라이트 모드 토글 추가도 용이하다.
