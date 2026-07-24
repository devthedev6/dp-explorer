import { describe, expect, it } from "vitest";

import type { PropagationProblemSpec, StateCoordinates } from "../src";
import { EventType, PropagationRuntime } from "../src";

interface StepsInput {
  readonly steps: number;
}

const runtime = new PropagationRuntime<StepsInput>();

describe("PropagationRuntime", () => {
  it("executes counting propagation and aggregates repeated contributions", () => {
    const result = runtime.execute(createCountingSpec(), { steps: 4 });

    expect([...result.dpTable.entries()]).toEqual([
      ["0", 1],
      ["1", 1],
      ["2", 2],
      ["3", 3],
      ["4", 5]
    ]);
    expect(answerOf(result)).toBe(5);
  });

  it("uses the specification's minimum aggregator", () => {
    const result = runtime.execute(createOptimizationSpec(Math.min), { steps: 3 });

    expect([...result.dpTable.entries()]).toEqual([
      ["0", 0],
      ["1", 5],
      ["2", 2],
      ["3", 7]
    ]);
    expect(answerOf(result)).toBe(7);
  });

  it("uses the specification's maximum aggregator", () => {
    const result = runtime.execute(createOptimizationSpec(Math.max), { steps: 3 });

    expect([...result.dpTable.entries()]).toEqual([
      ["0", 0],
      ["1", 5],
      ["2", 10],
      ["3", 15]
    ]);
    expect(answerOf(result)).toBe(15);
  });

  it("initializes every seed state before processing the schedule", () => {
    const spec: PropagationProblemSpec<StepsInput> = {
      ...createBaseSpec(),
      initialStates: () => [
        { state: [0], value: 2 },
        { state: [1], value: 3 }
      ],
      transitions: (state, context) =>
        single(state) < 2 ? [{ target: [2], contribution: context.value }] : [],
      aggregate: (current, contribution) => current + contribution
    };

    const result = runtime.execute(spec, { steps: 2 });

    expect([...result.dpTable.entries()]).toEqual([
      ["0", 2],
      ["1", 3],
      ["2", 5]
    ]);
    expect(result.trace.events.slice(0, 2)).toEqual([
      { id: 0, type: EventType.PropagationSeed, state: "0", value: 2 },
      { id: 1, type: EventType.PropagationSeed, state: "1", value: 3 }
    ]);
  });

  it("emits and applies every branch from a processed state", () => {
    const spec: PropagationProblemSpec<StepsInput> = {
      ...createBaseSpec(),
      initialStates: () => [{ state: [0], value: 1 }],
      transitions: (state, context) =>
        single(state) === 0
          ? [
              { target: [1], contribution: context.value * 2 },
              { target: [2], contribution: context.value * 3 }
            ]
          : [],
      aggregate: (current, contribution) => current + contribution
    };

    const result = runtime.execute(spec, { steps: 2 });

    expect([...result.dpTable.entries()]).toEqual([
      ["0", 1],
      ["1", 2],
      ["2", 3]
    ]);
    expect(result.trace.mode).toBe("propagation");
    expect(
      result.trace.events.filter((event) => event.type === EventType.PropagationTransition)
    ).toHaveLength(2);
  });

  it("emits a complete, ordered lifecycle for each propagated contribution", () => {
    const result = runtime.execute(createCountingSpec(), { steps: 2 });

    expect(result.trace.events).toEqual([
      { id: 0, type: EventType.PropagationSeed, state: "0", value: 1 },
      { id: 1, type: EventType.PropagationProcess, state: "0", value: 1 },
      {
        id: 2,
        type: EventType.PropagationTransition,
        processId: 1,
        source: "0",
        target: "1",
        contribution: 1
      },
      {
        id: 3,
        type: EventType.PropagationUpdate,
        processId: 1,
        source: "0",
        target: "1",
        previousValue: null,
        contribution: 1,
        updatedValue: 1,
        operation: "initialize"
      },
      {
        id: 4,
        type: EventType.PropagationTransition,
        processId: 1,
        source: "0",
        target: "2",
        contribution: 1
      },
      {
        id: 5,
        type: EventType.PropagationUpdate,
        processId: 1,
        source: "0",
        target: "2",
        previousValue: null,
        contribution: 1,
        updatedValue: 1,
        operation: "initialize"
      },
      { id: 6, type: EventType.PropagationComplete, processId: 1, state: "0", value: 1 },
      { id: 7, type: EventType.PropagationProcess, state: "1", value: 1 },
      {
        id: 8,
        type: EventType.PropagationTransition,
        processId: 7,
        source: "1",
        target: "2",
        contribution: 1
      },
      {
        id: 9,
        type: EventType.PropagationUpdate,
        processId: 7,
        source: "1",
        target: "2",
        previousValue: 1,
        contribution: 1,
        updatedValue: 2,
        operation: "aggregate"
      },
      { id: 10, type: EventType.PropagationComplete, processId: 7, state: "1", value: 1 },
      { id: 11, type: EventType.PropagationProcess, state: "2", value: 2 },
      { id: 12, type: EventType.PropagationComplete, processId: 11, state: "2", value: 2 },
      { id: 13, type: EventType.Complete, answer: 2 }
    ]);
  });
});

function createCountingSpec(): PropagationProblemSpec<StepsInput> {
  return {
    ...createBaseSpec(),
    initialStates: () => [{ state: [0], value: 1 }],
    transitions: (state, context) => {
      const i = single(state);
      const transitions = [] as { target: StateCoordinates; contribution: number }[];
      if (i + 1 <= context.input.steps)
        transitions.push({ target: [i + 1], contribution: context.value });
      if (i + 2 <= context.input.steps)
        transitions.push({ target: [i + 2], contribution: context.value });
      return transitions;
    },
    aggregate: (current, contribution) => current + contribution
  };
}

function createOptimizationSpec(
  aggregate: (current: number, contribution: number) => number
): PropagationProblemSpec<StepsInput> {
  return {
    ...createBaseSpec(),
    initialStates: () => [{ state: [0], value: 0 }],
    transitions: (state, context) => {
      const i = single(state);
      const transitions = [] as { target: StateCoordinates; contribution: number }[];
      if (i + 1 <= context.input.steps)
        transitions.push({ target: [i + 1], contribution: context.value + 5 });
      if (i + 2 <= context.input.steps)
        transitions.push({ target: [i + 2], contribution: context.value + 2 });
      return transitions;
    },
    aggregate: (current, contribution) => aggregate(current, contribution)
  };
}

function createBaseSpec(): Omit<
  PropagationProblemSpec<StepsInput>,
  "initialStates" | "transitions" | "aggregate"
> {
  return {
    id: "propagation-test",
    name: "Propagation test",
    stateVariables: ["i"],
    inputSchema: [],
    dimensions: (input) => [input.steps + 1],
    schedule: function* (input) {
      for (let i = 0; i <= input.steps; i += 1) yield [i];
    },
    extractAnswer: (context) => context.read([context.input.steps])
  };
}

function single(state: StateCoordinates): number {
  const value = state[0];
  if (value === undefined) throw new Error("Expected one-dimensional state.");
  return value;
}

function answerOf(result: ReturnType<PropagationRuntime<StepsInput>["execute"]>): number {
  const complete = result.trace.events.at(-1);
  if (complete?.type !== EventType.Complete) throw new Error("Expected completion event.");
  return complete.answer;
}
