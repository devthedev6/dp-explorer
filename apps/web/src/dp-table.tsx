import type { HighlightRole, PlaybackFrame } from "@dp-explorer/playback";
import { toStateKey } from "@dp-explorer/core";

import { isPropagationFrame } from "./propagation-presentation";
import "./dp-table.css";

export interface DPTableProps {
  readonly frame: PlaybackFrame;
}

type CellRole = HighlightRole | "updated" | "transition-target";

interface CellViewModel {
  readonly state: string;
  readonly label: string;
  readonly value: number | null;
  readonly role: CellRole | null;
  readonly executionModel: "functional" | "propagation";
  readonly roleLabel: string | null;
}

/**
 * Generic DP table renderer for 1D and 2D coordinate-vector state spaces.
 *
 * The component consumes only playback frame data; dimensions, filled values,
 * and highlights are all provided by the Playback Engine through the frame.
 */
export function DPTable({ frame }: DPTableProps) {
  const dimensions = frame.table.dimensions;

  if (dimensions.length === 1) {
    return <OneDimensionalTable frame={frame} />;
  }

  if (dimensions.length === 2) {
    return <TwoDimensionalTable frame={frame} />;
  }

  return (
    <section aria-label="DP table" className="dp-table-panel">
      <h2>DP table</h2>
      <p data-testid="dp-table-unsupported">
        Execution and playback are fully supported.
        <br />
        DP table visualization is currently available only for one- and two-dimensional dynamic
        programming.
      </p>
    </section>
  );
}

function OneDimensionalTable({ frame }: DPTableProps) {
  const size = frame.table.dimensions[0] ?? 0;
  const axis = frame.table.stateVariables[0] ?? "i";
  const cells = Array.from({ length: size }, (_, index) => cellFor(frame, [index]));

  return (
    <section aria-label="DP table" className="dp-table-panel">
      <h2>DP table</h2>
      <div className="dp-table-scroll">
        <table className="dp-table">
          <thead>
            <tr>
              <th scope="row">{axis}</th>
              {cells.map((cell) => (
                <th key={cell.state} scope="col">
                  {cell.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">value</th>
              {cells.map((cell) => (
                <DPCell key={cell.state} cell={cell} />
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <DPTableLegend propagation={isPropagationFrame(frame)} />
    </section>
  );
}

function TwoDimensionalTable({ frame }: DPTableProps) {
  const rowCount = frame.table.dimensions[0] ?? 0;
  const columnCount = frame.table.dimensions[1] ?? 0;
  const rowAxis = frame.table.stateVariables[0] ?? "i";
  const columnAxis = frame.table.stateVariables[1] ?? "j";
  const columns = Array.from({ length: columnCount }, (_, column) => column);
  const rows = Array.from({ length: rowCount }, (_, row) => row);

  return (
    <section aria-label="DP table" className="dp-table-panel">
      <h2>DP table</h2>
      <div className="dp-table-scroll">
        <table className="dp-table">
          <thead>
            <tr>
              <th scope="col">{`${rowAxis}\\${columnAxis}`}</th>
              {columns.map((column) => (
                <th key={column} scope="col">
                  {columnAxis}={column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row}>
                <th scope="row">
                  {rowAxis}={row}
                </th>
                {columns.map((column) => (
                  <DPCell key={`${row}-${column}`} cell={cellFor(frame, [row, column])} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <DPTableLegend propagation={isPropagationFrame(frame)} />
    </section>
  );
}

function DPCell({ cell }: { readonly cell: CellViewModel }) {
  const status = cell.value === null ? "unknown" : "computed";
  const roleDescription = cell.roleLabel ? `, ${cell.roleLabel}` : "";

  return (
    <td
      className="dp-table-cell"
      data-state={cell.state}
      data-status={status}
      data-role={cell.role ?? "none"}
      data-model={cell.executionModel}
      aria-label={`${cell.label}: ${cell.value ?? "unknown"}${roleDescription}`}
    >
      {cell.value ?? "?"}
    </td>
  );
}

function DPTableLegend({ propagation }: { readonly propagation: boolean }) {
  return (
    <ul className="dp-table-legend" aria-label="DP table legend">
      <LegendItem label={propagation ? "Processing Source" : "Active"} role="active" />
      <LegendItem label={propagation ? "Updated Target" : "Updated"} role="updated" />
      <LegendItem label="Transition Target" role="transition-target" />
      <LegendItem label="Dependency" role="dependency" />
      <LegendItem label="Base Case" role="base-case" />
      <LegendItem label="Memo Hit" role="memo-hit" />
      <LegendItem label="Unknown" role="unknown" />
    </ul>
  );
}

function LegendItem({ label, role }: { readonly label: string; readonly role: string }) {
  return (
    <li>
      <span className="dp-table-legend-swatch" data-role={role} aria-hidden="true" />
      {label}
    </li>
  );
}

function cellFor(frame: PlaybackFrame, coordinates: readonly number[]): CellViewModel {
  const state = toStateKey(coordinates);
  const role = roleFor(frame, state);
  const propagation = isPropagationFrame(frame);
  return {
    state,
    label: formatCoordinates(coordinates),
    value: frame.dpSnapshot.get(state) ?? null,
    role,
    executionModel: propagation ? "propagation" : "functional",
    roleLabel: propagation ? propagationRoleLabel(role) : null
  };
}

function roleFor(frame: PlaybackFrame, state: string): CellRole | null {
  if (isPropagationFrame(frame)) {
    if (frame.updatedState?.state === state) return "updated";
    if (frame.activeTransition?.source === state) return "active";
    if (frame.processedState === state) return "active";
    if (frame.activeTransition?.target === state) return "transition-target";
    return null;
  }

  const roles = frame.highlightedCells
    .filter((cell) => cell.state === state)
    .map((cell) => cell.role);

  if (roles.includes("active")) return "active";
  if (roles.includes("base-case")) return "base-case";
  if (roles.includes("memo-hit")) return "memo-hit";
  if (roles.includes("dependency")) return "dependency";
  return null;
}

function propagationRoleLabel(role: CellRole | null): string | null {
  if (role === "active") return "processing source";
  if (role === "updated") return "updated target";
  if (role === "transition-target") return "transition target";
  return null;
}

function formatCoordinates(coordinates: readonly number[]): string {
  return coordinates.join(",");
}
