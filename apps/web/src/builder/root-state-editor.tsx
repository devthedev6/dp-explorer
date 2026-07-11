import { useBuilderDispatch, useBuilderState } from "./builder-store";
import { ExpressionLanguageReference } from "./expression-language-reference";

export function RootStateEditor() {
  const builderState = useBuilderState();
  const dispatch = useBuilderDispatch();
  const dimensionCount = builderState.state.dimensionCount;
  const coordinates = normalizeCoordinates(
    readRootStateCoordinates(builderState.rootStateExpression),
    dimensionCount
  );

  function updateCoordinate(index: number, value: string) {
    const nextCoordinates = coordinates.map((coordinate, coordinateIndex) =>
      coordinateIndex === index ? value : coordinate
    );
    dispatch({
      type: "SET_ROOT_STATE_EXPRESSION",
      expression: formatRootStateExpression(nextCoordinates)
    });
  }

  return (
    <div className="builder-editor">
      <ExpressionLanguageReference />

      <div className="builder-root-coordinates">
        {coordinates.map((coordinate, index) => (
          <label key={index} className="builder-field">
            <span>Root coordinate {index + 1}</span>
            <input
              type="text"
              value={coordinate}
              placeholder={builderState.state.variables[index]?.upperBoundExpression || "0"}
              onChange={(event) => updateCoordinate(index, event.currentTarget.value)}
            />
          </label>
        ))}
      </div>

      <div className="builder-expression-preview">
        <span>Root State Expression</span>
        <code>{builderState.rootStateExpression}</code>
      </div>

      <p className="builder-hint">
        This expression describes which state the runtime should evaluate to begin the computation.
      </p>
    </div>
  );
}

function normalizeCoordinates(coordinates: readonly string[], dimensionCount: number): string[] {
  return Array.from({ length: dimensionCount }, (_, index) => coordinates[index] ?? "");
}

function formatRootStateExpression(coordinates: readonly string[]): string {
  if (coordinates.length === 1) {
    return coordinates[0] ?? "";
  }

  return `DP(${coordinates.join(", ")})`;
}

function readRootStateCoordinates(expression: string): readonly string[] {
  const trimmed = expression.trim();
  const match = /^DP\s*\((.*)\)$/u.exec(trimmed);
  if (match === null) {
    return trimmed === "" ? [] : [trimmed];
  }

  return splitTopLevelCommaList(match[1] ?? "");
}

function splitTopLevelCommaList(value: string): readonly string[] {
  const coordinates: string[] = [];
  let depth = 0;
  let current = "";

  for (const char of value) {
    if (char === "(" || char === "[" || char === "{") {
      depth += 1;
    } else if (char === ")" || char === "]" || char === "}") {
      depth = Math.max(0, depth - 1);
    }

    if (char === "," && depth === 0) {
      coordinates.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  if (current.trim() !== "" || value.trim() === "") {
    coordinates.push(current.trim());
  }

  return coordinates;
}
