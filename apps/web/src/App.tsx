import { useState } from "react";
import type { ExecutionFrame } from "@dp-explorer/playback";
import type { AlgorithmFormulation, InputField } from "@dp-explorer/core";
import type { RegisteredTemplate } from "@dp-explorer/templates";
import { templateRegistry } from "@dp-explorer/templates";

import { createDemoSession } from "./demo-session";
import { FrameDetails } from "./frame-details";
import { PlaybackTimeline } from "./playback-timeline";
import { DPTable } from "./dp-table";
import { RecursionTreeView } from "./recursion-tree";

import "./App.css";

const templates = templateRegistry.list();
const firstTemplate = templates[0];

if (firstTemplate === undefined) {
  throw new Error("No templates are registered.");
}

const defaultTemplate: RegisteredTemplate = firstTemplate;

export function App() {
  const [selectedTemplateId, setSelectedTemplateId] = useState(defaultTemplate.id);
  const [input, setInput] = useState<Record<string, unknown>>(() => ({
    ...defaultTemplate.defaultInput
  }));
  const [session, setSession] = useState(() => createDemoSession(defaultTemplate));
  const [frame, setFrame] = useState<ExecutionFrame>(() => session.currentFrame());
  const selectedTemplate = templateRegistry.get(selectedTemplateId) ?? defaultTemplate;

  function isGridTemplateId(templateId: string): boolean {
    return templateId === "unique-paths-ii" || templateId === "minimum-path-sum";
  }

  function ensureGridDimensions(
    templateId: string,
    nextInput: Record<string, unknown>,
    forceResize = false
  ): Record<string, unknown> {
    if (!isGridTemplateId(templateId)) {
      return nextInput;
    }

    const rows = typeof nextInput.rows === "number" ? nextInput.rows : 0;
    const columns = typeof nextInput.columns === "number" ? nextInput.columns : 0;
    const existingGrid = Array.isArray(nextInput.grid) ? nextInput.grid : [];

    if (
      !forceResize &&
      existingGrid.length === rows &&
      existingGrid.every((row) => Array.isArray(row) && row.length === columns)
    ) {
      return nextInput;
    }

    const grid: number[][] = [];

    for (let i = 0; i < rows; i += 1) {
      const row: number[] = [];
      const existingRow = Array.isArray(existingGrid[i]) ? (existingGrid[i] as number[]) : [];

      for (let j = 0; j < columns; j += 1) {
        const existingCell = existingRow[j];
        if (typeof existingCell === "number") {
          row.push(existingCell);
        } else {
          row.push(0);
        }
      }

      grid.push(row);
    }

    return { ...nextInput, grid };
  }

  function isInputValid(templateId: string, nextInput: Record<string, unknown>): boolean {
    if (!isGridTemplateId(templateId)) {
      return true;
    }

    const rows = typeof nextInput.rows === "number" ? nextInput.rows : 0;
    const columns = typeof nextInput.columns === "number" ? nextInput.columns : 0;

    if (!Number.isInteger(rows) || !Number.isInteger(columns) || rows < 1 || columns < 1) {
      return false;
    }

    const grid = Array.isArray(nextInput.grid) ? nextInput.grid : [];

    if (grid.length !== rows || grid.some((row) => !Array.isArray(row) || row.length !== columns)) {
      return false;
    }

    if (
      templateId === "minimum-path-sum" &&
      grid.some(
        (row: unknown) =>
          Array.isArray(row) &&
          (row as number[]).some(
            (cell: number) => typeof cell !== "number" || !Number.isFinite(cell) || cell < 0
          )
      )
    ) {
      return false;
    }

    if (
      templateId === "unique-paths-ii" &&
      grid.some(
        (row: unknown) =>
          Array.isArray(row) &&
          (row as number[]).some(
            (cell: number) => typeof cell !== "number" || !Number.isFinite(cell)
          )
      )
    ) {
      return false;
    }

    return true;
  }

  function startSession(template: RegisteredTemplate, nextInput: Record<string, unknown>) {
    const nextSession = createDemoSession({ ...template, defaultInput: nextInput });
    setSession(nextSession);
    setFrame(nextSession.currentFrame());
  }

  function selectTemplate(id: string) {
    const template = templateRegistry.get(id);
    if (!template) {
      return;
    }

    const nextInput = { ...template.defaultInput };
    const normalizedInput = ensureGridDimensions(template.id, nextInput);
    setSelectedTemplateId(id);
    setInput(normalizedInput);
    startSession(template, normalizedInput);
  }

  function updateInputValue(name: string, value: unknown) {
    const nextInput = { ...input, [name]: value };
    const normalizedInput = ensureGridDimensions(
      selectedTemplate.id,
      nextInput,
      name === "rows" || name === "columns"
    );
    setInput(normalizedInput);

    if (isInputValid(selectedTemplate.id, normalizedInput)) {
      startSession(selectedTemplate, normalizedInput);
    }
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>DP Explorer</h1>
        <p>Template verification shell</p>

        <label>
          Template
          <select
            value={selectedTemplateId}
            onChange={(event) => selectTemplate(event.target.value)}
            aria-label="Template"
          >
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </label>

        <AlgorithmFormulationPanel formulation={selectedTemplate.spec.formulation} />

        <fieldset>
          <legend>Input</legend>
          {selectedTemplate.spec.inputSchema.map((field) => (
            <InputFieldControl
              key={field.name}
              field={field}
              value={input[field.name]}
              onChange={(value) => updateInputValue(field.name, value)}
            />
          ))}
        </fieldset>
      </header>

      <section className="app-recursion-tree" aria-label="Recursion tree">
        <RecursionTreeView frame={frame} />
      </section>

      <section className="app-table-column" aria-label="DP table">
        <DPTable frame={frame} />
      </section>

      <aside className="app-frame-details" aria-label="Frame details">
        <FrameDetails frame={frame} />
      </aside>

      <section className="app-timeline-column" aria-label="Playback timeline">
        <PlaybackTimeline
          frame={frame}
          onSeek={(index) => setFrame(session.controller.seek(index))}
        />

        <nav className="app-playback-controls" aria-label="Playback controls">
          <button
            type="button"
            onClick={() => setFrame(session.previous())}
            disabled={frame.isFirst}
          >
            Previous
          </button>
          <button type="button" onClick={() => setFrame(session.reset())} disabled={frame.isFirst}>
            Reset
          </button>
          <button type="button" onClick={() => setFrame(session.next())} disabled={frame.isLast}>
            Next
          </button>
        </nav>
      </section>
    </main>
  );
}

interface InputFieldControlProps {
  readonly field: InputField;
  readonly value: unknown;
  readonly onChange: (value: unknown) => void;
}

interface AlgorithmFormulationPanelProps {
  readonly formulation: AlgorithmFormulation | undefined;
}

function AlgorithmFormulationPanel({ formulation }: AlgorithmFormulationPanelProps) {
  if (!formulation) {
    return null;
  }

  return (
    <section className="app-formulation" aria-label="Algorithm formulation">
      <h2>{formulation.title}</h2>

      <div className="app-formulation-section">
        <h3>Problem Statement</h3>
        <p className="app-formulation-prose">{formulation.problemStatement}</p>
      </div>

      <div className="app-formulation-section">
        <h3>DP State</h3>
        <pre className="app-formulation-code">{formulation.stateDefinition}</pre>
      </div>

      <div className="app-formulation-section">
        <h3>Base Cases</h3>
        <pre className="app-formulation-code">{formulation.baseCases}</pre>
      </div>

      <div className="app-formulation-section">
        <h3>Transition</h3>
        <pre className="app-formulation-code">{formulation.transition}</pre>
      </div>

      <div className="app-formulation-section">
        <h3>Complexity</h3>
        <p className="app-formulation-prose">
          Time: {formulation.timeComplexity} | Space: {formulation.spaceComplexity}
        </p>
      </div>
    </section>
  );
}

function InputFieldControl({ field, value, onChange }: InputFieldControlProps) {
  if (field.type === "integer") {
    return (
      <label>
        {field.label}
        <input
          type="number"
          min={field.min}
          max={field.max}
          value={typeof value === "number" ? value : ""}
          onChange={(event) => onChange(event.target.valueAsNumber)}
        />
      </label>
    );
  }

  if (field.name === "grid" && field.description?.includes("grid")) {
    const gridValue = Array.isArray(value) ? (value as number[][]) : [];

    return (
      <GridInputControl
        value={gridValue}
        label={field.label}
        onChange={(nextGrid) => onChange(nextGrid)}
      />
    );
  }

  if (field.type === "string") {
    if (field.name === "blocked" && field.description?.includes("coordinate")) {
      return (
        <label>
          {field.label}
          <textarea
            maxLength={field.maxLength}
            value={typeof value === "string" ? value : ""}
            onChange={(event) => onChange(event.target.value)}
            rows={5}
          />
          <span className="input-hint">
            One coordinate per line.
            <br />
            Example:
            <br />
            1,2
            <br />
            2,0
            <br />
            4,3
          </span>
        </label>
      );
    }

    return (
      <label>
        {field.label}
        <input
          type="text"
          maxLength={field.maxLength}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    );
  }

  // Unsupported field types are rendered as read-only placeholders.
  return (
    <label>
      {field.label}
      <input
        type="text"
        readOnly
        value={typeof value == "string" || typeof value == "number" ? String(value) : ""}
      />
    </label>
  );
}

interface GridInputControlProps {
  readonly value: readonly (readonly number[])[];
  readonly label: string;
  readonly onChange: (value: number[][]) => void;
}

function GridInputControl({ value, label, onChange }: GridInputControlProps) {
  function parseCellValue(rawValue: string): number {
    const trimmed = rawValue.trim();

    if (trimmed === "") {
      return Number.NaN;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }

  function updateCell(rowIndex: number, columnIndex: number, rawValue: string) {
    const parsed = parseCellValue(rawValue);
    const nextValue = value.map((row) => [...row]);

    if (nextValue[rowIndex] === undefined) {
      nextValue[rowIndex] = [];
    }

    nextValue[rowIndex][columnIndex] = parsed;
    onChange(nextValue);
  }

  const hasInvalidCells = value.some((row) => row.some((cell) => !Number.isFinite(cell)));

  return (
    <div className="input-group">
      <span className="input-label">{label}</span>
      <div className="grid-input" aria-label="Grid values">
        {value.map((row, rowIndex) => (
          <div key={rowIndex} className="grid-input-row">
            {row.map((cell, columnIndex) => (
              <input
                key={columnIndex}
                type="number"
                min={0}
                value={Number.isFinite(cell) ? cell : ""}
                onChange={(event) => updateCell(rowIndex, columnIndex, event.target.value)}
                className="grid-input-cell"
                aria-label={`Cell (${rowIndex}, ${columnIndex})`}
              />
            ))}
          </div>
        ))}
      </div>
      {hasInvalidCells && (
        <span className="input-error">All grid cells must contain a non-negative number.</span>
      )}
    </div>
  );
}
