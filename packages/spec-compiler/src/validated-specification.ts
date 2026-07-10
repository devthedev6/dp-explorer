import type { ParsedSpecification } from "./parsed-specification";
import type { CompilerSymbol } from "./symbol-table";

export interface ValidatedSpecification {
  readonly parsedSpecification: ParsedSpecification;
  readonly symbols: readonly CompilerSymbol[];
}
