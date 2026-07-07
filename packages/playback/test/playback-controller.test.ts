import { describe, expect, it } from "vitest";

import type { ExecutionTrace, TraceEvent } from "@dp-explorer/core";
import { EventType, toStateKey } from "@dp-explorer/core";

import { createPlaybackController } from "../src";

const s0 = toStateKey([0]);
const s1 = toStateKey([1]);
const s2 = toStateKey([2]);
const s3 = toStateKey([3]);

describe("createPlaybackController", () => {
  it("starts at frame 0 and returns the current frame without advancing", () => {
    const controller = createPlaybackController(topDownTrace);
    const first = controller.currentFrame();
    const again = controller.currentFrame();

    expect(first.frameIndex).toBe(0);
    expect(first.currentEvent).toEqual({
      id: 0,
      type: EventType.Call,
      state: s3,
      depth: 0,
      parentId: null
    });
    expect(first).toEqual(again);
  });

  it("advances with next and retreats with previous", () => {
    const controller = createPlaybackController(topDownTrace);

    expect(controller.next().frameIndex).toBe(1);
    expect(controller.next().frameIndex).toBe(2);
    expect(controller.previous().frameIndex).toBe(1);
    expect(controller.currentFrame().frameIndex).toBe(1);
  });

  it("clamps next and previous at trace boundaries", () => {
    const controller = createPlaybackController(topDownTrace);

    expect(controller.previous().frameIndex).toBe(0);
    expect(controller.seek(999).frameIndex).toBe(19);
    expect(controller.next().frameIndex).toBe(19);
  });

  it("clamps seek targets and truncates fractional frame indices", () => {
    const controller = createPlaybackController(topDownTrace);

    expect(controller.seek(-10).frameIndex).toBe(0);
    expect(controller.seek(8.8).frameIndex).toBe(8);
    expect(controller.seek(Number.NaN).frameIndex).toBe(0);
  });

  it("derives dpSnapshot from WRITE and BASE_CASE events", () => {
    const controller = createPlaybackController(topDownTrace);
    const baseCaseFrame = controller.seek(3);
    const transitionFrame = controller.seek(8);
    const writeFrame = controller.seek(9);

    expect([...baseCaseFrame.dpSnapshot.entries()]).toEqual([[s1, 1]]);
    expect([...transitionFrame.dpSnapshot.entries()]).toEqual([
      [s1, 1],
      [s0, 0]
    ]);
    expect([...writeFrame.dpSnapshot.entries()]).toEqual([
      [s1, 1],
      [s0, 0],
      [s2, 1]
    ]);
  });

  it("derives call stack, recursion tree, active node, and highlights from replay", () => {
    const controller = createPlaybackController(topDownTrace);
    const callFrame = controller.seek(2);
    const baseCaseFrame = controller.seek(3);
    const memoHitFrame = controller.seek(12);
    const returnFrame = controller.seek(17);

    expect(callFrame.callStack).toEqual([s3, s2, s1]);
    expect(callFrame.activeNodeId).toBe(2);
    expect(callFrame.recursionTree?.rootId).toBe(0);
    expect(callFrame.recursionTree?.nodes.get(2)).toMatchObject({
      callEventId: 2,
      state: s1,
      outcome: null
    });

    expect(baseCaseFrame.callStack).toEqual([s3, s2]);
    expect(baseCaseFrame.activeNodeId).toBe(1);
    expect(baseCaseFrame.recursionTree?.nodes.get(2)).toMatchObject({
      outcome: "base-case",
      terminalEventId: 3,
      value: 1
    });
    expect(baseCaseFrame.highlightedCells).toEqual([{ state: s1, role: "base-case" }]);

    expect(memoHitFrame.callStack).toEqual([s3]);
    expect(memoHitFrame.recursionTree?.nodes.get(11)).toMatchObject({
      outcome: "memo-hit",
      terminalEventId: 12,
      value: 1
    });
    expect(memoHitFrame.highlightedCells).toEqual([{ state: s1, role: "memo-hit" }]);

    expect(returnFrame.callStack).toEqual([]);
    expect(returnFrame.activeNodeId).toBeNull();
    expect(returnFrame.recursionTree?.nodes.get(0)).toMatchObject({
      outcome: "return",
      terminalEventId: 17,
      value: 2
    });
  });

  it("resolves transition dependencies from referenced READ events", () => {
    const frame = createPlaybackController(topDownTrace).seek(15);

    expect(frame.resolvedDependencies).toEqual([s2, s1]);
    expect(frame.highlightedCells).toEqual([
      { state: s3, role: "active" },
      { state: s2, role: "dependency" },
      { state: s1, role: "dependency" }
    ]);
  });

  it("returns deterministic frames regardless of navigation path", () => {
    const first = createPlaybackController(topDownTrace).seek(15);
    const controller = createPlaybackController(topDownTrace);

    controller.next();
    controller.next();
    controller.seek(4);
    controller.previous();
    const second = controller.seek(15);

    expect(second).toEqual(first);
    expect(second).not.toBe(first);
  });

  it("produces immutable frames and immutable controller surface", () => {
    const controller = createPlaybackController(topDownTrace);
    const frame = controller.seek(15);

    expect(Object.isFrozen(controller)).toBe(true);
    expect(Object.isFrozen(frame)).toBe(true);
    expect(Object.isFrozen(frame.table)).toBe(true);
    expect(Object.isFrozen(frame.table.dimensions)).toBe(true);
    expect(Object.isFrozen(frame.table.stateVariables)).toBe(true);
    expect(Object.isFrozen(frame.callStack)).toBe(true);
    expect(Object.isFrozen(frame.highlightedCells)).toBe(true);
    expect(Object.isFrozen(frame.resolvedDependencies)).toBe(true);
    expect(Object.isFrozen(frame.dpSnapshot)).toBe(true);
    expect(Object.isFrozen(frame.recursionTree)).toBe(true);
    expect(Object.isFrozen(frame.recursionTree?.nodes)).toBe(true);
    expect((frame.dpSnapshot as { set?: unknown }).set).toBeUndefined();
    expect((frame.recursionTree?.nodes as { set?: unknown } | undefined)?.set).toBeUndefined();
    expect(() => {
      (frame.callStack as string[]).push(s0);
    }).toThrow(TypeError);
  });

  it("keeps bottom-up frames free of top-down recursion state", () => {
    const frame = createPlaybackController(bottomUpTrace).seek(2);

    expect(frame.dpSnapshot.get(s0)).toBe(0);
    expect(frame.callStack).toEqual([]);
    expect(frame.recursionTree).toBeNull();
    expect(frame.activeNodeId).toBeNull();
    expect(frame.highlightedCells).toEqual([{ state: s1, role: "base-case" }]);
  });
});

const topDownTrace = freezeTrace({
  problemId: "fibonacci",
  mode: "top-down",
  input: Object.freeze({ n: 3 }),
  stateVariables: Object.freeze(["i"]),
  dimensions: Object.freeze([4]),
  events: [
    { id: 0, type: EventType.Call, state: s3, depth: 0, parentId: null },
    { id: 1, type: EventType.Call, state: s2, depth: 1, parentId: 0 },
    { id: 2, type: EventType.Call, state: s1, depth: 2, parentId: 1 },
    { id: 3, type: EventType.BaseCase, state: s1, value: 1, parentId: 1 },
    { id: 4, type: EventType.Call, state: s0, depth: 2, parentId: 1 },
    { id: 5, type: EventType.BaseCase, state: s0, value: 0, parentId: 1 },
    { id: 6, type: EventType.Read, state: s1, value: 1, requestedFor: s2 },
    { id: 7, type: EventType.Read, state: s0, value: 0, requestedFor: s2 },
    { id: 8, type: EventType.Transition, state: s2, usedReads: [6, 7], value: 1 },
    { id: 9, type: EventType.Write, state: s2, value: 1 },
    { id: 10, type: EventType.Return, state: s2, value: 1, parentId: 0 },
    { id: 11, type: EventType.Call, state: s1, depth: 1, parentId: 0 },
    { id: 12, type: EventType.MemoHit, state: s1, value: 1, parentId: 0 },
    { id: 13, type: EventType.Read, state: s2, value: 1, requestedFor: s3 },
    { id: 14, type: EventType.Read, state: s1, value: 1, requestedFor: s3 },
    { id: 15, type: EventType.Transition, state: s3, usedReads: [13, 14], value: 2 },
    { id: 16, type: EventType.Write, state: s3, value: 2 },
    { id: 17, type: EventType.Return, state: s3, value: 2, parentId: null },
    { id: 18, type: EventType.Read, state: s3, value: 2, requestedFor: "ANSWER" },
    { id: 19, type: EventType.Complete, answer: 2 }
  ].map((event) => Object.freeze(event)) as readonly TraceEvent[]
});

const bottomUpTrace = freezeTrace({
  problemId: "fibonacci",
  mode: "bottom-up",
  input: Object.freeze({ n: 1 }),
  stateVariables: Object.freeze(["i"]),
  dimensions: Object.freeze([2]),
  events: [
    { id: 0, type: EventType.BaseCase, state: s0, value: 0, parentId: null },
    { id: 1, type: EventType.Write, state: s0, value: 0 },
    { id: 2, type: EventType.BaseCase, state: s1, value: 1, parentId: null },
    { id: 3, type: EventType.Write, state: s1, value: 1 },
    { id: 4, type: EventType.Read, state: s1, value: 1, requestedFor: "ANSWER" },
    { id: 5, type: EventType.Complete, answer: 1 }
  ].map((event) => Object.freeze(event)) as readonly TraceEvent[]
});

function freezeTrace<Input>(trace: ExecutionTrace<Input>): ExecutionTrace<Input> {
  return Object.freeze({
    ...trace,
    events: Object.freeze([...trace.events])
  });
}
