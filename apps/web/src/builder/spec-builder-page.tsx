import { useMemo, useState } from "react";
import { BuilderProvider } from "./builder-store";
import { BUILDER_STAGES, type BuilderStageId } from "./builder-stages";
import { SymbolsEditor } from "./symbols-editor";
import { StateEditor } from "./state-editor";
import { BoundsEditor } from "./bounds-editor";
import { BaseCasesEditor } from "./base-cases-editor";
import { TransitionsEditor } from "./transitions-editor";
import { InitialValueEditor } from "./initial-value-editor";
import { RootStateEditor } from "./root-state-editor";
import { AnswerEditor } from "./answer-editor";
import { ReviewCompileStage } from "./review-compile-stage";

import "./spec-builder.css";

export interface SpecificationBuilderPageProps {
  readonly onExit: () => void;
}

export function SpecificationBuilderPage({ onExit }: SpecificationBuilderPageProps) {
  return (
    <BuilderProvider>
      <BuilderShell onExit={onExit} />
    </BuilderProvider>
  );
}

function BuilderShell({ onExit }: SpecificationBuilderPageProps) {
  const [currentStageId, setCurrentStageId] = useState<BuilderStageId>(
    BUILDER_STAGES[0]?.id ?? "symbols"
  );
  const currentStageIndex = useMemo(
    () => BUILDER_STAGES.findIndex((stage) => stage.id === currentStageId),
    [currentStageId]
  );

  function goToStage(index: number) {
    const stage = BUILDER_STAGES[index];
    if (stage) {
      setCurrentStageId(stage.id);
    }
  }

  function goPrevious() {
    if (currentStageIndex > 0) {
      goToStage(currentStageIndex - 1);
    }
  }

  function goNext() {
    if (currentStageIndex < BUILDER_STAGES.length - 1) {
      goToStage(currentStageIndex + 1);
    }
  }

  const isFirst = currentStageIndex === 0;
  const isLast = currentStageIndex === BUILDER_STAGES.length - 1;

  return (
    <main className="builder-shell">
      <header className="builder-header">
        <h1>Specification Builder</h1>
        <p>Define a custom DP formulation.</p>
        <button type="button" className="builder-exit-button" onClick={onExit}>
          Exit Builder
        </button>
      </header>

      <StageIndicator currentStageId={currentStageId} onSelect={setCurrentStageId} />

      <section className="builder-stage-content" aria-live="polite">
        <BuilderStageView stageId={currentStageId} />
      </section>

      <nav className="builder-nav" aria-label="Wizard navigation">
        <button type="button" onClick={goPrevious} disabled={isFirst}>
          Previous
        </button>
        <span className="builder-step-count">
          {currentStageIndex + 1} / {BUILDER_STAGES.length}
        </span>
        <button type="button" onClick={goNext} disabled={isLast}>
          Next
        </button>
      </nav>
    </main>
  );
}

interface StageIndicatorProps {
  readonly currentStageId: BuilderStageId;
  readonly onSelect: (stageId: BuilderStageId) => void;
}

function StageIndicator({ currentStageId, onSelect }: StageIndicatorProps) {
  return (
    <ol className="builder-stage-indicator" aria-label="Builder stages">
      {BUILDER_STAGES.map((stage, index) => {
        const status = stage.id === currentStageId ? "current" : "upcoming";
        return (
          <li
            key={stage.id}
            className={`builder-stage-step builder-stage-step--${status}`}
            aria-current={stage.id === currentStageId ? "step" : undefined}
          >
            <button
              type="button"
              onClick={() => onSelect(stage.id)}
              className="builder-stage-button"
              aria-label={`Step ${index + 1}: ${stage.title}`}
            >
              <span className="builder-stage-number">{index + 1}</span>
              <span className="builder-stage-label">{stage.shortTitle}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

interface BuilderStageViewProps {
  readonly stageId: BuilderStageId;
}

function BuilderStageView({ stageId }: BuilderStageViewProps) {
  const stage = BUILDER_STAGES.find((s) => s.id === stageId);
  if (!stage) {
    return null;
  }

  return (
    <div className="builder-stage-panel">
      <h2>{stage.title}</h2>
      {stageId === "symbols" && <SymbolsEditor />}
      {stageId === "state" && <StateEditor />}
      {stageId === "bounds" && <BoundsEditor />}
      {stageId === "base-cases" && <BaseCasesEditor />}
      {stageId === "transitions" && <TransitionsEditor />}
      {stageId === "initial-value" && <InitialValueEditor />}
      {stageId === "root-state" && <RootStateEditor />}
      {stageId === "answer" && <AnswerEditor />}
      {stageId === "review-compile" && <ReviewCompileStage />}
    </div>
  );
}
