# 🍽️ Casa do Sabor — Guia de Instalação

## Estrutura do Projeto

```
casadosabor/
├── index.html              ← Página principal
├── pages/
│   ├── menu.html           ← Ementa completa com carrinho
│   ├── about.html          ← Sobre nós
│   ├── chefs.html          ← Equipa de chefs
│   ├── contact.html        ← Contacto + reserva de mesa
│   └── checkout.html       ← Finalizar encomenda
├── css/
│   ├── alignment.css       ← ⭐ Alinhamento global
│   ├── cart.css            ← Carrinho de compras
│   ├── login.css           ← Modal de login
│   ├── reservation-map.css ← Planta do restaurante
│   └── ...
├── js/
│   ├── db.js               ← ⭐ Ligação à base de dados
│   ├── cart.js             ← Lógica do carrinho
│   ├── login.js            ← Sistema de autenticação
│   ├── reservation-map.js  ← Planta interativa
│   └── ...
├── assets/images/          ← Coloca aqui as tuas imagens
└── database/
    ├── schema.sql          ← ⭐ Schema MySQL completo
    ├── api.js              ← ⭐ Servidor API Node.js
    ├── package.json        ← Dependências Node
    └── .env.example        ← Modelo de variáveis de ambiente
```

---

## ⚡ Modo Rápido (sem base de dados)

Abre `index.html` diretamente no browser.
O site funciona em modo **offline** com `localStorage` — sem precisar de
servidor ou base de dados.

---

## 🗄️ Configurar a Base de Dados MySQL

### 1. Criar a base de dados

```sql
-- No MySQL Workbench, DBeaver, ou linha de comandos:
mysql -u root -p < database/schema.sql
```

Isto cria:
- Base de dados `casadosabor`
- Todas as tabelas (utilizadores, menu, mesas, reservas, encomendas…)
- Dados de demonstração (menu, mesas, chefs, eventos)
- Views e stored procedures

### 2. Configurar as variáveis de ambiente

```bash
cd database
cp .env.example .env
```

Edita `.env` com os teus dados:
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=a_tua_password
DB_NAME=casadosabor
JWT_SECRET=um_secret_longo_e_aleatorio
```

### 3. Instalar dependências e arrancar a API

```bash
cd database
npm install
npm start
```

A API fica disponível em `http://localhost:3000`

Verifica se está a funcionar:
```
http://localhost:3000/api/health
```

### 4. Ligar o site à API

No ficheiro `js/db.js`, a linha:
```js
const API_URL = window.CASADOSABOR_API || "http://localhost:3000/api";
```

Para alterar o URL da API sem editar o ficheiro, define antes de carregar `db.js`:
```html
<script>window.CASADOSABOR_API = "https://teu-servidor.com/api";</script>
<script src="js/db.js"></script>
```

---

## 🔄 Como funciona a sincronização

O `js/db.js` funciona em **modo híbrido**:

| Situação | Comportamento |
|---|---|
| API online + utilizador autenticado | Dados guardados na BD MySQL |
| API online + sem autenticação | Login/registo usa a BD |
| API offline | Tudo funciona com localStorage |

O site **nunca quebra** — se a API não estiver acessível, usa automaticamente
o localStorage como fallback.

---

## 📋 Endpoints da API

| Método | URL | Descrição |
|--------|-----|-----------|
| POST | `/api/auth/registar` | Criar conta |
| POST | `/api/auth/login` | Iniciar sessão |
| GET | `/api/auth/perfil` | Perfil do utilizador |
| GET | `/api/menu` | Lista de pratos |
| GET | `/api/menu?categoria=entradas` | Filtrar por categoria |
| GET | `/api/categorias` | Lista de categorias |
| GET | `/api/carrinho` | Ver carrinho |
| POST | `/api/carrinho/adicionar` | Adicionar item |
| PUT | `/api/carrinho/item/:id` | Alterar quantidade |
| DELETE | `/api/carrinho/limpar` | Limpar carrinho |
| POST | `/api/encomendas` | Confirmar encomenda |
| GET | `/api/encomendas` | Histórico de encomendas |
| GET | `/api/mesas` | Estado das mesas |
| GET | `/api/mesas/:id/slots?data=` | Slots ocupados |
| POST | `/api/reservas` | Criar reserva |
| GET | `/api/reservas` | Histórico de reservas |
| POST | `/api/newsletter` | Subscrever newsletter |
| GET | `/api/config` | Configurações do site |
| GET | `/api/health` | Estado da API |

**Endpoints Admin** (requerem `role: admin`):
| Método | URL | Descrição |
|--------|-----|-----------|
| GET | `/api/admin/dashboard` | Estatísticas do dia |
| GET | `/api/admin/encomendas` | Todas as encomendas |
| PUT | `/api/admin/encomendas/:id/estado` | Atualizar estado |
| GET | `/api/admin/reservas` | Reservas do dia |

---

## 🖼️ Imagens

Coloca os teus ficheiros de imagem em `assets/images/` com estes nomes:

```
hero-slider-1.jpg    (1880×950)
hero-slider-2.jpg    (1880×950)
hero-slider-3.jpg    (1880×950)
service-1.jpg        (285×336)  — Pequeno-almoço
service-2.jpg        (285×336)  — Bebidas
service-3.jpg        (285×336)  — Entradas
menu-1.jpg a menu-6.jpg  (100×100)
about-banner.jpg     (570×570)
about-abs-image.jpg  (285×285)
special-dish-banner.jpg (940×900)
event-1.jpg a event-3.jpg (350×450)
features-icon-1.png a features-icon-4.png (100×80)
logo.svg             (160×50)
footer-bg.jpg
testimonial-bg.jpg
```

---

## 🚀 Deploy em Produção

1. Coloca os ficheiros HTML/CSS/JS num servidor web (Apache, Nginx, Netlify, etc.)
2. Instala a API num servidor Node.js (VPS, Railway, Render, etc.)
3. Configura `window.CASADOSABOR_API` com o URL público da API
4. Garante que o MySQL está acessível a partir do servidor da API

---

## 🛠️ Tecnologias

- **Frontend**: HTML5, CSS3, JavaScript (vanilla)
- **Backend**: Node.js + Express
- **Base de dados**: MySQL 8+
- **Autenticação**: JWT + bcrypt
- **Pagamento**: simulado (integrar Stripe/MB Way em produção)
