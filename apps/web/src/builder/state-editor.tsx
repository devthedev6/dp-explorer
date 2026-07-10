import { useBuilderDispatch, useBuilderState } from "./builder-store";

const DIMENSION_OPTIONS = [1, 2, 3];

export function StateEditor() {
  const state = useBuilderState();
  const dispatch = useBuilderDispatch();
  const { dimensionCount, variables, meaning } = state.state;

  return (
    <div className="builder-editor">
      <label className="builder-field builder-field--inline">
        <span>Number of DP dimensions</span>
        <select
          value={dimensionCount}
          onChange={(event) =>
            dispatch({ type: "SET_DIMENSION_COUNT", count: parseInt(event.target.value, 10) })
          }
        >
          {DIMENSION_OPTIONS.map((count) => (
            <option key={count} value={count}>
              {count}D
            </option>
          ))}
        </select>
      </label>

      <div className="builder-state-preview">
        dp[
        {variables.map((variable, index) => (
          <span key={index}>
            {variable.name}
            {index < variables.length - 1 ? "][" : ""}
          </span>
        ))}
        ]
      </div>

      {variables.map((variable, index) => (
        <label key={index} className="builder-field">
          <span>State variable {index + 1} name</span>
          <input
            type="text"
            value={variable.name}
            onChange={(event) =>
              dispatch({
                type: "UPDATE_STATE_VARIABLE",
                index,
                updates: { name: event.target.value }
              })
            }
          />
        </label>
      ))}

      <label className="builder-field builder-field--stacked">
        <span>State meaning</span>
        <textarea
          value={meaning}
          onChange={(event) => dispatch({ type: "SET_STATE_MEANING", meaning: event.target.value })}
          rows={4}
        />
      </label>
    </div>
  );
}
