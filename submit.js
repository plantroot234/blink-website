const VOTE_THRESHOLD = 5;
const VOTED_KEY      = 'blink_voted'; // localStorage key

// ── tab switching ──
document.querySelectorAll('.stab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.stab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('pane-' + btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'pending') loadPending();
  });
});

// ── modal ──
const overlay    = document.getElementById('modalOverlay');
const submitBtn  = document.getElementById('submitBtn');
const modalClose = document.getElementById('modalClose');
const subConfirm = document.getElementById('subConfirm');
const subTitle   = document.getElementById('subTitle');
const subArtist  = document.getElementById('subArtist');
const subUrl     = document.getElementById('subUrl');
const subMsg     = document.getElementById('subMsg');

submitBtn.addEventListener('click', () => overlay.classList.add('open'));
modalClose.addEventListener('click', closeModal);
overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

function closeModal() {
  overlay.classList.remove('open');
  subTitle.value = '';
  subArtist.value = '';
  subUrl.value = '';
  subMsg.textContent = '';
  subMsg.className = 'modal-msg';
}

subConfirm.addEventListener('click', async () => {
  const title  = subTitle.value.trim();
  const artist = subArtist.value.trim();
  const url    = subUrl.value.trim();

  if (!title || !artist || !url) {
    setMsg('fill everything in', 'err'); return;
  }
  if (!url.startsWith('http')) {
    setMsg('needs a full url (https://...)', 'err'); return;
  }

  subConfirm.disabled = true;
  setMsg('submitting...', '');

  try {
    const res  = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, artist, url }),
    });
    const data = await res.json();
    if (data.ok) {
      setMsg('submitted! go vote for it in pending', 'ok');
      subTitle.value = '';
      subArtist.value = '';
      subUrl.value = '';
    } else {
      setMsg(data.error || 'something went wrong', 'err');
    }
  } catch (_) {
    setMsg('could not reach server', 'err');
  }

  subConfirm.disabled = false;
});

function setMsg(text, type) {
  subMsg.textContent  = text;
  subMsg.className    = 'modal-msg' + (type ? ' ' + type : '');
}

// ── pending list ──
async function loadPending() {
  const list = document.getElementById('pendingList');
  const countEl = document.getElementById('pendingCount');

  try {
    const res  = await fetch('/api/pending');
    const data = await res.json();

    countEl.textContent = data.length || '';

    if (!data.length) {
      list.innerHTML = `
        <div class="playlist-empty">
          <p class="vt empty-big">EMPTY</p>
          <p class="empty-sub">no submissions yet.<br>be the first.</p>
        </div>`;
      return;
    }

    const voted = getVoted();
    list.innerHTML = '';

    data.forEach(song => {
      const hasVoted = voted.includes(song.id);
      const pct      = Math.min(100, Math.round((song.votes / VOTE_THRESHOLD) * 100));

      const el = document.createElement('div');
      el.className    = 'pend-item';
      el.dataset.id   = song.id;
      el.innerHTML = `
        <div class="pend-details">
          <div class="pend-name">${esc(song.title)}</div>
          <div class="pend-by">${esc(song.artist)}</div>
          <div class="vote-bar-wrap">
            <div class="vote-bar" style="width:${pct}%"></div>
          </div>
        </div>
        <div class="vote-wrap">
          <button class="vote-btn" data-id="${song.id}" ${hasVoted ? 'disabled' : ''} title="upvote">▲</button>
          <span class="vote-count">${song.votes}/${VOTE_THRESHOLD}</span>
        </div>
      `;
      list.appendChild(el);
    });

    list.querySelectorAll('.vote-btn:not(:disabled)').forEach(btn => {
      btn.addEventListener('click', () => handleVote(btn));
    });

  } catch (_) {
    list.innerHTML = `<div class="playlist-empty"><p class="empty-sub">could not load submissions</p></div>`;
  }
}

async function handleVote(btn) {
  const id = parseInt(btn.dataset.id);
  btn.disabled = true;

  try {
    const res  = await fetch(`/api/vote/${id}`, { method: 'POST' });
    const data = await res.json();

    if (data.error) { btn.disabled = false; return; }

    // save vote to localStorage
    saveVote(id);

    // update count display
    const wrap = btn.closest('.pend-item');
    wrap.querySelector('.vote-count').textContent = `${data.votes}/${VOTE_THRESHOLD}`;
    const pct = Math.min(100, Math.round((data.votes / VOTE_THRESHOLD) * 100));
    wrap.querySelector('.vote-bar').style.width = pct + '%';

    if (data.approved) {
      wrap.style.opacity = '0.4';
      wrap.querySelector('.pend-name').textContent += '  ✓ approved';
      // reload playlist after a moment
      setTimeout(() => location.reload(), 1200);
    }
  } catch (_) {
    btn.disabled = false;
  }
}

// ── localStorage vote tracking ──
function getVoted() {
  try { return JSON.parse(localStorage.getItem(VOTED_KEY) || '[]'); }
  catch (_) { return []; }
}

function saveVote(id) {
  const voted = getVoted();
  if (!voted.includes(id)) voted.push(id);
  localStorage.setItem(VOTED_KEY, JSON.stringify(voted));
}

// ── escape html ──
function esc(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
