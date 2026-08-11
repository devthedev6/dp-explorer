import { describe, expect, it } from "vitest";

import { EventType, PropagationRuntime, toStateKey } from "@dp-explorer/core";

import { gridPathsPropagationSpec, templateRegistry } from "../src";

describe("gridPathsPropagationSpec", () => {
  const runtime = new PropagationRuntime();

  it("seeds dp[0][0] with one way", () => {
    const result = runtime.execute(gridPathsPropagationSpec, { rows: 3, columns: 3 });

    expect(result.dpTable.get(toStateKey([0, 0]))).toBe(1);
    expect(result.trace.events[0]).toEqual({
      id: 0,
      type: EventType.PropagationSeed,
      state: toStateKey([0, 0]),
      value: 1
    });
  });

  it("propagates from a source cell to right and down neighbors", () => {
    const transitions = gridPathsPropagationSpec.transitions([0, 0], {
      input: { rows: 3, columns: 3 },
      value: 1
    });

    expect([...transitions]).toEqual([
      { target: [1, 0], contribution: 1 },
      { target: [0, 1], contribution: 1 }
    ]);
  });

  it("omits transitions whose targets are outside the grid", () => {
    const transitions = gridPathsPropagationSpec.transitions([2, 2], {
      input: { rows: 3, columns: 3 },
      value: 6
    });

    expect([...transitions]).toEqual([]);
  });

  it("aggregates contributions from multiple predecessors", () => {
    const result = runtime.execute(gridPathsPropagationSpec, { rows: 3, columns: 3 });
    const aggregation = result.trace.events.find(
      (event) =>
        event.type === EventType.PropagationUpdate &&
        event.target === toStateKey([1, 1]) &&
        event.operation === "aggregate"
    );

    expect(aggregation).toMatchObject({
      previousValue: 1,
      contribution: 1,
      updatedValue: 2
    });
    expect(result.dpTable.get(toStateKey([1, 1]))).toBe(2);
  });

  it("computes expected values and final answer for a 3 x 3 grid", () => {
    const result = runtime.execute(gridPathsPropagationSpec, { rows: 3, columns: 3 });

    expect(Object.fromEntries(result.dpTable)).toEqual({
      "0,0": 1,
      "0,1": 1,
      "0,2": 1,
      "1,0": 1,
      "1,1": 2,
      "1,2": 3,
      "2,0": 1,
      "2,1": 3,
      "2,2": 6
    });
    expect(result.trace.events.at(-1)).toMatchObject({
      type: EventType.Complete,
      answer: 6
    });
  });

  it("is registered as a propagation template", () => {
    const template = templateRegistry.get("grid-paths-propagation");

    expect(template).toMatchObject({
      id: "grid-paths-propagation",
      name: "2D Grid Paths",
      executionModel: "propagation",
      defaultInput: { rows: 3, columns: 3 }
    });
  });

  it("executes from the registered template through the propagation runtime", () => {
    const template = templateRegistry.get("grid-paths-propagation");

    if (template === undefined || template.executionModel !== "propagation") {
      throw new Error("Expected 2D Grid Paths to be registered as a propagation template.");
    }

    const result = runtime.execute(template.spec, template.defaultInput);

    expect(result.trace.mode).toBe("propagation");
    expect(result.trace.problemId).toBe("grid-paths-propagation");
    expect(result.trace.events.at(-1)).toMatchObject({
      type: EventType.Complete,
      answer: 6
    });
  });
});
