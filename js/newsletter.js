/*-----------------------------------*\
  #newsletter.js
  — validates and "submits" the
    footer newsletter form
\*-----------------------------------*/

(function () {
  "use strict";

  const form = document.querySelector(".footer-brand form");

  if (!form) return;

  /* ── Inject feedback element ────────────────────── */
  let feedback = form.nextElementSibling;
  if (!feedback || !feedback.classList.contains("newsletter-feedback")) {
    feedback = document.createElement("p");
    feedback.className = "newsletter-feedback";
    form.parentNode.insertBefore(feedback, form.nextSibling);
  }

  function showFeedback(type, msg) {
    feedback.className = `newsletter-feedback ${type}`;
    feedback.textContent = msg;

    setTimeout(() => {
      feedback.className = "newsletter-feedback";
      feedback.textContent = "";
    }, 5000);
  }

  function isValidEmail(val) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const emailInput = form.querySelector("[name=email_address]");
    const email = emailInput ? emailInput.value : "";

    if (!email || !isValidEmail(email)) {
      showFeedback("error", "Por favor insira um email válido.");
      return;
    }

    showFeedback("success", `Subscrito com sucesso! Receberá 25% de desconto em breve.`);
    form.reset();
  });
})();
