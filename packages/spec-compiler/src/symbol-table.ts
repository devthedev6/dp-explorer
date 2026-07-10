import type { BuilderState, BuilderSymbol, BuilderStateVariable } from "./builder-state";
import type { SemanticDiagnostic } from "./validator-diagnostics";

export type SymbolKind =
  "primitive" | "array" | "constant" | "state-variable" | "built-in-function" | "reserved-keyword";

export interface CompilerSymbol {
  readonly name: string;
  readonly kind: SymbolKind;
  readonly source: "builder" | "reserved";
  readonly path?: readonly (string | number)[];
  readonly dimensions?: number;
  readonly primitiveType?: string;
}

export const RESERVED_IDENTIFIERS = [
  "DP",
  "min",
  "max",
  "abs",
  "floor",
  "ceil",
  "len",
  "rows",
  "cols",
  "bitXor",
  "true",
  "false"
] as const;

const BUILT_IN_FUNCTIONS = new Set([
  "DP",
  "min",
  "max",
  "abs",
  "floor",
  "ceil",
  "len",
  "rows",
  "cols",
  "bitXor"
]);
export class SymbolTable {
  readonly #symbols = new Map<string, CompilerSymbol>();

  static createWithReserved(): SymbolTable {
    const table = new SymbolTable();

    for (const identifier of RESERVED_IDENTIFIERS) {
      table.defineReserved({
        name: identifier,
        kind: BUILT_IN_FUNCTIONS.has(identifier) ? "built-in-function" : "reserved-keyword"
      });
    }

    return table;
  }

  define(symbol: CompilerSymbol): boolean {
    if (this.#symbols.has(symbol.name)) {
      return false;
    }

    this.#symbols.set(symbol.name, Object.freeze({ ...symbol }));
    return true;
  }

  resolve(name: string): CompilerSymbol | null {
    return this.#symbols.get(name) ?? null;
  }

  has(name: string): boolean {
    return this.#symbols.has(name);
  }

  values(): readonly CompilerSymbol[] {
    return Object.freeze([...this.#symbols.values()]);
  }

  defineReserved(symbol: Pick<CompilerSymbol, "name" | "kind">): void {
    this.#symbols.set(
      symbol.name,
      Object.freeze({
        name: symbol.name,
        kind: symbol.kind,
        source: "reserved"
      })
    );
  }
}

export function buildSymbolTable(builderState: BuilderState): {
  readonly symbolTable: SymbolTable;
  readonly diagnostics: readonly SemanticDiagnostic[];
} {
  const symbolTable = SymbolTable.createWithReserved();
  const diagnostics: SemanticDiagnostic[] = [];

  builderState.symbols.forEach((symbol, index) => {
    defineBuilderSymbol(
      symbolTable,
      diagnostics,
      symbolToCompilerSymbol(symbol, ["symbols", index])
    );
  });

  builderState.state.variables.forEach((variable, index) => {
    defineBuilderSymbol(
      symbolTable,
      diagnostics,
      stateVariableToCompilerSymbol(variable, ["state", "variables", index])
    );
  });

  return {
    symbolTable,
    diagnostics
  };
}

function defineBuilderSymbol(
  symbolTable: SymbolTable,
  diagnostics: SemanticDiagnostic[],
  symbol: CompilerSymbol
): void {
  const existing = symbolTable.resolve(symbol.name);
  if (existing?.source === "reserved") {
    diagnostics.push({
      severity: "error",
      message: `Identifier "${symbol.name}" is reserved and cannot be redefined.`,
      ...(symbol.path === undefined ? {} : { path: symbol.path })
    });
    return;
  }

  if (!symbolTable.define(symbol)) {
    diagnostics.push({
      severity: "error",
      message: `Duplicate declaration for "${symbol.name}".`,
      ...(symbol.path === undefined ? {} : { path: symbol.path })
    });
  }
}

function symbolToCompilerSymbol(
  symbol: BuilderSymbol,
  path: readonly (string | number)[]
): CompilerSymbol {
  const compilerSymbol: CompilerSymbol = {
    name: symbol.name,
    kind: symbol.category,
    source: "builder",
    path
  };

  if (symbol.dimensions !== undefined) {
    return {
      ...compilerSymbol,
      dimensions: symbol.dimensions,
      ...(symbol.primitiveType === undefined ? {} : { primitiveType: symbol.primitiveType })
    };
  }

  if (symbol.primitiveType !== undefined) {
    return {
      ...compilerSymbol,
      primitiveType: symbol.primitiveType
    };
  }

  return compilerSymbol;
}

function stateVariableToCompilerSymbol(
  variable: BuilderStateVariable,
  path: readonly (string | number)[]
): CompilerSymbol {
  return {
    name: variable.name,
    kind: "state-variable",
    source: "builder",
    path
  };
}
