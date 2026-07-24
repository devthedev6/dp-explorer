import type { ExtractionContext, StateCoordinates, TransitionCtx } from "@dp-explorer/core";
import type { MathNode } from "mathjs";
import type { ParsedConstant } from "./parsed-specification";

export type RuntimeInput = Readonly<Record<string, unknown>>;

export interface EvaluationScope {
  readonly input: RuntimeInput;
  readonly stateBindings?: Readonly<Record<string, number>>;
  readonly constants: ReadonlyMap<string, MathNode>;
  readonly dpRead?: (state: StateCoordinates) => number;
  readonly currentValue?: number;
}

export function evaluateMathNode(node: MathNode, scope: EvaluationScope): unknown {
  switch (node.type) {
    case "ConstantNode":
      return readObjectProperty(node, "value");
    case "SymbolNode":
      return evaluateSymbol(node, scope);
    case "ParenthesisNode":
      return evaluateMathNode(readRequiredNodeProperty(node, "content"), scope);
    case "OperatorNode":
      return evaluateOperator(node, scope);
    case "FunctionNode":
      return evaluateFunction(node, scope);
    case "AccessorNode":
      return evaluateAccessor(node, scope);
    default:
      throw new Error(`Unsupported MathJS node type "${node.type}".`);
  }
}

export function evaluateNumber(node: MathNode, scope: EvaluationScope): number {
  return toNumber(evaluateMathNode(node, scope));
}

export function evaluateBoolean(node: MathNode, scope: EvaluationScope): boolean {
  return Boolean(evaluateMathNode(node, scope));
}

export function createConstantMap(
  constants: readonly ParsedConstant[]
): ReadonlyMap<string, MathNode> {
  return new Map(constants.map((constant) => [constant.name, constant.value.ast]));
}

export function createTransitionScope<Input>(
  input: Input,
  stateVariables: readonly string[],
  state: StateCoordinates,
  constants: ReadonlyMap<string, MathNode>,
  ctx: TransitionCtx<Input>
): EvaluationScope {
  return {
    input: asRuntimeInput(input),
    stateBindings: createStateBindings(stateVariables, state),
    constants,
    dpRead: (dependencyState) => ctx.read(dependencyState)
  };
}

export function createExtractionScope<Input>(
  context: ExtractionContext<Input>,
  constants: ReadonlyMap<string, MathNode>
): EvaluationScope {
  return {
    input: asRuntimeInput(context.input),
    constants,
    dpRead: (state) => context.read(state)
  };
}

export function createStateBindings(
  stateVariables: readonly string[],
  state: StateCoordinates
): Readonly<Record<string, number>> {
  return Object.freeze(
    Object.fromEntries(stateVariables.map((variable, index) => [variable, state[index] ?? 0]))
  );
}

export function asRuntimeInput(input: unknown): RuntimeInput {
  if (input === null || typeof input !== "object") {
    return Object.freeze({});
  }

  return input as RuntimeInput;
}

function evaluateSymbol(node: MathNode, scope: EvaluationScope): unknown {
  const name = readRequiredStringProperty(node, "name");

  if (name === "true") {
    return true;
  }
  if (name === "false") {
    return false;
  }
  if (scope.stateBindings !== undefined && name in scope.stateBindings) {
    return scope.stateBindings[name];
  }
  if (name === "currentValue" && scope.currentValue !== undefined) {
    return scope.currentValue;
  }
  if (scope.constants.has(name)) {
    return evaluateMathNode(scope.constants.get(name)!, scope);
  }

  return scope.input[name];
}

function evaluateOperator(node: MathNode, scope: EvaluationScope): unknown {
  const fn = readRequiredStringProperty(node, "fn");
  const args = readNodeArrayProperty(node, "args");

  if (fn === "unaryMinus") {
    return -toNumber(evaluateMathNode(args[0]!, scope));
  }
  if (fn === "unaryPlus") {
    return toNumber(evaluateMathNode(args[0]!, scope));
  }
  if (fn === "not") {
    return !evaluateMathNode(args[0]!, scope);
  }
  if (fn === "and") {
    return Boolean(evaluateMathNode(args[0]!, scope)) && Boolean(evaluateMathNode(args[1]!, scope));
  }
  if (fn === "or") {
    return Boolean(evaluateMathNode(args[0]!, scope)) || Boolean(evaluateMathNode(args[1]!, scope));
  }

  const left = evaluateMathNode(args[0]!, scope);
  const right = evaluateMathNode(args[1]!, scope);

  switch (fn) {
    case "add":
      return toNumber(left) + toNumber(right);
    case "subtract":
      return toNumber(left) - toNumber(right);
    case "multiply":
      return toNumber(left) * toNumber(right);
    case "divide":
      return toNumber(left) / toNumber(right);
    case "mod":
      return toNumber(left) % toNumber(right);
    case "pow":
      return toNumber(left) ** toNumber(right);
    case "equal":
      return left === right;
    case "unequal":
      return left !== right;
    case "smaller":
      return toNumber(left) < toNumber(right);
    case "smallerEq":
      return toNumber(left) <= toNumber(right);
    case "larger":
      return toNumber(left) > toNumber(right);
    case "largerEq":
      return toNumber(left) >= toNumber(right);
    case "bitAnd":
      return toNumber(left) & toNumber(right);
    case "bitOr":
      return toNumber(left) | toNumber(right);
    case "leftShift":
      return toNumber(left) << toNumber(right);
    case "rightArithShift":
      return toNumber(left) >> toNumber(right);
    default:
      throw new Error(`Unsupported operator "${fn}".`);
  }
}

function evaluateFunction(node: MathNode, scope: EvaluationScope): unknown {
  const name = readFunctionName(node);
  const args = readNodeArrayProperty(node, "args");

  if (name === "DP") {
    if (scope.dpRead === undefined) {
      throw new Error("DP cannot be read in this expression context.");
    }

    return scope.dpRead(args.map((arg) => evaluateNumber(arg, scope)));
  }

  const values = args.map((arg) => evaluateMathNode(arg, scope));
  switch (name) {
    case "min":
      return Math.min(...values.map(toNumber));
    case "max":
      return Math.max(...values.map(toNumber));
    case "abs":
      return Math.abs(toNumber(values[0]));
    case "floor":
      return Math.floor(toNumber(values[0]));
    case "ceil":
      return Math.ceil(toNumber(values[0]));
    case "len":
      return readLength(values[0]);
    case "rows":
      return readRows(values[0]);
    case "cols":
      return readCols(values[0]);
    case "bitXor":
      return toNumber(values[0]) ^ toNumber(values[1]);
    default:
      throw new Error(`Unsupported function "${name}".`);
  }
}

function evaluateAccessor(node: MathNode, scope: EvaluationScope): unknown {
  const chain = collectAccessChain(node);
  let value = evaluateMathNode(chain.root, scope);

  for (const dimension of chain.dimensions) {
    const index = evaluateNumber(dimension, scope);
    if (!Array.isArray(value) && typeof value !== "string") {
      throw new Error("Cannot index a non-array value.");
    }

    value = value[index];
  }

  return value;
}

function collectAccessChain(node: MathNode): {
  readonly root: MathNode;
  readonly dimensions: readonly MathNode[];
} {
  const dimensions: MathNode[] = [];
  let current = node;

  while (current.type === "AccessorNode") {
    const index = readRequiredNodeProperty(current, "index");
    dimensions.unshift(...readNodeArrayProperty(index, "dimensions"));
    current = readRequiredNodeProperty(current, "object");
  }

  return { root: current, dimensions };
}

function readFunctionName(node: MathNode): string {
  const fn = readRequiredNodeProperty(node, "fn");
  return readRequiredStringProperty(fn, "name");
}

function readLength(value: unknown): number {
  if (typeof value === "string" || Array.isArray(value)) {
    return value.length;
  }

  throw new Error("len expects an array or string.");
}

function readRows(value: unknown): number {
  if (Array.isArray(value)) {
    return value.length;
  }

  throw new Error("rows expects an array.");
}

function readCols(value: unknown): number {
  if (Array.isArray(value) && Array.isArray(value[0])) {
    return value[0].length;
  }

  throw new Error("cols expects a two-dimensional array.");
}

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    throw new Error(`Expected numeric value but received ${String(value)}.`);
  }

  return numeric;
}

function readNodeArrayProperty(node: MathNode, property: string): readonly MathNode[] {
  const value = readObjectProperty(node, property);
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isMathNode);
}

function readRequiredNodeProperty(node: MathNode, property: string): MathNode {
  const value = readObjectProperty(node, property);
  if (!isMathNode(value)) {
    throw new Error(`Expected MathJS node property "${property}".`);
  }

  return value;
}

function readRequiredStringProperty(node: MathNode, property: string): string {
  const value = readObjectProperty(node, property);
  if (typeof value !== "string") {
    throw new Error(`Expected string property "${property}".`);
  }

  return value;
}

function readObjectProperty(node: MathNode, property: string): unknown {
  return (node as unknown as Record<string, unknown>)[property];
}

function isMathNode(value: unknown): value is MathNode {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof (value as { readonly type?: unknown }).type === "string"
  );
}
