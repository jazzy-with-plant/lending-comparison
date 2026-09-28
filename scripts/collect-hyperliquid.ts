import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import initSqlJs from "sql.js";
import { fetchHyperliquidReserves } from "../src/lib/data";
import type { HyperliquidHistoryPoint } from "../src/types";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(projectRoot, "data");
const publicDataDir = join(projectRoot, "public", "data");
const databasePath = join(dataDir, "hyperliquid-history.sqlite");
const exportPath = join(publicDataDir, "hyperliquid-history.json");
const wasmPath = join(projectRoot, "node_modules", "sql.js", "dist", "sql-wasm.wasm");

function argument(name: string, fallback: number): number {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? Number(process.argv[index + 1]) : fallback;
  if (!Number.isInteger(value) || value < 1) throw new Error(`${name} must be a positive integer.`);
  return value;
}

const count = argument("--count", 1);
const intervalMs = argument("--interval-ms", 60_000);

mkdirSync(dataDir, { recursive: true });
mkdirSync(publicDataDir, { recursive: true });

const SQL = await initSqlJs({ locateFile: () => wasmPath });
const database = existsSync(databasePath)
  ? new SQL.Database(readFileSync(databasePath))
  : new SQL.Database();

database.run(`
  CREATE TABLE IF NOT EXISTS reserve_samples (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_index INTEGER NOT NULL,
    asset TEXT NOT NULL,
    borrow_yearly_rate REAL NOT NULL,
    supply_yearly_rate REAL NOT NULL,
    balance REAL NOT NULL,
    utilization REAL NOT NULL,
    oracle_price REAL NOT NULL,
    ltv REAL NOT NULL,
    total_supplied REAL NOT NULL,
    total_borrowed REAL NOT NULL,
    fetched_at TEXT NOT NULL
  );
`);

async function capture(): Promise<void> {
  const reserves = await fetchHyperliquidReserves();
  const statement = database.prepare(`
    INSERT INTO reserve_samples (
      token_index, asset, borrow_yearly_rate, supply_yearly_rate, balance,
      utilization, oracle_price, ltv, total_supplied, total_borrowed, fetched_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  try {
    database.run("BEGIN TRANSACTION");
    for (const reserve of reserves) {
      statement.run([
        reserve.tokenIndex, reserve.asset, reserve.borrowYearlyRate,
        reserve.supplyYearlyRate, reserve.balance, reserve.utilization,
        reserve.oraclePrice, reserve.ltv, reserve.totalSupplied,
        reserve.totalBorrowed, reserve.fetchedAt,
      ]);
    }
    database.run("COMMIT");
  } catch (error) {
    database.run("ROLLBACK");
    throw error;
  } finally {
    statement.free();
  }
  console.log(`Captured ${reserves.length} official reserve observations at ${reserves[0]?.fetchedAt ?? "unknown"}.`);
}

for (let sample = 0; sample < count; sample += 1) {
  await capture();
  if (sample < count - 1) await new Promise((resolve) => setTimeout(resolve, intervalMs));
}

const result = database.exec(`
  SELECT id, token_index, asset, borrow_yearly_rate, supply_yearly_rate,
         balance, utilization, oracle_price, ltv, total_supplied,
         total_borrowed, fetched_at
  FROM reserve_samples
  ORDER BY fetched_at ASC, token_index ASC
`);

const history: HyperliquidHistoryPoint[] = result.length === 0 ? [] : result[0].values.map((row) => ({
  id: Number(row[0]), tokenIndex: Number(row[1]), asset: String(row[2]),
  borrowYearlyRate: Number(row[3]), supplyYearlyRate: Number(row[4]),
  balance: Number(row[5]), utilization: Number(row[6]), oraclePrice: Number(row[7]),
  ltv: Number(row[8]), totalSupplied: Number(row[9]), totalBorrowed: Number(row[10]),
  fetchedAt: String(row[11]),
}));

writeFileSync(databasePath, database.export());
writeFileSync(exportPath, `${JSON.stringify(history, null, 2)}\n`);
database.close();
console.log(`SQLite: ${databasePath}`);
console.log(`Dashboard export: ${exportPath} (${history.length} rows)`);
