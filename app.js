const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const COLUMNS = ['todo', 'in-progress', 'done'];
let cards = [];
let boardId = null;
let draggedCard = null;
let placeholder = null;
let activityPanelOpen = false;
let toastTimer = null;

const shareToken = new URLSearchParams(location.search).get('share');

/* ── 초기화 ── */
async function init() {
  const { data: { session } } = await db.auth.getSession();
  if (session) {
    await startBoard();
  } else {
    showLoginOverlay();
  }
}

function showLoginOverlay() {
  const overlay = document.getElementById('login-overlay');
  const googleBtn = document.getElementById('google-login-btn');
  const guestBtn = document.getElementById('guest-login-btn');
  const errorEl = document.getElementById('login-error');

  overlay.classList.add('active');

  function setSpinning(btn, on) {
    btn.disabled = on;
    btn.classList.toggle('btn-spinning', on);
  }

  function showError(msg) {
    errorEl.textContent = msg;
  }

  googleBtn.addEventListener('click', async () => {
    setSpinning(googleBtn, true);
    showError('');
    const { error } = await db.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.href }
    });
    if (error) {
      showError('Google 로그인 실패: ' + error.message);
      setSpinning(googleBtn, false);
    }
  });

  guestBtn.addEventListener('click', async () => {
    setSpinning(guestBtn, true);
    showError('');
    const { error } = await db.auth.signInAnonymously();
    if (error) {
      showError('게스트 접속 실패: ' + error.message);
      setSpinning(guestBtn, false);
      return;
    }
    overlay.classList.add('fade-out');
    overlay.addEventListener('animationend', () => overlay.classList.remove('active'), { once: true });
    await startBoard();
  });
}

async function startBoard() {
  boardId = await ensureBoard();
  if (!boardId) return;
  await loadCards();
  render();
  bindModal();
  bindHeaderActions();
  subscribeRealtime();
  renderUserInfo();
  await loadActivityLogs();

  if (shareToken) {
    const joinKey = `joined_${boardId}`;
    if (!sessionStorage.getItem(joinKey)) {
      sessionStorage.setItem(joinKey, '1');
      logActivity('board_joined', null, null);
    }
  }
}

function renderUserInfo() {
  const userInfoEl = document.getElementById('user-info');
  db.auth.getUser().then(({ data: { user } }) => {
    if (!user) return;
    const isGuest = user.is_anonymous;
    const name = user.user_metadata?.full_name || user.email || '게스트';
    userInfoEl.innerHTML = `
      <span class="user-name">${escapeHtml(isGuest ? '게스트' : name)}</span>
      <button id="logout-btn" type="button">로그아웃</button>
    `;
    document.getElementById('logout-btn').addEventListener('click', async () => {
      await db.auth.signOut();
      localStorage.removeItem('kanban_board_id');
      window.location.reload();
    });
  });
}

function bindHeaderActions() {
  document.getElementById('share-btn').addEventListener('click', copyShareLink);
  document.getElementById('activity-btn').addEventListener('click', toggleActivityPanel);
  document.getElementById('activity-close-btn').addEventListener('click', toggleActivityPanel);
}

/* ── 보드 ── */
async function ensureBoard() {
  if (shareToken) {
    const { data } = await db.from('boards').select('id').eq('share_token', shareToken).maybeSingle();
    if (data) return data.id;
  }

  const cached = localStorage.getItem('kanban_board_id');
  if (cached) {
    const { data } = await db.from('boards').select('id').eq('id', cached).maybeSingle();
    if (data) return data.id;
  }

  const { data: { user } } = await db.auth.getUser();
  const { data, error } = await db
    .from('boards')
    .insert({ title: '내 칸반 보드', owner_id: user.id })
    .select()
    .single();

  if (error) { console.error('보드 생성 실패:', error.message); return null; }
  localStorage.setItem('kanban_board_id', data.id);
  return data.id;
}

async function loadCards() {
  const { data, error } = await db
    .from('cards')
    .select('*')
    .eq('board_id', boardId)
    .is('deleted_at', null)
    .order('position');
  if (error) { console.error('카드 로드 실패:', error.message); return; }
  cards = data;
}

/* ── 렌더링 ── */
function render() {
  COLUMNS.forEach(status => {
    const list = document.getElementById(`${status}-list`);
    const column = document.getElementById(status);
    const filtered = cards.filter(c => c.status === status);

    list.innerHTML = '';
    filtered.forEach(card => list.appendChild(createCardEl(card)));
    column.querySelector('.card-count').textContent = filtered.length;
    bindColumnDrop(column, list);
  });
}

function createCardEl(card) {
  const el = document.createElement('div');
  el.className = `card priority-${card.priority}`;
  el.draggable = true;
  el.dataset.id = card.id;

  el.innerHTML = `
    <div class="card-title">${escapeHtml(card.title)}</div>
    ${card.description ? `<div class="card-desc">${escapeHtml(card.description)}</div>` : ''}
    <div class="card-footer">
      <span class="priority-badge ${card.priority}">${priorityLabel(card.priority)}</span>
      <button class="card-delete" title="삭제">✕</button>
    </div>
  `;

  el.querySelector('.card-delete').addEventListener('click', e => {
    e.stopPropagation();
    deleteCard(card.id);
  });

  bindCardDrag(el, card);
  return el;
}

/* ── 드래그 앤 드롭 ── */
function bindCardDrag(el, card) {
  el.addEventListener('dragstart', e => {
    draggedCard = card;
    el.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    requestAnimationFrame(() => el.classList.add('dragging'));
  });

  el.addEventListener('dragend', () => {
    el.classList.remove('dragging');
    removePlaceholder();
    draggedCard = null;
  });
}

function bindColumnDrop(column, list) {
  column.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    column.classList.add('drag-over');

    const afterEl = getDragAfterElement(list, e.clientY);
    ensurePlaceholder();
    if (!afterEl) {
      list.appendChild(placeholder);
    } else {
      list.insertBefore(placeholder, afterEl);
    }
  });

  column.addEventListener('dragleave', e => {
    if (!column.contains(e.relatedTarget)) {
      column.classList.remove('drag-over');
      removePlaceholder();
    }
  });

  column.addEventListener('drop', async e => {
    e.preventDefault();
    column.classList.remove('drag-over');
    removePlaceholder();

    if (!draggedCard) return;

    const newStatus = column.dataset.status;
    const afterEl = getDragAfterElement(list, e.clientY);

    const colCards = cards
      .filter(c => c.status === newStatus && c.id !== draggedCard.id)
      .sort((a, b) => a.position - b.position);

    let newPosition;
    if (!afterEl) {
      newPosition = colCards.length > 0 ? colCards.at(-1).position + 1000 : 1000;
    } else {
      const afterIdx = colCards.findIndex(c => c.id === afterEl.dataset.id);
      const afterCard = colCards[afterIdx];
      const beforeCard = colCards[afterIdx - 1] ?? null;
      newPosition = beforeCard
        ? (beforeCard.position + afterCard.position) / 2
        : afterCard.position - 500;
    }

    const cardObj = cards.find(c => c.id === draggedCard.id);
    if (!cardObj) return;
    const oldStatus = cardObj.status;
    cardObj.status = newStatus;
    cardObj.position = newPosition;
    cards.sort((a, b) => a.position - b.position);
    render();

    const { error } = await db
      .from('cards')
      .update({ status: newStatus, position: newPosition })
      .eq('id', draggedCard.id);

    if (error) {
      console.error('카드 이동 실패:', error.message);
      await loadCards();
      render();
    } else if (oldStatus !== newStatus) {
      logActivity('card_moved', cardObj.id, cardObj.title, { from: oldStatus, to: newStatus });
    }
  });
}

function ensurePlaceholder() {
  if (!placeholder) {
    placeholder = document.createElement('div');
    placeholder.className = 'drop-placeholder';
  }
}

function removePlaceholder() {
  if (placeholder && placeholder.parentNode) {
    placeholder.parentNode.removeChild(placeholder);
  }
  placeholder = null;
  document.querySelectorAll('.column').forEach(c => c.classList.remove('drag-over'));
}

function getDragAfterElement(list, y) {
  const draggableEls = [...list.querySelectorAll('.card:not(.dragging)')];
  return draggableEls.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset, element: child };
    }
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

/* ── 카드 삭제 ── */
async function deleteCard(id) {
  const card = cards.find(c => c.id === id);
  const title = card?.title || '';
  cards = cards.filter(c => c.id !== id);
  render();

  const { error } = await db
    .from('cards')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('카드 삭제 실패:', error.message);
    await loadCards();
    render();
  } else {
    logActivity('card_deleted', id, title);
  }
}

/* ── 모달 ── */
function bindModal() {
  const overlay = document.getElementById('modal-overlay');
  const titleInput = document.getElementById('card-title');
  const descInput = document.getElementById('card-desc');
  const prioritySelect = document.getElementById('card-priority');

  document.getElementById('add-card-btn').addEventListener('click', () => {
    overlay.classList.add('active');
    titleInput.focus();
  });

  document.getElementById('modal-cancel').addEventListener('click', closeModal);

  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModal();
  });

  document.getElementById('modal-confirm').addEventListener('click', addCard);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
    if (e.key === 'Enter' && overlay.classList.contains('active')) addCard();
  });

  async function addCard() {
    const title = titleInput.value.trim();
    if (!title) {
      titleInput.focus();
      titleInput.style.borderColor = '#e94560';
      return;
    }
    titleInput.style.borderColor = '';

    const todoCards = cards.filter(c => c.status === 'todo').sort((a, b) => a.position - b.position);
    const position = todoCards.length > 0 ? todoCards.at(-1).position + 1000 : 1000;

    const { data: { user } } = await db.auth.getUser();
    const { data, error } = await db
      .from('cards')
      .insert({
        board_id: boardId,
        created_by: user.id,
        title,
        description: descInput.value.trim() || null,
        priority: prioritySelect.value,
        status: 'todo',
        position,
      })
      .select()
      .single();

    if (error) { console.error('카드 추가 실패:', error.message); return; }

    cards.push(data);
    render();
    closeModal();
    logActivity('card_created', data.id, data.title);
  }

  function closeModal() {
    overlay.classList.remove('active');
    titleInput.value = '';
    descInput.value = '';
    prioritySelect.value = 'medium';
    titleInput.style.borderColor = '';
  }
}

/* ── Realtime ── */
function subscribeRealtime() {
  db.channel('cards-changes')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'cards', filter: `board_id=eq.${boardId}` },
      async () => { await loadCards(); render(); }
    )
    .subscribe();

  db.channel('activity-changes')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'activity_logs', filter: `board_id=eq.${boardId}` },
      payload => {
        const list = document.getElementById('activity-list');
        const empty = list.querySelector('.activity-empty');
        if (empty) empty.remove();
        list.insertBefore(buildActivityItem(payload.new), list.firstChild);
      }
    )
    .subscribe();
}

/* ── 활동 로그 ── */
async function logActivity(action, entityId, entityName, meta = {}) {
  const { data: { user } } = await db.auth.getUser();
  if (!user) return;
  const actorName = user.is_anonymous
    ? '게스트'
    : (user.user_metadata?.full_name || user.email || '알 수 없음');
  await db.from('activity_logs').insert({
    board_id: boardId,
    user_id: user.id,
    actor_name: actorName,
    action,
    entity_id: entityId,
    entity_name: entityName,
    meta,
  });
}

async function loadActivityLogs() {
  const { data, error } = await db
    .from('activity_logs')
    .select('*')
    .eq('board_id', boardId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) { console.error('로그 로드 실패:', error.message); return; }
  renderActivityLogs(data);
}

function renderActivityLogs(logs) {
  const list = document.getElementById('activity-list');
  if (!logs.length) {
    list.innerHTML = '<li class="activity-empty">활동 내역이 없습니다.</li>';
    return;
  }
  list.innerHTML = '';
  logs.forEach(log => list.appendChild(buildActivityItem(log)));
}

function buildActivityItem(log) {
  const li = document.createElement('li');
  li.className = 'activity-item';
  li.dataset.id = log.id;
  li.innerHTML = `
    <div class="activity-text">${actionLabel(log)}</div>
    <div class="activity-time">${timeAgo(log.created_at)}</div>
  `;
  return li;
}

function actionLabel(log) {
  const actor = `<span class="activity-actor">${escapeHtml(log.actor_name)}</span>`;
  const entity = log.entity_name ? `<b>'${escapeHtml(log.entity_name)}'</b>` : '';
  switch (log.action) {
    case 'card_created':
      return `${actor}이(가) ${entity} 카드를 추가했습니다`;
    case 'card_moved': {
      const from = columnLabel(log.meta?.from);
      const to = columnLabel(log.meta?.to);
      return `${actor}이(가) ${entity}을(를) ${from} → ${to}로 이동했습니다`;
    }
    case 'card_deleted':
      return `${actor}이(가) ${entity} 카드를 삭제했습니다`;
    case 'board_joined':
      return `${actor}이(가) 보드에 참여했습니다`;
    default:
      return `${actor}이(가) 작업을 수행했습니다`;
  }
}

function columnLabel(status) {
  return { todo: 'TO-DO', 'in-progress': 'IN-PROGRESS', done: 'DONE' }[status] || status || '';
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}

/* ── 공유 링크 ── */
async function copyShareLink() {
  const { data, error } = await db
    .from('boards')
    .select('share_token')
    .eq('id', boardId)
    .single();

  if (error || !data?.share_token) {
    showToast('링크 복사 실패. 잠시 후 다시 시도하세요.');
    return;
  }

  const url = `${location.origin}${location.pathname}?share=${data.share_token}`;
  await navigator.clipboard.writeText(url);
  showToast('공유 링크가 복사되었습니다!');
}

/* ── 활동 패널 토글 ── */
function toggleActivityPanel() {
  activityPanelOpen = !activityPanelOpen;
  document.getElementById('activity-panel').classList.toggle('open', activityPanelOpen);
  document.getElementById('activity-btn').classList.toggle('active', activityPanelOpen);
}

/* ── 토스트 ── */
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}

/* ── 유틸 ── */
function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function priorityLabel(p) {
  return { low: '낮음', medium: '보통', high: '높음' }[p] || p;
}

/* ── 시작 ── */
init();
