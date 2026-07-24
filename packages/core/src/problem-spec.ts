import type { ExtractionContext } from "./extraction-context";
import type { StateCoordinates } from "./state-key";

/**
 * Supported learner-provided input field shapes for built-in templates.
 *
 * Bounds are teaching-tool constraints: they cap trace size for smooth
 * playback, rather than describing algorithmic complexity.
 */
export type InputFieldType = "integer" | "integerArray" | "string" | "stringArray";

/**
 * Declarative input metadata consumed by the visualization layer.
 */
export interface InputField {
  readonly name: string;
  readonly label: string;
  readonly type: InputFieldType;
  readonly min?: number;
  readonly max?: number;
  readonly maxLength?: number;
  readonly description?: string;
}

/**
 * Result of checking whether a state is a base case.
 */
export type BaseCaseResult =
  | { readonly isBase: true; readonly value: number }
  | { readonly isBase: false; readonly value?: never };

/**
 * Context supplied to a transition by the Execution Engine.
 *
 * `read` is the only way a transition can access another state. The engine
 * instruments this boundary to emit provenance-rich `READ` events.
 */
export interface TransitionCtx<Input = unknown> {
  readonly input: Input;
  read(state: StateCoordinates): number;
}

/**
 * A recurrence rule over a single functional-DP state.
 *
 * Template authors provide this math-only function; the Execution Engine owns
 * recursion, iteration, memoization, and trace emission.
 */
export type Transition<Input = unknown> = (
  state: StateCoordinates,
  ctx: TransitionCtx<Input>
) => number;

/**
 * Structured output of evaluating a transition.
 *
 * The current `FunctionalProblemSpec.transition` returns only a number as documented.
 * This richer value object gives future engine internals a typed place to
 * carry the numeric result alongside the `READ` event ids that explain it.
 */
export interface TransitionResult {
  readonly state: StateCoordinates;
  readonly value: number;
  readonly usedReads: readonly number[];
}

/**
 * Human-readable DP algorithm formulation.
 *
 * This is display-only metadata consumed by template information panels.
 */
export interface AlgorithmFormulation {
  readonly title: string;
  readonly problemStatement: string;
  readonly stateDefinition: string;
  readonly baseCases: string;
  readonly transition: string;
  readonly timeComplexity: string;
  readonly spaceComplexity: string;
}

/**
 * Common, compiled description of a DP problem.
 *
 * This type contains only concepts shared by every execution model. It never
 * specifies how execution happens.
 */
export interface CompiledSpecification<Input = unknown> {
  readonly id: string;
  readonly name: string;
  readonly title?: string;
  readonly description?: string;
  readonly formulation?: AlgorithmFormulation;
  readonly stateVariables: readonly string[];
  readonly inputSchema: readonly InputField[];
  dimensions(input: Input): readonly number[];
}

/**
 * Declarative specification for dependency-based state computation.
 *
 * Functional specifications add recurrence semantics to the common compiled
 * specification. The functional runtimes own recursion, iteration,
 * memoization, and trace emission.
 */
export interface FunctionalProblemSpec<Input = unknown> extends CompiledSpecification<Input> {
  initialValue?(input: Input): number;
  rootState(input: Input): StateCoordinates;
  baseCase(state: StateCoordinates, input: Input): BaseCaseResult;
  transition: Transition<Input>;
  iterationOrder(input: Input): Iterable<StateCoordinates>;
  extractAnswer(context: ExtractionContext<Input>): number;
}

/**
 * Placeholder for propagation-specific semantics.
 *
 * Propagation execution is intentionally not implemented in this release
 * session. The type reserves the model-specific branch while sharing only the
 * common compiled specification contract.
 */
export type PropagationProblemSpec<Input = unknown> = CompiledSpecification<Input>;
