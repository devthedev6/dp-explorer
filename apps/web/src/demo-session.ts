import { runTopDown } from "@dp-explorer/core";
import type { ExecutionFrame, PlaybackController } from "@dp-explorer/playback";
import { createPlaybackController } from "@dp-explorer/playback";
import type { RegisteredTemplate } from "@dp-explorer/templates";
import { coordinateKey } from "@dp-explorer/templates";

export interface DemoSession {
  readonly controller: PlaybackController;
  currentFrame(): ExecutionFrame;
  next(): ExecutionFrame;
  previous(): ExecutionFrame;
  reset(): ExecutionFrame;
}

/**
 * Compose the architecture pipeline for a registered DP template.
 *
 * Accepts any template from the registry and produces a playable demo session
 * using the template's default input.
 */
export function createDemoSession(template: RegisteredTemplate): DemoSession {
  const normalizedInput = normalizeInput(template.id, template.defaultInput);
  const trace = runTopDown(template.spec, normalizedInput);
  const controller = createPlaybackController(trace);

  return Object.freeze({
    controller,
    currentFrame: () => controller.currentFrame(),
    next: () => controller.next(),
    previous: () => controller.previous(),
    reset: () => controller.seek(0)
  });
}

function normalizeInput(
  templateId: string,
  input: Readonly<Record<string, unknown>>
): Readonly<Record<string, unknown>> {
  if (templateId === "knapsack") {
    const weights = parseIntegerArray(input.weights);
    const values = parseIntegerArray(input.values);

    if (weights.length !== values.length) {
      throw new Error(
        `Weights and values must have the same length. Received ${weights.length} weights and ${values.length} values.`
      );
    }

    return {
      ...input,
      weights,
      values
    };
  }

  if (templateId === "unique-paths-ii") {
    const rows = expectInteger(input.rows, "rows");
    const columns = expectInteger(input.columns, "columns");
    const blocked = parseBlockedCells(input.blocked, rows, columns);

    return {
      ...input,
      rows,
      columns,
      blocked
    };
  }

  return input;
}

function expectInteger(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${name} must be a finite number.`);
  }

  return value;
}

function parseBlockedCells(value: unknown, rows: number, columns: number): ReadonlySet<string> {
  if (typeof value !== "string") {
    return new Set();
  }

  const blocked = new Set<string>();
  const lines = value
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "");

  for (const line of lines) {
    const parts = line.split(",").map((part) => part.trim());

    if (parts.length !== 2) {
      throw new Error(`Blocked cell coordinate must have two parts. Received: "${line}".`);
    }

    const row = Number(parts[0]);
    const column = Number(parts[1]);

    if (!Number.isInteger(row) || !Number.isInteger(column)) {
      throw new Error(`Blocked cell coordinates must be integers. Received: "${line}".`);
    }

    if (row < 0 || row >= rows || column < 0 || column >= columns) {
      throw new Error(`Blocked cell (${row},${column}) is outside the ${rows} × ${columns} grid.`);
    }

    blocked.add(coordinateKey(row, column));
  }

  return blocked;
}

function parseIntegerArray(value: unknown): readonly number[] {
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item !== "number" || !Number.isFinite(item)) {
        throw new Error("Array input must contain only finite numbers.");
      }

      return item;
    });
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    return [];
  }

  return value.split(",").map((part) => {
    const trimmed = part.trim();
    const parsed = Number(trimmed);

    if (trimmed === "" || !Number.isFinite(parsed)) {
      throw new Error(`Cannot parse "${part}" as an integer.`);
    }

    return parsed;
  });
}
