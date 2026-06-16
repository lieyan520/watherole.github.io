let shopItems = [];

function showToast(msg, type) {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'toast ' + type;
  t.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderShop() {
  const el = $('shopList');
  if (!shopItems.length) {
    el.innerHTML = '<div class="shop-empty">暂无物品，点击下方按钮添加</div>';
    return;
  }
  el.innerHTML = shopItems.map((item, i) => `
    <div class="shop-item">
      <input type="text" placeholder="物品名称" value="${esc(item.name)}" class="shop-name">
      <input type="number" placeholder="金币" value="${item.cost}" min="0" class="shop-cost">
      <button type="button" class="shop-del" data-idx="${i}">删</button>
    </div>`).join('');
  el.querySelectorAll('.shop-name').forEach(inp => inp.addEventListener('input', syncShop));
  el.querySelectorAll('.shop-cost').forEach(inp => inp.addEventListener('input', syncShop));
  el.querySelectorAll('.shop-del').forEach(btn => btn.addEventListener('click', () => {
    shopItems.splice(+btn.dataset.idx, 1);
    renderShop();
  }));
}

function syncShop() {
  $('shopList').querySelectorAll('.shop-item').forEach((row, i) => {
    shopItems[i] = {
      name: row.querySelector('.shop-name').value.trim(),
      cost: parseInt(row.querySelector('.shop-cost').value) || 0
    };
  });
}

function switchSubmitTab(tab) {
  $('jobFormPanel').classList.toggle('active', tab === 'job');
  $('modifierFormPanel').classList.toggle('active', tab === 'modifier');
}

function initSubmit() {
  const params = new URLSearchParams(location.search);
  const initialTab = params.get('tab') === 'modifier' ? 'modifier' : 'job';

  setupTabs('submitTabs', switchSubmitTab);
  $('submitTabs').querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === initialTab);
  });
  switchSubmitTab(initialTab);

  $('addShopBtn').onclick = () => {
    shopItems.push({ name: '', cost: 0 });
    renderShop();
    const inputs = $('shopList').querySelectorAll('.shop-name');
    if (inputs.length) inputs[inputs.length - 1].focus();
  };

  $('jobForm').onsubmit = async e => {
    e.preventDefault();
    $('toast').className = 'toast';
    syncShop();
    const data = {
      name: $('jobName').value.trim(),
      faction: $('jobFaction').value,
      author: $('jobAuthor').value.trim(),
      summary: $('jobSummary').value.trim(),
      description: $('jobDesc').value.trim(),
      shop: shopItems.filter(s => s.name),
      story: $('jobStory').value.trim(),
    };
    if (!data.name) return showToast('请填写职业名称', 'error');
    if (!data.faction) return showToast('请选择职业阵营', 'error');
    if (!data.author) return showToast('请填写投稿者昵称', 'error');
    if (data.description.length < 10) return showToast('职业描述至少 10 个字', 'error');

    const btn = $('jobSubmitBtn');
    btn.disabled = true;
    btn.textContent = '提交中...';
    try {
      await supabaseFetch('job_submissions', { method: 'POST', body: JSON.stringify(data), prefer: 'return=minimal' });
      location.href = 'index.html?tab=job';
    } catch (err) {
      showToast('提交失败：' + err.message, 'error');
      btn.disabled = false;
      btn.textContent = '提交职业到云端';
    }
  };

  $('modifierForm').onsubmit = async e => {
    e.preventDefault();
    $('toast').className = 'toast';
    const data = {
      name: $('modName').value.trim(),
      author: $('modAuthor').value.trim(),
      description: $('modDesc').value.trim(),
      story: $('modStory').value.trim(),
    };
    if (!data.name) return showToast('请填写修饰符名称', 'error');
    if (!data.author) return showToast('请填写投稿者昵称', 'error');
    if (data.description.length < 10) return showToast('修饰符描述至少 10 个字', 'error');

    const btn = $('modSubmitBtn');
    btn.disabled = true;
    btn.textContent = '提交中...';
    try {
      await supabaseFetch('modifier_submissions', { method: 'POST', body: JSON.stringify(data), prefer: 'return=minimal' });
      location.href = 'index.html?tab=modifier';
    } catch (err) {
      showToast('提交失败：' + err.message, 'error');
      btn.disabled = false;
      btn.textContent = '提交修饰符到云端';
    }
  };

  updateAdminUI();
  renderShop();
}

initSubmit();
