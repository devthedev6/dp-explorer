import { useBuilderDispatch, useBuilderState } from "./builder-store";

export function BoundsEditor() {
  const state = useBuilderState();
  const dispatch = useBuilderDispatch();
  const variables = state.state.variables;

  return (
    <div className="builder-editor">
      {variables.length === 0 && (
        <p className="builder-placeholder">No state variables declared yet.</p>
      )}

      {variables.map((variable, index) => (
        <fieldset key={index} className="builder-bounds-group">
          <legend>Variable: {variable.name || `variable ${index + 1}`}</legend>

          <label className="builder-field">
            <span>Lower Bound</span>
            <input
              type="text"
              value={variable.lowerBoundExpression}
              onChange={(event) =>
                dispatch({
                  type: "UPDATE_STATE_VARIABLE",
                  index,
                  updates: { lowerBoundExpression: event.target.value }
                })
              }
            />
          </label>

          <label className="builder-field">
            <span>Upper Bound</span>
            <input
              type="text"
              value={variable.upperBoundExpression}
              onChange={(event) =>
                dispatch({
                  type: "UPDATE_STATE_VARIABLE",
                  index,
                  updates: { upperBoundExpression: event.target.value }
                })
              }
            />
          </label>
        </fieldset>
      ))}
    </div>
  );
}
