// ============================================================
//  Casa do Sabor — API Server (Node.js + Express + MySQL2)
//  Arquivo: database/api.js
//
//  Instalar dependências:
//    npm install express mysql2 bcrypt cors dotenv jsonwebtoken
//
//  Arrancar:
//    node api.js
// ============================================================

require("dotenv").config();
const express    = require("express");
const mysql      = require("mysql2/promise");
const bcrypt     = require("bcrypt");
const jwt        = require("jsonwebtoken");
const cors       = require("cors");

const app  = express();
const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || "casadosabor_secret_2025";

app.use(cors({ origin: "*" }));
app.use(express.json());

// ── Pool de ligações MySQL ────────────────────────────────
const pool = mysql.createPool({
  host:               process.env.DB_HOST     || "localhost",
  port:               process.env.DB_PORT     || 3306,
  user:               process.env.DB_USER     || "root",
  password:           process.env.DB_PASSWORD || "",
  database:           process.env.DB_NAME     || "casadosabor",
  waitForConnections: true,
  connectionLimit:    10,
  charset:            "utf8mb4",
});

// ── Helper: query simplificada ────────────────────────────
async function q(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

// ── Middleware: autenticação JWT ──────────────────────────
function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ erro: "Não autenticado" });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ erro: "Token inválido" });
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ erro: "Acesso negado" });
  next();
}

// ─────────────────────────────────────────────────────────
//  UTILIZADORES
// ─────────────────────────────────────────────────────────

// POST /api/auth/registar
app.post("/api/auth/registar", async (req, res) => {
  try {
    const { nome, email, senha } = req.body;
    if (!nome || !email || !senha)
      return res.status(400).json({ erro: "Nome, email e senha são obrigatórios" });

    const existe = await q("SELECT id FROM utilizadores WHERE email=?", [email]);
    if (existe.length) return res.status(409).json({ erro: "Email já registado" });

    const hash = await bcrypt.hash(senha, 12);
    const result = await q(
      "INSERT INTO utilizadores (nome, email, senha_hash) VALUES (?,?,?)",
      [nome, email, hash]
    );
    const id = result.insertId;
    const token = jwt.sign({ id, nome, email, role: "cliente" }, SECRET, { expiresIn: "7d" });
    res.json({ token, utilizador: { id, nome, email, role: "cliente" } });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// POST /api/auth/login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, senha } = req.body;
    const [u] = await q("SELECT * FROM utilizadores WHERE email=? AND ativo=1", [email]);
    if (!u) return res.status(401).json({ erro: "Credenciais inválidas" });

    const ok = await bcrypt.compare(senha, u.senha_hash);
    if (!ok) return res.status(401).json({ erro: "Credenciais inválidas" });

    const token = jwt.sign(
      { id: u.id, nome: u.nome, email: u.email, role: u.role },
      SECRET,
      { expiresIn: "7d" }
    );
    res.json({ token, utilizador: { id: u.id, nome: u.nome, email: u.email, role: u.role } });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// GET /api/auth/perfil
app.get("/api/auth/perfil", auth, async (req, res) => {
  try {
    const [u] = await q(
      "SELECT id, nome, email, telefone, morada, andar, lote, cod_postal, localidade, role, criado_em FROM utilizadores WHERE id=?",
      [req.user.id]
    );
    if (!u) return res.status(404).json({ erro: "Utilizador não encontrado" });
    res.json(u);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// PUT /api/auth/perfil
app.put("/api/auth/perfil", auth, async (req, res) => {
  try {
    const { nome, telefone, morada, andar, lote, cod_postal, localidade } = req.body;
    await q(
      "UPDATE utilizadores SET nome=?, telefone=?, morada=?, andar=?, lote=?, cod_postal=?, localidade=? WHERE id=?",
      [nome, telefone, morada, andar, lote, cod_postal, localidade, req.user.id]
    );
    res.json({ mensagem: "Perfil atualizado" });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// ─────────────────────────────────────────────────────────
//  MENU
// ─────────────────────────────────────────────────────────

// GET /api/menu  ?categoria=entradas&destaque=1
app.get("/api/menu", async (req, res) => {
  try {
    const { categoria, destaque } = req.query;
    let sql = "SELECT * FROM v_menu WHERE 1=1";
    const params = [];
    if (categoria) { sql += " AND categoria_slug=?"; params.push(categoria); }
    if (destaque)  { sql += " AND destaque=1"; }
    sql += " ORDER BY ordem, nome";
    res.json(await q(sql, params));
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// GET /api/menu/:id
app.get("/api/menu/:id", async (req, res) => {
  try {
    const [item] = await q("SELECT * FROM v_menu WHERE id=?", [req.params.id]);
    if (!item) return res.status(404).json({ erro: "Item não encontrado" });
    res.json(item);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// GET /api/categorias
app.get("/api/categorias", async (req, res) => {
  try {
    res.json(await q("SELECT * FROM categorias WHERE ativo=1 ORDER BY ordem"));
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// POST /api/menu  (admin)
app.post("/api/menu", auth, adminOnly, async (req, res) => {
  try {
    const { categoria_id, nome, descricao, preco, preco_promo, imagem, badge, destaque, ordem } = req.body;
    const r = await q(
      "INSERT INTO menu_items (categoria_id,nome,descricao,preco,preco_promo,imagem,badge,destaque,ordem) VALUES (?,?,?,?,?,?,?,?,?)",
      [categoria_id, nome, descricao, preco, preco_promo || null, imagem || null, badge || null, destaque || 0, ordem || 0]
    );
    res.json({ id: r.insertId, mensagem: "Item criado" });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// PUT /api/menu/:id  (admin)
app.put("/api/menu/:id", auth, adminOnly, async (req, res) => {
  try {
    const { nome, descricao, preco, preco_promo, imagem, badge, disponivel, destaque, ordem } = req.body;
    await q(
      "UPDATE menu_items SET nome=?,descricao=?,preco=?,preco_promo=?,imagem=?,badge=?,disponivel=?,destaque=?,ordem=? WHERE id=?",
      [nome, descricao, preco, preco_promo||null, imagem||null, badge||null, disponivel??1, destaque??0, ordem??0, req.params.id]
    );
    res.json({ mensagem: "Item atualizado" });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// ─────────────────────────────────────────────────────────
//  CARRINHO
// ─────────────────────────────────────────────────────────

// GET /api/carrinho
app.get("/api/carrinho", auth, async (req, res) => {
  try {
    const itens = await q(
      `SELECT ci.id, ci.menu_item_id, mi.nome, mi.imagem,
              ci.quantidade, ci.preco_unitario,
              ci.quantidade * ci.preco_unitario AS subtotal
       FROM carrinho_itens ci
       JOIN carrinhos c      ON c.id = ci.carrinho_id
       JOIN menu_items mi    ON mi.id = ci.menu_item_id
       WHERE c.utilizador_id = ?`,
      [req.user.id]
    );
    const total = itens.reduce((s, i) => s + parseFloat(i.subtotal), 0);
    res.json({ itens, total: total.toFixed(2) });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// POST /api/carrinho/adicionar
app.post("/api/carrinho/adicionar", auth, async (req, res) => {
  try {
    const { menu_item_id, quantidade = 1 } = req.body;
    // Get or create cart
    let [cart] = await q("SELECT id FROM carrinhos WHERE utilizador_id=?", [req.user.id]);
    if (!cart) {
      const r = await q("INSERT INTO carrinhos (utilizador_id) VALUES (?)", [req.user.id]);
      cart = { id: r.insertId };
    }
    // Get price snapshot
    const [item] = await q(
      "SELECT COALESCE(preco_promo, preco) AS preco FROM menu_items WHERE id=? AND disponivel=1",
      [menu_item_id]
    );
    if (!item) return res.status(404).json({ erro: "Item não disponível" });

    await q(
      "INSERT INTO carrinho_itens (carrinho_id, menu_item_id, quantidade, preco_unitario) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE quantidade = quantidade + ?",
      [cart.id, menu_item_id, quantidade, item.preco, quantidade]
    );
    await q("UPDATE carrinhos SET atualizado_em=NOW() WHERE id=?", [cart.id]);
    res.json({ mensagem: "Item adicionado ao carrinho" });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// PUT /api/carrinho/item/:id  — alterar quantidade
app.put("/api/carrinho/item/:id", auth, async (req, res) => {
  try {
    const { quantidade } = req.body;
    if (quantidade < 1) {
      await q(
        "DELETE ci FROM carrinho_itens ci JOIN carrinhos c ON c.id=ci.carrinho_id WHERE ci.id=? AND c.utilizador_id=?",
        [req.params.id, req.user.id]
      );
    } else {
      await q(
        "UPDATE carrinho_itens ci JOIN carrinhos c ON c.id=ci.carrinho_id SET ci.quantidade=? WHERE ci.id=? AND c.utilizador_id=?",
        [quantidade, req.params.id, req.user.id]
      );
    }
    res.json({ mensagem: "Carrinho atualizado" });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// DELETE /api/carrinho/limpar
app.delete("/api/carrinho/limpar", auth, async (req, res) => {
  try {
    await q(
      "DELETE ci FROM carrinho_itens ci JOIN carrinhos c ON c.id=ci.carrinho_id WHERE c.utilizador_id=?",
      [req.user.id]
    );
    res.json({ mensagem: "Carrinho limpo" });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// ─────────────────────────────────────────────────────────
//  ENCOMENDAS
// ─────────────────────────────────────────────────────────

// POST /api/encomendas  — confirmar encomenda
app.post("/api/encomendas", auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const {
      tipo_entrega, morada, andar, lote, cod_postal, localidade,
      telefone_entrega, metodo_pagamento
    } = req.body;

    // Get cart items
    const [cart] = await conn.execute(
      "SELECT id FROM carrinhos WHERE utilizador_id=?", [req.user.id]
    ).then(([r]) => r);

    if (!cart) return res.status(400).json({ erro: "Carrinho vazio" });

    const [itens] = await conn.execute(
      `SELECT ci.menu_item_id, mi.nome, ci.quantidade, ci.preco_unitario
       FROM carrinho_itens ci JOIN menu_items mi ON mi.id=ci.menu_item_id
       WHERE ci.carrinho_id=?`,
      [cart.id]
    );
    if (!itens.length) return res.status(400).json({ erro: "Carrinho vazio" });

    const subtotal = itens.reduce((s, i) => s + i.quantidade * parseFloat(i.preco_unitario), 0);
    const [config]  = await conn.execute("SELECT valor FROM configuracoes WHERE chave='taxa_entrega'").then(([r]) => r);
    const taxa    = tipo_entrega === "domicilio" ? parseFloat(config?.valor || 2.50) : 0;
    const total   = subtotal + taxa;
    const ref     = "#CDS-" + String(Math.floor(100000 + Math.random() * 900000));

    const [enc] = await conn.execute(
      `INSERT INTO encomendas
        (referencia,utilizador_id,tipo_entrega,morada,andar,lote,cod_postal,localidade,
         telefone_entrega,metodo_pagamento,subtotal,taxa_entrega,total)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [ref, req.user.id, tipo_entrega, morada||null, andar||null, lote||null,
       cod_postal||null, localidade||null, telefone_entrega||null,
       metodo_pagamento, subtotal.toFixed(2), taxa.toFixed(2), total.toFixed(2)]
    );
    const encId = enc.insertId;

    for (const item of itens) {
      await conn.execute(
        "INSERT INTO encomenda_itens (encomenda_id,menu_item_id,nome_item,quantidade,preco_unitario) VALUES (?,?,?,?,?)",
        [encId, item.menu_item_id, item.nome, item.quantidade, item.preco_unitario]
      );
    }

    // Clear cart
    await conn.execute("DELETE FROM carrinho_itens WHERE carrinho_id=?", [cart.id]);
    await conn.execute("DELETE FROM carrinhos WHERE id=?", [cart.id]);

    await conn.commit();
    res.json({ referencia: ref, total: total.toFixed(2), mensagem: "Encomenda confirmada!" });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ erro: e.message });
  } finally {
    conn.release();
  }
});

// GET /api/encomendas  — histórico do utilizador
app.get("/api/encomendas", auth, async (req, res) => {
  try {
    const encomendas = await q(
      `SELECT e.id, e.referencia, e.tipo_entrega, e.estado, e.metodo_pagamento,
              e.total, e.pago, e.criado_em,
              COUNT(ei.id) AS num_itens
       FROM encomendas e
       LEFT JOIN encomenda_itens ei ON ei.encomenda_id = e.id
       WHERE e.utilizador_id = ?
       GROUP BY e.id ORDER BY e.criado_em DESC`,
      [req.user.id]
    );
    res.json(encomendas);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// GET /api/encomendas/:ref — detalhe por referência
app.get("/api/encomendas/:ref", auth, async (req, res) => {
  try {
    const [enc] = await q(
      "SELECT * FROM encomendas WHERE referencia=? AND (utilizador_id=? OR ?='admin')",
      [req.params.ref, req.user.id, req.user.role]
    );
    if (!enc) return res.status(404).json({ erro: "Encomenda não encontrada" });
    const itens = await q(
      "SELECT * FROM encomenda_itens WHERE encomenda_id=?", [enc.id]
    );
    res.json({ ...enc, itens });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// ─────────────────────────────────────────────────────────
//  RESERVAS
// ─────────────────────────────────────────────────────────

// GET /api/mesas  — estado de todas as mesas
app.get("/api/mesas", async (req, res) => {
  try {
    res.json(await q("SELECT * FROM mesas WHERE ativa=1 ORDER BY numero"));
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// GET /api/mesas/:id/slots?data=YYYY-MM-DD  — slots ocupados numa data
app.get("/api/mesas/:id/slots", async (req, res) => {
  try {
    const { data } = req.query;
    if (!data) return res.status(400).json({ erro: "Parâmetro 'data' obrigatório" });
    const ocupados = await q(
      "SELECT hora_reserva FROM reservas WHERE mesa_id=? AND data_reserva=? AND estado IN ('pendente','confirmada')",
      [req.params.id, data]
    );
    res.json(ocupados.map(r => r.hora_reserva.slice(0, 5)));
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// POST /api/reservas  — criar reserva
app.post("/api/reservas", async (req, res) => {
  try {
    const {
      mesa_id, nome_cliente, telefone, email,
      data_reserva, hora_reserva, num_pessoas, mensagem
    } = req.body;

    if (!mesa_id || !nome_cliente || !data_reserva || !hora_reserva)
      return res.status(400).json({ erro: "Campos obrigatórios em falta" });

    // Check slot availability
    const conflict = await q(
      "SELECT id FROM reservas WHERE mesa_id=? AND data_reserva=? AND hora_reserva=? AND estado IN ('pendente','confirmada')",
      [mesa_id, data_reserva, hora_reserva]
    );
    if (conflict.length) return res.status(409).json({ erro: "Slot já ocupado" });

    const r = await q(
      `INSERT INTO reservas
        (mesa_id, nome_cliente, telefone, email, data_reserva, hora_reserva, num_pessoas, mensagem)
       VALUES (?,?,?,?,?,?,?,?)`,
      [mesa_id, nome_cliente, telefone||null, email||null, data_reserva, hora_reserva, num_pessoas||1, mensagem||null]
    );
    res.json({ id: r.insertId, mensagem: "Reserva criada com sucesso" });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// GET /api/reservas  — histórico do utilizador autenticado
app.get("/api/reservas", auth, async (req, res) => {
  try {
    res.json(await q(
      `SELECT r.*, m.numero AS mesa_num, m.zona, m.capacidade
       FROM reservas r JOIN mesas m ON m.id=r.mesa_id
       WHERE r.utilizador_id=? ORDER BY r.data_reserva DESC, r.hora_reserva DESC`,
      [req.user.id]
    ));
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// DELETE /api/reservas/:id  — cancelar reserva
app.delete("/api/reservas/:id", auth, async (req, res) => {
  try {
    await q(
      "UPDATE reservas SET estado='cancelada' WHERE id=? AND utilizador_id=?",
      [req.params.id, req.user.id]
    );
    res.json({ mensagem: "Reserva cancelada" });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// ─────────────────────────────────────────────────────────
//  CHEFS & EVENTOS (públicos)
// ─────────────────────────────────────────────────────────

app.get("/api/chefs", async (req, res) => {
  try {
    res.json(await q("SELECT * FROM chefs WHERE ativo=1 ORDER BY ordem"));
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

app.get("/api/eventos", async (req, res) => {
  try {
    res.json(await q("SELECT * FROM eventos WHERE publicado=1 ORDER BY data_evento DESC"));
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// ─────────────────────────────────────────────────────────
//  NEWSLETTER
// ─────────────────────────────────────────────────────────

app.post("/api/newsletter", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ erro: "Email inválido" });
    await q(
      "INSERT INTO newsletter (email) VALUES (?) ON DUPLICATE KEY UPDATE ativo=1",
      [email]
    );
    res.json({ mensagem: "Subscrito com sucesso! Receberá 25% de desconto." });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// ─────────────────────────────────────────────────────────
//  CONFIGURAÇÕES (público — leitura)
// ─────────────────────────────────────────────────────────

app.get("/api/config", async (req, res) => {
  try {
    const rows = await q("SELECT chave, valor FROM configuracoes");
    const cfg = {};
    rows.forEach(r => { cfg[r.chave] = r.valor; });
    res.json(cfg);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// ─────────────────────────────────────────────────────────
//  ADMIN — painel
// ─────────────────────────────────────────────────────────

// GET /api/admin/dashboard
app.get("/api/admin/dashboard", auth, adminOnly, async (req, res) => {
  try {
    const [[totalEnc]]  = await pool.execute("SELECT COUNT(*) AS n FROM encomendas WHERE DATE(criado_em)=CURDATE()");
    const [[totalRev]]  = await pool.execute("SELECT COUNT(*) AS n FROM reservas WHERE data_reserva=CURDATE()");
    const [[totalUsers]]= await pool.execute("SELECT COUNT(*) AS n FROM utilizadores");
    const [[revenue]]   = await pool.execute("SELECT COALESCE(SUM(total),0) AS n FROM encomendas WHERE pago=1 AND DATE(criado_em)=CURDATE()");
    res.json({
      encomendas_hoje: totalEnc.n,
      reservas_hoje:   totalRev.n,
      utilizadores:    totalUsers.n,
      receita_hoje:    parseFloat(revenue.n).toFixed(2),
    });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// GET /api/admin/encomendas
app.get("/api/admin/encomendas", auth, adminOnly, async (req, res) => {
  try {
    res.json(await q("SELECT * FROM v_encomendas LIMIT 100"));
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// PUT /api/admin/encomendas/:id/estado
app.put("/api/admin/encomendas/:id/estado", auth, adminOnly, async (req, res) => {
  try {
    const { estado } = req.body;
    await q("UPDATE encomendas SET estado=? WHERE id=?", [estado, req.params.id]);
    res.json({ mensagem: "Estado atualizado" });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// GET /api/admin/reservas?data=YYYY-MM-DD
app.get("/api/admin/reservas", auth, adminOnly, async (req, res) => {
  try {
    const { data } = req.query;
    if (data) {
      res.json(await q(
        `SELECT r.id, CONCAT('RES-', LPAD(r.id, 5, '0')) AS ref,
                m.numero AS mesa_num, m.zona, m.capacidade,
                r.nome_cliente, r.telefone, r.data_reserva, r.hora_reserva,
                r.num_pessoas, r.estado
         FROM reservas r JOIN mesas m ON m.id = r.mesa_id
         WHERE r.data_reserva = ? ORDER BY r.hora_reserva`,
        [data]
      ));
    } else {
      res.json(await q("SELECT * FROM v_reservas_hoje ORDER BY hora_reserva"));
    }
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// PUT /api/admin/reservas/:id/estado  (confirmar / cancelar reserva)
app.put("/api/admin/reservas/:id/estado", auth, adminOnly, async (req, res) => {
  try {
    const { estado } = req.body; // 'pendente' | 'confirmada' | 'cancelada'
    const validos = ["pendente", "confirmada", "cancelada"];
    if (!validos.includes(estado))
      return res.status(400).json({ erro: "Estado inválido" });
    await q("UPDATE reservas SET estado=? WHERE id=?", [estado, req.params.id]);
    res.json({ mensagem: "Estado da reserva atualizado" });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// GET /api/admin/clientes  (lista de clientes registados)
app.get("/api/admin/clientes", auth, adminOnly, async (req, res) => {
  try {
    res.json(await q(
      `SELECT u.id, u.nome, u.email, u.telefone, u.morada, u.localidade,
              u.role, u.ativo, u.criado_em,
              (SELECT COUNT(*) FROM encomendas e WHERE e.utilizador_id = u.id) AS total_encomendas,
              (SELECT COUNT(*) FROM reservas r WHERE r.utilizador_id = u.id) AS total_reservas
       FROM utilizadores u
       WHERE u.role = 'cliente'
       ORDER BY u.criado_em DESC`
    ));
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// PUT /api/admin/clientes/:id/estado  (ativar / desativar conta)
app.put("/api/admin/clientes/:id/estado", auth, adminOnly, async (req, res) => {
  try {
    const { ativo } = req.body; // 0 ou 1
    await q("UPDATE utilizadores SET ativo=? WHERE id=?", [ativo ? 1 : 0, req.params.id]);
    res.json({ mensagem: "Estado do cliente atualizado" });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// ─────────────────────────────────────────────────────────
//  HEALTH CHECK
// ─────────────────────────────────────────────────────────
app.get("/api/health", async (req, res) => {
  try {
    await pool.execute("SELECT 1");
    res.json({ status: "ok", db: "connected", hora: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ status: "error", erro: e.message });
  }
});

// ─────────────────────────────────────────────────────────
//  START
// ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🍽️  Casa do Sabor API`);
  console.log(`✅  A correr em http://localhost:${PORT}`);
  console.log(`📋  Endpoints disponíveis:`);
  console.log(`    POST /api/auth/registar`);
  console.log(`    POST /api/auth/login`);
  console.log(`    GET  /api/menu`);
  console.log(`    GET  /api/mesas`);
  console.log(`    POST /api/carrinho/adicionar`);
  console.log(`    POST /api/encomendas`);
  console.log(`    POST /api/reservas`);
  console.log(`    GET  /api/health\n`);
});
