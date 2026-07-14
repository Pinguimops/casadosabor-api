/*-----------------------------------*\
  #db.js
  Camada de comunicação entre o frontend
  e a API REST (database/api.js).

  Usado por: login.js, cart.js,
             reservation-map.js,
             newsletter.js, checkout page
\*-----------------------------------*/

(function () {
  "use strict";

  /* ── Configuração ──────────────────────────────── */
  const API_URL = window.CASADOSABOR_API || "http://localhost:3000/api";

  /* ── Token JWT em localStorage ─────────────────── */
  const TOKEN_KEY = "casaDoSaborToken";

  function getToken()        { return localStorage.getItem(TOKEN_KEY); }
  function saveToken(t)      { localStorage.setItem(TOKEN_KEY, t); }
  function removeToken()     { localStorage.removeItem(TOKEN_KEY); }

  /* ── Fetch helper ───────────────────────────────── */
  async function apiFetch(path, options = {}) {
    const token = getToken();
    const headers = { "Content-Type": "application/json", ...options.headers };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const res = await fetch(`${API_URL}${path}`, { ...options, headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.erro || `Erro ${res.status}`);
      return data;
    } catch (err) {
      console.warn(`[db.js] ${path}:`, err.message);
      throw err;
    }
  }

  /* ─────────────────────────────────────────────────
     AUTENTICAÇÃO
  ───────────────────────────────────────────────── */
  const Auth = {
    async registar(nome, email, senha) {
      const data = await apiFetch("/auth/registar", {
        method: "POST",
        body: JSON.stringify({ nome, email, senha }),
      });
      saveToken(data.token);
      return data.utilizador;
    },

    async login(email, senha) {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, senha }),
      });
      saveToken(data.token);
      return data.utilizador;
    },

    logout() {
      removeToken();
      localStorage.removeItem("casaDoSaborSession");
    },

    async perfil() {
      return apiFetch("/auth/perfil");
    },

    async atualizarPerfil(dados) {
      return apiFetch("/auth/perfil", {
        method: "PUT",
        body: JSON.stringify(dados),
      });
    },

    isLoggedIn() { return !!getToken(); },
  };

  /* ─────────────────────────────────────────────────
     MENU
  ───────────────────────────────────────────────── */
  const Menu = {
    async listar(params = {}) {
      const qs = new URLSearchParams(params).toString();
      return apiFetch(`/menu${qs ? "?" + qs : ""}`);
    },
    async item(id) { return apiFetch(`/menu/${id}`); },
    async categorias() { return apiFetch("/categorias"); },
  };

  /* ─────────────────────────────────────────────────
     CARRINHO
  ───────────────────────────────────────────────── */
  const Carrinho = {
    async obter()         { return apiFetch("/carrinho"); },

    async adicionar(menu_item_id, quantidade = 1) {
      return apiFetch("/carrinho/adicionar", {
        method: "POST",
        body: JSON.stringify({ menu_item_id, quantidade }),
      });
    },

    async alterarQty(item_id, quantidade) {
      return apiFetch(`/carrinho/item/${item_id}`, {
        method: "PUT",
        body: JSON.stringify({ quantidade }),
      });
    },

    async limpar() {
      return apiFetch("/carrinho/limpar", { method: "DELETE" });
    },
  };

  /* ─────────────────────────────────────────────────
     ENCOMENDAS
  ───────────────────────────────────────────────── */
  const Encomendas = {
    async confirmar(dados) {
      return apiFetch("/encomendas", {
        method: "POST",
        body: JSON.stringify(dados),
      });
    },

    async historico()        { return apiFetch("/encomendas"); },
    async detalhe(referencia){ return apiFetch(`/encomendas/${referencia}`); },
  };

  /* ─────────────────────────────────────────────────
     RESERVAS
  ───────────────────────────────────────────────── */
  const Reservas = {
    async mesas()            { return apiFetch("/mesas"); },

    async slotsOcupados(mesa_id, data) {
      return apiFetch(`/mesas/${mesa_id}/slots?data=${data}`);
    },

    async criar(dados) {
      return apiFetch("/reservas", {
        method: "POST",
        body: JSON.stringify(dados),
      });
    },

    async historico()        { return apiFetch("/reservas"); },

    async cancelar(id) {
      return apiFetch(`/reservas/${id}`, { method: "DELETE" });
    },
  };

  /* ─────────────────────────────────────────────────
     NEWSLETTER
  ───────────────────────────────────────────────── */
  const Newsletter = {
    async subscrever(email) {
      return apiFetch("/newsletter", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
    },
  };

  /* ─────────────────────────────────────────────────
     CONFIGURAÇÕES
  ───────────────────────────────────────────────── */
  const Config = {
    async obter() { return apiFetch("/config"); },
    _cache: null,
    async get(chave) {
      if (!this._cache) this._cache = await this.obter();
      return this._cache[chave];
    },
  };

  /* ─────────────────────────────────────────────────
     MODO OFFLINE (fallback para localStorage)
     Usado automaticamente quando a API não está
     acessível — mantém compatibilidade com o site
     a correr sem backend.
  ───────────────────────────────────────────────── */

  let apiOnline = null;  // null=desconhecido, true, false

  async function checkApi() {
    try {
      await fetch(`${API_URL}/health`, { method: "GET", signal: AbortSignal.timeout(2000) });
      apiOnline = true;
    } catch {
      apiOnline = false;
      console.info("[db.js] API offline — modo localStorage ativo");
    }
    return apiOnline;
  }

  /* ─────────────────────────────────────────────────
     INTEGRAÇÃO COM login.js existente
     Quando a API está online, substitui as funções
     de login/registo para usar a API.
  ───────────────────────────────────────────────── */
  async function patchLoginJS() {
    if (!(await checkApi())) return;  // offline — login.js usa localStorage normalmente

    /* Interceptar handleSignIn */
    const origSignIn = window.handleSignIn;
    window.handleSignIn = async function () {
      const email    = document.getElementById("signInEmail")?.value?.trim()?.toLowerCase();
      const password = document.getElementById("signInPassword")?.value;
      const errEl    = document.getElementById("signInError");
      if (errEl) errEl.textContent = "";

      if (!email || !password) {
        if (errEl) errEl.textContent = "Por favor preencha todos os campos.";
        return;
      }
      try {
        const user = await Auth.login(email, password);
        // Sintetizar sessão para compatibilidade com login.js
        localStorage.setItem("casaDoSaborSession", JSON.stringify({ email: user.email, name: user.nome }));
        if (typeof closeLoginModal === "function") closeLoginModal();
        if (typeof updateHeaderAuth === "function") updateHeaderAuth();
        if (typeof window.onLoginSuccess === "function") window.onLoginSuccess();
      } catch (err) {
        if (errEl) errEl.textContent = err.message || "Credenciais inválidas.";
      }
    };

    /* Interceptar handleSignUp */
    window.handleSignUp = async function () {
      const nome     = document.getElementById("signUpName")?.value?.trim();
      const email    = document.getElementById("signUpEmail")?.value?.trim()?.toLowerCase();
      const password = document.getElementById("signUpPassword")?.value;
      const errEl    = document.getElementById("signUpError");
      if (errEl) errEl.textContent = "";

      if (!nome || !email || !password) {
        if (errEl) errEl.textContent = "Por favor preencha todos os campos.";
        return;
      }
      if (password.length < 6) {
        if (errEl) errEl.textContent = "A palavra-passe deve ter pelo menos 6 caracteres.";
        return;
      }
      try {
        const user = await Auth.registar(nome, email, password);
        localStorage.setItem("casaDoSaborSession", JSON.stringify({ email: user.email, name: user.nome }));
        if (typeof closeLoginModal === "function") closeLoginModal();
        if (typeof updateHeaderAuth === "function") updateHeaderAuth();
        if (typeof window.onLoginSuccess === "function") window.onLoginSuccess();
      } catch (err) {
        if (errEl) errEl.textContent = err.message || "Erro ao criar conta.";
      }
    };

    /* Interceptar handleSignOut */
    const origSignOut = window.handleSignOut;
    window.handleSignOut = function () {
      Auth.logout();
      if (typeof origSignOut === "function") origSignOut();
      else {
        localStorage.removeItem("casaDoSaborSession");
        if (typeof updateHeaderAuth === "function") updateHeaderAuth();
      }
    };
  }

  /* ─────────────────────────────────────────────────
     INTEGRAÇÃO COM cart.js existente
     Quando a API está online, sincroniza o carrinho
     localStorage com a BD ao adicionar itens.
  ───────────────────────────────────────────────── */
  async function patchCartJS() {
    if (!apiOnline || !Auth.isLoggedIn()) return;

    const origAdd = window.addToCart;
    if (!origAdd) return;

    window.addToCart = async function (name, price, btn) {
      // Chama o original primeiro (atualiza localStorage + UI)
      origAdd(name, price, btn);

      // Tenta sincronizar com API em background
      try {
        // Encontrar o id do item pelo nome
        const menu = await Menu.listar();
        const item = menu.find(m => m.nome === name);
        if (item) await Carrinho.adicionar(item.id, 1);
      } catch (e) {
        // Falha silenciosa — localStorage já foi atualizado
        console.warn("[db.js] sync cart:", e.message);
      }
    };
  }

  /* ─────────────────────────────────────────────────
     INTEGRAÇÃO COM reservation-map.js
     Carrega slots ocupados da API para a mesa/data
     selecionada, substituindo os dados estáticos.
  ───────────────────────────────────────────────── */
  async function patchReservationJS() {
    if (!apiOnline) return;

    /* Sobrepor a função de reserva para guardar na BD */
    const origConfirm = window.confirmBooking;
    if (!origConfirm) return;

    window.confirmBooking = async function () {
      // Recolher dados do formulário modal
      const nome       = document.getElementById("bmGuestName")?.value?.trim();
      const dateEl     = document.getElementById("calDatesGrid");
      const timeGridEl = document.getElementById("bmTimeGrid");

      // Tentar obter selDate e selTime do escopo do módulo (via data attributes ou globals)
      // reservation-map.js não expõe estes valores, então chamamos o original
      // e depois guardamos na BD em background
      origConfirm();

      // Background sync — obtém dados da reserva recém confirmada
      try {
        const bookings = JSON.parse(localStorage.getItem("casaDoSaborBookings") || "[]");
        const last = bookings[bookings.length - 1];
        if (last) {
          await Reservas.criar({
            mesa_id:      last.table,
            nome_cliente: last.name,
            data_reserva: last.date,
            hora_reserva: last.time + ":00",
            num_pessoas:  last.cap,
          });
        }
      } catch (e) {
        console.warn("[db.js] sync reserva:", e.message);
      }
    };

    /* Carregar slots reais da BD quando uma mesa é selecionada */
    const origPickDate = window._dbOrigPickDate || null;

    // Monkeypatch: quando calDatesGrid recebe um clique numa data,
    // carrega slots da API para a mesa corrente
    document.addEventListener("click", async function (e) {
      const dayEl = e.target.closest(".cal-day:not(.cal-disabled):not(.cal-other)");
      if (!dayEl || !dayEl.dataset.iso) return;

      // Aguardar um tick para o reservation-map.js processar o clique
      await new Promise(r => setTimeout(r, 80));

      // Obter mesa selecionada do DOM
      const mesaEl = document.querySelector(".t-spot.sel");
      if (!mesaEl) return;
      const mesaId = mesaEl.dataset.id;
      const data   = dayEl.dataset.iso;
      if (!mesaId || !data) return;

      try {
        const ocupados = await Reservas.slotsOcupados(mesaId, data);
        // Marcar no time grid
        document.querySelectorAll(".time-slot").forEach(btn => {
          const hora = btn.textContent.trim();
          if (ocupados.includes(hora)) {
            btn.classList.add("time-taken");
            btn.disabled = true;
          }
        });
      } catch (e) {
        console.warn("[db.js] slots:", e.message);
      }
    });
  }

  /* ─────────────────────────────────────────────────
     INTEGRAÇÃO COM newsletter.js
  ───────────────────────────────────────────────── */
  async function patchNewsletterJS() {
    if (!apiOnline) return;

    // Interceptar submit do formulário de newsletter
    document.querySelectorAll(".footer-brand form").forEach(form => {
      form.addEventListener("submit", async function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        const emailInput = form.querySelector("[name=email_address]");
        const email = emailInput?.value?.trim();
        if (!email) return;

        let fb = form.nextElementSibling;
        if (!fb || !fb.classList.contains("newsletter-feedback")) {
          fb = document.createElement("p");
          fb.className = "newsletter-feedback";
          form.parentNode.insertBefore(fb, form.nextSibling);
        }

        try {
          const res = await Newsletter.subscrever(email);
          fb.className = "newsletter-feedback success";
          fb.textContent = res.mensagem || "Subscrito com sucesso!";
          form.reset();
        } catch (err) {
          fb.className = "newsletter-feedback error";
          fb.textContent = err.message || "Erro ao subscrever.";
        }
        setTimeout(() => { fb.className = "newsletter-feedback"; fb.textContent = ""; }, 5000);
      }, true); // capture phase to run before newsletter.js
    });
  }

  /* ─────────────────────────────────────────────────
     INTEGRAÇÃO COM checkout.html
     Quando está na página de checkout e a API está
     online, usa a API para confirmar a encomenda.
  ───────────────────────────────────────────────── */
  async function patchCheckoutPage() {
    if (!apiOnline || !window.location.pathname.includes("checkout")) return;

    const origConfirmOrder = window.confirmOrder;
    if (!origConfirmOrder) return;

    window.confirmOrder = async function () {
      // Verificar se o utilizador está autenticado
      if (!Auth.isLoggedIn()) {
        alert("Por favor inicie sessão para confirmar a sua encomenda.");
        if (typeof openLoginModal === "function") openLoginModal();
        return;
      }

      // Recolher dados do formulário
      const tipoEntrega = document.querySelector(".delivery-card.selected")?.id === "cardDelivery"
        ? "domicilio" : "takeaway";
      const pagamento = document.querySelector(".payment-card.selected")?.id
        ?.replace("pay","")?.toLowerCase() || null;

      if (!pagamento) {
        document.getElementById("paymentErr")?.classList.add("show");
        return;
      }

      const dados = {
        tipo_entrega:     tipoEntrega,
        metodo_pagamento: pagamento,
      };

      if (tipoEntrega === "domicilio") {
        dados.morada           = document.getElementById("addrMorada")?.value;
        dados.andar            = document.getElementById("addrAndar")?.value;
        dados.lote             = document.getElementById("addrLote")?.value;
        dados.cod_postal       = document.getElementById("addrCodPostal")?.value;
        dados.localidade       = document.getElementById("addrLocalidade")?.value;
        dados.telefone_entrega = document.getElementById("addrTelefone")?.value;
      }

      try {
        const res = await Encomendas.confirmar(dados);
        // Mostrar ecrã de sucesso com referência da BD
        document.getElementById("orderRef").textContent = res.referencia;
        // Limpar localStorage
        localStorage.removeItem("casaDoSaborCart");
        // Chamar o ecrã de sucesso do checkout.html
        document.getElementById("checkoutSteps").style.display = "none";
        for (let i = 1; i <= 3; i++)
          document.getElementById("panel" + i)?.classList.remove("active");
        document.getElementById("checkoutSuccess")?.classList.add("show");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (err) {
        alert("Erro ao confirmar encomenda: " + err.message);
      }
    };
  }

  /* ─────────────────────────────────────────────────
     EXPOSIÇÃO PÚBLICA
  ───────────────────────────────────────────────── */
  window.CasaDB = { Auth, Menu, Carrinho, Encomendas, Reservas, Newsletter, Config, apiOnline };

  /* ─────────────────────────────────────────────────
     ARRANQUE — corre quando o DOM está pronto
  ───────────────────────────────────────────────── */
  async function init() {
    await checkApi();
    window.CasaDB.apiOnline = apiOnline;

    if (apiOnline) {
      await patchLoginJS();
      await patchCartJS();
      await patchNewsletterJS();
    }

    // Estas funções verificam internamente se estão na página certa
    await patchReservationJS();
    await patchCheckoutPage();

    console.info(`[db.js] API ${apiOnline ? "✅ online" : "⚠️ offline (localStorage)"}`);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
