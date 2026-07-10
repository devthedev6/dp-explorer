export type ParseDiagnosticSeverity = "error";

export type ParseExpressionKind =
  | "constant"
  | "state-lower-bound"
  | "state-upper-bound"
  | "base-case-condition"
  | "base-case-expression"
  | "transition-condition"
  | "transition-expression"
  | "root-state"
  | "answer-expression";

export interface ParseDiagnostic {
  readonly severity: ParseDiagnosticSeverity;
  readonly message: string;
  readonly expression: string;
  readonly kind: ParseExpressionKind;
  readonly path: readonly (string | number)[];
}

export type ParseSpecificationResult =
  | {
      readonly success: true;
      readonly diagnostics: readonly [];
      readonly parsedSpecification: import("./parsed-specification").ParsedSpecification;
    }
  | {
      readonly success: false;
      readonly diagnostics: readonly ParseDiagnostic[];
      readonly parsedSpecification: null;
    };
