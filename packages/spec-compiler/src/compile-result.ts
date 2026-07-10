import type { ProblemSpec } from "@dp-explorer/core";
import type { ParseDiagnostic } from "./diagnostics";
import type { SemanticDiagnostic } from "./validator-diagnostics";

export type CompilerDiagnostic = ParseDiagnostic | SemanticDiagnostic;

export type CompileResult =
  | {
      readonly success: true;
      readonly diagnostics: readonly [];
      readonly problemSpec: ProblemSpec<Record<string, unknown>>;
    }
  | {
      readonly success: false;
      readonly diagnostics: readonly CompilerDiagnostic[];
    };
