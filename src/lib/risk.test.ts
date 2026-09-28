import { describe, expect, it } from "vitest";
import {
  annualizeSimpleRate, calculateLtv, calculateMaxDebt, classifyHealth,
  hyperliquidBorrowRate, impliedTermRate, midnightLiquidationStatus,
  priceWadToDecimal, simulatePortfolioStress,
} from "./risk";

describe("shared lending math", () => {
  it("calculates LTV as debt divided by collateral value", () => {
    expect(calculateLtv(50, 100)).toBe(0.5);
  });

  it("rejects missing or zero collateral value", () => {
    expect(() => calculateLtv(50, 0)).toThrow(/greater than zero/);
  });

  it("calculates multi-collateral max debt", () => {
    expect(calculateMaxDebt([{ value: 20_000, lltv: 0.8 }, { value: 10_000, lltv: 0.5 }])).toBe(21_000);
  });

  it.each([
    [0.25, "SAFE"], [0.1, "WARNING"], [0.01, "CRITICAL"], [-0.01, "LIQUIDATABLE"],
  ] as const)("classifies %s liquidation distance as %s", (distance, status) => {
    expect(classifyHealth(distance)).toBe(status);
  });
});

describe("Morpho Midnight math", () => {
  it("marks a healthy pre-maturity position safe", () => {
    expect(midnightLiquidationStatus({ debt: 70, maxDebt: 100, maturity: 2_000, now: 1_000 })).toBe("SAFE");
  });

  it("marks a near-liquidation pre-maturity position critical", () => {
    expect(midnightLiquidationStatus({ debt: 98, maxDebt: 100, maturity: 2_000, now: 1_000 })).toBe("CRITICAL");
  });

  it("marks any remaining post-maturity debt liquidatable", () => {
    expect(midnightLiquidationStatus({ debt: 1, maxDebt: 100, maturity: 1_000, now: 1_001 })).toBe("LIQUIDATABLE");
  });

  it("derives term and annualized rates from a WAD price", () => {
    const price = priceWadToDecimal("950000000000000000");
    expect(price).toBe(0.95);
    expect(impliedTermRate(price)).toBeCloseTo(0.05263158, 7);
    expect(annualizeSimpleRate(impliedTermRate(price), 182.5)).toBeCloseTo(0.10526316, 7);
  });
});

describe("Hyperliquid published stablecoin curve", () => {
  it("holds the base rate below the utilization kink", () => {
    expect(hyperliquidBorrowRate(0.7)).toBe(0.05);
  });

  it("raises the rate above 80% utilization", () => {
    expect(hyperliquidBorrowRate(0.9)).toBeCloseTo(0.525, 10);
  });
});

describe("portfolio stress simulation", () => {
  const base = { hypeCollateralUsd: 20_000, btcCollateralUsd: 30_000, debtUsd: 15_000, perpNotionalUsd: 40_000 };

  it("keeps the mild scenario healthy", () => {
    expect(simulatePortfolioStress({ ...base, perpShock: -0.1 }).status).toBe("SAFE");
  });

  it("shows a larger loss reducing liquidation buffer", () => {
    const mild = simulatePortfolioStress({ ...base, perpShock: -0.1 });
    const severe = simulatePortfolioStress({ ...base, perpShock: -0.8 });
    expect(severe.liquidationBufferUsd).toBeLessThan(mild.liquidationBufferUsd);
    expect(severe.status).toBe("LIQUIDATABLE");
  });

  it("rejects shocks below -100%", () => {
    expect(() => simulatePortfolioStress({ ...base, perpShock: -1.1 })).toThrow(/between -100%/);
  });
});
