import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchMidnightBooks } from "./data";

afterEach(() => vi.unstubAllGlobals());

describe("official API runtime validation", () => {
  it("rejects invalid or missing Midnight oracle data", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      data: [{
        market_id: "0xmarket", chain_id: 1, loan_token: "0xloan", maturity: 2_000_000_000,
        collaterals: [{ token: "0xcollateral", lltv: "800000000000000000", liquidation_cursor: "0" }],
        asks: [], bids: [],
      }],
      cursor: null,
    }), { status: 200 })));
    await expect(fetchMidnightBooks()).rejects.toThrow(/validation failed/i);
  });

  it("keeps large on-chain integers as strings", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      data: [{
        market_id: "0xmarket", chain_id: 8453, loan_token: "0xloan", maturity: 2_000_000_000,
        collaterals: [{ token: "0xcollateral", lltv: "980000000000000000", liquidation_cursor: "300000000000000000", oracle: "0xoracle" }],
        asks: [], bids: [{ tick: 1, price: "995000000000000000", units: "900719925474099300000", assets: "1000000", count: 1 }],
      }], cursor: null,
    }), { status: 200 })));
    const [book] = await fetchMidnightBooks();
    expect(book.bids[0].units).toBe("900719925474099300000");
  });
});
