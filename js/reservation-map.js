/*-----------------------------------*\
  #reservation-map.js
  Fixes:
  1. Login required before opening floor plan
  2. Tables remain clickable after a booking
     (only the booked date+time is blocked)
  3. Slot blocking is per-table + per-date
\*-----------------------------------*/
(function () {
  "use strict";

  /* ─────────────────────────────────────────────────
     TABLE DATA
  ───────────────────────────────────────────────── */
  const TABLES = [
    {id:1,  row:"zw1", shape:"round", sz:2, occ:false},
    {id:2,  row:"zw1", shape:"round", sz:2, occ:true},
    {id:3,  row:"zw1", shape:"round", sz:4, occ:false},
    {id:4,  row:"zw1", shape:"round", sz:2, occ:false},
    {id:5,  row:"zw1", shape:"round", sz:2, occ:true},
    {id:6,  row:"zw2", shape:"rect",  sz:4, occ:false},
    {id:7,  row:"zw2", shape:"rect",  sz:6, occ:false},
    {id:8,  row:"zw2", shape:"rect",  sz:4, occ:true},
    {id:9,  row:"zm1", shape:"round", sz:4, occ:false},
    {id:10, row:"zm1", shape:"round", sz:4, occ:true},
    {id:11, row:"zm1", shape:"round", sz:6, occ:false},
    {id:12, row:"zm1", shape:"round", sz:4, occ:false},
    {id:13, row:"zm1", shape:"round", sz:4, occ:true},
    {id:14, row:"zm2", shape:"rect",  sz:6, occ:false},
    {id:15, row:"zm2", shape:"rect",  sz:8, occ:false},
    {id:16, row:"zm2", shape:"rect",  sz:6, occ:true},
    {id:17, row:"zt",  shape:"round", sz:2, occ:false},
    {id:18, row:"zt",  shape:"round", sz:2, occ:true},
    {id:19, row:"zt",  shape:"round", sz:4, occ:false},
    {id:20, row:"zt",  shape:"round", sz:2, occ:false},
    {id:21, row:"zt",  shape:"round", sz:2, occ:false},
  ];

  /* Default slots taken regardless of date (demo data) */
  const DEFAULT_TAKEN = {
    1:  ["12:00","20:00"],
    6:  ["13:00","21:00"],
    9:  ["12:30","19:30"],
    14: ["20:30"],
    17: ["12:00"],
  };

  const TIMES = [
    "12:00","12:30","13:00","13:30","14:00","14:30",
    "15:00","15:30","16:00","16:30","17:00","17:30",
    "18:00","18:30","19:00","19:30","20:00","20:30",
    "21:00","21:30","22:00","22:30","23:00","23:30","00:00",
  ];
  const MONTHS = [
    "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
  ];
  const ZONE_LABEL = {
    zw1:"Janela", zw2:"Janela",
    zm1:"Principal", zm2:"Principal",
    zt:"Terraço",
  };

  /* ─────────────────────────────────────────────────
     STATE
  ───────────────────────────────────────────────── */
  let selTable = null, selDate = null, selTime = null, calY, calM;

  /* ─────────────────────────────────────────────────
     HELPERS — bookings stored in localStorage
  ───────────────────────────────────────────────── */
  function getBookings() {
    try { return JSON.parse(localStorage.getItem("casaDoSaborBookings") || "[]"); }
    catch (e) { return []; }
  }

  /** Returns array of times already booked for a given table on a given date */
  function bookedTimesFor(tableId, date) {
    const existing = getBookings()
      .filter(b => b.table === tableId && b.date === date)
      .map(b => b.time);
    const defaults = DEFAULT_TAKEN[tableId] || [];
    return [...new Set([...defaults, ...existing])];
  }

  /* ─────────────────────────────────────────────────
     SESSION CHECK
  ───────────────────────────────────────────────── */
  function getSession() {
    try { return JSON.parse(localStorage.getItem("casaDoSaborSession")) || null; }
    catch (e) { return null; }
  }

  /* ─────────────────────────────────────────────────
     BUILD FLOOR PLAN
  ───────────────────────────────────────────────── */
  function buildFloor() {
    TABLES.forEach(t => {
      const row = document.getElementById(t.row);
      if (!row) return;
      const el  = document.createElement("div");
      el.className = ["t-spot", t.shape, `sz${t.sz}`, t.occ ? "occ" : ""].filter(Boolean).join(" ");
      el.dataset.id = t.id;
      const chairClass = t.shape === "rect" ? " chairs-h" : "";
      el.innerHTML = `<div class="t-top${chairClass}"><span class="t-num">${t.id}</span></div><span class="t-cap">${t.sz} lug.</span>`;
      if (!t.occ) el.addEventListener("click", () => onTableClick(t));
      row.appendChild(el);
    });
  }

  /* ─────────────────────────────────────────────────
     TABLE CLICK — guard login first
  ───────────────────────────────────────────────── */
  function onTableClick(t) {
    if (!getSession()) {
      /* No session — show login modal with a message, then open floor plan after login */
      showLoginPrompt(t);
      return;
    }
    openModal(t);
  }

  /* Show the login modal with a hint, then re-open floor plan on success */
  function showLoginPrompt(pendingTable) {
    /* Store pending table id so we can re-open after login */
    sessionStorage.setItem("pendingTableId", pendingTable.id);

    /* Flash a visible hint above the floor plan */
    let hint = document.getElementById("reservaLoginHint");
    if (!hint) {
      hint = document.createElement("p");
      hint.id = "reservaLoginHint";
      hint.style.cssText = [
        "text-align:center",
        "color:var(--gold-crayola)",
        "font-size:var(--fontSize-label-1)",
        "font-weight:var(--weight-bold)",
        "letter-spacing:.06em",
        "text-transform:uppercase",
        "padding:12px 20px",
        "background:hsla(38,61%,73%,0.08)",
        "border:1px solid hsla(38,61%,73%,0.3)",
        "margin-block-end:20px",
        "max-width:860px",
        "margin-inline:auto",
        "animation:fadeIn .3s ease",
      ].join(";");
      const section = document.getElementById("reserva");
      const container = section && section.querySelector(".container");
      const legend = container && container.querySelector(".floor-legend");
      if (legend) legend.insertAdjacentElement("beforebegin", hint);
    }
    hint.textContent = "⚠ Para reservar uma mesa é necessário ter sessão iniciada. Por favor crie uma conta ou faça login.";
    hint.style.display = "block";

    /* Open the login modal */
    if (typeof openLoginModal === "function") openLoginModal();
  }

  /* Called from login.js after a successful login — check for a pending table */
  window.onLoginSuccess = function () {
    const pendingId = sessionStorage.getItem("pendingTableId");
    if (pendingId) {
      sessionStorage.removeItem("pendingTableId");
      /* Hide the hint */
      const hint = document.getElementById("reservaLoginHint");
      if (hint) hint.style.display = "none";
      /* Find the table data and open the modal */
      const t = TABLES.find(t => t.id === parseInt(pendingId, 10));
      if (t && !t.occ) openModal(t);
    }
  };

  /* ─────────────────────────────────────────────────
     MODAL OPEN / CLOSE
  ───────────────────────────────────────────────── */
  function openModal(t) {
    selTable = t;
    selDate  = null;
    selTime  = null;

    /* Highlight selected table */
    document.querySelectorAll(".t-spot").forEach(e => e.classList.remove("sel"));
    const el = document.querySelector(`.t-spot[data-id="${t.id}"]`);
    if (el) el.classList.add("sel");

    /* Populate header */
    const badge = document.getElementById("bmBadge");
    const sub   = document.getElementById("bmSub");
    if (badge) badge.textContent = `Mesa ${t.id} · ${t.sz} lugares`;
    if (sub)   sub.textContent   = `Zona ${ZONE_LABEL[t.row] || t.row} · ${t.shape === "round" ? "Redonda" : "Rectangular"}`;

    /* Pre-fill guest name from session */
    const session = getSession();
    const nameInput = document.getElementById("bmGuestName");
    if (nameInput) nameInput.value = session ? session.name : "";

    /* Reset state */
    const formScreen    = document.getElementById("bmFormScreen");
    const successScreen = document.getElementById("bmSuccessScreen");
    const feedback      = document.getElementById("bmFeedback");
    const summary       = document.getElementById("bmSummary");
    if (formScreen)    formScreen.style.display = "";
    if (successScreen) successScreen.className = "bm-success-screen";
    if (feedback)      feedback.className = "bm-feedback";
    if (summary)       summary.className = "bm-summary";

    /* Init calendar */
    const now = new Date();
    calY = now.getFullYear();
    calM = now.getMonth();
    renderCal();
    renderTimes();

    /* Open modal */
    const backdrop = document.getElementById("bookingModalBackdrop");
    if (backdrop) backdrop.classList.add("open");
    document.body.classList.add("modal-open");
  }

  window.closeBookingModal = function () {
    const backdrop = document.getElementById("bookingModalBackdrop");
    if (backdrop) backdrop.classList.remove("open");
    document.body.classList.remove("modal-open");
    /* De-select table but leave it CLICKABLE */
    document.querySelectorAll(".t-spot").forEach(e => e.classList.remove("sel"));
    selTable = null;
  };

  document.addEventListener("DOMContentLoaded", () => {
    const bd = document.getElementById("bookingModalBackdrop");
    if (bd) bd.addEventListener("click", e => { if (e.target === bd) window.closeBookingModal(); });
  });

  document.addEventListener("keydown", e => {
    const bd = document.getElementById("bookingModalBackdrop");
    if (e.key === "Escape" && bd && bd.classList.contains("open")) window.closeBookingModal();
  });

  /* ─────────────────────────────────────────────────
     CALENDAR
  ───────────────────────────────────────────────── */
  function renderCal() {
    const lbl = document.getElementById("calMonthLbl");
    if (lbl) lbl.textContent = `${MONTHS[calM]} ${calY}`;

    const container = document.getElementById("calDatesGrid");
    if (!container) return;
    container.innerHTML = "";

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const first = new Date(calY, calM, 1);
    const last  = new Date(calY, calM + 1, 0);
    let dow = first.getDay();
    dow = dow === 0 ? 6 : dow - 1;

    /* Empty prefix cells */
    for (let i = 0; i < dow; i++) {
      const d = document.createElement("div");
      d.className = "cal-day cal-other";
      d.textContent = new Date(calY, calM, -dow + i + 1).getDate();
      container.appendChild(d);
    }

    /* Day cells */
    for (let n = 1; n <= last.getDate(); n++) {
      const dd  = new Date(calY, calM, n); dd.setHours(0, 0, 0, 0);
      const iso = `${calY}-${String(calM + 1).padStart(2, "0")}-${String(n).padStart(2, "0")}`;
      const d   = document.createElement("div");
      const past = dd < today;
      d.className = [
        "cal-day",
        past ? "cal-disabled" : "",
        dd.getTime() === today.getTime() ? "cal-today" : "",
        selDate === iso ? "cal-sel" : "",
      ].filter(Boolean).join(" ");
      d.textContent = n;
      if (!past) d.addEventListener("click", () => pickDate(iso));
      container.appendChild(d);
    }

    /* Trailing empty cells */
    const filled = dow + last.getDate();
    const rem = filled % 7 === 0 ? 0 : 7 - (filled % 7);
    for (let i = 1; i <= rem; i++) {
      const d = document.createElement("div");
      d.className = "cal-day cal-other";
      d.textContent = i;
      container.appendChild(d);
    }
  }

  window.bmCalPrev = function () {
    calM--;
    if (calM < 0) { calM = 11; calY--; }
    renderCal();
  };

  window.bmCalNext = function () {
    calM++;
    if (calM > 11) { calM = 0; calY++; }
    renderCal();
  };

  function pickDate(iso) {
    selDate = iso;
    selTime = null;   /* reset time when date changes */
    renderCal();
    renderTimes();
    updateSummary();
  }

  /* ─────────────────────────────────────────────────
     TIME SLOTS  (blocked per table + per date)
  ───────────────────────────────────────────────── */
  function renderTimes() {
    const grid = document.getElementById("bmTimeGrid");
    if (!grid) return;
    grid.innerHTML = "";

    /* Only look up real bookings once a date is chosen */
    const taken = selTable
      ? (selDate
          ? bookedTimesFor(selTable.id, selDate)
          : DEFAULT_TAKEN[selTable.id] || [])
      : [];

    TIMES.forEach(t => {
      const isTaken = taken.includes(t);
      const b = document.createElement("button");
      b.className = [
        "time-slot",
        isTaken ? "time-taken" : "",
        selTime === t ? "time-sel" : "",
      ].filter(Boolean).join(" ");
      b.textContent = t;
      b.type = "button";
      if (!isTaken) b.addEventListener("click", () => pickTime(t));
      grid.appendChild(b);
    });
  }

  function pickTime(t) {
    selTime = t;
    renderTimes();
    updateSummary();
  }

  /* ─────────────────────────────────────────────────
     SUMMARY STRIP
  ───────────────────────────────────────────────── */
  function updateSummary() {
    const s = document.getElementById("bmSummary");
    if (!s) return;
    if (!selDate && !selTime) { s.className = "bm-summary"; return; }
    s.className = "bm-summary vis";

    const ds = selDate
      ? new Date(selDate + "T12:00").toLocaleDateString("pt-PT", {
          weekday: "short", day: "numeric", month: "short", year: "numeric",
        })
      : "—";

    const tEl = document.getElementById("bmSumTable");
    const dEl = document.getElementById("bmSumDate");
    const hEl = document.getElementById("bmSumTime");
    if (tEl) tEl.textContent = selTable ? `Mesa ${selTable.id} (${ZONE_LABEL[selTable.row]})` : "—";
    if (dEl) dEl.textContent = ds;
    if (hEl) hEl.textContent = selTime ? `${selTime}h` : "—";
  }

  /* ─────────────────────────────────────────────────
     CONFIRM BOOKING
  ───────────────────────────────────────────────── */
  window.confirmBooking = function () {
    const name     = (document.getElementById("bmGuestName")?.value || "").trim();
    const fb       = document.getElementById("bmFeedback");
    if (!fb) return;
    fb.className = "bm-feedback";

    if (!selDate) {
      fb.className = "bm-feedback err";
      fb.textContent = "Por favor selecione uma data.";
      return;
    }
    if (!selTime) {
      fb.className = "bm-feedback err";
      fb.textContent = "Por favor selecione um horário.";
      return;
    }
    if (!name) {
      fb.className = "bm-feedback err";
      fb.textContent = "Por favor introduza o seu nome.";
      return;
    }

    /* Save booking (date + time + table) */
    const bookings = getBookings();
    bookings.push({
      table: selTable.id,
      zone:  ZONE_LABEL[selTable.row],
      cap:   selTable.sz,
      date:  selDate,
      time:  selTime,
      name,
      ts: Date.now(),
    });
    localStorage.setItem("casaDoSaborBookings", JSON.stringify(bookings));

    /* De-select the table visually — but keep it CLICKABLE (do NOT add .occ) */
    document.querySelectorAll(".t-spot").forEach(e => e.classList.remove("sel"));

    /* Show success screen */
    const ds = new Date(selDate + "T12:00").toLocaleDateString("pt-PT", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    const sd = document.getElementById("bmSuccessDetails");
    if (sd) sd.innerHTML = `
      <div class="bm-s-row"><span class="bm-s-key">Nome</span><span class="bm-s-val gold">${name}</span></div>
      <div class="bm-s-row"><span class="bm-s-key">Mesa</span><span class="bm-s-val">Nº ${selTable.id} · ${ZONE_LABEL[selTable.row]}</span></div>
      <div class="bm-s-row"><span class="bm-s-key">Data</span><span class="bm-s-val">${ds}</span></div>
      <div class="bm-s-row"><span class="bm-s-key">Hora</span><span class="bm-s-val">${selTime}h</span></div>
      <div class="bm-s-row"><span class="bm-s-key">Lugares</span><span class="bm-s-val">${selTable.sz} pessoas</span></div>`;

    const formScreen    = document.getElementById("bmFormScreen");
    const successScreen = document.getElementById("bmSuccessScreen");
    if (formScreen)    formScreen.style.display = "none";
    if (successScreen) successScreen.className = "bm-success-screen show";
  };

  window.closeAfterBooking = function () {
    window.closeBookingModal();
  };

  /* ─────────────────────────────────────────────────
     INIT
  ───────────────────────────────────────────────── */
  document.addEventListener("DOMContentLoaded", buildFloor);
})();
