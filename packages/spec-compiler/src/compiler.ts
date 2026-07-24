import type { BuilderState, PropagationBuilderState } from "./builder-state";
import type { CompileResult, PropagationCompileResult } from "./compile-result";
import { parseSpecification } from "./parser";
import { generateFunctionalProblemSpec } from "./problem-spec-generator";
import { generatePropagationProblemSpec } from "./propagation-problem-spec-generator";
import { validateSpecification } from "./semantic-validator";

export function compileSpecification(builderState: BuilderState): CompileResult {
  const parseResult = parseSpecification(builderState);
  if (!parseResult.success) {
    return Object.freeze({
      success: false,
      diagnostics: Object.freeze([...parseResult.diagnostics])
    });
  }

  const validationResult = validateSpecification(parseResult.parsedSpecification);
  if (!validationResult.success) {
    return Object.freeze({
      success: false,
      diagnostics: Object.freeze([...validationResult.diagnostics])
    });
  }

  return Object.freeze({
    success: true,
    diagnostics: [] as const,
    problemSpec: generateFunctionalProblemSpec(validationResult.validatedSpecification)
  });
}

/**
 * Compile a propagation BuilderState into its model-specific specification.
 *
 * Propagation execution is intentionally deferred to PropagationRuntime.
 */
export function compilePropagationSpecification(
  builderState: PropagationBuilderState
): PropagationCompileResult {
  try {
    return Object.freeze({
      success: true,
      diagnostics: [] as const,
      problemSpec: generatePropagationProblemSpec(builderState)
    });
  } catch (error) {
    return Object.freeze({
      success: false,
      diagnostics: Object.freeze([
        {
          severity: "error" as const,
          message:
            error instanceof Error ? error.message : "Unable to compile propagation specification."
        }
      ])
    });
  }
}
