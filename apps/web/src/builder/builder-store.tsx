import { createContext, useContext, useReducer, type ReactNode } from "react";
import type { CompilerDiagnostic } from "@dp-explorer/spec-compiler";
import type { FunctionalProblemSpec } from "@dp-explorer/core";
import type {
  BuilderBaseCase,
  BuilderState,
  BuilderStateVariable,
  BuilderSymbol,
  BuilderTransition,
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
    }
  | { readonly type: "ADD_BASE_CASE" }
  | { readonly type: "REMOVE_BASE_CASE"; readonly id: string }
  | {
      readonly type: "UPDATE_BASE_CASE";
      readonly id: string;
      readonly updates: Partial<BuilderBaseCase>;
    }
  | { readonly type: "ADD_TRANSITION" }
  | { readonly type: "REMOVE_TRANSITION"; readonly id: string }
  | {
      readonly type: "UPDATE_TRANSITION";
      readonly id: string;
      readonly updates: Partial<BuilderTransition>;
    }
  | {
      readonly type: "SET_ROOT_STATE_EXPRESSION";
      readonly expression: string;
    }
  | {
      readonly type: "SET_INITIAL_VALUE_EXPRESSION";
      readonly expression: string;
    }
  | {
      readonly type: "SET_ANSWER_EXPRESSION";
      readonly expression: string;
    }
  | {
      readonly type: "COMPILE_SUCCESS";
      readonly problemSpec: FunctionalProblemSpec<Record<string, unknown>>;
    }
  | {
      readonly type: "COMPILE_FAILURE";
      readonly diagnostics: readonly CompilerDiagnostic[];
    };

export type CompilationStatus = "idle" | "success" | "failure";

export interface BuilderCompilationState {
  readonly status: CompilationStatus;
  readonly problemSpec: FunctionalProblemSpec<Record<string, unknown>> | null;
  readonly diagnostics: readonly CompilerDiagnostic[];
}

export interface BuilderStore {
  readonly builderState: BuilderState;
  readonly compilation: BuilderCompilationState;
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

function createEmptyBaseCase(): BuilderBaseCase {
  return { id: createId(), conditionExpression: "", valueExpression: "" };
}

function createEmptyTransition(): BuilderTransition {
  return { id: createId(), conditionExpression: null, valueExpression: "" };
}

function createInitialCompilationState(): BuilderCompilationState {
  return {
    status: "idle",
    problemSpec: null,
    diagnostics: []
  };
}

interface BuilderReducerState {
  readonly builderState: BuilderState;
  readonly compilation: BuilderCompilationState;
}

function normalizeStateVariables(
  variables: readonly BuilderStateVariable[],
  dimensionCount: number
): BuilderStateVariable[] {
  const next = variables.slice(0, dimensionCount);
  const names = ["i", "j", "k", "l", "m"];
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

function clampDimensionCount(count: number): number {
  return Math.min(5, Math.max(1, Math.floor(count)));
}

function normalizeRootStateExpression(builderState: BuilderState, dimensionCount: number): string {
  const coordinates = readRootStateCoordinates(builderState.rootStateExpression);
  const nextVariables = normalizeStateVariables(builderState.state.variables, dimensionCount);
  const nextCoordinates = Array.from({ length: dimensionCount }, (_, index) => {
    const existing = coordinates[index];
    if (existing !== undefined && existing.trim() !== "") {
      return existing;
    }

    const variable = nextVariables[index];
    return variable?.upperBoundExpression.trim() || variable?.name || "0";
  });

  if (dimensionCount === 1) {
    return nextCoordinates[0] ?? "0";
  }

  return `DP(${nextCoordinates.join(", ")})`;
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

function withBuilderState(builderState: BuilderState): BuilderReducerState {
  return {
    builderState,
    compilation: createInitialCompilationState()
  };
}

function builderReducer(state: BuilderReducerState, action: BuilderAction): BuilderReducerState {
  switch (action.type) {
    case "RESET":
      return withBuilderState(createDefaultBuilderState());
    case "SET_STATE":
      return withBuilderState(action.state);
    case "UPDATE_STATE":
      return withBuilderState({ ...state.builderState, ...action.partial });
    case "UPDATE_STAGE_FIELD":
      return withBuilderState({ ...state.builderState, [action.stage]: action.value });
    case "ADD_SYMBOL":
      return withBuilderState({
        ...state.builderState,
        symbols: [...state.builderState.symbols, createEmptySymbol(action.category)]
      });
    case "REMOVE_SYMBOL":
      return withBuilderState({
        ...state.builderState,
        symbols: state.builderState.symbols.filter((symbol) => symbol.id !== action.id)
      });
    case "UPDATE_SYMBOL":
      return withBuilderState({
        ...state.builderState,
        symbols: state.builderState.symbols.map((symbol) =>
          symbol.id === action.id ? { ...symbol, ...action.updates } : symbol
        )
      });
    case "SET_DIMENSION_COUNT": {
      const dimensionCount = clampDimensionCount(action.count);
      const variables = normalizeStateVariables(state.builderState.state.variables, dimensionCount);
      const nextState = {
        ...state.builderState,
        state: {
          ...state.builderState.state,
          dimensionCount,
          variables
        }
      };
      return withBuilderState({
        ...nextState,
        rootStateExpression: normalizeRootStateExpression(nextState, dimensionCount)
      });
    }
    case "SET_STATE_MEANING":
      return withBuilderState({
        ...state.builderState,
        state: { ...state.builderState.state, meaning: action.meaning }
      });
    case "UPDATE_STATE_VARIABLE":
      return withBuilderState({
        ...state.builderState,
        state: {
          ...state.builderState.state,
          variables: state.builderState.state.variables.map((variable, index) =>
            index === action.index ? { ...variable, ...action.updates } : variable
          )
        }
      });
    case "ADD_BASE_CASE":
      return withBuilderState({
        ...state.builderState,
        baseCases: [...state.builderState.baseCases, createEmptyBaseCase()]
      });
    case "REMOVE_BASE_CASE":
      return withBuilderState({
        ...state.builderState,
        baseCases: state.builderState.baseCases.filter((item) => item.id !== action.id)
      });
    case "UPDATE_BASE_CASE":
      return withBuilderState({
        ...state.builderState,
        baseCases: state.builderState.baseCases.map((item) =>
          item.id === action.id ? { ...item, ...action.updates } : item
        )
      });
    case "ADD_TRANSITION":
      return withBuilderState({
        ...state.builderState,
        transitions: [...state.builderState.transitions, createEmptyTransition()]
      });
    case "REMOVE_TRANSITION":
      return withBuilderState({
        ...state.builderState,
        transitions: state.builderState.transitions.filter((item) => item.id !== action.id)
      });
    case "UPDATE_TRANSITION":
      return withBuilderState({
        ...state.builderState,
        transitions: state.builderState.transitions.map((item) =>
          item.id === action.id ? { ...item, ...action.updates } : item
        )
      });
    case "SET_ROOT_STATE_EXPRESSION":
      return withBuilderState({
        ...state.builderState,
        rootStateExpression: action.expression
      });
    case "SET_INITIAL_VALUE_EXPRESSION":
      return withBuilderState({
        ...state.builderState,
        initialValueExpression: action.expression
      });
    case "SET_ANSWER_EXPRESSION":
      return withBuilderState({
        ...state.builderState,
        answerExpression: action.expression
      });
    case "COMPILE_SUCCESS":
      return {
        ...state,
        compilation: {
          status: "success",
          problemSpec: action.problemSpec,
          diagnostics: []
        }
      };
    case "COMPILE_FAILURE":
      return {
        ...state,
        compilation: {
          status: "failure",
          problemSpec: null,
          diagnostics: action.diagnostics
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
  const [state, dispatch] = useReducer(builderReducer, {
    builderState: initialState ?? createDefaultBuilderState(),
    compilation: createInitialCompilationState()
  });
  return (
    <BuilderContext.Provider
      value={{ builderState: state.builderState, compilation: state.compilation, dispatch }}
    >
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

export function useBuilderCompilation(): BuilderCompilationState {
  const store = useContext(BuilderContext);
  if (store === null) {
    throw new Error("useBuilderCompilation must be used within a BuilderProvider.");
  }
  return store.compilation;
}

export function useBuilderDispatch(): (action: BuilderAction) => void {
  const store = useContext(BuilderContext);
  if (store === null) {
    throw new Error("useBuilderDispatch must be used within a BuilderProvider.");
  }
  return store.dispatch;
}

export { type PrimitiveType };
