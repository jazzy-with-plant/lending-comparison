export type Protocol = "Morpho Midnight" | "Hyperliquid";
export type DataMode = "LIVE" | "DERIVED" | "SELF-COLLECTED" | "SIMULATED" | "UNAVAILABLE";
export type RiskStatus = "SAFE" | "WARNING" | "CRITICAL" | "LIQUIDATABLE";

export interface Provenance {
  mode: DataMode;
  sourceUrl: string;
  endpoint: string;
  fetchedAt: string;
  observedAt: string | null;
  note: string;
}

export interface LendingMarketSnapshot {
  protocol: Protocol;
  marketId: string;
  asset: string;
  borrowApr: number | null;
  supplyApr: number | null;
  utilization: number | null;
  totalSupplied: number | null;
  totalBorrowed: number | null;
  oraclePrice: number | null;
  ltv: number | null;
  maturity: number | null;
  provenance: Provenance;
}

export interface HyperliquidReserve {
  tokenIndex: number;
  asset: string;
  borrowYearlyRate: number;
  supplyYearlyRate: number;
  balance: number;
  utilization: number;
  oraclePrice: number;
  ltv: number;
  totalSupplied: number;
  totalBorrowed: number;
  fetchedAt: string;
}

export interface HyperliquidHistoryPoint extends HyperliquidReserve {
  id: number;
}

export interface MidnightLevel {
  tick: number;
  price: string;
  units: string;
  assets: string;
  count: number;
}

export interface MidnightCollateral {
  token: string;
  lltv: string;
  liquidationCursor: string;
  oracle: string;
}

export interface MidnightBook {
  marketId: string;
  chainId: number;
  loanToken: string;
  maturity: number;
  collaterals: MidnightCollateral[];
  bids: MidnightLevel[];
  asks: MidnightLevel[];
  fetchedAt: string;
}

export interface StressInput {
  hypeCollateralUsd: number;
  btcCollateralUsd: number;
  debtUsd: number;
  perpNotionalUsd: number;
  perpShock: number;
}

export interface StressResult {
  perpPnlUsd: number;
  equityUsd: number;
  borrowHeadroomUsd: number;
  liquidationAdjustedCollateralUsd: number;
  perpMaintenanceUsd: number;
  liquidationBufferUsd: number;
  effectiveLtv: number;
  status: RiskStatus;
}
