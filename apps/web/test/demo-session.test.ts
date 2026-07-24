import { describe, expect, it } from "vitest";
import { templateRegistry } from "@dp-explorer/templates";
import { compileSpecification } from "@dp-explorer/spec-compiler";

import { createDemoSession, createProblemSpecSession } from "../src/demo-session";

const fibonacciTemplate = templateRegistry.get("fibonacci");
const lcsTemplate = templateRegistry.get("longest-common-subsequence");

if (fibonacciTemplate === undefined) {
  throw new Error("Fibonacci template is not registered.");
}

if (lcsTemplate === undefined) {
  throw new Error("LCS template is not registered.");
}

describe("createDemoSession", () => {
  it("starts at the first frame", () => {
    const session = createDemoSession({
      ...fibonacciTemplate,
      defaultInput: { n: 3 }
    });
    const frame = session.currentFrame();

    expect(frame.frameIndex).toBe(0);
    expect(frame.currentEvent.type).toBe("CALL");
    expect(frame.isFirst).toBe(true);
  });

  it("moves next, previous, and reset through ExecutionFrames", () => {
    const session = createDemoSession({
      ...fibonacciTemplate,
      defaultInput: { n: 3 }
    });

    expect(session.next().frameIndex).toBe(1);
    expect(session.next().frameIndex).toBe(2);
    expect(session.previous().frameIndex).toBe(1);
    expect(session.reset().frameIndex).toBe(0);
  });

  it("respects frame boundaries", () => {
    const session = createDemoSession({
      ...fibonacciTemplate,
      defaultInput: { n: 3 }
    });

    expect(session.previous().frameIndex).toBe(0);
    const last = session.currentFrame().totalFrames - 1;
    for (let i = 0; i < 100; i += 1) {
      session.next();
    }

    expect(session.currentFrame().frameIndex).toBe(last);
    expect(session.next().frameIndex).toBe(last);
  });

  it("produces the same sequence of displayed frame facts for the same trace", () => {
    const first = readFrameFacts({
      ...fibonacciTemplate,
      defaultInput: { n: 3 }
    });
    const second = readFrameFacts({
      ...fibonacciTemplate,
      defaultInput: { n: 3 }
    });

    expect(second).toEqual(first);
  });

  it("creates a session using registered default Fibonacci input", () => {
    const session = createDemoSession(fibonacciTemplate);

    expect(session.currentFrame().frameIndex).toBe(0);
    expect(session.currentFrame().currentEvent.type).toBe("CALL");
  });

  it("computes the correct LCS length for two example strings", () => {
    const session = createDemoSession({
      ...lcsTemplate,
      defaultInput: { first: "ABCDGH", second: "AEDFHR" }
    });

    const last = session.currentFrame().totalFrames - 1;
    for (let i = 0; i < last; i += 1) {
      session.next();
    }

    expect(session.currentFrame().frameIndex).toBe(last);
    const completeEvent = session.currentFrame().currentEvent;
    expect(completeEvent.type).toBe("COMPLETE");
    expect("answer" in completeEvent ? completeEvent.answer : null).toBe(3);
  });

  it("runs a compiled functional specification through the generic top-down session path", () => {
    const compiled = compileSpecification(createCompiledFibonacciBuilderState("top-down"));
    if (!compiled.success) {
      throw new Error("Expected compilation to succeed.");
    }

    const session = createProblemSpecSession(compiled.problemSpec, { n: 3 }, "top-down");

    expect(session.currentFrame().currentEvent.type).toBe("CALL");
    expect(session.currentFrame().recursionTree).not.toBeNull();
  });

  it("runs a compiled functional specification through the generic bottom-up session path", () => {
    const compiled = compileSpecification(createCompiledFibonacciBuilderState("bottom-up"));
    if (!compiled.success) {
      throw new Error("Expected compilation to succeed.");
    }

    const session = createProblemSpecSession(compiled.problemSpec, { n: 3 }, "bottom-up");

    expect(session.currentFrame().frameIndex).toBe(0);
    expect(session.currentFrame().table.dimensions).toEqual([4]);
  });
});

function readFrameFacts(template: Parameters<typeof createDemoSession>[0]) {
  const session = createDemoSession(template);
  const facts = [];
  let frame = session.currentFrame();

  while (true) {
    facts.push({
      frameIndex: frame.frameIndex,
      totalFrames: frame.totalFrames,
      eventType: frame.currentEvent.type,
      state: "state" in frame.currentEvent ? frame.currentEvent.state : null,
      callStack: [...frame.callStack],
      dpSnapshot: Object.fromEntries(frame.dpSnapshot.entries())
    });

    if (frame.isLast) {
      return facts;
    }

    frame = session.next();
  }
}

function createCompiledFibonacciBuilderState(executionMode: "top-down" | "bottom-up") {
  return {
    metadata: {
      name: "Fibonacci",
      description: "Generated Fibonacci specification"
    },
    symbols: [
      {
        id: "symbol-n",
        name: "n",
        category: "primitive",
        primitiveType: "integer"
      }
    ],
    state: {
      dimensionCount: 1,
      variables: [
        {
          name: "i",
          lowerBoundExpression: "0",
          upperBoundExpression: "n"
        }
      ],
      meaning: "dp[i]"
    },
    baseCases: [
      {
        id: "base-0",
        conditionExpression: "i == 0",
        valueExpression: "0"
      },
      {
        id: "base-1",
        conditionExpression: "i == 1",
        valueExpression: "1"
      }
    ],
    transitions: [
      {
        id: "transition-1",
        conditionExpression: null,
        valueExpression: "DP(i - 1) + DP(i - 2)"
      }
    ],
    rootStateExpression: "DP(n)",
    answerExpression: "DP(n)",
    executionMode
  } as const;
}
