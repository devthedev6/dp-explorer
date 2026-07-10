import { useBuilderDispatch, useBuilderState } from "./builder-store";
import type { BuilderSymbol, PrimitiveType, SymbolCategory } from "./builder-state";

const PRIMITIVE_TYPES: readonly PrimitiveType[] = [
  "integer",
  "double",
  "boolean",
  "character",
  "string"
];

export function SymbolsEditor() {
  const builderState = useBuilderState();
  const dispatch = useBuilderDispatch();
  const symbols = builderState.symbols;

  function addSymbol(category: SymbolCategory) {
    dispatch({ type: "ADD_SYMBOL", category });
  }

  function removeSymbol(id: string) {
    dispatch({ type: "REMOVE_SYMBOL", id });
  }

  function updateSymbol(id: string, updates: Partial<BuilderSymbol>) {
    dispatch({ type: "UPDATE_SYMBOL", id, updates });
  }

  return (
    <div className="builder-editor">
      <section className="builder-editor-section">
        <div className="builder-editor-header">
          <h3>Primitive Inputs</h3>
          <button
            type="button"
            onClick={() => addSymbol("primitive")}
            className="builder-add-button"
          >
            Add Primitive
          </button>
        </div>
        {symbols
          .filter((symbol) => symbol.category === "primitive")
          .map((symbol) => (
            <SymbolRow
              key={symbol.id}
              symbol={symbol}
              onUpdate={updateSymbol}
              onRemove={removeSymbol}
            />
          ))}
      </section>

      <section className="builder-editor-section">
        <div className="builder-editor-header">
          <h3>Arrays</h3>
          <button type="button" onClick={() => addSymbol("array")} className="builder-add-button">
            Add Array
          </button>
        </div>
        {symbols
          .filter((symbol) => symbol.category === "array")
          .map((symbol) => (
            <SymbolRow
              key={symbol.id}
              symbol={symbol}
              onUpdate={updateSymbol}
              onRemove={removeSymbol}
            />
          ))}
      </section>

      <section className="builder-editor-section">
        <div className="builder-editor-header">
          <h3>Constants</h3>
          <button
            type="button"
            onClick={() => addSymbol("constant")}
            className="builder-add-button"
          >
            Add Constant
          </button>
        </div>
        {symbols
          .filter((symbol) => symbol.category === "constant")
          .map((symbol) => (
            <SymbolRow
              key={symbol.id}
              symbol={symbol}
              onUpdate={updateSymbol}
              onRemove={removeSymbol}
            />
          ))}
      </section>
    </div>
  );
}

interface SymbolRowProps {
  readonly symbol: BuilderSymbol;
  readonly onUpdate: (id: string, updates: Partial<BuilderSymbol>) => void;
  readonly onRemove: (id: string) => void;
}

function SymbolRow({ symbol, onUpdate, onRemove }: SymbolRowProps) {
  return (
    <div className="builder-symbol-row">
      <label className="builder-field">
        <span>Name</span>
        <input
          type="text"
          value={symbol.name}
          onChange={(event) => onUpdate(symbol.id, { name: event.target.value })}
        />
      </label>

      {symbol.category !== "constant" && (
        <label className="builder-field">
          <span>Type</span>
          <select
            value={symbol.primitiveType ?? "integer"}
            onChange={(event) =>
              onUpdate(symbol.id, { primitiveType: event.target.value as PrimitiveType })
            }
          >
            {PRIMITIVE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
      )}

      {symbol.category === "array" && (
        <label className="builder-field">
          <span>Dimensions</span>
          <input
            type="number"
            min={1}
            value={symbol.dimensions ?? 1}
            onChange={(event) => {
              const parsed = parseInt(event.target.value, 10);
              onUpdate(symbol.id, { dimensions: Number.isNaN(parsed) ? 1 : Math.max(1, parsed) });
            }}
          />
        </label>
      )}

      {symbol.category === "constant" && (
        <label className="builder-field">
          <span>Value</span>
          <input
            type="text"
            value={symbol.value ?? ""}
            onChange={(event) => onUpdate(symbol.id, { value: event.target.value })}
          />
        </label>
      )}

      <button type="button" className="builder-remove-button" onClick={() => onRemove(symbol.id)}>
        Remove
      </button>
    </div>
  );
}
