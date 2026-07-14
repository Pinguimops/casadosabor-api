/*-----------------------------------*\
  #parallax.js
  — subtle parallax on data-parallax-item
    elements (used in About section)
\*-----------------------------------*/

(function () {
  "use strict";

  const parallaxItems = document.querySelectorAll("[data-parallax-item]");

  if (!parallaxItems.length) return;

  window.addEventListener("scroll", () => {
    parallaxItems.forEach((item) => {
      const speed  = parseFloat(item.dataset.parallaxSpeed) || 1;
      const offset = window.scrollY * speed * 0.08;
      item.style.transform = `translateY(${offset}px)`;
    });
  });
})();
