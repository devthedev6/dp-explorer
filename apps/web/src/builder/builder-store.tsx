import { createContext, useContext, useReducer, type ReactNode } from "react";
import type {
  BuilderState,
  BuilderStateVariable,
  BuilderSymbol,
  PrimitiveType
} from "./builder-state";
import { createDefaultBuilderState } from "./builder-state";

export type BuilderAction =
  | { readonly type: "RESET" }
  | { readonly type: "SET_STATE"; readonly state: BuilderState }
  | {
      readonly type: "UPDATE_STATE";
      readonly partial: Partial<BuilderState>;
    }
  | {
      readonly type: "UPDATE_STAGE_FIELD";
      readonly stage: keyof BuilderState;
      readonly value: unknown;
    }
  | { readonly type: "ADD_SYMBOL"; readonly category: BuilderSymbol["category"] }
  | { readonly type: "REMOVE_SYMBOL"; readonly id: string }
  | {
      readonly type: "UPDATE_SYMBOL";
      readonly id: string;
      readonly updates: Partial<BuilderSymbol>;
    }
  | {
      readonly type: "SET_DIMENSION_COUNT";
      readonly count: number;
    }
  | {
      readonly type: "SET_STATE_MEANING";
      readonly meaning: string;
    }
  | {
      readonly type: "UPDATE_STATE_VARIABLE";
      readonly index: number;
      readonly updates: Partial<BuilderStateVariable>;
    };

export interface BuilderStore {
  readonly builderState: BuilderState;
  readonly dispatch: (action: BuilderAction) => void;
}

const BuilderContext = createContext<BuilderStore | null>(null);

function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function createEmptySymbol(category: BuilderSymbol["category"]): BuilderSymbol {
  if (category === "primitive") {
    return { id: createId(), name: "", category, primitiveType: "integer" };
  }
  if (category === "array") {
    return { id: createId(), name: "", category, primitiveType: "integer", dimensions: 1 };
  }
  return { id: createId(), name: "", category, value: "" };
}

function normalizeStateVariables(
  variables: readonly BuilderStateVariable[],
  dimensionCount: number
): BuilderStateVariable[] {
  const next = variables.slice(0, dimensionCount);
  const names = ["i", "j", "k"];
  while (next.length < dimensionCount) {
    next.push({
      name: names[next.length] ?? `v${next.length + 1}`,
      lowerBoundExpression: "0",
      upperBoundExpression: "",
      description: ""
    });
  }
  return next;
}

function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case "RESET":
      return createDefaultBuilderState();
    case "SET_STATE":
      return action.state;
    case "UPDATE_STATE":
      return { ...state, ...action.partial };
    case "UPDATE_STAGE_FIELD":
      return { ...state, [action.stage]: action.value };
    case "ADD_SYMBOL":
      return { ...state, symbols: [...state.symbols, createEmptySymbol(action.category)] };
    case "REMOVE_SYMBOL":
      return { ...state, symbols: state.symbols.filter((symbol) => symbol.id !== action.id) };
    case "UPDATE_SYMBOL":
      return {
        ...state,
        symbols: state.symbols.map((symbol) =>
          symbol.id === action.id ? { ...symbol, ...action.updates } : symbol
        )
      };
    case "SET_DIMENSION_COUNT":
      return {
        ...state,
        state: {
          ...state.state,
          dimensionCount: action.count,
          variables: normalizeStateVariables(state.state.variables, action.count)
        }
      };
    case "SET_STATE_MEANING":
      return {
        ...state,
        state: { ...state.state, meaning: action.meaning }
      };
    case "UPDATE_STATE_VARIABLE":
      return {
        ...state,
        state: {
          ...state.state,
          variables: state.state.variables.map((variable, index) =>
            index === action.index ? { ...variable, ...action.updates } : variable
          )
        }
      };
    default:
      return state;
  }
}

export interface BuilderProviderProps {
  readonly children: ReactNode;
  readonly initialState?: BuilderState;
}

export function BuilderProvider({ children, initialState }: BuilderProviderProps) {
  const [state, dispatch] = useReducer(builderReducer, initialState ?? createDefaultBuilderState());
  return (
    <BuilderContext.Provider value={{ builderState: state, dispatch }}>
      {children}
    </BuilderContext.Provider>
  );
}

export function useBuilderState(): BuilderState {
  const store = useContext(BuilderContext);
  if (store === null) {
    throw new Error("useBuilderState must be used within a BuilderProvider.");
  }
  return store.builderState;
}

export function useBuilderDispatch(): (action: BuilderAction) => void {
  const store = useContext(BuilderContext);
  if (store === null) {
    throw new Error("useBuilderDispatch must be used within a BuilderProvider.");
  }
  return store.dispatch;
}

export { type PrimitiveType };
