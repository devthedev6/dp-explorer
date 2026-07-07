# Problem Specification

This is the contract every DP template must satisfy. The Execution Engine
(`packages/core`) is written once against this interface and never touches
template-specific logic — that is what makes it a generic engine rather than
a set of hand-coded animations.

## The core rule

A template author supplies **only the math**: how big the state space is,
what a base case looks like, and how one state's value is derived from
others. They never write a loop and never write recursion — the engine
supplies both, driven by this spec.

## Interface

```typescript
interface ProblemSpec<Input = unknown> {
  id: string;
  name: string;

  /** Axis names, for display only, e.g. ["i"] or ["i", "w"]. Length = number of dimensions. */
  stateVariables: string[];

  /** What the learner provides, with validation and size caps. */
  inputSchema: InputField[];

  /** Size of the state space for a given concrete input, one entry per axis. */
  dimensions(input: Input): number[];

  /** Is this state a base case? If so, what's its value? */
  baseCase(state: number[], input: Input): { isBase: boolean; value?: number };

  /**
   * The recurrence. `ctx.read(otherState)` is the ONLY way to reference
   * another state's value — the engine instruments every call to emit a
   * READ event, and behavior differs by mode (recursion vs table lookup).
   */
  transition(state: number[], ctx: TransitionCtx<Input>): number;

  /**
   * Bottom-up only: states in dependency order. The engine validates this
   * at runtime — a read of an unwritten cell throws immediately.
   *
   * Must yield **every** state in the DP table, including base-case states.
   * The engine checks `baseCase` before calling `transition`, so base-case
   * states are handled correctly regardless of their position in the order.
   * Omitting base-case states from the iterator means their cells are never
   * filled and downstream READs will throw.
   */
  iterationOrder(input: Input): Iterable<number[]>;

  /**
   * How to get the final answer. `read` behaves like `ctx.read` above —
   * calling it top-down KICKS OFF the recursion (this is the single entry
   * point; there's no separate "root state" field). Bottom-up, it's a table
   * lookup against the already-fully-computed table.
   *
   * CONTRACT: `read` must be called exactly once. This produces exactly one
   * root CALL event (parentId: null) in top-down mode and exactly one READ
   * event tagged requestedFor: "ANSWER" in both modes. Calling `read` more
   * than once, or not at all, is a spec error.
   */
  extractAnswer(input: Input, read: (state: number[]) => number): number;
}

interface TransitionCtx<Input> {
  input: Input;
  read(state: number[]): number;
}

interface InputField {
  name: string;
  label: string;
  type: "integer" | "integerArray" | "string" | "stringArray";
  min?: number;
  max?: number;        // value bound
  maxLength?: number;   // array length bound — keeps traces small enough to scrub smoothly
  description?: string;
}
```

## Worked example: Fibonacci (1D)

```typescript
const fibonacci: ProblemSpec<{ n: number }> = {
  id: "fibonacci",
  name: "Fibonacci",
  stateVariables: ["i"],
  inputSchema: [
    { name: "n", label: "n", type: "integer", min: 0, max: 20 },
  ],
  dimensions: (input) => [input.n + 1],
  baseCase: (state) => {
    const [i] = state;
    return i <= 1 ? { isBase: true, value: i } : { isBase: false };
  },
  transition: (state, ctx) => {
    const [i] = state;
    return ctx.read([i - 1]) + ctx.read([i - 2]);
  },
  iterationOrder: function* (input) {
    for (let i = 0; i <= input.n; i++) yield [i];
  },
  extractAnswer: (input, read) => read([input.n]),
};
```

## Worked example: 0/1 Knapsack (2D)

```typescript
const knapsack: ProblemSpec<{ weights: number[]; values: number[]; capacity: number }> = {
  id: "knapsack",
  name: "0/1 Knapsack",
  stateVariables: ["i", "w"],
  inputSchema: [
    { name: "weights", label: "Weights", type: "integerArray", maxLength: 12, min: 1 },
    { name: "values", label: "Values", type: "integerArray", maxLength: 12, min: 1 },
    { name: "capacity", label: "Capacity", type: "integer", min: 0, max: 50 },
  ],
  dimensions: (input) => [input.weights.length + 1, input.capacity + 1],
  baseCase: (state) => {
    const [i, w] = state;
    return i === 0 || w === 0 ? { isBase: true, value: 0 } : { isBase: false };
  },
  transition: (state, ctx) => {
    const [i, w] = state;
    const idx = i - 1;
    const weight = ctx.input.weights[idx];
    const skip = ctx.read([i - 1, w]);
    if (weight > w) return skip;
    const take = ctx.input.values[idx] + ctx.read([i - 1, w - weight]);
    return Math.max(skip, take);
  },
  iterationOrder: function* (input) {
    for (let i = 0; i <= input.weights.length; i++)
      for (let w = 0; w <= input.capacity; w++)
        yield [i, w];
  },
  extractAnswer: (input, read) => read([input.weights.length, input.capacity]),
};
```

Note that `dimensions`, `baseCase`, `transition`, `iterationOrder`, and
`extractAnswer` all have exactly the same shape as Fibonacci's — only the
axis count and the math differ. This identity of shape across a 1D and a 2D
problem is the thing that gets proven first in the roadmap (see
`docs/ROADMAP.md`, Stage 3), before any UI exists.

## Validation & size caps

- `inputSchema` bounds are enforced before an input reaches the engine — this
  is UI-adjacent validation (form constraints), not DP logic, so it's fine for
  the web app to own it.
- Bounds exist to cap trace size for a smooth scrubbing experience, not to
  express algorithmic constraints. This is a teaching tool, not a solver.

## Non-goals for this schema

- **Tree DP / Graph DP** — state here is fundamentally a coordinate vector.
  A node-reference-based state model is a separate future spec, not a special
  case of this one. See `docs/ARCHITECTURE.md` → Boundaries.
- **User-submitted arbitrary code** — specs are trusted, authored TypeScript,
  not sandboxed user input. Parsing arbitrary code into a spec is future work
  (see `docs/ROADMAP.md`, Post-MVP).
