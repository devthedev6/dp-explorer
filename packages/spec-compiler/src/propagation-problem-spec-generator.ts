import type {
  ExtractionContext,
  InputField,
  InputFieldType,
  PropagationProblemSpec,
  StateCoordinates
} from "@dp-explorer/core";
import { parse, type MathNode } from "mathjs";
import {
  asRuntimeInput,
  createExtractionScope,
  createStateBindings,
  evaluateBoolean,
  evaluateNumber,
  type EvaluationScope
} from "./ast-evaluator";
import type {
  BuilderPropagationInitialState,
  BuilderPropagationTransition,
  BuilderSymbol,
  PrimitiveType,
  PropagationBuilderState
} from "./builder-state";

interface ParsedInitialState {
  readonly state: MathNode;
  readonly value: MathNode;
}

interface ParsedTransition {
  readonly condition: MathNode | null;
  readonly target: MathNode;
  readonly contribution: MathNode;
}

/**
 * Produces a propagation specification from the propagation-specific Builder
 * representation. It deliberately creates no runtime and emits no trace.
 */
export function generatePropagationProblemSpec(
  builderState: PropagationBuilderState
): PropagationProblemSpec<Record<string, unknown>> {
  if (builderState.schedule !== "state-space-order") {
    throw new Error(`Unsupported propagation schedule "${String(builderState.schedule)}".`);
  }

  const stateVariables = Object.freeze(
    builderState.state.variables.map((variable) => variable.name)
  );
  const constants = createConstantMap(builderState.symbols);
  const parsedStateVariables = builderState.state.variables.map((variable) => ({
    lower: parseExpression(variable.lowerBoundExpression, "state lower bound"),
    upper: parseExpression(variable.upperBoundExpression, "state upper bound")
  }));
  const parsedInitialStates = builderState.initialStates.map(parseInitialState);
  const parsedTransitions = builderState.transitions.map(parsePropagationTransition);
  const answerExpression = parseExpression(builderState.answerExpression, "answer expression");

  const spec: PropagationProblemSpec<Record<string, unknown>> = {
    id: createProblemId(builderState.metadata.name),
    name: builderState.metadata.name,
    title: builderState.metadata.name,
    description: builderState.metadata.description,
    stateVariables,
    inputSchema: Object.freeze(builderState.symbols.flatMap(symbolToInputField)),
    dimensions(input) {
      const scope = createInputScope(input, constants);
      return Object.freeze(
        parsedStateVariables.map((variable) => {
          const lower = evaluateNumber(variable.lower, scope);
          const upper = evaluateNumber(variable.upper, scope);
          return Math.max(0, Math.floor(upper - lower + 1));
        })
      );
    },
    initialStates(input) {
      const scope = createInputScope(input, constants);
      return Object.freeze(
        parsedInitialStates.map((initialState) =>
          Object.freeze({
            state: Object.freeze(
              evaluateStateExpression(initialState.state, scope, stateVariables.length)
            ),
            value: evaluateNumber(initialState.value, scope)
          })
        )
      );
    },
    transitions(state, context) {
      const scope: EvaluationScope = {
        input: asRuntimeInput(context.input),
        stateBindings: createStateBindings(stateVariables, state),
        constants,
        currentValue: context.value
      };

      return Object.freeze(
        parsedTransitions.flatMap((transition) => {
          if (transition.condition !== null && !evaluateBoolean(transition.condition, scope)) {
            return [];
          }

          return [
            Object.freeze({
              target: Object.freeze(
                evaluateStateExpression(transition.target, scope, stateVariables.length)
              ),
              contribution: evaluateNumber(transition.contribution, scope)
            })
          ];
        })
      );
    },
    aggregate: createAggregator(builderState.aggregation),
    schedule(input) {
      return createStateSpaceOrder(parsedStateVariables, input, constants);
    },
    extractAnswer(context: ExtractionContext<Record<string, unknown>>) {
      return evaluateNumber(answerExpression, createExtractionScope(context, constants));
    }
  };

  return Object.freeze(spec);
}

function parseInitialState(initialState: BuilderPropagationInitialState): ParsedInitialState {
  return Object.freeze({
    state: parseExpression(initialState.stateExpression, "initial state"),
    value: parseExpression(initialState.valueExpression, "initial state value")
  });
}

function parsePropagationTransition(transition: BuilderPropagationTransition): ParsedTransition {
  return Object.freeze({
    condition:
      transition.conditionExpression === null
        ? null
        : parseExpression(transition.conditionExpression, "propagation transition condition"),
    target: parseExpression(transition.targetStateExpression, "propagation transition target"),
    contribution: parseExpression(
      transition.contributionExpression,
      "propagation transition contribution"
    )
  });
}

function parseExpression(expression: string, description: string): MathNode {
  try {
    return parse(expression);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid expression.";
    throw new Error(`Unable to parse ${description}: ${message}`);
  }
}

function createInputScope(
  input: Record<string, unknown>,
  constants: ReadonlyMap<string, MathNode>
): EvaluationScope {
  return { input: asRuntimeInput(input), constants };
}

function evaluateStateExpression(
  expression: MathNode,
  scope: EvaluationScope,
  dimensionCount: number
): StateCoordinates {
  if (expression.type === "FunctionNode") {
    const fn = (expression as unknown as { readonly fn?: { readonly name?: unknown } }).fn;
    const args = (expression as unknown as { readonly args?: readonly MathNode[] }).args ?? [];
    if (fn?.name === "DP") {
      if (args.length !== dimensionCount) {
        throw new Error(`DP expects ${dimensionCount} indices but received ${args.length}.`);
      }
      return args.map((argument) => evaluateNumber(argument, scope));
    }
  }

  if (dimensionCount === 1) {
    return [evaluateNumber(expression, scope)];
  }

  throw new Error("Multi-dimensional propagation states must use DP(...).");
}

function createAggregator(
  kind: PropagationBuilderState["aggregation"]
): PropagationProblemSpec<Record<string, unknown>>["aggregate"] {
  switch (kind) {
    case "sum":
      return (currentValue, contribution) => currentValue + contribution;
    case "minimum":
      return (currentValue, contribution) => Math.min(currentValue, contribution);
    case "maximum":
      return (currentValue, contribution) => Math.max(currentValue, contribution);
  }
}

function* createStateSpaceOrder(
  variables: readonly { readonly lower: MathNode; readonly upper: MathNode }[],
  input: Record<string, unknown>,
  constants: ReadonlyMap<string, MathNode>
): Iterable<StateCoordinates> {
  const scope = createInputScope(input, constants);
  const bounds = variables.map((variable) => ({
    lower: Math.floor(evaluateNumber(variable.lower, scope)),
    upper: Math.floor(evaluateNumber(variable.upper, scope))
  }));

  yield* enumerateStates(bounds, 0, []);
}

function* enumerateStates(
  bounds: readonly { readonly lower: number; readonly upper: number }[],
  index: number,
  prefix: number[]
): Iterable<StateCoordinates> {
  if (index === bounds.length) {
    yield Object.freeze([...prefix]);
    return;
  }

  const bound = bounds[index]!;
  for (let value = bound.lower; value <= bound.upper; value += 1) {
    prefix.push(value);
    yield* enumerateStates(bounds, index + 1, prefix);
    prefix.pop();
  }
}

function createConstantMap(symbols: readonly BuilderSymbol[]): ReadonlyMap<string, MathNode> {
  return new Map(
    symbols.flatMap((symbol) =>
      symbol.category === "constant" && symbol.value !== undefined
        ? [[symbol.name, parseExpression(symbol.value, `constant "${symbol.name}"`)] as const]
        : []
    )
  );
}

function symbolToInputField(symbol: BuilderSymbol): readonly InputField[] {
  if (symbol.category === "constant") {
    return [];
  }

  return [
    Object.freeze({
      name: symbol.name,
      label: symbol.name,
      type: toInputFieldType(symbol)
    })
  ];
}

function toInputFieldType(symbol: BuilderSymbol): InputFieldType {
  if (symbol.category === "array") {
    return symbol.primitiveType === "string" ? "stringArray" : "integerArray";
  }

  return primitiveToInputFieldType(symbol.primitiveType);
}

function primitiveToInputFieldType(type: PrimitiveType | undefined): InputFieldType {
  if (type === "string" || type === "character") {
    return "string";
  }

  return "integer";
}

function createProblemId(name: string): string {
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized === "" ? "generated-propagation-specification" : `generated-${normalized}`;
}
