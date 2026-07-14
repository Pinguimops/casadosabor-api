/*-----------------------------------*\
  #reservation.js
  — validates and "submits" the
    reservation form (client-side demo)
\*-----------------------------------*/

(function () {
  "use strict";

  const form = document.querySelector(".reservation-form form");

  if (!form) return;

  /* ── Inject feedback element ────────────────────── */
  let feedback = form.querySelector(".form-feedback");
  if (!feedback) {
    feedback = document.createElement("div");
    feedback.className = "form-feedback";
    form.insertBefore(feedback, form.querySelector("button[type=submit]"));
  }

  function showFeedback(type, msg) {
    feedback.className = `form-feedback ${type}`;
    feedback.textContent = msg;

    if (type === "success") {
      setTimeout(() => {
        feedback.className = "form-feedback";
        feedback.textContent = "";
      }, 5000);
    }
  }

  /* ── Validation helpers ─────────────────────────── */
  function isEmpty(val) { return !val || val.trim() === ""; }

  function isValidPhone(val) { return /^[\d\s\+\-\(\)]{7,}$/.test(val.trim()); }

  function isFutureDate(val) {
    const chosen = new Date(val);
    const today  = new Date();
    today.setHours(0, 0, 0, 0);
    return chosen >= today;
  }

  /* ── Submit handler ─────────────────────────────── */
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const name  = form.querySelector("[name=name]").value;
    const phone = form.querySelector("[name=phone]").value;
    const date  = form.querySelector("[name=reservation-date]").value;

    if (isEmpty(name)) {
      showFeedback("error", "Por favor insira o seu nome.");
      return;
    }

    if (isEmpty(phone) || !isValidPhone(phone)) {
      showFeedback("error", "Por favor insira um número de telefone válido.");
      return;
    }

    if (isEmpty(date)) {
      showFeedback("error", "Por favor selecione uma data.");
      return;
    }

    if (!isFutureDate(date)) {
      showFeedback("error", "Por favor escolha uma data futura.");
      return;
    }

    /* All good — simulate sending */
    showFeedback(
      "success",
      `Obrigado, ${name.trim()}! A sua reserva foi recebida. Confirmaremos pelo número ${phone.trim()}.`
    );
    form.reset();
  });
})();
