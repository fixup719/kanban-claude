#!/bin/bash
# 소스(day03/kanban)를 ~/work/kanban-claude에 동기화하고 GitHub Pages에 배포한다.

SRC="$(cd "$(dirname "$0")" && pwd)"
DEST="$HOME/work/kanban-claude"
DEPLOY_FILES="index.html style.css app.js config.js"

# 대상 디렉토리 확인
if [ ! -d "$DEST/.git" ]; then
  echo "오류: $DEST 가 git 저장소가 아닙니다."
  echo "GITHUB_PAGES.md의 Step 1~2를 먼저 실행하세요."
  exit 1
fi

# 파일 동기화
echo "▶ 파일 동기화: $SRC → $DEST"
for f in $DEPLOY_FILES; do
  cp "$SRC/$f" "$DEST/$f" && echo "  복사: $f"
done

# 변경 감지 후 커밋 & 푸시
cd "$DEST"
git add $DEPLOY_FILES

if git diff --cached --quiet; then
  echo "변경사항 없음. 배포를 건너뜁니다."
  exit 0
fi

TIMESTAMP=$(date '+%Y-%m-%d %H:%M')
git commit -m "sync: $TIMESTAMP"
git push origin main

echo ""
echo "✓ 배포 완료"
echo "  URL: https://fixup719.github.io/kanban-claude/"
echo "  (GitHub Pages 반영까지 약 1~2분 소요)"
