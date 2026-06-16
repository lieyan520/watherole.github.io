const SUPABASE_URL = 'https://esltidvulrpybiqjtzlj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_wwG-lapJ7eJdWQJmTkwbCg_QtctCPTB';
const ADMIN_PASSWORD = 'admin888';

const FACTIONS = ['全部', '平民', '警长', '独立胜利/特殊中立', '杀手方中立', '杀手'];
const FACTION_CLASS = {
  '平民': 'tag-civilian', '警长': 'tag-sheriff',
  '独立胜利/特殊中立': 'tag-neutral', '杀手方中立': 'tag-killer-neutral', '杀手': 'tag-killer'
};

let isAdmin = sessionStorage.getItem('isAdmin') === '1';
const $ = id => document.getElementById(id);

function isConfigured() {
  return SUPABASE_URL.startsWith('https://') && !SUPABASE_URL.includes('YOUR_');
}

async function supabaseFetch(path, options = {}) {
  const headers = { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json', ...options.headers };
  if (options.prefer) headers['Prefer'] = options.prefer;
  if (!SUPABASE_ANON_KEY.startsWith('sb_publishable_')) headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...options, headers });
  if (!res.ok) throw new Error((await res.text()) || `请求失败 (${res.status})`);
  const text = await res.text();
  if (!text) return null;
  return JSON.parse(text);
}

function esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
}

function factionTag(f) {
  return `<span class="tag ${FACTION_CLASS[f] || 'tag-civilian'}">${esc(f)}</span>`;
}

function parseShop(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
}

function modalBlock(title, text) {
  return `<div class="modal-block"><h4>${title}</h4><p>${esc(text)}</p></div>`;
}

function setupTabs(containerId, onSwitch) {
  const container = $(containerId);
  if (!container) return;
  container.querySelectorAll('.tab').forEach(tab => {
    tab.onclick = () => {
      container.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      onSwitch(tab.dataset.tab);
    };
  });
}

function updateAdminUI(onChange) {
  const btn = $('adminBtn');
  if (!btn) return;
  btn.textContent = isAdmin ? '管理 ✓' : '管理';
  btn.classList.toggle('on', isAdmin);
  btn.onclick = e => {
    e.preventDefault();
    if (isAdmin) {
      if (confirm('退出管理？')) {
        isAdmin = false;
        sessionStorage.removeItem('isAdmin');
        updateAdminUI(onChange);
        if (onChange) onChange();
      }
      return;
    }
    const pwd = prompt('管理员密码：');
    if (pwd === ADMIN_PASSWORD) {
      isAdmin = true;
      sessionStorage.setItem('isAdmin', '1');
      updateAdminUI(onChange);
      if (onChange) onChange();
      alert('已进入管理模式');
    } else if (pwd) alert('密码错误');
  };
}

async function deleteItem(type, id, jobs, modifiers, onDone) {
  if (!isAdmin) return alert('请先进入管理模式');
  const table = type === 'job' ? 'job_submissions' : 'modifier_submissions';
  const list = type === 'job' ? jobs : modifiers;
  const item = list.find(x => x.id === id);
  const name = item ? `「${item.name}」` : '此投稿';
  if (!confirm(`确定删除 ${name}？`)) return;
  try {
    const r = await supabaseFetch(`${table}?id=eq.${id}`, { method: 'DELETE', prefer: 'return=representation' });
    if (!r || !r.length) throw new Error('删除权限未开放');
    if (onDone) await onDone();
    alert('已删除');
  } catch (err) {
    alert('删除失败：' + err.message + '\n\n执行：create policy "职业-删" on ' + table + ' for delete using (true);');
  }
}
