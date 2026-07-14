/*-----------------------------------*\
  #login.js
  — modal open/close, sign-in, sign-up,
    logout, session persistence via
    localStorage
\*-----------------------------------*/

(function () {
  "use strict";

  const STORAGE_KEY = "casaDoSaborUsers";
  const SESSION_KEY = "casaDoSaborSession";

  /* ── Storage helpers ────────────────────────────── */
  function getUsers() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch (e) { return {}; }
  }

  function saveUsers(users) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  }

  function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)) || null; }
    catch (e) { return null; }
  }

  function saveSession(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  /* ── DOM helpers ────────────────────────────────── */
  function $(id) { return document.getElementById(id); }

  function setError(id, msg) {
    const el = $(id);
    if (el) { el.textContent = msg; }
  }

  function clearErrors() {
    ["signInError", "signUpError"].forEach((id) => setError(id, ""));
  }

  /* ── Modal open / close ─────────────────────────── */
  window.openLoginModal = function () {
    $("loginModalBackdrop").classList.add("open");
    document.body.classList.add("modal-open");
    $("loginModal").classList.remove("active");   // start on sign-in
    clearErrors();
  };

  window.closeLoginModal = function () {
    $("loginModalBackdrop").classList.remove("open");
    document.body.classList.remove("modal-open");
    clearErrors();
  };

  window.handleBackdropClick = function (e) {
    if (e.target === $("loginModalBackdrop")) closeLoginModal();
  };

  /* ── Toggle sign-in / sign-up ───────────────────── */
  window.toggleLoginModal = function (showSignUp) {
    const modal = $("loginModal");
    showSignUp ? modal.classList.add("active") : modal.classList.remove("active");
    clearErrors();
  };

  /* ── Sign In ────────────────────────────────────── */
  window.handleSignIn = function () {
    const email    = $("signInEmail").value.trim().toLowerCase();
    const password = $("signInPassword").value;

    setError("signInError", "");

    if (!email || !password) {
      setError("signInError", "Por favor preencha todos os campos.");
      return;
    }

    const users = getUsers();

    if (!users[email]) {
      setError("signInError", "Email não encontrado. Crie uma conta primeiro.");
      return;
    }

    if (users[email].password !== btoa(password)) {
      setError("signInError", "Palavra-passe incorreta. Tente novamente.");
      return;
    }

    saveSession({ email, name: users[email].name });
    closeLoginModal();
    updateHeaderAuth();
    if (typeof window.onLoginSuccess === "function") window.onLoginSuccess();
  };

  /* ── Sign Up ────────────────────────────────────── */
  window.handleSignUp = function () {
    const name     = $("signUpName").value.trim();
    const email    = $("signUpEmail").value.trim().toLowerCase();
    const password = $("signUpPassword").value;

    setError("signUpError", "");

    if (!name || !email || !password) {
      setError("signUpError", "Por favor preencha todos os campos.");
      return;
    }

    if (!email.includes("@") || !email.includes(".")) {
      setError("signUpError", "Por favor insira um email válido.");
      return;
    }

    if (password.length < 6) {
      setError("signUpError", "A palavra-passe deve ter pelo menos 6 caracteres.");
      return;
    }

    const users = getUsers();

    if (users[email]) {
      setError("signUpError", "Este email já está registado. Faça login.");
      return;
    }

    users[email] = { name, password: btoa(password) };
    saveUsers(users);
    saveSession({ email, name });
    closeLoginModal();
    updateHeaderAuth();
    if (typeof window.onLoginSuccess === "function") window.onLoginSuccess();
  };

  /* ── Sign Out ───────────────────────────────────── */
  window.handleSignOut = function () {
    clearSession();
    updateHeaderAuth();
  };

  /* ── Update header auth area ────────────────────── */
  function updateHeaderAuth() {
    const session = getSession();
    const area    = $("headerAuthArea");
    if (!area) return;

    const userSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>`;

    if (session) {
      const firstName = session.name.split(" ")[0];
      area.innerHTML = `
        <div class="header-user-info">
          <button class="btn-login-icon" onclick="openLoginModal()" aria-label="Conta" title="Olá, ${firstName}" style="color:var(--gold-crayola)">
            ${userSVG}
          </button>
          <span class="user-name">Olá, ${firstName}</span>
          <button class="btn-logout-small" onclick="handleSignOut()">Sair</button>
        </div>`;
    } else {
      area.innerHTML = `
        <button class="btn-login-icon" onclick="openLoginModal()" aria-label="Entrar na conta" title="Entrar / Registar">
          ${userSVG}
        </button>`;
    }
  }

  /* ── Keyboard: close on Escape ──────────────────── */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeLoginModal();
  });

  /* ── Allow Enter key inside inputs ─────────────── */
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;

    const active = $("loginModal");
    if (!active) return;

    if (active.classList.contains("active")) {
      handleSignUp();
    } else {
      handleSignIn();
    }
  });

  /* ── Init ───────────────────────────────────────── */
  document.addEventListener("DOMContentLoaded", updateHeaderAuth);window.updateHeaderAuth = updateHeaderAuth;
document.addEventListener("DOMContentLoaded", updateHeaderAuth);
})();
