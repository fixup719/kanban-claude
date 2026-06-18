# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

순수 Vanilla JS(ES6+) / HTML5 / CSS3로 구현된 클라이언트 전용 칸반 보드.  
빌드 도구, 패키지 매니저, 외부 라이브러리 없음. 서버 없이 정적 파일로 동작한다.

## 개발 및 실행

빌드 단계 없음. 브라우저에서 `index.html`을 직접 열거나 로컬 HTTP 서버로 서빙한다.

```bash
# 로컬 서버 실행 (포트 8787)
python3 -m http.server 8787 --directory /home/ubuntu/work/kosa-vibecoding-2026-3rd/src/exercise/fixup719/day03/kanban
```

## 검증 방법

- 브라우저에서 직접 확인한다 (Chrome/Edge/Firefox 최신 버전).
- **Playwright는 사용하지 않는다.**
- 별도의 테스트 프레임워크 없음. 기능 변경 후 브라우저에서 직접 동작을 확인한다.

## 코드 아키텍처

진입점은 `index.html`이며 `app.js` 하나에 모든 로직이 담긴다.

```
index.html   → 마크업 (헤더, 3컬럼 보드, 카드 추가 모달)
style.css    → 전역 스타일 + 컴포넌트 스타일 + 반응형
app.js       → 상태 관리 + 렌더링 + 이벤트 바인딩 전체
docs/        → PRD / TRD / USER_FLOW / DATABASE_DESIGN / DESIGN_SYSTEM / TASKS
```

**상태 관리:** `cards[]` 배열을 직접 변이 후 `render()`를 호출해 DOM 전체를 재생성한다(Full Re-render).  
**드래그 앤 드롭:** 외부 라이브러리 없이 HTML5 Native DnD API 사용.  
**XSS 방지:** 모든 사용자 입력은 `escapeHtml()`을 통해 이스케이프 후 DOM에 삽입한다.

카드 데이터 모델:
```js
{ id: Number, title: String, desc: String, priority: 'low'|'medium'|'high', status: 'todo'|'in-progress'|'done' }
```

## Git 규칙

- 브랜치 통합 시 **항상 merge** 사용. **rebase 금지**.
- 이 프로젝트의 상위 폴더(`day03/`, `fixup719/`, `src/` 등)는 읽지 않는다.

## WORKFLOW.md 갱신 규칙

- **작업을 수행할 때마다 반드시 `WORKFLOW.md`를 갱신한다.**
- 형식:
  - **프롬프트:** 사용자가 전달한 원문 그대로
  - **작업:** 수행한 내용을 간결하게 요약
- 날짜별로 구분하고, 같은 날 작업은 순번([1], [2], ...)으로 추가한다.
- 코드 변경 → git 커밋 → 배포의 흐름이면 각 단계를 모두 기록한다.
