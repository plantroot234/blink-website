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
const playlist    = document.getElementById('playlist');
const trackCount  = document.getElementById('trackCount');
const liveCounter = document.getElementById('liveCounter');

let currentIndex = 0;
let shuffling    = false;
let repeating    = false;
let isPlaying    = false;
let shuffled     = [];

async function init() {
  // merge static songs with API-approved songs
  let allSongs = window.songs ? [...songs] : [];

  try {
    const res = await fetch('/api/approved');
    if (res.ok) {
      const approved = await res.json();
      approved.forEach(s => allSongs.push({ title: s.title, artist: s.artist, src: s.url }));
    }
  } catch (_) {}

  // replace global songs with merged list
  window.songs = allSongs;

  if (!allSongs.length) return;

  trackCount.textContent = allSongs.length;
  buildShuffleOrder();
  renderPlaylist();
  loadTrack(0, false);
}

function buildShuffleOrder() {
  shuffled = songs.map((_, i) => i);
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
}

function renderPlaylist() {
  playlist.innerHTML = '';
  songs.forEach((s, i) => {
    const el = document.createElement('div');
    el.className = 'pl-item' + (i === currentIndex ? ' active' : '');
    el.dataset.i = i;
    el.innerHTML = `
      <span class="pl-num vt">
        <span class="pl-num-static">${String(i + 1).padStart(2, '0')}</span>
        <span class="pl-num-playing">▶</span>
      </span>
      <div class="pl-details">
        <div class="pl-name">${s.title}</div>
        <div class="pl-by">${s.artist}</div>
      </div>
      ${s.duration ? `<span class="pl-dur vt">${s.duration}</span>` : ''}
    `;
    el.addEventListener('click', () => loadTrack(i, true));
    playlist.appendChild(el);
  });
}

function loadTrack(index, autoPlay = true) {
  currentIndex = index;
  const s = songs[index];

  audio.src = s.src;
  trackTitle.textContent  = s.title;
  trackArtist.textContent = s.artist;
  document.title          = `${s.title} — STATIC`;

  // cover art
  if (s.cover) {
    coverImg.src = s.cover;
    document.body.classList.add('has-cover');
  } else {
    document.body.classList.remove('has-cover');
  }

  // active playlist item
  document.querySelectorAll('.pl-item').forEach((el, i) => {
    el.classList.toggle('active', i === index);
  });

  const active = playlist.querySelector('.pl-item.active');
  if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

  // title scroll for long names
  trackTitle.classList.remove('scroll');
  // check after render
  requestAnimationFrame(() => {
    if (trackTitle.scrollWidth > trackTitle.parentElement.offsetWidth + 4) {
      trackTitle.classList.add('scroll');
    }
  });

  seekFill.style.width = '0%';
  seekInput.value      = 0;
  timeNow.textContent  = '0:00';
  timeTotal.textContent = '0:00';

  if (autoPlay) play();
  else pause();
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
  if (!songs || !songs.length) return;
  isPlaying ? pause() : play();
}

function goNext() {
  if (!songs.length) return;
  let next;
  if (shuffling) {
    const pos = shuffled.indexOf(currentIndex);
    next = shuffled[(pos + 1) % shuffled.length];
  } else {
    next = (currentIndex + 1) % songs.length;
  }
  loadTrack(next, isPlaying);
}

function goPrev() {
  if (!songs.length) return;
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }
  let prev;
  if (shuffling) {
    const pos = shuffled.indexOf(currentIndex);
    prev = shuffled[(pos - 1 + shuffled.length) % shuffled.length];
  } else {
    prev = (currentIndex - 1 + songs.length) % songs.length;
  }
  loadTrack(prev, isPlaying);
}

function fmt(s) {
  if (isNaN(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
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
  if (repeating) {
    audio.currentTime = 0;
    play();
  } else {
    goNext();
  }
});

// ── seek ──
seekInput.addEventListener('input', () => {
  if (!audio.duration) return;
  const pct = seekInput.value;
  seekFill.style.width = pct + '%';
  audio.currentTime    = (pct / 100) * audio.duration;
});

// ── volume ──
audio.volume = 0.8;
volSlider.addEventListener('input', () => {
  audio.volume = volSlider.value;
});

// ── controls ──
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

// ── keyboard shortcuts ──
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  switch (e.key) {
    case ' ':
      e.preventDefault();
      togglePlay();
      break;
    case 'ArrowRight':
      e.preventDefault();
      goNext();
      break;
    case 'ArrowLeft':
      e.preventDefault();
      goPrev();
      break;
    case 'ArrowUp':
      e.preventDefault();
      audio.volume = Math.min(1, audio.volume + 0.05);
      volSlider.value = audio.volume;
      break;
    case 'ArrowDown':
      e.preventDefault();
      audio.volume = Math.max(0, audio.volume - 0.05);
      volSlider.value = audio.volume;
      break;
  }
});

init();
