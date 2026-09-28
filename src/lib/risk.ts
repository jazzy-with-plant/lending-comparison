import Decimal from "decimal.js";
import type { RiskStatus, StressInput, StressResult } from "../types";

export const WAD = new Decimal("1e18");

export function clampRatio(value: number): number {
  if (!Number.isFinite(value)) throw new Error("Ratio must be a finite number.");
  return Math.min(1, Math.max(0, value));
}

export function calculateLtv(debt: Decimal.Value, collateralValue: Decimal.Value): number {
  const collateral = new Decimal(collateralValue);
  if (!collateral.isFinite() || collateral.lte(0)) throw new Error("Collateral value must be greater than zero.");
  const result = new Decimal(debt).div(collateral);
  if (!result.isFinite() || result.lt(0)) throw new Error("Debt must be a non-negative finite value.");
  return result.toNumber();
}

export function calculateMaxDebt(
  collaterals: Array<{ value: Decimal.Value; lltv: Decimal.Value }>,
): number {
  if (collaterals.length === 0) throw new Error("At least one collateral is required.");
  return collaterals.reduce((sum, collateral) => {
    const value = new Decimal(collateral.value);
    const lltv = new Decimal(collateral.lltv);
    if (value.lt(0) || lltv.lt(0) || lltv.gt(1)) throw new Error("Collateral value and LLTV are out of range.");
    return sum.add(value.mul(lltv));
  }, new Decimal(0)).toNumber();
}

export function classifyHealth(distanceToLiquidation: number): RiskStatus {
  if (!Number.isFinite(distanceToLiquidation)) throw new Error("Liquidation distance must be finite.");
  if (distanceToLiquidation < 0) return "LIQUIDATABLE";
  if (distanceToLiquidation < 0.05) return "CRITICAL";
  if (distanceToLiquidation < 0.2) return "WARNING";
  return "SAFE";
}

export function midnightLiquidationStatus(input: {
  debt: Decimal.Value;
  maxDebt: Decimal.Value;
  maturity: number;
  now?: number;
}): RiskStatus {
  const debt = new Decimal(input.debt);
  const maxDebt = new Decimal(input.maxDebt);
  if (debt.lt(0) || maxDebt.lt(0)) throw new Error("Debt and max debt must be non-negative.");
  const now = input.now ?? Math.floor(Date.now() / 1000);
  if (now > input.maturity && debt.gt(0)) return "LIQUIDATABLE";
  if (maxDebt.eq(0)) return debt.eq(0) ? "SAFE" : "LIQUIDATABLE";
  return classifyHealth(maxDebt.minus(debt).div(maxDebt).toNumber());
}

export function priceWadToDecimal(price: string): number {
  const parsed = new Decimal(price);
  if (!parsed.isFinite() || parsed.lte(0)) throw new Error("Unit price must be positive.");
  return parsed.div(WAD).toNumber();
}

export function impliedTermRate(unitPrice: number): number {
  if (!Number.isFinite(unitPrice) || unitPrice <= 0 || unitPrice > 1) throw new Error("Unit price must be in (0, 1].");
  return new Decimal(1).div(unitPrice).minus(1).toNumber();
}

export function annualizeSimpleRate(termRate: number, daysToMaturity: number): number {
  if (!Number.isFinite(termRate) || termRate < 0) throw new Error("Term rate must be non-negative.");
  if (!Number.isFinite(daysToMaturity) || daysToMaturity <= 0) throw new Error("Days to maturity must be positive.");
  return new Decimal(termRate).mul(365).div(daysToMaturity).toNumber();
}

export function hyperliquidBorrowRate(utilization: number): number {
  const u = clampRatio(utilization);
  return new Decimal("0.05").plus(new Decimal("4.75").mul(Math.max(0, u - 0.8))).toNumber();
}

export function simulatePortfolioStress(input: StressInput): StressResult {
  const values = Object.values(input);
  if (values.some((value) => !Number.isFinite(value))) throw new Error("All stress inputs must be finite.");
  if ([input.hypeCollateralUsd, input.btcCollateralUsd, input.debtUsd, input.perpNotionalUsd].some((value) => value < 0)) {
    throw new Error("USD inputs must be non-negative.");
  }
  if (input.perpShock < -1 || input.perpShock > 1) throw new Error("Perp shock must be between -100% and +100%.");

  const hype = new Decimal(input.hypeCollateralUsd);
  const btc = new Decimal(input.btcCollateralUsd);
  const debt = new Decimal(input.debtUsd);
  const notional = new Decimal(input.perpNotionalUsd);
  const pnl = notional.mul(input.perpShock);
  const equity = hype.plus(btc).minus(debt).plus(pnl);

  // Official LTVs: HYPE 65%, BTC 50%. PnL is applied as a USD balance change.
  const borrowCapacity = hype.mul("0.65").plus(btc.mul("0.50")).plus(Decimal.min(0, pnl));
  const borrowHeadroom = Decimal.max(0, borrowCapacity.minus(debt));

  // Official liquidation thresholds: HYPE 82.5%, BTC 75%. The 2% perp
  // maintenance rate is the first ETH tier; this lab intentionally does not
  // claim to reproduce every account cap, oracle median, tier deduction or
  // liquidation ordering used by Hyperliquid.
  const liquidationAdjusted = hype.mul("0.825").plus(btc.mul("0.75")).plus(pnl);
  const currentNotional = notional.mul(new Decimal(1).plus(input.perpShock));
  const perpMaintenance = Decimal.max(0, currentNotional).mul("0.02").plus(20);
  const buffer = liquidationAdjusted.minus(debt).minus(perpMaintenance);
  const base = Decimal.max(1, liquidationAdjusted.abs());
  const distance = buffer.div(base).toNumber();

  return {
    perpPnlUsd: pnl.toNumber(),
    equityUsd: equity.toNumber(),
    borrowHeadroomUsd: borrowHeadroom.toNumber(),
    liquidationAdjustedCollateralUsd: liquidationAdjusted.toNumber(),
    perpMaintenanceUsd: perpMaintenance.toNumber(),
    liquidationBufferUsd: buffer.toNumber(),
    effectiveLtv: calculateLtv(debt, Decimal.max(1, hype.plus(btc).plus(pnl))),
    status: classifyHealth(distance),
  };
}
