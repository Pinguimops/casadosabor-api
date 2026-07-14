/*
  import-schema.js
  Importa o ficheiro schema_fixed.sql para uma base de dados MySQL remota
  (Aiven), lidando corretamente com blocos DELIMITER (stored procedures).

  Uso:
    node import-schema.js

  As credenciais vêm do ficheiro .env (nunca vão para o GitHub).
*/

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const CONFIG = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false },
  multipleStatements: true,
};

const SCHEMA_FILE = path.join(__dirname, "schema_fixed.sql");

function splitStatements(sql) {
  const lines = sql.split(/\r?\n/);
  let delimiter = ";";
  let buffer = "";
  const statements = [];

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("--") || trimmed.startsWith("#")) continue;

    const delimMatch = trimmed.match(/^DELIMITER\s+(\S+)/i);
    if (delimMatch) {
      delimiter = delimMatch[1];
      continue;
    }

    buffer += line + "\n";

    if (buffer.trim().endsWith(delimiter)) {
      let stmt = buffer.trim();
      stmt = stmt.slice(0, -delimiter.length).trim();
      if (stmt) statements.push(stmt);
      buffer = "";
    }
  }

  if (buffer.trim()) statements.push(buffer.trim());
  return statements;
}

async function main() {
  if (!CONFIG.host || !CONFIG.password) {
    console.error("❌ Faltam credenciais no ficheiro .env — verifica se o criaste corretamente.");
    process.exit(1);
  }

  console.log("📖 A ler ficheiro:", SCHEMA_FILE);
  const sql = fs.readFileSync(SCHEMA_FILE, "utf8");
  const statements = splitStatements(sql);
  console.log(`🔧 ${statements.length} instruções encontradas.`);

  console.log("🔌 A ligar ao Aiven...");
  const conn = await mysql.createConnection(CONFIG);
  console.log("✅ Ligado com sucesso!\n");

  let ok = 0, fail = 0;
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      await conn.query(stmt);
      ok++;
      process.stdout.write(".");
    } catch (e) {
      fail++;
      console.log(`\n❌ Erro na instrução ${i + 1}: ${e.message}`);
      console.log(`   → ${stmt.slice(0, 100)}...`);
    }
  }

  console.log(`\n\n🎉 Concluído: ${ok} com sucesso, ${fail} com erro.`);
  await conn.end();
}

main().catch(e => {
  console.error("💥 Erro fatal:", e.message);
  process.exit(1);
});
