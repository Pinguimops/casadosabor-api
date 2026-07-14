/*-----------------------------------*\
  #cart.js
  Shopping cart: add, remove, qty,
  auto-total, localStorage persistence,
  drawer open/close, checkout
\*-----------------------------------*/
(function () {
  "use strict";

  const CART_KEY = "casaDoSaborCart";

  /* ── State ──────────────────────────────────────── */
  let cart = load();

  /* ── Storage ─────────────────────────────────────── */
  function load() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch (e) { return []; }
  }

  function save() {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }

  /* ── DOM refs ─────────────────────────────────────── */
  function $id(id) { return document.getElementById(id); }

  /* ── Drawer open / close ──────────────────────────── */
  window.openCart = function () {
    $id("cartDrawer")?.classList.add("open");
    $id("cartOverlay")?.classList.add("open");
    document.body.classList.add("modal-open");
    renderCart();
  };

  window.closeCart = function () {
    $id("cartDrawer")?.classList.remove("open");
    $id("cartOverlay")?.classList.remove("open");
    document.body.classList.remove("modal-open");
  };

  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && $id("cartDrawer")?.classList.contains("open")) {
      window.closeCart();
    }
  });

  /* ── Add to cart ──────────────────────────────────── */
  window.addToCart = function (name, price, btn) {
    const existing = cart.find(i => i.name === name);
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({ name, price, qty: 1, id: Date.now() });
    }
    save();
    updateBadge();
    renderCart();

    /* Visual feedback on button */
    if (btn) {
      const orig = btn.innerHTML;
      const iconPath = btn.querySelector(".atc-icon")?.src || "";
      btn.classList.add("added");
      btn.innerHTML = `<img src="${iconPath}" alt="" class="atc-icon"> ✓ Adicionado!`;
      setTimeout(() => {
        btn.classList.remove("added");
        btn.innerHTML = orig;
      }, 1400);
    }

    /* Toast */
    showToast(`"${name}" adicionado ao carrinho`);

    /* Auto-open drawer briefly to show the item was added */
    window.openCart();
  };

  /* ── Remove item ──────────────────────────────────── */
  window.removeFromCart = function (id) {
    cart = cart.filter(i => i.id !== id);
    save();
    updateBadge();
    renderCart();
  };

  /* ── Change quantity ──────────────────────────────── */
  window.changeQty = function (id, delta) {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    item.qty = Math.max(1, item.qty + delta);
    save();
    updateBadge();
    renderCart();
  };

  /* ── Go to checkout page ─────────────────────────── */
  window.goToCheckout = function () {
    if (cart.length === 0) return;
    /* Detect if we're in a subpage */
    const isSubpage = window.location.pathname.includes("/pages/");
    const checkoutPath = isSubpage ? "checkout.html" : "pages/checkout.html";
    window.closeCart();
    window.location.href = checkoutPath;
  };

  /* ── Clear cart ───────────────────────────────────── */
  window.clearCart = function () {
    cart = [];
    save();
    updateBadge();
    renderCart();
  };

  /* ── Compute total ────────────────────────────────── */
  function getTotal() {
    return cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  }

  function getTotalItems() {
    return cart.reduce((sum, i) => sum + i.qty, 0);
  }

  /* ── Update badge ─────────────────────────────────── */
  function updateBadge() {
    const badge = $id("cartBadge");
    if (!badge) return;
    const count = getTotalItems();
    if (count > 0) {
      badge.textContent = count > 99 ? "99+" : count;
      badge.style.display = "flex";
    } else {
      badge.style.display = "none";
    }
  }

  /* ── Render drawer ────────────────────────────────── */
  function renderCart() {
    const list     = $id("cartList");
    const empty    = $id("cartEmpty");
    const footer   = $id("cartFooter");
    const subtotal = $id("cartSubtotal");
    const total    = $id("cartTotal");

    if (!list) return;

    if (cart.length === 0) {
      list.className = "cart-list";
      empty?.classList.remove("hidden");
      if (footer) footer.style.display = "none";
      return;
    }

    empty?.classList.add("hidden");
    list.className = "cart-list visible";
    if (footer) footer.style.display = "block";

    /* Rebuild list items */
    list.innerHTML = "";
    cart.forEach(item => {
      const li = document.createElement("li");
      li.className = "cart-item";
      li.dataset.id = item.id;
      li.innerHTML = `
        <div class="cart-item-info">
          <p class="cart-item-name">${item.name}</p>
          <p class="cart-item-price">${(item.price * item.qty).toFixed(2)}€
            <span style="color:var(--quick-silver);font-weight:400;font-size:1.1rem;">
              (${item.price.toFixed(2)}€ × ${item.qty})
            </span>
          </p>
        </div>
        <div class="cart-item-qty">
          <button class="qty-btn" onclick="changeQty(${item.id}, -1)" aria-label="Diminuir">−</button>
          <span class="qty-num">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty(${item.id}, 1)" aria-label="Aumentar">+</button>
        </div>
        <button class="cart-item-remove" onclick="removeFromCart(${item.id})" aria-label="Remover">✕</button>
      `;
      list.appendChild(li);
    });

    /* Update totals */
    const t = getTotal();
    if (subtotal) subtotal.textContent = t.toFixed(2) + "€";
    if (total)    total.textContent    = t.toFixed(2) + "€";
  }

  /* ── Toast ────────────────────────────────────────── */
  function showToast(msg) {
    const t = $id("cartToast");
    if (!t) return;
    t.textContent = msg;
    t.className = "cart-toast show";
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.className = "cart-toast"; }, 2600);
  }

  /* ── Init ─────────────────────────────────────────── */
  document.addEventListener("DOMContentLoaded", () => {
    updateBadge();
    /* Re-render if drawer is already open (e.g. page refresh) */
    if ($id("cartDrawer")?.classList.contains("open")) renderCart();
  });
})();
