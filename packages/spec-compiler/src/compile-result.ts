import type { FunctionalProblemSpec, PropagationProblemSpec } from "@dp-explorer/core";
import type { ParseDiagnostic } from "./diagnostics";
import type { SemanticDiagnostic } from "./validator-diagnostics";

export type CompilerDiagnostic = ParseDiagnostic | SemanticDiagnostic;

export type CompileResult =
  | {
      readonly success: true;
      readonly diagnostics: readonly [];
      readonly problemSpec: FunctionalProblemSpec<Record<string, unknown>>;
    }
  | {
      readonly success: false;
      readonly diagnostics: readonly CompilerDiagnostic[];
    };

export type PropagationCompileResult =
  | {
      readonly success: true;
      readonly diagnostics: readonly [];
      readonly problemSpec: PropagationProblemSpec<Record<string, unknown>>;
    }
  | {
      readonly success: false;
      readonly diagnostics: readonly CompilerDiagnostic[];
    };
