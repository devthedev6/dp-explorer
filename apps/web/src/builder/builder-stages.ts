/**
 * Ordered wizard stages for the Specification Builder.
 *
 * This file avoids hard-coding stage strings across the page components,
 * making it easy to extend and reorder later.
 */

export type BuilderStageId =
  | "symbols"
  | "state"
  | "bounds"
  | "base-cases"
  | "transitions"
  | "initial-value"
  | "root-state"
  | "answer"
  | "review-compile";

export interface BuilderStage {
  readonly id: BuilderStageId;
  readonly title: string;
  readonly shortTitle: string;
}

export const BUILDER_STAGES: readonly BuilderStage[] = [
  { id: "symbols", title: "Symbols", shortTitle: "Symbols" },
  { id: "state", title: "State Definition", shortTitle: "State" },
  { id: "bounds", title: "Bounds", shortTitle: "Bounds" },
  { id: "base-cases", title: "Base Cases", shortTitle: "Base" },
  { id: "transitions", title: "Transitions", shortTitle: "Transitions" },
  { id: "initial-value", title: "Initial DP Value", shortTitle: "Initial" },
  { id: "root-state", title: "Root State", shortTitle: "Root" },
  { id: "answer", title: "Answer", shortTitle: "Answer" },
  { id: "review-compile", title: "Review & Compile", shortTitle: "Review" }
] as const;

export const BUILDER_STAGE_IDS = BUILDER_STAGES.map((stage) => stage.id);

export function findStageIndex(id: BuilderStageId): number {
  return BUILDER_STAGE_IDS.indexOf(id);
}
