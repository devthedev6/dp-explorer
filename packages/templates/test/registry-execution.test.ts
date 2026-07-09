import { describe, expect, it } from "vitest";

import { EventType, runBottomUp, runTopDown } from "@dp-explorer/core";

import { coordinateKey, templateRegistry } from "../src";

describe("templateRegistry", () => {
  it("executes every registered template in both engine modes", () => {
    for (const template of templateRegistry.list()) {
      const input = normalizeInput(template.id, template.defaultInput);
      const topDown = runTopDown(template.spec, input);
      const bottomUp = runBottomUp(template.spec, input);

      expect(topDown.trace.events.at(-1)).toMatchObject({ type: EventType.Complete });
      expect(bottomUp.trace.events.at(-1)).toMatchObject({ type: EventType.Complete });
      expect(topDown.dpTable.size).toBeGreaterThan(0);
      expect(bottomUp.dpTable.size).toBeGreaterThan(0);
    }
  });
});

function normalizeInput(
  templateId: string,
  input: Readonly<Record<string, unknown>>
): Readonly<Record<string, unknown>> {
  if (templateId === "knapsack") {
    return {
      ...input,
      weights: parseIntegerArray(input.weights),
      values: parseIntegerArray(input.values)
    };
  }

  if (templateId === "coin-change") {
    return {
      ...input,
      coins: parseIntegerArray(input.coins)
    };
  }

  if (templateId === "unique-paths-ii") {
    const rows = expectNumber(input.rows);
    const columns = expectNumber(input.columns);

    return {
      ...input,
      blocked: parseBlockedCells(input.blocked, rows, columns)
    };
  }

  return input;
}

function parseIntegerArray(value: unknown): readonly number[] {
  if (Array.isArray(value)) {
    return value as readonly number[];
  }

  if (typeof value !== "string" || value.trim() === "") {
    return [];
  }

  return value.split(",").map((part) => Number(part.trim()));
}

function parseBlockedCells(value: unknown, rows: number, columns: number): ReadonlySet<string> {
  if (typeof value !== "string") {
    return new Set();
  }

  const blocked = new Set<string>();

  for (const line of value.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (trimmed === "") {
      continue;
    }

    const [row, column] = trimmed.split(",").map((part) => Number(part.trim()));

    if (
      row !== undefined &&
      column !== undefined &&
      row >= 0 &&
      row < rows &&
      column >= 0 &&
      column < columns
    ) {
      blocked.add(coordinateKey(row, column));
    }
  }

  return blocked;
}

function expectNumber(value: unknown): number {
  if (typeof value !== "number") {
    throw new Error("Expected numeric template input.");
  }

  return value;
}
