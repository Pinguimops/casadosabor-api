/*-----------------------------------*\
  #header.js
  — sticky header, hide-on-scroll-down,
    mobile navbar toggle
\*-----------------------------------*/

(function () {
  "use strict";

  const header      = document.querySelector("[data-header]");
  const navTogglers = document.querySelectorAll("[data-nav-toggler]");
  const navbar      = document.querySelector("[data-navbar]");
  const overlay     = document.querySelector("[data-overlay]");

  // ── Sticky + hide on scroll ─────────────────────────
  let lastScrollY = window.scrollY;

  window.addEventListener("scroll", () => {
    if (window.scrollY > 100) {
      header.classList.add("active");
    } else {
      header.classList.remove("active");
    }

    if (window.scrollY > lastScrollY) {
      header.classList.add("hide");
    } else {
      header.classList.remove("hide");
    }

    lastScrollY = window.scrollY;
  });

  // ── Mobile nav open/close ───────────────────────────
  function toggleNav() {
    navbar.classList.toggle("active");
    overlay.classList.toggle("active");
    document.body.classList.toggle("nav-active");
  }

  navTogglers.forEach((btn) => btn.addEventListener("click", toggleNav));

  // ── Active navbar link on scroll ───────────────────
  const sections     = document.querySelectorAll("section[id]");
  const navbarLinks  = document.querySelectorAll(".navbar-link");

  window.addEventListener("scroll", () => {
    let current = "";

    sections.forEach((section) => {
      const sectionTop = section.offsetTop - 200;
      if (window.scrollY >= sectionTop) current = section.id;
    });

    navbarLinks.forEach((link) => {
      link.classList.remove("active");
      if (link.getAttribute("href") === `#${current}`) {
        link.classList.add("active");
      }
    });
  });
})();
