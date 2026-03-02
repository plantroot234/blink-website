// Replace this URL with your Stripe Payment Link
// Dashboard → Payment Links → Create link → copy the https://buy.stripe.com/... URL
const STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/REPLACE_ME';

function checkout(plan) {
  window.location.href = STRIPE_PAYMENT_LINK;
}

// ── Auth modal ────────────────────────────────────────────────────────────────
const { createClient } = supabase;
const sb = createClient(
  'https://fyuqjigcnmknumvaslbc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5dXFqaWdjbm1rbnVtdmFzbGJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0MjcwNjcsImV4cCI6MjA4ODAwMzA2N30.JKVHOYbxFf8G6SJZgY8bDyEfVoZmXvpbTVPXrFD85YY'
);

let modalIsSignUp = false;

// Update nav button if already logged in
sb.auth.getSession().then(({ data }) => {
  if (data.session) {
    const btn = document.getElementById('nav-auth-btn');
    if (btn) {
      btn.textContent = 'Dashboard';
      btn.onclick = () => { window.location.href = 'dashboard.html'; };
    }
  }
});

function openModal() {
  document.getElementById('modal-bg').style.display = 'block';
  document.getElementById('modal').style.display = 'block';
  setModalMode('in');
}

function closeModal() {
  document.getElementById('modal-bg').style.display = 'none';
  document.getElementById('modal').style.display = 'none';
  document.getElementById('m-msg').textContent = '';
}

function setModalMode(mode) {
  modalIsSignUp = mode === 'up';
  document.getElementById('mtab-in').style.background = modalIsSignUp ? 'transparent' : 'var(--accent)';
  document.getElementById('mtab-in').style.color = modalIsSignUp ? 'var(--muted)' : '#000';
  document.getElementById('mtab-up').style.background = modalIsSignUp ? 'var(--accent)' : 'transparent';
  document.getElementById('mtab-up').style.color = modalIsSignUp ? '#000' : 'var(--muted)';
  document.getElementById('m-btn').textContent = modalIsSignUp ? 'Sign Up' : 'Sign In';
  document.getElementById('m-msg').textContent = '';
}

async function modalSubmit() {
  const email    = document.getElementById('m-email').value.trim();
  const password = document.getElementById('m-password').value;
  const btn      = document.getElementById('m-btn');
  const msg      = document.getElementById('m-msg');

  if (!email || !password) { msg.style.color = '#ff5555'; msg.textContent = 'Fill in all fields.'; return; }
  if (password.length < 6) { msg.style.color = '#ff5555'; msg.textContent = 'Password must be at least 6 characters.'; return; }

  btn.disabled = true;
  btn.textContent = 'Please wait…';
  msg.textContent = '';

  if (modalIsSignUp) {
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) {
      msg.style.color = '#ff5555';
      msg.textContent = error.status === 429 ? 'Too many attempts. Wait a moment.' : error.message;
    } else if (data.user?.identities?.length === 0) {
      msg.style.color = '#ff5555';
      msg.textContent = 'An account with this email already exists. Please sign in.';
      setModalMode('in');
    } else {
      msg.style.color = '#55ff99';
      msg.textContent = 'Check your email for a confirmation link.';
    }
  } else {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      msg.style.color = '#ff5555';
      if (error.status === 429)                              msg.textContent = 'Too many attempts. Wait a moment.';
      else if (error.message.toLowerCase().includes('invalid')) msg.textContent = 'Wrong email or password.';
      else if (error.message.toLowerCase().includes('confirm')) msg.textContent = 'Please confirm your email first.';
      else                                                    msg.textContent = error.message;
    } else {
      window.location.href = 'dashboard.html';
    }
  }

  btn.disabled = false;
  btn.textContent = modalIsSignUp ? 'Sign Up' : 'Sign In';
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
  if (e.key === 'Enter' && document.getElementById('modal').style.display === 'block') modalSubmit();
});
