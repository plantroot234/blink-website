// ── tab switching ──
document.querySelectorAll('.stab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.stab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('pane-' + btn.dataset.tab).classList.add('active');
  });
});

// ── discover tab ──
function renderDiscover() {
  const list = document.getElementById('discoverList');
  if (!list) return;

  const songs = window.discoverSongs || [];

  if (!songs.length) {
    list.innerHTML = `
      <div class="playlist-empty">
        <p class="vt empty-big">NOTHING</p>
        <p class="empty-sub">add files to songs/ folder<br>and update songs.js</p>
      </div>`;
    return;
  }

  list.innerHTML = '';
  songs.forEach((s, i) => {
    const inQueue  = window.getQueue().some(q => q.src === s.src);
    const el       = document.createElement('div');
    el.className   = 'disc-item';
    el.dataset.src = s.src;
    el.innerHTML   = `
      <span class="pl-num vt">${String(i + 1).padStart(2, '0')}</span>
      <div class="pl-details">
        <div class="pl-name">${esc(s.title)}</div>
        <div class="pl-by">${esc(s.artist)}</div>
      </div>
      <button class="disc-heart ${inQueue ? 'loved' : ''}" title="${inQueue ? 'Remove from playlist' : 'Add to playlist'}">
        ${inQueue ? '♥' : '♡'}
      </button>
    `;

    el.querySelector('.pl-details').addEventListener('click', () => {
      // click title = add and immediately play
      if (!window.getQueue().some(q => q.src === s.src)) {
        window.addToQueue(s);
      }
      // switch to playlist tab and play this song
      const playlistTab = document.querySelector('.stab[data-tab="playlist"]');
      if (playlistTab) playlistTab.click();
      const idx = window.getQueue().findIndex(q => q.src === s.src);
      if (idx >= 0 && window.playTrack) window.playTrack(idx);
    });

    el.querySelector('.disc-heart').addEventListener('click', e => {
      e.stopPropagation();
      const inQ = window.getQueue().some(q => q.src === s.src);
      if (inQ) {
        window.removeFromQueue(s.src);
      } else {
        window.addToQueue(s);
      }
      renderDiscover(); // refresh heart states
    });

    list.appendChild(el);
  });
}

// expose so app.js can trigger a refresh when queue changes
window.refreshDiscover = renderDiscover;

// expose playTrack
window.playTrack = function(idx) {
  if (window._loadTrack) window._loadTrack(idx, true);
};

// run on load
renderDiscover();

function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
