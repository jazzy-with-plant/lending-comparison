import type { StressInput } from "../types";

type ToolInput = Partial<StressInput>;
type ModelContext = {
  registerTool: (tool: {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
    execute: (input: ToolInput) => Promise<{ content: Array<{ type: "text"; text: string }> }>;
  }) => void;
  unregisterTool?: (name: string) => void;
};

declare global {
  interface Navigator { modelContext?: ModelContext; }
}

const toolName = "set_lending_stress_scenario";

export function registerStressTool(): () => void {
  if (!navigator.modelContext) return () => undefined;
  navigator.modelContext.registerTool({
    name: toolName,
    description: "Update the visible Hyperliquid portfolio-margin research scenario and recalculate its risk outputs.",
    inputSchema: {
      type: "object",
      properties: {
        hypeCollateralUsd: { type: "number", minimum: 0 },
        btcCollateralUsd: { type: "number", minimum: 0 },
        debtUsd: { type: "number", minimum: 0 },
        perpNotionalUsd: { type: "number", minimum: 0 },
        perpShock: { type: "number", minimum: -1, maximum: 1 },
      },
      additionalProperties: false,
    },
    execute: async (input) => {
      window.dispatchEvent(new CustomEvent("lending-lab:set-stress", { detail: input }));
      return { content: [{ type: "text", text: "The visible simulated stress scenario was updated. Results remain a research projection, not an account liquidation quote." }] };
    },
  });
  return () => navigator.modelContext?.unregisterTool?.(toolName);
}
