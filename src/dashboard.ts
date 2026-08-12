export function dashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>RenewGuard — Facebook Scheduler</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@600;700;800&display=swap" rel="stylesheet" />
<style>
  :root {
    --ink:#17123f; --green:#12a150; --green-deep:#0b7a3e; --green-soft:#d5f5e0;
    --teal:#0ea8a0; --bg:#f3faf5; --card:#ffffff; --muted:#5f7268; --danger:#dc2626;
    --border:#dcece1; --font-d:"Sora",sans-serif; --font-b:"Inter",sans-serif; --radius:1rem;
  }
  * { box-sizing:border-box; }
  body { margin:0; font-family:var(--font-b); background:linear-gradient(165deg,var(--ink) 0%,var(--green-deep) 28%,var(--bg) 28%); min-height:100vh; color:var(--ink); }
  .wrap { max-width:1150px; margin:0 auto; padding:28px 16px 64px; }
  h1 { color:#fff; margin:0 0 4px; font-size:2rem; font-family:var(--font-d); font-weight:800; letter-spacing:-0.02em; }
  .sub { color:var(--green-soft); margin-bottom:24px; font-weight:500; }
  .card { background:var(--card); border-radius:var(--radius); padding:22px; box-shadow:0 12px 32px -12px rgba(20,32,58,.18); border:1px solid var(--border); margin-bottom:18px; }
  label { display:block; font-size:.85rem; color:var(--muted); margin-bottom:4px; font-weight:500; }
  input, select, textarea, button { font:inherit; padding:10px 14px; border-radius:.7rem; border:1px solid var(--border); }
  input, select, textarea { width:100%; margin-bottom:10px; background:#fff; }
  textarea { resize:vertical; min-height:64px; }
  button { background:var(--ink); color:#fff; border:none; cursor:pointer; font-weight:700; transition:transform .15s; }
  button:hover { transform:translateY(-1px); }
  button.green { background:var(--green); }
  button.secondary { background:var(--bg); color:var(--ink); border:1px solid var(--border); }
  button.danger { background:var(--danger); color:#fff; }
  button:disabled { opacity:.5; cursor:not-allowed; transform:none; }
  .hidden { display:none !important; }
  table { width:100%; border-collapse:collapse; font-size:.86rem; }
  th, td { text-align:left; padding:9px 8px; border-bottom:1px solid var(--border); vertical-align:middle; }
  th { color:var(--muted); font-weight:700; font-size:.68rem; text-transform:uppercase; letter-spacing:.05em; }
  .badge { display:inline-block; padding:3px 10px; border-radius:999px; font-size:.7rem; font-weight:700; }
  .badge.pending { background:#e0f2fe; color:#075985; }
  .badge.published { background:var(--green-soft); color:var(--green-deep); }
  .badge.failed { background:#fee2e2; color:#991b1b; }
  .thumb { width:64px; height:34px; object-fit:cover; border-radius:6px; border:1px solid var(--border); background:#f4f4f4; }
  .toolbar { display:flex; gap:10px; flex-wrap:wrap; align-items:flex-end; margin-bottom:6px; }
  .toolbar > div { flex:1; min-width:160px; }
  .row-actions { display:flex; gap:6px; flex-wrap:wrap; }
  .err { color:var(--danger); margin-top:8px; font-size:.9rem; }
  .hint { color:var(--muted); font-size:.85rem; }
  #loginCard { max-width:380px; margin:90px auto; text-align:center; border-top:4px solid var(--green); }
  .status-row { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; }
  .table-scroll { overflow-x:auto; }
  .campaign-select-row { display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-bottom:10px; }
  .campaign-select-row select { width:auto; min-width:220px; margin:0; }
  .form-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:0 14px; }
  .modal-bg { position:fixed; inset:0; z-index:100; background:rgba(20,32,58,.6); display:flex; align-items:center; justify-content:center; padding:16px; }
  .modal-bg.hidden { display:none !important; }
  .modal { background:#fff; border-radius:var(--radius); padding:22px; width:100%; max-width:480px; max-height:calc(100vh - 32px); overflow-y:auto; border-top:4px solid var(--green); }
  .modal h3 { margin:0 0 10px; font-family:var(--font-d); }
  .modal-actions { display:flex; gap:8px; margin-top:10px; }
  .modal-actions button { flex:1; }
</style>
</head>
<body>
<div class="wrap">
  <h1>RenewGuard</h1>
  <p class="sub">Facebook auto-scheduler</p>

  <div id="loginCard" class="card">
    <h2 style="margin-top:0;font-family:var(--font-d)">Sign in</h2>
    <label>Username</label>
    <input id="user" autocomplete="off" />
    <label>Password</label>
    <input id="pass" type="password" autocomplete="new-password" />
    <button class="green" id="loginBtn" style="width:100%">Sign in</button>
    <div id="loginErr" class="err"></div>
  </div>

  <div id="app" class="hidden">
    <div class="card">
      <div class="status-row">
        <div>
          <strong id="connStatus">Checking connection…</strong>
          <div class="hint" id="connDetail"></div>
        </div>
        <div>
          <button class="green" id="connectBtn">Connect Facebook Page</button>
          <button class="secondary hidden" id="disconnectBtn">Disconnect</button>
        </div>
      </div>
      <div class="status-row" style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border)">
        <div>
          <strong id="liConnStatus">Checking LinkedIn connection…</strong>
          <div class="hint" id="liConnDetail">Posts to your personal LinkedIn profile.</div>
        </div>
        <div>
          <button class="green" id="liConnectBtn">Connect LinkedIn</button>
          <button class="secondary hidden" id="liDisconnectBtn">Disconnect</button>
        </div>
      </div>
    </div>

    <div class="card">
      <h3 style="margin-top:0;font-family:var(--font-d)">Campaign</h3>
      <div class="campaign-select-row">
        <select id="campaignSelect"></select>
        <button class="secondary" id="newCampaignBtn">+ New campaign</button>
        <button class="danger" id="deleteCampaignBtn">Delete campaign</button>
      </div>
      <div class="toolbar">
        <div>
          <label>Start date</label>
          <input id="startDate" type="date" />
        </div>
        <button class="green" id="startBtn">Start automation</button>
        <button class="secondary" id="pauseBtn">Pause</button>
      </div>
      <p class="hint" id="automationHint">Loading…</p>
    </div>

    <div class="card">
      <div class="status-row" style="margin-bottom:10px">
        <h3 style="margin:0;font-family:var(--font-d)">Posts</h3>
        <button class="green" id="addPostBtn">+ Add / upload flyer</button>
      </div>
      <div class="table-scroll">
      <table>
        <thead><tr><th>Day</th><th>Pillar</th><th>Image</th><th>Facebook</th><th>LinkedIn</th><th></th></tr></thead>
        <tbody id="postsBody"></tbody>
      </table>
      </div>
    </div>
  </div>
</div>

<div id="postModalBg" class="modal-bg hidden">
  <div class="modal">
    <h3 id="postModalTitle">Add flyer</h3>
    <input type="hidden" id="postId" />
    <div class="form-grid">
      <div>
        <label>Day number</label>
        <input id="postDay" type="number" min="1" />
      </div>
      <div>
        <label>Content pillar</label>
        <input id="postPillar" placeholder="e.g. Mobile feature" />
      </div>
    </div>
    <label>Focus</label>
    <input id="postFocus" placeholder="Mobile App / Web Agent Portal / Both" />
    <label>Caption</label>
    <textarea id="postCaption"></textarea>
    <label>Hashtags</label>
    <input id="postHashtags" placeholder="#RenewGuard #InsuranceAgentsSL" />
    <label>Call to action</label>
    <input id="postCta" placeholder="Start free trial" />
    <label>Image (upload a file — replaces any existing image)</label>
    <input id="postImage" type="file" accept="image/*" />
    <label class="check-row" style="display:flex;gap:16px;margin:10px 0;font-weight:600">
      <span><input id="postFb" type="checkbox" style="width:auto;margin:0 6px 0 0" checked />Publish to Facebook</span>
      <span><input id="postLi" type="checkbox" style="width:auto;margin:0 6px 0 0" />Publish to LinkedIn</span>
    </label>
    <div id="postModalErr" class="err"></div>
    <div class="modal-actions">
      <button class="secondary" type="button" id="postModalCancel">Cancel</button>
      <button class="green" type="button" id="postModalSave">Save</button>
    </div>
  </div>
</div>

<script>
async function api(path, opts = {}) {
  const res = await fetch(path, { credentials: 'include', ...opts });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { error: text }; }
  if (!res.ok) throw new Error((data && (data.error || data.message)) || res.statusText);
  return data;
}
async function apiJson(path, method, body) {
  return api(path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
}

const loginCard = document.getElementById('loginCard');
const app = document.getElementById('app');
let campaigns = [];
let currentCampaignId = null;

async function checkSession() {
  try {
    await api('/api/status');
    loginCard.classList.add('hidden');
    app.classList.remove('hidden');
    await loadCampaigns();
  } catch {
    loginCard.classList.remove('hidden');
    app.classList.add('hidden');
  }
}

document.getElementById('loginBtn').onclick = async () => {
  const err = document.getElementById('loginErr');
  err.textContent = '';
  try {
    await apiJson('/api/login', 'POST', {
      username: document.getElementById('user').value.trim(),
      password: document.getElementById('pass').value
    });
    await checkSession();
  } catch (e) { err.textContent = e.message; }
};

document.getElementById('connectBtn').onclick = () => { window.location.href = '/auth/facebook/start'; };
document.getElementById('disconnectBtn').onclick = async () => {
  if (!confirm('Disconnect this Facebook Page?')) return;
  await apiJson('/api/disconnect', 'POST');
  await loadStatus();
};
document.getElementById('liConnectBtn').onclick = () => { window.location.href = '/auth/linkedin/start'; };
document.getElementById('liDisconnectBtn').onclick = async () => {
  if (!confirm('Disconnect LinkedIn?')) return;
  await apiJson('/api/disconnect/linkedin', 'POST');
  await loadStatus();
};

document.getElementById('newCampaignBtn').onclick = async () => {
  const name = prompt('Name this campaign (e.g. "September push"):');
  if (!name) return;
  const res = await apiJson('/api/campaigns', 'POST', { name });
  await loadCampaigns(res.id);
};

document.getElementById('deleteCampaignBtn').onclick = async () => {
  if (!currentCampaignId) return;
  const c = campaigns.find(c => c.id === currentCampaignId);
  if (!confirm('Delete campaign "' + (c ? c.name : '') + '" and all its flyers? This cannot be undone.')) return;
  await api('/api/campaigns/' + currentCampaignId, { method: 'DELETE' });
  await loadCampaigns();
};

document.getElementById('campaignSelect').onchange = async (e) => {
  currentCampaignId = parseInt(e.target.value, 10);
  await renderCampaign();
  await loadPosts();
};

document.getElementById('startBtn').onclick = async () => {
  if (!currentCampaignId) return;
  const startDate = document.getElementById('startDate').value;
  if (!startDate) { alert('Pick a start date first'); return; }
  try {
    await apiJson('/api/campaigns/' + currentCampaignId + '/start', 'POST', { start_date: startDate });
    await loadCampaigns(currentCampaignId);
  } catch (e) { alert(e.message); }
};
document.getElementById('pauseBtn').onclick = async () => {
  if (!currentCampaignId) return;
  await apiJson('/api/campaigns/' + currentCampaignId + '/pause', 'POST');
  await loadCampaigns(currentCampaignId);
};

function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

async function loadStatus() {
  const status = await api('/api/status');
  const connStatus = document.getElementById('connStatus');
  const connDetail = document.getElementById('connDetail');
  const connectBtn = document.getElementById('connectBtn');
  const disconnectBtn = document.getElementById('disconnectBtn');
  if (status.connected) {
    connStatus.textContent = 'Connected to ' + status.page_name;
    connDetail.textContent = 'Page ID: ' + status.page_id;
    connectBtn.classList.add('hidden');
    disconnectBtn.classList.remove('hidden');
  } else {
    connStatus.textContent = 'No Facebook Page connected';
    connDetail.textContent = 'Connect a page to enable publishing.';
    connectBtn.classList.remove('hidden');
    disconnectBtn.classList.add('hidden');
  }

  const liStatus = document.getElementById('liConnStatus');
  const liConnectBtn = document.getElementById('liConnectBtn');
  const liDisconnectBtn = document.getElementById('liDisconnectBtn');
  if (status.linkedin_connected) {
    liStatus.textContent = 'Connected as ' + status.linkedin_name;
    liConnectBtn.classList.add('hidden');
    liDisconnectBtn.classList.remove('hidden');
  } else {
    liStatus.textContent = 'No LinkedIn account connected';
    liConnectBtn.classList.remove('hidden');
    liDisconnectBtn.classList.add('hidden');
  }
}

async function loadCampaigns(selectId) {
  campaigns = await api('/api/campaigns');
  const sel = document.getElementById('campaignSelect');
  sel.innerHTML = campaigns.map(c => \`<option value="\${c.id}">\${esc(c.name)} (\${c.published_count}/\${c.post_count} published)\${c.automation_enabled ? ' — running' : ''}</option>\`).join('');
  if (campaigns.length === 0) {
    currentCampaignId = null;
  } else {
    currentCampaignId = selectId && campaigns.some(c => c.id === selectId) ? selectId : campaigns[0].id;
    sel.value = String(currentCampaignId);
  }
  await loadStatus();
  await renderCampaign();
  await loadPosts();
}

async function renderCampaign() {
  const hint = document.getElementById('automationHint');
  const c = campaigns.find(c => c.id === currentCampaignId);
  if (!c) { hint.textContent = 'No campaigns yet — create one to get started.'; return; }
  if (c.automation_enabled) {
    hint.textContent = 'Running — started ' + c.start_date + '.';
  } else if (c.start_date) {
    hint.textContent = 'Paused. Configured start date: ' + c.start_date;
  } else {
    hint.textContent = 'Not started yet.';
  }
  document.getElementById('startDate').value = c.start_date || '';
}

async function loadPosts() {
  const body = document.getElementById('postsBody');
  if (!currentCampaignId) { body.innerHTML = ''; return; }
  const posts = await api('/api/posts?campaign_id=' + currentCampaignId);
  body.innerHTML = posts.map(p => \`
    <tr>
      <td><strong>\${p.day_offset}</strong></td>
      <td>\${esc(p.pillar)}</td>
      <td><img class="thumb" src="\${esc(p.resolved_image_url || '')}" /></td>
      <td>\${p.publish_facebook ? '<span class="badge ' + p.status + '">' + p.status + '</span>' : '<span class="hint">off</span>'}</td>
      <td>\${p.publish_linkedin ? '<span class="badge ' + p.li_status + '">' + p.li_status + '</span>' : '<span class="hint">off</span>'}</td>
      <td class="row-actions">
        <button class="secondary" data-publish="\${p.id}" \${(p.status === 'published' || !p.publish_facebook) && (p.li_status === 'published' || !p.publish_linkedin) ? 'disabled' : ''}>Publish now</button>
        <button class="secondary" data-edit="\${p.id}">Edit</button>
        <button class="danger" data-delete="\${p.id}">Delete</button>
      </td>
    </tr>\`).join('') || '<tr><td colspan="6">No flyers in this campaign yet.</td></tr>';

  body.querySelectorAll('button[data-publish]').forEach(btn => {
    btn.onclick = async () => {
      btn.disabled = true; btn.textContent = 'Publishing…';
      try {
        const res = await apiJson('/api/publish/' + btn.dataset.publish, 'POST');
        alert(res.message);
      } catch (e) { alert(e.message); } finally { await loadPosts(); await loadCampaigns(currentCampaignId); }
    };
  });
  body.querySelectorAll('button[data-delete]').forEach(btn => {
    btn.onclick = async () => {
      if (!confirm('Delete this flyer permanently?')) return;
      await api('/api/posts/' + btn.dataset.delete, { method: 'DELETE' });
      await loadPosts();
      await loadCampaigns(currentCampaignId);
    };
  });
  body.querySelectorAll('button[data-edit]').forEach(btn => {
    btn.onclick = () => openPostModal(posts.find(p => p.id === parseInt(btn.dataset.edit, 10)));
  });
}

const postModalBg = document.getElementById('postModalBg');
function openPostModal(post) {
  document.getElementById('postModalTitle').textContent = post ? 'Edit flyer' : 'Add flyer';
  document.getElementById('postId').value = post ? post.id : '';
  document.getElementById('postDay').value = post ? post.day_offset : '';
  document.getElementById('postPillar').value = post ? post.pillar : '';
  document.getElementById('postFocus').value = post ? post.focus : '';
  document.getElementById('postCaption').value = post ? post.caption : '';
  document.getElementById('postHashtags').value = post ? post.hashtags : '';
  document.getElementById('postCta').value = post ? post.cta : '';
  document.getElementById('postImage').value = '';
  document.getElementById('postFb').checked = post ? !!post.publish_facebook : true;
  document.getElementById('postLi').checked = post ? !!post.publish_linkedin : false;
  document.getElementById('postModalErr').textContent = '';
  postModalBg.classList.remove('hidden');
}
document.getElementById('addPostBtn').onclick = () => {
  if (!currentCampaignId) { alert('Create or select a campaign first'); return; }
  openPostModal(null);
};
document.getElementById('postModalCancel').onclick = () => postModalBg.classList.add('hidden');

document.getElementById('postModalSave').onclick = async () => {
  const err = document.getElementById('postModalErr');
  err.textContent = '';
  const id = document.getElementById('postId').value;
  const fd = new FormData();
  fd.set('campaign_id', String(currentCampaignId));
  fd.set('day_offset', document.getElementById('postDay').value);
  fd.set('pillar', document.getElementById('postPillar').value);
  fd.set('focus', document.getElementById('postFocus').value);
  fd.set('caption', document.getElementById('postCaption').value);
  fd.set('hashtags', document.getElementById('postHashtags').value);
  fd.set('cta', document.getElementById('postCta').value);
  fd.set('publish_facebook', document.getElementById('postFb').checked ? '1' : '0');
  fd.set('publish_linkedin', document.getElementById('postLi').checked ? '1' : '0');
  const file = document.getElementById('postImage').files[0];
  if (file) fd.set('image', file);
  if (!document.getElementById('postDay').value || !document.getElementById('postCaption').value) {
    err.textContent = 'Day number and caption are required.';
    return;
  }
  if (!id && !file) {
    err.textContent = 'Please upload an image for a new flyer.';
    return;
  }
  try {
    if (id) {
      await api('/api/posts/' + id, { method: 'PUT', body: fd });
    } else {
      await api('/api/posts', { method: 'POST', body: fd });
    }
    postModalBg.classList.add('hidden');
    await loadPosts();
    await loadCampaigns(currentCampaignId);
  } catch (e) { err.textContent = e.message; }
};

checkSession();
</script>
</body>
</html>`;
}
