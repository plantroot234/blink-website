const audio       = document.getElementById('audio');
const btnPlay     = document.getElementById('btnPlay');
const btnPrev     = document.getElementById('btnPrev');
const btnNext     = document.getElementById('btnNext');
const btnShuffle  = document.getElementById('btnShuffle');
const btnRepeat   = document.getElementById('btnRepeat');
const trackTitle  = document.getElementById('trackTitle');
const trackArtist = document.getElementById('trackArtist');
const coverImg    = document.getElementById('coverImg');
const seekFill    = document.getElementById('seekFill');
const seekInput   = document.getElementById('seekInput');
const timeNow     = document.getElementById('timeNow');
const timeTotal   = document.getElementById('timeTotal');
const volSlider   = document.getElementById('volSlider');
const playlistEl  = document.getElementById('playlist');
const trackCount  = document.getElementById('trackCount');
const liveCounter = document.getElementById('liveCounter');

const QUEUE_KEY = 'blink_queue';

let queue      = [];   // songs currently in playlist
let currentIdx = 0;
let shuffling  = false;
let repeating  = false;
let isPlaying  = false;
let shuffled   = [];

// ── queue persistence ──
function loadQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); }
  catch (_) { return []; }
}

function saveQueue() {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

function addToQueue(song) {
  if (queue.find(s => s.src === song.src)) return; // already in queue
  queue.push(song);
  saveQueue();
  renderPlaylist();
  trackCount.textContent = queue.length || '';
  if (queue.length === 1) loadTrack(0, false);
}

function removeFromQueue(src) {
  const wasIdx = queue.findIndex(s => s.src === src);
  queue = queue.filter(s => s.src !== src);
  saveQueue();
  renderPlaylist();
  trackCount.textContent = queue.length || '';
  if (!queue.length) {
    resetPlayer();
    return;
  }
  if (wasIdx <= currentIdx) {
    currentIdx = Math.max(0, currentIdx - 1);
  }
}

function resetPlayer() {
  audio.src = '';
  trackTitle.textContent  = 'nothing yet';
  trackArtist.textContent = 'heart songs from discover';
  document.body.classList.remove('has-cover', 'playing');
  btnPlay.classList.remove('playing');
  document.title = 'BLINK';
  seekFill.style.width = '0%';
  timeNow.textContent   = '0:00';
  timeTotal.textContent = '0:00';
  isPlaying = false;
}

// expose globally so discover tab can call them
window.addToQueue      = addToQueue;
window.removeFromQueue = removeFromQueue;
window.getQueue        = () => queue;
window._loadTrack      = loadTrack;

// ── init ──
function init() {
  queue = loadQueue();

  // first visit with empty queue — auto-load all discover songs
  if (!queue.length && window.discoverSongs && discoverSongs.length) {
    queue = [...discoverSongs];
    saveQueue();
  }

  renderPlaylist();
  trackCount.textContent = queue.length || '';

  if (queue.length) {
    buildShuffleOrder();
    loadTrack(0, false);
  } else {
    resetPlayer();
  }
}

function buildShuffleOrder() {
  shuffled = queue.map((_, i) => i);
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
}

function renderPlaylist() {
  if (!queue.length) {
    playlistEl.innerHTML = `
      <div class="playlist-empty">
        <p class="vt empty-big">EMPTY</p>
        <p class="empty-sub">heart songs from discover<br>to build your playlist</p>
      </div>`;
    return;
  }

  playlistEl.innerHTML = '';
  queue.forEach((s, i) => {
    const el = document.createElement('div');
    el.className = 'pl-item' + (i === currentIdx ? ' active' : '');
    el.innerHTML = `
      <span class="pl-num vt">
        <span class="pl-num-static">${String(i + 1).padStart(2, '0')}</span>
        <span class="pl-num-playing">▶</span>
      </span>
      <div class="pl-details">
        <div class="pl-name">${esc(s.title)}</div>
        <div class="pl-by">${esc(s.artist)}</div>
      </div>
      <button class="pl-remove" data-src="${esc(s.src)}" title="Remove">♥</button>
    `;
    el.querySelector('.pl-details').addEventListener('click', () => loadTrack(i, true));
    el.querySelector('.pl-remove').addEventListener('click', e => {
      e.stopPropagation();
      removeFromQueue(s.src);
      if (window.refreshDiscover) window.refreshDiscover();
    });
    playlistEl.appendChild(el);
  });
}

function loadTrack(index, autoPlay = true) {
  if (!queue.length) return;
  currentIdx = index;
  const s = queue[index];

  audio.src           = s.src;
  trackTitle.textContent  = s.title;
  trackArtist.textContent = s.artist;
  document.title          = `${s.title} — BLINK`;

  if (s.cover) {
    coverImg.src = s.cover;
    document.body.classList.add('has-cover');
  } else {
    document.body.classList.remove('has-cover');
  }

  document.querySelectorAll('.pl-item').forEach((el, i) => {
    el.classList.toggle('active', i === index);
  });

  const active = playlistEl.querySelector('.pl-item.active');
  if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

  trackTitle.classList.remove('scroll');
  requestAnimationFrame(() => {
    if (trackTitle.scrollWidth > trackTitle.parentElement.offsetWidth + 4)
      trackTitle.classList.add('scroll');
  });

  seekFill.style.width  = '0%';
  seekInput.value       = 0;
  timeNow.textContent   = '0:00';
  timeTotal.textContent = '0:00';

  if (autoPlay) play(); else pause();
}

function play() {
  audio.play().catch(() => {});
  isPlaying = true;
  btnPlay.classList.add('playing');
  document.body.classList.add('playing');
}

function pause() {
  audio.pause();
  isPlaying = false;
  btnPlay.classList.remove('playing');
  document.body.classList.remove('playing');
}

function togglePlay() {
  if (!queue.length) return;
  isPlaying ? pause() : play();
}

function goNext() {
  if (!queue.length) return;
  let next = shuffling
    ? shuffled[(shuffled.indexOf(currentIdx) + 1) % shuffled.length]
    : (currentIdx + 1) % queue.length;
  loadTrack(next, isPlaying);
}

function goPrev() {
  if (!queue.length) return;
  if (audio.currentTime > 3) { audio.currentTime = 0; return; }
  let prev = shuffling
    ? shuffled[(shuffled.indexOf(currentIdx) - 1 + shuffled.length) % shuffled.length]
    : (currentIdx - 1 + queue.length) % queue.length;
  loadTrack(prev, isPlaying);
}

function fmt(s) {
  if (isNaN(s) || s < 0) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── audio events ──
audio.addEventListener('timeupdate', () => {
  if (!audio.duration) return;
  const pct = (audio.currentTime / audio.duration) * 100;
  seekFill.style.width    = pct + '%';
  seekInput.value         = pct;
  timeNow.textContent     = fmt(audio.currentTime);
  liveCounter.textContent = `▶ ${fmt(audio.currentTime)}`;
});

audio.addEventListener('loadedmetadata', () => {
  timeTotal.textContent = fmt(audio.duration);
});

audio.addEventListener('ended', () => {
  if (repeating) { audio.currentTime = 0; play(); }
  else goNext();
});

seekInput.addEventListener('input', () => {
  if (!audio.duration) return;
  seekFill.style.width = seekInput.value + '%';
  audio.currentTime    = (seekInput.value / 100) * audio.duration;
});

audio.volume = 0.8;
volSlider.addEventListener('input', () => { audio.volume = volSlider.value; });

btnPlay.addEventListener('click', togglePlay);
btnNext.addEventListener('click', goNext);
btnPrev.addEventListener('click', goPrev);

btnShuffle.addEventListener('click', () => {
  shuffling = !shuffling;
  btnShuffle.classList.toggle('active', shuffling);
  if (shuffling) buildShuffleOrder();
});

btnRepeat.addEventListener('click', () => {
  repeating = !repeating;
  btnRepeat.classList.toggle('active', repeating);
});

document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  switch (e.key) {
    case ' ':          e.preventDefault(); togglePlay(); break;
    case 'ArrowRight': e.preventDefault(); goNext(); break;
    case 'ArrowLeft':  e.preventDefault(); goPrev(); break;
    case 'ArrowUp':    e.preventDefault(); audio.volume = Math.min(1, audio.volume + 0.05); volSlider.value = audio.volume; break;
    case 'ArrowDown':  e.preventDefault(); audio.volume = Math.max(0, audio.volume - 0.05); volSlider.value = audio.volume; break;
  }
});

init();
