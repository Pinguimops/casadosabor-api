/*-----------------------------------*\
  #hero.js
  — auto-advancing hero slider with
    prev / next buttons
\*-----------------------------------*/

(function () {
  "use strict";

  const sliderItems = document.querySelectorAll("[data-hero-slider-item]");
  const prevBtn     = document.querySelector("[data-prev-btn]");
  const nextBtn     = document.querySelector("[data-next-btn]");

  if (!sliderItems.length) return;

  let currentIndex  = 0;
  let autoSlideTimer;
  const INTERVAL    = 5000; // ms

  function goTo(index) {
    sliderItems[currentIndex].classList.remove("active");
    currentIndex = (index + sliderItems.length) % sliderItems.length;
    sliderItems[currentIndex].classList.add("active");
  }

  function startAuto() {
    clearInterval(autoSlideTimer);
    autoSlideTimer = setInterval(() => goTo(currentIndex + 1), INTERVAL);
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      goTo(currentIndex - 1);
      startAuto();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      goTo(currentIndex + 1);
      startAuto();
    });
  }

  startAuto();
})();
