import type {
  BaseCaseResult,
  ExtractionContext,
  InputField,
  InputFieldType,
  ProblemSpec,
  StateCoordinates
} from "@dp-explorer/core";
import type { MathNode } from "mathjs";
import {
  asRuntimeInput,
  createConstantMap,
  createExtractionScope,
  createStateBindings,
  createTransitionScope,
  evaluateBoolean,
  evaluateNumber
} from "./ast-evaluator";
import type { BuilderSymbol, PrimitiveType } from "./builder-state";
import type { ValidatedSpecification } from "./validated-specification";

export function generateProblemSpec(
  validatedSpecification: ValidatedSpecification
): ProblemSpec<Record<string, unknown>> {
  const parsed = validatedSpecification.parsedSpecification;
  const builderState = parsed.builderState;
  const stateVariables = Object.freeze(
    builderState.state.variables.map((variable) => variable.name)
  );
  const constants = createConstantMap(parsed.parsedConstants);

  const spec: ProblemSpec<Record<string, unknown>> = {
    id: createProblemId(builderState.metadata.name),
    name: builderState.metadata.name,
    title: builderState.metadata.name,
    description: builderState.metadata.description,
    stateVariables,
    inputSchema: Object.freeze(builderState.symbols.flatMap(symbolToInputField)),
    initialValue(input) {
      return evaluateNumber(parsed.parsedInitialValueExpression.ast, {
        input: asRuntimeInput(input),
        constants
      });
    },
    dimensions(input) {
      const scope = {
        input: asRuntimeInput(input),
        constants
      };

      return Object.freeze(
        parsed.parsedStateVariables.map((variable) => {
          const lower = evaluateNumber(variable.lowerBound.ast, scope);
          const upper = evaluateNumber(variable.upperBound.ast, scope);
          return Math.max(0, Math.floor(upper - lower + 1));
        })
      );
    },
    rootState(input) {
      return Object.freeze(evaluateRootState(validatedSpecification, input, constants));
    },
    baseCase(state, input): BaseCaseResult {
      const scope = {
        input: asRuntimeInput(input),
        stateBindings: createStateBindings(stateVariables, state),
        constants
      };

      for (const baseCase of parsed.parsedBaseCases) {
        if (evaluateBoolean(baseCase.condition.ast, scope)) {
          return Object.freeze({
            isBase: true,
            value: evaluateNumber(baseCase.value.ast, scope)
          });
        }
      }

      return Object.freeze({ isBase: false });
    },
    transition(state, ctx) {
      for (const transition of parsed.parsedTransitions) {
        const scope = createTransitionScope(ctx.input, stateVariables, state, constants, ctx);
        if (transition.condition === null || evaluateBoolean(transition.condition.ast, scope)) {
          return evaluateNumber(transition.value.ast, scope);
        }
      }

      throw new Error("No transition matched the current state.");
    },
    iterationOrder(input) {
      return createIterationOrder(validatedSpecification, input, constants);
    },
    extractAnswer(context: ExtractionContext<Record<string, unknown>>) {
      return evaluateNumber(
        parsed.parsedAnswerExpression.ast,
        createExtractionScope(context, constants)
      );
    }
  };

  return Object.freeze(spec);
}

function evaluateRootState(
  validatedSpecification: ValidatedSpecification,
  input: unknown,
  constants: ReturnType<typeof createConstantMap>
): StateCoordinates {
  const parsed = validatedSpecification.parsedSpecification;
  const root = parsed.parsedRootState.ast;
  const scope = {
    input: asRuntimeInput(input),
    constants
  };

  if (root.type === "FunctionNode") {
    const value = evaluateRootDpFunction(root, scope);
    if (value !== null) {
      return value;
    }
  }

  if (parsed.builderState.state.dimensionCount === 1) {
    return [evaluateNumber(root, scope)];
  }

  throw new Error("Multi-dimensional root states must use DP(...).");
}

function evaluateRootDpFunction(
  node: MathNode,
  scope: Parameters<typeof evaluateNumber>[1]
): StateCoordinates | null {
  const fn = (node as unknown as { readonly fn?: { readonly name?: unknown } }).fn;
  if (fn?.name !== "DP") {
    return null;
  }

  const args = (node as unknown as { readonly args?: readonly MathNode[] }).args ?? [];
  return args.map((arg) => evaluateNumber(arg, scope));
}

function* createIterationOrder(
  validatedSpecification: ValidatedSpecification,
  input: unknown,
  constants: ReturnType<typeof createConstantMap>
): Iterable<StateCoordinates> {
  const variables = validatedSpecification.parsedSpecification.parsedStateVariables;
  const scope = {
    input: asRuntimeInput(input),
    constants
  };
  const bounds = variables.map((variable) => ({
    lower: Math.floor(evaluateNumber(variable.lowerBound.ast, scope)),
    upper: Math.floor(evaluateNumber(variable.upperBound.ast, scope))
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

  return normalized === "" ? "generated-specification" : `generated-${normalized}`;
}
