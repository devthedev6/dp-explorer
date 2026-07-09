import { describe, expect, it } from "vitest";

import { runTopDown } from "@dp-explorer/core";

import { fibonacciSpec } from "../src";

describe("fibonacciSpec", () => {
  it("type-checks and produces a trace through the generic top-down engine", () => {
    const { trace } = runTopDown(fibonacciSpec, { n: 3 });

    expect(trace.problemId).toBe("fibonacci");
    expect(trace.mode).toBe("top-down");
    expect(trace.events.at(-1)).toMatchObject({ type: "COMPLETE", answer: 2 });
  });
});
