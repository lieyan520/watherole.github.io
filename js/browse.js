let jobs = [], modifiers = [];
let browseTab = 'job', factionFilter = '全部';
let modalItem = null, modalTable = null;

function showToast(msg, type) {
  const t = $('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast ' + type;
}

async function loadAll() {
  const c = $('listContainer');
  if (!isConfigured()) {
    c.innerHTML = '<div class="state-box"><p>请先配置 Supabase 密钥</p></div>';
    return;
  }
  c.innerHTML = '<div class="state-box"><div class="spinner"></div><p>加载中...</p></div>';
  try {
    const [j, m] = await Promise.all([
      supabaseFetch('job_submissions?select=*&order=created_at.desc'),
      supabaseFetch('modifier_submissions?select=*&order=created_at.desc'),
    ]);
    jobs = j || [];
    modifiers = m || [];
    renderList();
  } catch (e) {
    c.innerHTML = `<div class="state-box"><p>加载失败：${esc(e.message)}</p><button class="btn btn-ghost btn-sm" style="margin-top:12px" onclick="loadAll()">重试</button></div>`;
  }
}

function renderList() {
  const c = $('listContainer');
  if (browseTab === 'job') {
    $('browseTitle').innerHTML = `职业列表 <span style="color:var(--muted);font-size:15px;font-weight:400">（共 ${jobs.length} 个）</span>`;
    initFactionFilters();
    const list = factionFilter === '全部' ? jobs : jobs.filter(j => j.faction === factionFilter);
    if (!list.length) {
      c.innerHTML = `<div class="state-box"><p>${factionFilter === '全部' ? '还没有职业投稿' : `暂无「${esc(factionFilter)}」阵营投稿`}</p><a href="submit.html" class="btn btn-primary btn-sm" style="margin-top:12px">去投稿</a></div>`;
      return;
    }
    c.innerHTML = `<div class="card-grid">${list.map(j => `
      <div class="card" data-type="job" data-id="${j.id}">
        <div class="card-top">${factionTag(j.faction)}<span class="card-date">${formatDate(j.created_at)}</span></div>
        <h3>${esc(j.name)}</h3>
        ${j.summary ? `<div class="card-author">${esc(j.summary)}</div>` : ''}
        <div class="card-preview">${esc(j.description)}</div>
        <div class="card-author">投稿：${esc(j.author)}</div>
        <div class="card-footer">点击查看详情 →</div>
        ${isAdmin ? `<button class="card-delete" data-type="job" data-id="${j.id}">删除</button>` : ''}
      </div>`).join('')}</div>`;
  } else {
    $('browseTitle').innerHTML = `修饰符列表 <span style="color:var(--muted);font-size:15px;font-weight:400">（共 ${modifiers.length} 个）</span>`;
    $('filterBar').innerHTML = '';
    if (!modifiers.length) {
      c.innerHTML = '<div class="state-box"><p>还没有修饰符投稿</p><a href="submit.html?tab=modifier" class="btn btn-primary btn-sm" style="margin-top:12px">去投稿</a></div>';
      return;
    }
    c.innerHTML = `<div class="card-grid">${modifiers.map(m => `
      <div class="card" data-type="modifier" data-id="${m.id}">
        <div class="card-top"><span class="tag tag-mod">修饰符</span><span class="card-date">${formatDate(m.created_at)}</span></div>
        <h3>${esc(m.name)}</h3>
        <div class="card-preview">${esc(m.description)}</div>
        <div class="card-author">投稿：${esc(m.author)}</div>
        <div class="card-footer">点击查看详情 →</div>
        ${isAdmin ? `<button class="card-delete" data-type="modifier" data-id="${m.id}">删除</button>` : ''}
      </div>`).join('')}</div>`;
  }
  bindCardEvents();
}

function initFactionFilters() {
  $('filterBar').innerHTML = FACTIONS.map(f =>
    `<button class="filter-btn${f === factionFilter ? ' active' : ''}" data-f="${f}">${f}</button>`
  ).join('');
  $('filterBar').onclick = e => {
    if (!e.target.dataset.f) return;
    factionFilter = e.target.dataset.f;
    $('filterBar').querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.dataset.f === factionFilter));
    renderList();
  };
}

function bindCardEvents() {
  $('listContainer').querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => {
      const type = card.dataset.type, id = card.dataset.id;
      const item = type === 'job' ? jobs.find(j => j.id === id) : modifiers.find(m => m.id === id);
      if (item) openModal(item, type);
    });
  });
  $('listContainer').querySelectorAll('.card-delete').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      handleDelete(btn.dataset.type, btn.dataset.id);
    });
  });
}

function openModal(item, type) {
  modalItem = item;
  modalTable = type === 'job' ? 'job_submissions' : 'modifier_submissions';
  let body = '';
  if (type === 'job') {
    $('mTags').innerHTML = factionTag(item.faction);
    $('mTitle').textContent = item.name;
    $('mMeta').textContent = `投稿者：${item.author}  ·  ${formatDate(item.created_at)}`;
    if (item.summary) body += modalBlock('职业小结', item.summary);
    body += modalBlock('职业描述', item.description);
    const shop = parseShop(item.shop);
    if (shop.length) {
      body += `<div class="modal-block"><h4>职业商店</h4><table class="shop-table"><thead><tr><th>物品</th><th>金币</th></tr></thead><tbody>${shop.map(s => `<tr><td>${esc(s.name)}</td><td>${s.cost}</td></tr>`).join('')}</tbody></table></div>`;
    }
    if (item.story) body += modalBlock('职业故事', item.story);
  } else {
    $('mTags').innerHTML = '<span class="tag tag-mod">修饰符</span>';
    $('mTitle').textContent = item.name;
    $('mMeta').textContent = `投稿者：${item.author}  ·  ${formatDate(item.created_at)}`;
    body += modalBlock('修饰符描述', item.description);
    if (item.story) body += modalBlock('修饰符故事', item.story);
  }
  $('mBody').innerHTML = body;
  $('modalActions').classList.toggle('show', isAdmin);
  $('modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modalItem = null;
  modalTable = null;
  $('modal').classList.remove('open');
  document.body.style.overflow = '';
}

async function handleDelete(type, id) {
  await deleteItem(type, id, jobs, modifiers, async () => {
    closeModal();
    await loadAll();
  });
}

function initBrowse() {
  const params = new URLSearchParams(location.search);
  if (params.get('tab') === 'modifier') browseTab = 'modifier';

  setupTabs('browseTabs', tab => {
    browseTab = tab;
    factionFilter = '全部';
    renderList();
  });

  if (browseTab === 'modifier') {
    $('browseTabs').querySelectorAll('.tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === 'modifier');
    });
  }

  $('modalClose').onclick = closeModal;
  $('modal').onclick = e => { if (e.target === $('modal')) closeModal(); };
  document.onkeydown = e => { if (e.key === 'Escape') closeModal(); };
  $('modalDeleteBtn').onclick = () => {
    if (modalItem && modalTable) {
      handleDelete(modalTable === 'job_submissions' ? 'job' : 'modifier', modalItem.id);
    }
  };

  updateAdminUI(() => renderList());
  loadAll();
}

initBrowse();
