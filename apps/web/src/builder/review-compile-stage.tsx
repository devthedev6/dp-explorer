import { useEffect, useState } from "react";
import { type InputField } from "@dp-explorer/core";
import type { ExecutionFrame } from "@dp-explorer/playback";
import {
  compileSpecification,
  createDefaultRuntimeInputText,
  formatRuntimeInputType,
  getRuntimeInputExample,
  parseRuntimeInputs,
  type CompilerDiagnostic
} from "@dp-explorer/spec-compiler";
import { DPTable } from "../dp-table";
import { createProblemSpecSession, type DemoSession } from "../demo-session";
import { FrameDetails } from "../frame-details";
import { PlaybackTimeline } from "../playback-timeline";
import { RecursionTreeView } from "../recursion-tree";
import type { BuilderSymbol } from "./builder-state";
import { useBuilderCompilation, useBuilderDispatch, useBuilderState } from "./builder-store";

type RuntimeInputText = Record<string, string>;

interface ExecutionViewState {
  readonly session: DemoSession;
  readonly frame: ExecutionFrame;
}

function formatDiagnosticPath(path: readonly (string | number)[] | undefined): string | null {
  if (!path || path.length === 0) {
    return null;
  }
  return path.map((segment) => String(segment)).join(".");
}

function DiagnosticItem({ diagnostic }: { readonly diagnostic: CompilerDiagnostic }) {
  const path = formatDiagnosticPath(diagnostic.path);
  return (
    <li className="builder-diagnostic-item">
      <p className="builder-diagnostic-message">{diagnostic.message}</p>
      <dl className="builder-diagnostic-meta">
        {path && (
          <>
            <dt>Path</dt>
            <dd>{path}</dd>
          </>
        )}
        {diagnostic.expression && (
          <>
            <dt>Expression</dt>
            <dd>
              <code>{diagnostic.expression}</code>
            </dd>
          </>
        )}
      </dl>
    </li>
  );
}

export function ReviewCompileStage() {
  const builderState = useBuilderState();
  const compilation = useBuilderCompilation();
  const dispatch = useBuilderDispatch();
  const [runtimeInput, setRuntimeInput] = useState<RuntimeInputText>({});
  const [execution, setExecution] = useState<ExecutionViewState | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);

  useEffect(() => {
    setExecution(null);
    setExecutionError(null);
    if (compilation.problemSpec) {
      setRuntimeInput(createDefaultRuntimeInputText(builderState.symbols));
    } else {
      setRuntimeInput({});
    }
  }, [builderState.symbols, compilation.problemSpec]);

  function compileCurrentSpecification() {
    const result = compileSpecification(builderState);
    if (result.success) {
      dispatch({ type: "COMPILE_SUCCESS", problemSpec: result.problemSpec });
    } else {
      dispatch({ type: "COMPILE_FAILURE", diagnostics: result.diagnostics });
    }
  }

  function updateRuntimeInput(name: string, value: string) {
    setRuntimeInput((current) => ({ ...current, [name]: value }));
    setExecution(null);
    setExecutionError(null);
  }

  function executeCompiledSpecification() {
    if (!compilation.problemSpec) {
      setExecutionError("Compile the specification successfully before running it.");
      return;
    }

    try {
      const input = parseRuntimeInputs(builderState.symbols, runtimeInput);
      const session = createProblemSpecSession(
        compilation.problemSpec,
        input,
        builderState.executionMode
      );
      setExecution({ session, frame: session.currentFrame() });
      setExecutionError(null);
    } catch (error) {
      setExecution(null);
      setExecutionError(error instanceof Error ? error.message : "Execution failed.");
    }
  }

  function setFrame(frame: ExecutionFrame) {
    setExecution((current) => (current ? { ...current, frame } : current));
  }

  return (
    <div className="builder-editor">
      <h3>Review</h3>
      <p className="builder-hint">Review the current BuilderState before compiling.</p>

      <pre className="builder-json-preview">{JSON.stringify(builderState, null, 2)}</pre>

      <div className="builder-compile-area">
        <button
          type="button"
          className="builder-compile-button"
          onClick={compileCurrentSpecification}
        >
          Compile Specification
        </button>
      </div>

      <section
        className={`builder-compile-status builder-compile-status--${compilation.status}`}
        aria-live="polite"
      >
        <h4>Compilation Status</h4>
        {compilation.status === "idle" && <p>Not compiled yet.</p>}
        {compilation.status === "success" && (
          <p>
            Specification compiled successfully. The generated functional specification is ready to
            run.
          </p>
        )}
        {compilation.status === "failure" && (
          <>
            <p>Compilation failed. Fix the compiler errors below and try again.</p>
            <ol className="builder-diagnostics-list">
              {compilation.diagnostics.map((diagnostic, index) => (
                <DiagnosticItem key={`${diagnostic.message}-${index}`} diagnostic={diagnostic} />
              ))}
            </ol>
          </>
        )}
      </section>

      {compilation.status === "success" && compilation.problemSpec && (
        <section className="builder-runtime-panel" aria-label="Compiled specification runtime">
          <div className="builder-runtime-header">
            <h4>Execution</h4>
            <button
              type="button"
              className="builder-compile-button"
              onClick={executeCompiledSpecification}
            >
              Run Specification
            </button>
          </div>

          <fieldset className="builder-runtime-inputs">
            <legend>Input</legend>
            {compilation.problemSpec.inputSchema.map((field) => (
              <RuntimeInputControl
                key={field.name}
                field={field}
                symbol={builderState.symbols.find((symbol) => symbol.name === field.name)}
                value={runtimeInput[field.name]}
                onChange={(value) => updateRuntimeInput(field.name, value)}
              />
            ))}
          </fieldset>

          {executionError && <p className="builder-execution-error">{executionError}</p>}

          {execution && (
            <>
              <section className="builder-answer-panel" aria-label="Execution answer">
                <h4>Answer</h4>
                <output>{execution.session.answer}</output>
              </section>
              <section className="builder-playback" aria-label="Compiled specification playback">
                <section className="builder-playback-tree" aria-label="Recursion tree">
                  <RecursionTreeView frame={execution.frame} />
                </section>
                <section className="builder-playback-table" aria-label="DP table">
                  <DPTable frame={execution.frame} />
                </section>
                <aside className="builder-playback-details" aria-label="Frame details">
                  <FrameDetails frame={execution.frame} />
                </aside>
                <section className="builder-playback-timeline" aria-label="Playback timeline">
                  <PlaybackTimeline
                    frame={execution.frame}
                    onSeek={(index) => setFrame(execution.session.controller.seek(index))}
                  />
                  <nav className="app-playback-controls" aria-label="Playback controls">
                    <button
                      type="button"
                      onClick={() => setFrame(execution.session.previous())}
                      disabled={execution.frame.isFirst}
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => setFrame(execution.session.reset())}
                      disabled={execution.frame.isFirst}
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => setFrame(execution.session.next())}
                      disabled={execution.frame.isLast}
                    >
                      Next
                    </button>
                  </nav>
                </section>
              </section>
            </>
          )}
        </section>
      )}
    </div>
  );
}

interface RuntimeInputControlProps {
  readonly field: InputField;
  readonly symbol: BuilderSymbol | undefined;
  readonly value: string | undefined;
  readonly onChange: (value: string) => void;
}

function RuntimeInputControl({ field, symbol, value, onChange }: RuntimeInputControlProps) {
  const inputId = `runtime-input-${field.name}`;
  const hintId = `${inputId}-hint`;

  return (
    <div className="builder-field">
      <label htmlFor={inputId}>{field.label}</label>
      <input
        id={inputId}
        type="text"
        maxLength={field.maxLength}
        value={value ?? ""}
        aria-describedby={symbol ? hintId : undefined}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
      {symbol && (
        <span id={hintId} className="builder-field-hint">
          {formatRuntimeInputType(symbol)} example: <code>{getRuntimeInputExample(symbol)}</code>
        </span>
      )}
    </div>
  );
}
