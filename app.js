const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const COLUMNS = ['todo', 'in-progress', 'done'];
let cards = [];
let boardId = null;
let draggedCard = null;
let placeholder = null;

/* ── 초기화 ── */
async function init() {
  await ensureSession();
  boardId = await ensureBoard();
  await loadCards();
  render();
  bindModal();
  subscribeRealtime();
}

async function ensureSession() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) {
    const { error } = await db.auth.signInAnonymously();
    if (error) console.error('익명 로그인 실패:', error.message);
  }
}

async function ensureBoard() {
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

    // 같은 컬럼 카드를 position 순 정렬 (드래그 중인 카드 제외)
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

    // 낙관적 업데이트
    const cardObj = cards.find(c => c.id === draggedCard.id);
    if (!cardObj) return;
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
  // 낙관적 업데이트
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
      async () => {
        await loadCards();
        render();
      }
    )
    .subscribe();
}

/* ── 유틸 ── */
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function priorityLabel(p) {
  return { low: '낮음', medium: '보통', high: '높음' }[p] || p;
}

/* ── 시작 ── */
init();
