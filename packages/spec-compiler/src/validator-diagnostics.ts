export type SemanticDiagnosticSeverity = "error";

export interface SemanticDiagnostic {
  readonly severity: SemanticDiagnosticSeverity;
  readonly message: string;
  readonly path?: readonly (string | number)[];
  readonly expression?: string;
  readonly nodeType?: string;
}

export type ValidateSpecificationResult =
  | {
      readonly success: true;
      readonly diagnostics: readonly [];
      readonly validatedSpecification: import("./validated-specification").ValidatedSpecification;
    }
  | {
      readonly success: false;
      readonly diagnostics: readonly SemanticDiagnostic[];
      readonly validatedSpecification: null;
    };
