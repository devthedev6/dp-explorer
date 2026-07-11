import { useBuilderDispatch, useBuilderState } from "./builder-store";

export function InitialValueEditor() {
  const builderState = useBuilderState();
  const dispatch = useBuilderDispatch();

  return (
    <div className="builder-editor">
      <label className="builder-field builder-field--stacked">
        <span>Initial DP Value</span>
        <input
          type="text"
          value={builderState.initialValueExpression ?? "0"}
          onChange={(event) =>
            dispatch({
              type: "SET_INITIAL_VALUE_EXPRESSION",
              expression: event.currentTarget.value
            })
          }
        />
      </label>
      <p className="builder-hint">
        This expression initializes every DP state before base cases and transitions run.
      </p>
    </div>
  );
}
