import { z } from "zod";
import type {
  HyperliquidHistoryPoint,
  HyperliquidReserve,
  LendingMarketSnapshot,
  MidnightBook,
} from "../types";

export const HYPERLIQUID_INFO_URL = "https://api.hyperliquid.xyz/info";
export const HYPERLIQUID_DOCS_URL = "https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint";
export const MIDNIGHT_API_URL = "https://api.morpho.org/v0/midnight/books";
export const MIDNIGHT_DOCS_URL = "https://docs.morpho.org/developers/api/morpho-midnight/";

const numberString = z.string().refine((value) => Number.isFinite(Number(value)), "Expected a numeric string");

const reserveSchema = z.object({
  borrowYearlyRate: numberString,
  supplyYearlyRate: numberString,
  balance: numberString,
  utilization: numberString,
  oraclePx: numberString,
  ltv: numberString,
  totalSupplied: numberString,
  totalBorrowed: numberString,
});

const reserveListSchema = z.array(z.tuple([z.number().int().nonnegative(), reserveSchema]));
const spotMetaSchema = z.object({
  tokens: z.array(z.object({ index: z.number().int(), name: z.string().min(1) }).passthrough()),
}).passthrough();

const levelSchema = z.object({
  tick: z.number().int(),
  price: numberString,
  units: numberString,
  assets: numberString,
  count: z.number().int().nonnegative(),
});

const collateralSchema = z.object({
  token: z.string(),
  lltv: numberString,
  liquidation_cursor: numberString,
  oracle: z.string(),
});

const bookSchema = z.object({
  market_id: z.string(),
  chain_id: z.number().int(),
  loan_token: z.string(),
  maturity: z.number().int(),
  collaterals: z.array(collateralSchema),
  asks: z.array(levelSchema),
  bids: z.array(levelSchema),
}).passthrough();

const booksResponseSchema = z.object({ data: z.array(bookSchema), cursor: z.string().nullable().optional() });

async function postInfo(body: object): Promise<unknown> {
  const response = await fetch(HYPERLIQUID_INFO_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Hyperliquid API returned HTTP ${response.status}.`);
  return response.json();
}

export async function fetchHyperliquidReserves(): Promise<HyperliquidReserve[]> {
  const fetchedAt = new Date().toISOString();
  const [rawReserves, rawMeta] = await Promise.all([
    postInfo({ type: "allBorrowLendReserveStates" }),
    postInfo({ type: "spotMeta" }),
  ]);
  const reserves = reserveListSchema.safeParse(rawReserves);
  const meta = spotMetaSchema.safeParse(rawMeta);
  if (!reserves.success) throw new Error(`Hyperliquid reserve validation failed: ${reserves.error.issues[0]?.message ?? "unknown schema error"}.`);
  if (!meta.success) throw new Error(`Hyperliquid token metadata validation failed: ${meta.error.issues[0]?.message ?? "unknown schema error"}.`);
  const tokenNames = new Map(meta.data.tokens.map((token) => [token.index, token.name]));
  return reserves.data.map(([tokenIndex, reserve]) => ({
    tokenIndex,
    asset: tokenNames.get(tokenIndex) ?? `Token ${tokenIndex}`,
    borrowYearlyRate: Number(reserve.borrowYearlyRate),
    supplyYearlyRate: Number(reserve.supplyYearlyRate),
    balance: Number(reserve.balance),
    utilization: Number(reserve.utilization),
    oraclePrice: Number(reserve.oraclePx),
    ltv: Number(reserve.ltv),
    totalSupplied: Number(reserve.totalSupplied),
    totalBorrowed: Number(reserve.totalBorrowed),
    fetchedAt,
  }));
}

export function hyperliquidSnapshot(reserve: HyperliquidReserve): LendingMarketSnapshot {
  return {
    protocol: "Hyperliquid",
    marketId: `reserve:${reserve.tokenIndex}`,
    asset: reserve.asset,
    borrowApr: reserve.borrowYearlyRate,
    supplyApr: reserve.supplyYearlyRate,
    utilization: reserve.utilization,
    totalSupplied: reserve.totalSupplied,
    totalBorrowed: reserve.totalBorrowed,
    oraclePrice: reserve.oraclePrice,
    ltv: reserve.ltv,
    maturity: null,
    provenance: {
      mode: "LIVE",
      sourceUrl: HYPERLIQUID_DOCS_URL,
      endpoint: "POST /info · allBorrowLendReserveStates + spotMeta",
      fetchedAt: reserve.fetchedAt,
      observedAt: null,
      note: "The public response has no observation timestamp; fetchedAt is client receipt time, not oracle time.",
    },
  };
}

export async function fetchMidnightBooks(): Promise<MidnightBook[]> {
  const fetchedAt = new Date().toISOString();
  const response = await fetch(MIDNIGHT_API_URL);
  if (!response.ok) throw new Error(`Morpho Midnight API returned HTTP ${response.status}.`);
  const parsed = booksResponseSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error(`Morpho Midnight validation failed: ${parsed.error.issues[0]?.message ?? "unknown schema error"}.`);
  return parsed.data.data.map((book) => ({
    marketId: book.market_id,
    chainId: book.chain_id,
    loanToken: book.loan_token,
    maturity: book.maturity,
    collaterals: book.collaterals.map((collateral) => ({
      token: collateral.token,
      lltv: collateral.lltv,
      liquidationCursor: collateral.liquidation_cursor,
      oracle: collateral.oracle,
    })),
    asks: book.asks,
    bids: book.bids,
    fetchedAt,
  }));
}

const historyPointSchema = z.object({
  id: z.number().int(), tokenIndex: z.number().int(), asset: z.string(),
  borrowYearlyRate: z.number(), supplyYearlyRate: z.number(), balance: z.number(),
  utilization: z.number(), oraclePrice: z.number(), ltv: z.number(),
  totalSupplied: z.number(), totalBorrowed: z.number(), fetchedAt: z.string().datetime(),
});

export async function fetchCollectedHistory(): Promise<HyperliquidHistoryPoint[]> {
  const response = await fetch("/data/hyperliquid-history.json", { cache: "no-store" });
  if (!response.ok) throw new Error("No self-collected history yet. Run pnpm collect:hyperliquid.");
  const parsed = z.array(historyPointSchema).safeParse(await response.json());
  if (!parsed.success) throw new Error("Self-collected history file failed runtime validation.");
  return parsed.data;
}
