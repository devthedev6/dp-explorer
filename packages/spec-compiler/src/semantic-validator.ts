import type { MathNode } from "mathjs";
import type { ParsedExpression, ParsedSpecification } from "./parsed-specification";
import { buildSymbolTable, type CompilerSymbol, type SymbolTable } from "./symbol-table";
import type { ValidateSpecificationResult, SemanticDiagnostic } from "./validator-diagnostics";
import type { ValidatedSpecification } from "./validated-specification";

interface ValidationContext {
  readonly parsedExpression: ParsedExpression;
  readonly path: readonly (string | number)[];
  readonly symbolTable: SymbolTable;
  readonly stateDimensionCount: number;
  readonly diagnostics: SemanticDiagnostic[];
}

interface AccessChain {
  readonly root: MathNode;
  readonly dimensions: readonly MathNode[];
}

const BUILT_IN_ARITY: Readonly<Record<string, { readonly min: number; readonly max: number }>> = {
  min: { min: 1, max: Number.POSITIVE_INFINITY },
  max: { min: 1, max: Number.POSITIVE_INFINITY },
  abs: { min: 1, max: 1 },
  floor: { min: 1, max: 1 },
  ceil: { min: 1, max: 1 },
  len: { min: 1, max: 1 },
  rows: { min: 1, max: 1 },
  cols: { min: 1, max: 1 },
  bitXor: { min: 2, max: 2 }
};

export function validateSpecification(
  parsedSpecification: ParsedSpecification
): ValidateSpecificationResult {
  const { symbolTable, diagnostics: declarationDiagnostics } = buildSymbolTable(
    parsedSpecification.builderState
  );
  const diagnostics = [...declarationDiagnostics];

  for (const target of collectValidationTargets(parsedSpecification)) {
    validateNode(target.parsedExpression.ast, {
      parsedExpression: target.parsedExpression,
      path: target.path,
      symbolTable,
      stateDimensionCount: parsedSpecification.builderState.state.dimensionCount,
      diagnostics
    });
  }

  if (diagnostics.length > 0) {
    return {
      success: false,
      diagnostics,
      validatedSpecification: null
    };
  }

  return {
    success: true,
    diagnostics: [],
    validatedSpecification: createValidatedSpecification(parsedSpecification, symbolTable.values())
  };
}

function collectValidationTargets(parsedSpecification: ParsedSpecification): readonly {
  readonly parsedExpression: ParsedExpression;
  readonly path: readonly (string | number)[];
}[] {
  const targets: {
    readonly parsedExpression: ParsedExpression;
    readonly path: readonly (string | number)[];
  }[] = [];

  parsedSpecification.parsedConstants.forEach((constant, index) => {
    targets.push({
      parsedExpression: constant.value,
      path: ["symbols", index, "value"]
    });
  });

  parsedSpecification.parsedStateVariables.forEach((variable, index) => {
    targets.push({
      parsedExpression: variable.lowerBound,
      path: ["state", "variables", index, "lowerBoundExpression"]
    });
    targets.push({
      parsedExpression: variable.upperBound,
      path: ["state", "variables", index, "upperBoundExpression"]
    });
  });

  parsedSpecification.parsedBaseCases.forEach((baseCase, index) => {
    targets.push({
      parsedExpression: baseCase.condition,
      path: ["baseCases", index, "conditionExpression"]
    });
    targets.push({
      parsedExpression: baseCase.value,
      path: ["baseCases", index, "valueExpression"]
    });
  });

  parsedSpecification.parsedTransitions.forEach((transition, index) => {
    if (transition.condition !== null) {
      targets.push({
        parsedExpression: transition.condition,
        path: ["transitions", index, "conditionExpression"]
      });
    }
    targets.push({
      parsedExpression: transition.value,
      path: ["transitions", index, "valueExpression"]
    });
  });

  targets.push({
    parsedExpression: parsedSpecification.parsedRootState,
    path: ["rootStateExpression"]
  });
  targets.push({
    parsedExpression: parsedSpecification.parsedAnswerExpression,
    path: ["answerExpression"]
  });

  return targets;
}

function validateNode(node: MathNode, context: ValidationContext): void {
  switch (node.type) {
    case "SymbolNode":
      validateSymbolNode(node, context);
      return;
    case "FunctionNode":
      validateFunctionNode(node, context);
      return;
    case "AccessorNode":
      validateAccessorNode(node, context);
      return;
    default:
      visitChildren(node, context);
  }
}

function validateSymbolNode(node: MathNode, context: ValidationContext): void {
  const name = readStringProperty(node, "name");
  if (name === null) {
    return;
  }

  const symbol = context.symbolTable.resolve(name);
  if (symbol === null) {
    addDiagnostic(context, `Undefined identifier "${name}".`, node);
  }
}

function validateFunctionNode(node: MathNode, context: ValidationContext): void {
  const name = getFunctionName(node);
  const args = readNodeArrayProperty(node, "args");

  if (name === null) {
    addDiagnostic(context, "Unsupported function expression.", node);
    visitChildren(node, context);
    return;
  }

  const symbol = context.symbolTable.resolve(name);
  if (symbol?.kind !== "built-in-function") {
    addDiagnostic(context, `Unknown function call "${name}".`, node);
  } else if (name === "DP") {
    validateDpCall(args, context, node);
  } else {
    validateBuiltInFunctionCall(name, args, context, node);
  }

  for (const arg of args) {
    validateNode(arg, context);
  }
}

function validateAccessorNode(node: MathNode, context: ValidationContext): void {
  const chain = collectAccessChain(node);

  if (chain === null) {
    visitChildren(node, context);
    return;
  }

  if (chain.root.type !== "SymbolNode") {
    addDiagnostic(context, "Only declared arrays can be indexed.", node);
  } else {
    const name = readStringProperty(chain.root, "name");
    const symbol = name === null ? null : context.symbolTable.resolve(name);

    if (name !== null && symbol === null) {
      addDiagnostic(context, `Array "${name}" is not declared.`, node);
    } else if (symbol?.kind !== "array") {
      addDiagnostic(context, `Identifier "${name}" is not an array and cannot be indexed.`, node);
    } else if (symbol.dimensions !== chain.dimensions.length) {
      addDiagnostic(
        context,
        `Array "${name}" expects ${symbol.dimensions ?? 0} indices but received ${chain.dimensions.length}.`,
        node
      );
    }
  }

  for (const dimension of chain.dimensions) {
    validateNode(dimension, context);
  }
}

function validateDpCall(
  args: readonly MathNode[],
  context: ValidationContext,
  node: MathNode
): void {
  if (args.length !== context.stateDimensionCount) {
    addDiagnostic(
      context,
      `DP expects ${context.stateDimensionCount} indices but received ${args.length}.`,
      node
    );
  }
}

function validateBuiltInFunctionCall(
  name: string,
  args: readonly MathNode[],
  context: ValidationContext,
  node: MathNode
): void {
  const arity = BUILT_IN_ARITY[name];
  if (arity !== undefined && (args.length < arity.min || args.length > arity.max)) {
    addDiagnostic(
      context,
      `${name} expects ${formatArity(arity.min, arity.max)} but received ${args.length}.`,
      node
    );
    return;
  }

  if (name === "len") {
    validateLenCall(args, context, node);
  }
  if (name === "rows" || name === "cols") {
    validateRowsOrColsCall(name, args, context, node);
  }
}

function validateLenCall(
  args: readonly MathNode[],
  context: ValidationContext,
  node: MathNode
): void {
  const symbol = resolveSingleSymbolArgument(args, context, node, "len");
  if (symbol === null) {
    return;
  }

  const valid =
    symbol.kind === "array" || (symbol.kind === "primitive" && symbol.primitiveType === "string");
  if (!valid) {
    addDiagnostic(context, "len expects a declared array or string primitive.", node);
  }
}

function validateRowsOrColsCall(
  name: string,
  args: readonly MathNode[],
  context: ValidationContext,
  node: MathNode
): void {
  const symbol = resolveSingleSymbolArgument(args, context, node, name);
  if (symbol === null) {
    return;
  }

  if (symbol.kind !== "array" || (symbol.dimensions ?? 0) < 2) {
    addDiagnostic(context, `${name} expects a declared array with at least two dimensions.`, node);
  }
}

function resolveSingleSymbolArgument(
  args: readonly MathNode[],
  context: ValidationContext,
  node: MathNode,
  functionName: string
): CompilerSymbol | null {
  const [arg] = args;
  if (args.length !== 1 || arg === undefined) {
    return null;
  }

  if (arg.type !== "SymbolNode") {
    addDiagnostic(context, `${functionName} expects a single identifier argument.`, node);
    return null;
  }

  const name = readStringProperty(arg, "name");
  const symbol = name === null ? null : context.symbolTable.resolve(name);
  if (name !== null && symbol === null) {
    addDiagnostic(context, `Undefined identifier "${name}".`, arg);
  }

  return symbol;
}

function collectAccessChain(node: MathNode): AccessChain | null {
  const dimensions: MathNode[] = [];
  let current: MathNode = node;

  while (current.type === "AccessorNode") {
    const index = readObjectProperty(current, "index");
    const object = readObjectProperty(current, "object");
    if (!isMathNode(index) || !isMathNode(object)) {
      return null;
    }

    dimensions.unshift(...readNodeArrayProperty(index, "dimensions"));
    current = object;
  }

  return {
    root: current,
    dimensions
  };
}

function visitChildren(node: MathNode, context: ValidationContext): void {
  for (const child of childNodes(node)) {
    validateNode(child, context);
  }
}

function childNodes(node: MathNode): readonly MathNode[] {
  const children: MathNode[] = [];

  for (const key of Reflect.ownKeys(node)) {
    const value = (node as unknown as Record<PropertyKey, unknown>)[key];
    if (isMathNode(value)) {
      children.push(value);
    } else if (Array.isArray(value)) {
      children.push(...value.filter(isMathNode));
    }
  }

  return children;
}

function getFunctionName(node: MathNode): string | null {
  const fn = readObjectProperty(node, "fn");
  if (!isMathNode(fn) || fn.type !== "SymbolNode") {
    return null;
  }

  return readStringProperty(fn, "name");
}

function readNodeArrayProperty(node: MathNode, property: string): readonly MathNode[] {
  const value = readObjectProperty(node, property);
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isMathNode);
}

function readStringProperty(node: MathNode, property: string): string | null {
  const value = readObjectProperty(node, property);
  return typeof value === "string" ? value : null;
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

function addDiagnostic(context: ValidationContext, message: string, node: MathNode): void {
  context.diagnostics.push({
    severity: "error",
    message,
    path: context.path,
    expression: context.parsedExpression.source,
    nodeType: node.type
  });
}

function formatArity(min: number, max: number): string {
  if (max === Number.POSITIVE_INFINITY) {
    return `at least ${min} argument${min === 1 ? "" : "s"}`;
  }

  if (min === max) {
    return `${min} argument${min === 1 ? "" : "s"}`;
  }

  return `${min}-${max} arguments`;
}

function createValidatedSpecification(
  parsedSpecification: ParsedSpecification,
  symbols: readonly CompilerSymbol[]
): ValidatedSpecification {
  return Object.freeze({
    parsedSpecification,
    symbols: Object.freeze([...symbols])
  });
}
