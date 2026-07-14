/*-----------------------------------*\
  #backtotop.js
\*-----------------------------------*/

(function () {
  "use strict";

  const backTopBtn = document.querySelector("[data-back-top-btn]");

  if (!backTopBtn) return;

  window.addEventListener("scroll", () => {
    if (window.scrollY > 300) {
      backTopBtn.classList.add("active");
    } else {
      backTopBtn.classList.remove("active");
    }
  });
})();
