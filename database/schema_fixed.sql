-- ============================================================
--  CASA DO SABOR — Base de Dados MySQL
--  Schema completo: utilizadores, menu, carrinho,
--  encomendas, reservas, chefs, eventos, newsletter
-- ============================================================

CREATE DATABASE IF NOT EXISTS casadosabor
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE casadosabor;

-- ────────────────────────────────────────────────────────────
--  1. UTILIZADORES
-- ────────────────────────────────────────────────────────────
CREATE TABLE utilizadores (
  id            INT            AUTO_INCREMENT PRIMARY KEY,
  nome          VARCHAR(100)   NOT NULL,
  email         VARCHAR(150)   NOT NULL UNIQUE,
  senha_hash    VARCHAR(255)   NOT NULL,           -- bcrypt
  telefone      VARCHAR(20)    NULL,
  morada        VARCHAR(200)   NULL,
  andar         VARCHAR(30)    NULL,
  lote          VARCHAR(30)    NULL,
  cod_postal    VARCHAR(10)    NULL,
  localidade    VARCHAR(80)    NULL,
  role          ENUM('cliente','staff','admin') NOT NULL DEFAULT 'cliente',
  ativo         TINYINT(1)     NOT NULL DEFAULT 1,
  criado_em     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role  (role)
) ENGINE=InnoDB;

-- ────────────────────────────────────────────────────────────
--  2. CATEGORIAS DO MENU
-- ────────────────────────────────────────────────────────────
CREATE TABLE categorias (
  id            INT            AUTO_INCREMENT PRIMARY KEY,
  nome          VARCHAR(80)    NOT NULL,
  slug          VARCHAR(80)    NOT NULL UNIQUE,
  ordem         INT            NOT NULL DEFAULT 0,
  ativo         TINYINT(1)     NOT NULL DEFAULT 1
) ENGINE=InnoDB;

INSERT INTO categorias (nome, slug, ordem) VALUES
  ('Entradas',        'entradas',    1),
  ('Pratos Principais','principais', 2),
  ('Sobremesas',       'sobremesas', 3),
  ('Bebidas',          'bebidas',    4),
  ('Pequeno-Almoço',   'breakfast',  5);

-- ────────────────────────────────────────────────────────────
--  3. ITENS DO MENU
-- ────────────────────────────────────────────────────────────
CREATE TABLE menu_items (
  id             INT             AUTO_INCREMENT PRIMARY KEY,
  categoria_id   INT             NOT NULL,
  nome           VARCHAR(120)    NOT NULL,
  descricao      TEXT            NULL,
  preco          DECIMAL(8,2)    NOT NULL,
  preco_promo    DECIMAL(8,2)    NULL,
  imagem         VARCHAR(255)    NULL,
  badge          VARCHAR(40)     NULL,             -- "Sazonal", "Novo", "Especial"
  disponivel     TINYINT(1)      NOT NULL DEFAULT 1,
  destaque       TINYINT(1)      NOT NULL DEFAULT 0,
  ordem          INT             NOT NULL DEFAULT 0,
  criado_em      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE RESTRICT,
  INDEX idx_categoria (categoria_id),
  INDEX idx_disponivel (disponivel),
  INDEX idx_destaque  (destaque)
) ENGINE=InnoDB;

INSERT INTO menu_items (categoria_id, nome, descricao, preco, imagem, badge, destaque) VALUES
  (1, 'Salada Grega',          'Tomates, pimento verde, pepino fatiado, cebola, azeitonas e queijo feta', 25.50, 'menu-1.jpg', 'Sazonal', 1),
  (2, 'Lasanha',               'Vegetais, queijo, carne moída, molho de tomate, temperos e especiarias',  40.00, 'menu-2.jpg', NULL,      1),
  (1, 'Sopa de Abóbora',       'Sopa cremosa de abóbora butternut com especiarias aromáticas e natas frescas', 10.00, 'menu-3.jpg', NULL, 1),
  (2, 'Tokusen Wagyu',         'Bife de wagyu grelhado com legumes salteados e molho demi-glace',         39.00, 'menu-4.jpg', 'Novo',    1),
  (1, 'Azeitonas Recheadas',   'Abacates com carne de caranguejo, cebola roxa e pimento vermelho',        25.00, 'menu-5.jpg', NULL,      1),
  (2, 'Góbio',                 'Vegetais, queijo, carne picada, molho de tomate, temperos e especiarias', 49.00, 'menu-6.jpg', NULL,      1),
  (2, 'Tortellini de Lagosta', 'Delicados tortellini recheados com lagosta suculenta e creme de marisco', 20.00, 'menu-1.jpg', 'Especial',1),
  (3, 'Bolo de Chocolate',     'Bolo húmido de chocolate negro com ganache e frutos vermelhos frescos',    8.50, 'menu-2.jpg', NULL,      0),
  (3, 'Crème Brûlée',          'Creme de baunilha caramelizado na hora, servido com frutos vermelhos',     9.00, 'menu-3.jpg', NULL,      0),
  (4, 'Sangria da Casa',       'Sangria artesanal com vinho tinto, frutos tropicais e especiarias',        7.00, 'menu-4.jpg', NULL,      0),
  (4, 'Limonada Natural',      'Limonada feita na hora com limões frescos, hortelã e xarope de cana',      4.50, 'menu-5.jpg', NULL,      0),
  (4, 'Vinho da Região',       'Seleção de vinhos regionais portugueses, tinto, branco ou rosé',           5.50, 'menu-6.jpg', NULL,      0);

-- ────────────────────────────────────────────────────────────
--  4. MESAS DO RESTAURANTE
-- ────────────────────────────────────────────────────────────
CREATE TABLE mesas (
  id            INT            AUTO_INCREMENT PRIMARY KEY,
  numero        INT            NOT NULL UNIQUE,
  zona          ENUM('janela','principal','terraco') NOT NULL,
  forma         ENUM('round','rect') NOT NULL DEFAULT 'round',
  capacidade    INT            NOT NULL,
  ocupada       TINYINT(1)     NOT NULL DEFAULT 0,
  ativa         TINYINT(1)     NOT NULL DEFAULT 1
) ENGINE=InnoDB;

INSERT INTO mesas (numero, zona, forma, capacidade, ocupada) VALUES
  (1,  'janela',    'round', 2, 0), (2,  'janela',    'round', 2, 1),
  (3,  'janela',    'round', 4, 0), (4,  'janela',    'round', 2, 0),
  (5,  'janela',    'round', 2, 1), (6,  'janela',    'rect',  4, 0),
  (7,  'janela',    'rect',  6, 0), (8,  'janela',    'rect',  4, 1),
  (9,  'principal', 'round', 4, 0), (10, 'principal', 'round', 4, 1),
  (11, 'principal', 'round', 6, 0), (12, 'principal', 'round', 4, 0),
  (13, 'principal', 'round', 4, 1), (14, 'principal', 'rect',  6, 0),
  (15, 'principal', 'rect',  8, 0), (16, 'principal', 'rect',  6, 1),
  (17, 'terraco',   'round', 2, 0), (18, 'terraco',   'round', 2, 1),
  (19, 'terraco',   'round', 4, 0), (20, 'terraco',   'round', 2, 0),
  (21, 'terraco',   'round', 2, 0);

-- ────────────────────────────────────────────────────────────
--  5. RESERVAS DE MESA
-- ────────────────────────────────────────────────────────────
CREATE TABLE reservas (
  id              INT             AUTO_INCREMENT PRIMARY KEY,
  utilizador_id   INT             NULL,                        -- NULL = sem conta
  mesa_id         INT             NOT NULL,
  nome_cliente    VARCHAR(100)    NOT NULL,
  telefone        VARCHAR(20)     NULL,
  email           VARCHAR(150)    NULL,
  data_reserva    DATE            NOT NULL,
  hora_reserva    TIME            NOT NULL,
  num_pessoas     INT             NOT NULL DEFAULT 1,
  mensagem        TEXT            NULL,
  estado          ENUM('pendente','confirmada','cancelada','concluida') NOT NULL DEFAULT 'pendente',
  criado_em       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id) ON DELETE SET NULL,
  FOREIGN KEY (mesa_id)       REFERENCES mesas(id)        ON DELETE RESTRICT,
  INDEX idx_mesa_data  (mesa_id, data_reserva),
  INDEX idx_data_hora  (data_reserva, hora_reserva),
  INDEX idx_estado     (estado),
  INDEX idx_utilizador (utilizador_id)
) ENGINE=InnoDB;

-- ────────────────────────────────────────────────────────────
--  6. SESSÕES DO CARRINHO
-- ────────────────────────────────────────────────────────────
CREATE TABLE carrinhos (
  id              INT             AUTO_INCREMENT PRIMARY KEY,
  utilizador_id   INT             NULL,
  session_token   VARCHAR(64)     NULL,
  criado_em       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id) ON DELETE CASCADE,
  INDEX idx_utilizador  (utilizador_id),
  INDEX idx_token       (session_token)
) ENGINE=InnoDB;

CREATE TABLE carrinho_itens (
  id              INT             AUTO_INCREMENT PRIMARY KEY,
  carrinho_id     INT             NOT NULL,
  menu_item_id    INT             NOT NULL,
  quantidade      INT             NOT NULL DEFAULT 1,
  preco_unitario  DECIMAL(8,2)    NOT NULL,          -- snapshot do preço
  FOREIGN KEY (carrinho_id)   REFERENCES carrinhos(id)   ON DELETE CASCADE,
  FOREIGN KEY (menu_item_id)  REFERENCES menu_items(id)  ON DELETE RESTRICT,
  UNIQUE KEY uq_carrinho_item (carrinho_id, menu_item_id)
) ENGINE=InnoDB;

-- ────────────────────────────────────────────────────────────
--  7. ENCOMENDAS
-- ────────────────────────────────────────────────────────────
CREATE TABLE encomendas (
  id                  INT             AUTO_INCREMENT PRIMARY KEY,
  referencia          VARCHAR(20)     NOT NULL UNIQUE,          -- #CDS-000000
  utilizador_id       INT             NULL,
  tipo_entrega        ENUM('takeaway','domicilio') NOT NULL,
  estado              ENUM('pendente','confirmada','em_preparacao','a_caminho','entregue','cancelada')
                                      NOT NULL DEFAULT 'pendente',
  -- Endereço de entrega (só para domicílio)
  morada              VARCHAR(200)    NULL,
  andar               VARCHAR(30)     NULL,
  lote                VARCHAR(30)     NULL,
  cod_postal          VARCHAR(10)     NULL,
  localidade          VARCHAR(80)     NULL,
  telefone_entrega    VARCHAR(20)     NULL,
  -- Pagamento
  metodo_pagamento    ENUM('cartao','mbway','multibanco','numerario') NOT NULL,
  subtotal            DECIMAL(8,2)    NOT NULL,
  taxa_entrega        DECIMAL(8,2)    NOT NULL DEFAULT 0.00,
  total               DECIMAL(8,2)    NOT NULL,
  pago                TINYINT(1)      NOT NULL DEFAULT 0,
  -- Timestamps
  criado_em           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id) ON DELETE SET NULL,
  INDEX idx_referencia   (referencia),
  INDEX idx_utilizador   (utilizador_id),
  INDEX idx_estado       (estado),
  INDEX idx_criado       (criado_em)
) ENGINE=InnoDB;

CREATE TABLE encomenda_itens (
  id              INT             AUTO_INCREMENT PRIMARY KEY,
  encomenda_id    INT             NOT NULL,
  menu_item_id    INT             NOT NULL,
  nome_item       VARCHAR(120)    NOT NULL,    -- snapshot do nome
  quantidade      INT             NOT NULL,
  preco_unitario  DECIMAL(8,2)    NOT NULL,
  subtotal        DECIMAL(8,2)    GENERATED ALWAYS AS (quantidade * preco_unitario) STORED,
  FOREIGN KEY (encomenda_id)  REFERENCES encomendas(id)  ON DELETE CASCADE,
  FOREIGN KEY (menu_item_id)  REFERENCES menu_items(id)  ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ────────────────────────────────────────────────────────────
--  8. CHEFS
-- ────────────────────────────────────────────────────────────
CREATE TABLE chefs (
  id              INT             AUTO_INCREMENT PRIMARY KEY,
  nome            VARCHAR(100)    NOT NULL,
  cargo           VARCHAR(80)     NOT NULL,
  bio             TEXT            NULL,
  foto            VARCHAR(255)    NULL,
  instagram       VARCHAR(100)    NULL,
  facebook        VARCHAR(100)    NULL,
  twitter         VARCHAR(100)    NULL,
  ordem           INT             NOT NULL DEFAULT 0,
  ativo           TINYINT(1)      NOT NULL DEFAULT 1
) ENGINE=InnoDB;

INSERT INTO chefs (nome, cargo, bio, ordem) VALUES
  ('António Silva',   'Chef Executivo',           'Com 20 anos de experiência em cozinhas de topo europeias, António é o guardião da alma do Casa do Sabor.', 1),
  ('Mariana Costa',   'Chef de Pastelaria',        'Formada em Paris e apaixonada por técnicas clássicas com toque moderno.', 2),
  ('Ricardo Ferreira','Chef de Cozinha',            'Especialista em cozinha de mar, Ricardo traz do Algarve o conhecimento profundo dos produtos da costa portuguesa.', 3),
  ('Sofia Mendes',    'Sous Chef',                  'A visão vegetariana e sustentável da nossa cozinha.', 4),
  ('Miguel Lopes',    'Chef de Grelhados',          'O mestre do fogo. Miguel aperfeiçoou a arte do grelhado durante anos.', 5),
  ('Ana Rodrigues',   'Chef de Petit-Déjeuner',     'Responsável pela magia das manhãs no Casa do Sabor.', 6);

-- ────────────────────────────────────────────────────────────
--  9. EVENTOS
-- ────────────────────────────────────────────────────────────
CREATE TABLE eventos (
  id              INT             AUTO_INCREMENT PRIMARY KEY,
  titulo          VARCHAR(200)    NOT NULL,
  subtitulo       VARCHAR(100)    NULL,
  descricao       TEXT            NULL,
  imagem          VARCHAR(255)    NULL,
  data_evento     DATE            NULL,
  publicado       TINYINT(1)      NOT NULL DEFAULT 1,
  criado_em       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO eventos (titulo, subtitulo, descricao, data_evento) VALUES
  ('Um sabor tão bom que se come primeiro com os olhos.', 'Comida e Sabor', 'Jantar especial com menu degustação de 6 pratos.', '2025-09-15'),
  ('Um sabor tão bom que se come primeiro com os olhos.', 'Comida e Sabor', 'Noite de vinhos com harmonização e pratos regionais.', '2025-09-08'),
  ('Um sabor tão bom que se come primeiro com os olhos.', 'Receita',        'Workshop de cozinha portuguesa contemporânea.', '2025-09-03');

-- ────────────────────────────────────────────────────────────
--  10. NEWSLETTER
-- ────────────────────────────────────────────────────────────
CREATE TABLE newsletter (
  id              INT             AUTO_INCREMENT PRIMARY KEY,
  email           VARCHAR(150)    NOT NULL UNIQUE,
  ativo           TINYINT(1)      NOT NULL DEFAULT 1,
  subscrito_em    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (email)
) ENGINE=InnoDB;

-- ────────────────────────────────────────────────────────────
--  11. CONTACTOS / MENSAGENS
-- ────────────────────────────────────────────────────────────
CREATE TABLE contactos (
  id              INT             AUTO_INCREMENT PRIMARY KEY,
  nome            VARCHAR(100)    NOT NULL,
  email           VARCHAR(150)    NULL,
  telefone        VARCHAR(20)     NULL,
  mensagem        TEXT            NOT NULL,
  lido            TINYINT(1)      NOT NULL DEFAULT 0,
  criado_em       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ────────────────────────────────────────────────────────────
--  12. CONFIGURAÇÕES DO SITE
-- ────────────────────────────────────────────────────────────
CREATE TABLE configuracoes (
  chave           VARCHAR(60)     PRIMARY KEY,
  valor           TEXT            NOT NULL,
  descricao       VARCHAR(200)    NULL
) ENGINE=InnoDB;

INSERT INTO configuracoes (chave, valor, descricao) VALUES
  ('nome_restaurante',    'Casa do Sabor',                        'Nome do restaurante'),
  ('morada',              'Rua do Restaurante, Lisboa 5555',      'Morada completa'),
  ('telefone',            '+351 123 123 456',                     'Telefone principal'),
  ('email',               'info@casadosabor.pt',                  'Email de contacto'),
  ('horario_abertura',    '12:00',                                'Hora de abertura'),
  ('horario_fecho',       '00:00',                                'Hora de fecho'),
  ('taxa_entrega',        '2.50',                                 'Taxa de entrega ao domicílio (€)'),
  ('tempo_takeaway',      '20-30',                                'Tempo estimado takeaway (min)'),
  ('tempo_entrega',       '45-60',                                'Tempo estimado entrega (min)'),
  ('min_encomenda',       '0',                                    'Valor mínimo de encomenda (€)');

-- ────────────────────────────────────────────────────────────
--  VIEWS ÚTEIS
-- ────────────────────────────────────────────────────────────

-- Reservas do dia com info da mesa
CREATE OR REPLACE VIEW v_reservas_hoje AS
SELECT
  r.id,
  CONCAT('RES-', LPAD(r.id, 5, '0')) AS ref,
  m.numero    AS mesa_num,
  m.zona,
  m.capacidade,
  r.nome_cliente,
  r.telefone,
  r.data_reserva,
  r.hora_reserva,
  r.num_pessoas,
  r.estado
FROM reservas r
JOIN mesas m ON m.id = r.mesa_id
WHERE r.data_reserva = CURDATE()
ORDER BY r.hora_reserva;

-- Slots ocupados por mesa/data (para o mapa de reservas)
CREATE OR REPLACE VIEW v_slots_ocupados AS
SELECT
  mesa_id,
  data_reserva,
  hora_reserva,
  estado
FROM reservas
WHERE estado IN ('pendente','confirmada')
ORDER BY mesa_id, data_reserva, hora_reserva;

-- Encomendas com totais e estado
CREATE OR REPLACE VIEW v_encomendas AS
SELECT
  e.id,
  e.referencia,
  u.nome AS cliente,
  e.tipo_entrega,
  e.estado,
  e.metodo_pagamento,
  e.total,
  e.pago,
  e.criado_em,
  COUNT(ei.id) AS num_itens
FROM encomendas e
LEFT JOIN utilizadores u  ON u.id = e.utilizador_id
LEFT JOIN encomenda_itens ei ON ei.encomenda_id = e.id
GROUP BY e.id
ORDER BY e.criado_em DESC;

-- Menu com categoria
CREATE OR REPLACE VIEW v_menu AS
SELECT
  mi.id,
  c.nome   AS categoria,
  c.slug   AS categoria_slug,
  mi.nome,
  mi.descricao,
  mi.preco,
  mi.preco_promo,
  COALESCE(mi.preco_promo, mi.preco) AS preco_final,
  mi.imagem,
  mi.badge,
  mi.disponivel,
  mi.destaque,
  mi.ordem
FROM menu_items mi
JOIN categorias c ON c.id = mi.categoria_id
WHERE mi.disponivel = 1
  AND c.ativo = 1
ORDER BY c.ordem, mi.ordem, mi.nome;

-- ────────────────────────────────────────────────────────────
--  STORED PROCEDURES
-- ────────────────────────────────────────────────────────────
DELIMITER $$

-- Cria ou devolve carrinho para utilizador/sessão
CREATE PROCEDURE sp_get_or_create_carrinho(
  IN p_user_id INT,
  IN p_token   VARCHAR(64),
  OUT p_cart_id INT
)
BEGIN
  SELECT id INTO p_cart_id
  FROM carrinhos
  WHERE (p_user_id IS NOT NULL AND utilizador_id = p_user_id)
     OR (p_user_id IS NULL     AND session_token = p_token)
  LIMIT 1;

  IF p_cart_id IS NULL THEN
    INSERT INTO carrinhos (utilizador_id, session_token)
    VALUES (p_user_id, p_token);
    SET p_cart_id = LAST_INSERT_ID();
  END IF;
END$$

-- Adiciona item ao carrinho (upsert)
CREATE PROCEDURE sp_add_to_cart(
  IN p_cart_id      INT,
  IN p_item_id      INT,
  IN p_quantidade   INT
)
BEGIN
  DECLARE v_preco DECIMAL(8,2);
  SELECT COALESCE(preco_promo, preco) INTO v_preco
  FROM menu_items WHERE id = p_item_id AND disponivel = 1;

  IF v_preco IS NOT NULL THEN
    INSERT INTO carrinho_itens (carrinho_id, menu_item_id, quantidade, preco_unitario)
    VALUES (p_cart_id, p_item_id, p_quantidade, v_preco)
    ON DUPLICATE KEY UPDATE quantidade = quantidade + p_quantidade;

    UPDATE carrinhos SET atualizado_em = NOW() WHERE id = p_cart_id;
  END IF;
END$$

-- Confirma encomenda a partir do carrinho
CREATE PROCEDURE sp_confirmar_encomenda(
  IN p_cart_id          INT,
  IN p_user_id          INT,
  IN p_tipo_entrega     VARCHAR(20),
  IN p_morada           VARCHAR(200),
  IN p_andar            VARCHAR(30),
  IN p_lote             VARCHAR(30),
  IN p_cod_postal       VARCHAR(10),
  IN p_localidade       VARCHAR(80),
  IN p_telefone         VARCHAR(20),
  IN p_metodo_pagamento VARCHAR(20),
  OUT p_referencia      VARCHAR(20),
  OUT p_total           DECIMAL(8,2)
)
BEGIN
  DECLARE v_subtotal DECIMAL(8,2);
  DECLARE v_taxa     DECIMAL(8,2) DEFAULT 0.00;
  DECLARE v_ref      VARCHAR(20);
  DECLARE v_enc_id   INT;

  -- Calcular subtotal
  SELECT SUM(ci.quantidade * ci.preco_unitario)
  INTO v_subtotal
  FROM carrinho_itens ci
  WHERE ci.carrinho_id = p_cart_id;

  IF v_subtotal IS NULL OR v_subtotal = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Carrinho vazio';
  END IF;

  -- Taxa de entrega
  IF p_tipo_entrega = 'domicilio' THEN
    SELECT CAST(valor AS DECIMAL(8,2)) INTO v_taxa
    FROM configuracoes WHERE chave = 'taxa_entrega';
  END IF;

  SET p_total = v_subtotal + v_taxa;

  -- Gerar referência única
  SET v_ref = CONCAT('#CDS-', LPAD(FLOOR(RAND() * 900000) + 100000, 6, '0'));
  SET p_referencia = v_ref;

  -- Criar encomenda
  INSERT INTO encomendas (
    referencia, utilizador_id, tipo_entrega,
    morada, andar, lote, cod_postal, localidade, telefone_entrega,
    metodo_pagamento, subtotal, taxa_entrega, total
  ) VALUES (
    v_ref, p_user_id, p_tipo_entrega,
    p_morada, p_andar, p_lote, p_cod_postal, p_localidade, p_telefone,
    p_metodo_pagamento, v_subtotal, v_taxa, p_total
  );
  SET v_enc_id = LAST_INSERT_ID();

  -- Copiar itens do carrinho
  INSERT INTO encomenda_itens (encomenda_id, menu_item_id, nome_item, quantidade, preco_unitario)
  SELECT v_enc_id, ci.menu_item_id, mi.nome, ci.quantidade, ci.preco_unitario
  FROM carrinho_itens ci
  JOIN menu_items mi ON mi.id = ci.menu_item_id
  WHERE ci.carrinho_id = p_cart_id;

  -- Limpar carrinho
  DELETE FROM carrinho_itens WHERE carrinho_id = p_cart_id;
  DELETE FROM carrinhos       WHERE id = p_cart_id;
END$$

-- Verificar disponibilidade de mesa num slot
CREATE PROCEDURE sp_verificar_slot(
  IN  p_mesa_id     INT,
  IN  p_data        DATE,
  IN  p_hora        TIME,
  OUT p_disponivel  TINYINT
)
BEGIN
  DECLARE v_count INT;
  SELECT COUNT(*) INTO v_count
  FROM reservas
  WHERE mesa_id = p_mesa_id
    AND data_reserva = p_data
    AND hora_reserva = p_hora
    AND estado IN ('pendente','confirmada');
  SET p_disponivel = IF(v_count = 0, 1, 0);
END$$

DELIMITER ;

-- ────────────────────────────────────────────────────────────
--  ÍNDICES EXTRA para performance
-- ────────────────────────────────────────────────────────────
ALTER TABLE reservas
  ADD INDEX idx_data_estado (data_reserva, estado);

ALTER TABLE encomendas
  ADD INDEX idx_pago_estado (pago, estado);

-- ============================================================
--  FIM DO SCHEMA
-- ============================================================
