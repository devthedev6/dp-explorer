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
    setSelectedTemplateId(id);
    setInput(nextInput);
    startSession(template, nextInput);
  }

  function updateInputValue(name: string, value: unknown) {
    const nextInput = { ...input, [name]: value };
    setInput(nextInput);
    startSession(selectedTemplate, nextInput);
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

  if (field.type === "string") {
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
