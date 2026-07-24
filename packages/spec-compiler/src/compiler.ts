import type { BuilderState } from "./builder-state";
import type { CompileResult } from "./compile-result";
import { parseSpecification } from "./parser";
import { generateFunctionalProblemSpec } from "./problem-spec-generator";
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
