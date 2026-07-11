import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  AnswerEditor,
  BaseCasesEditor,
  BoundsEditor,
  BuilderProvider,
  ExpressionLanguageReference,
  InitialValueEditor,
  ReviewCompileStage,
  RootStateEditor,
  SpecificationBuilderPage,
  StateEditor,
  SymbolsEditor,
  TransitionsEditor,
  useBuilderCompilation,
  useBuilderState
} from "../src/builder";

function StateProbe() {
  const state = useBuilderState();
  return (
    <pre data-testid="state-probe">
      {state.symbols.length} symbols | {state.state.dimensionCount}D |{" "}
      {state.state.variables
        .map((v) => `${v.name}:${v.lowerBoundExpression}:${v.upperBoundExpression}`)
        .join(",")}{" "}
      | {state.baseCases.length} bases | {state.transitions.length} transitions |{" "}
      {state.rootStateExpression} | {state.answerExpression}
    </pre>
  );
}

function CompilationProbe() {
  const compilation = useBuilderCompilation();
  return (
    <pre data-testid="compilation-probe">
      {compilation.status} | {compilation.problemSpec?.name ?? "none"} |{" "}
      {compilation.diagnostics.length} diagnostics
    </pre>
  );
}

describe("SpecificationBuilderPage", () => {
  it("renders the wizard with the first stage active", () => {
    render(<SpecificationBuilderPage onExit={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Specification Builder" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Symbols" })).toBeDefined();
  });

  it("navigates to the next and previous stages", () => {
    render(<SpecificationBuilderPage onExit={vi.fn()} />);

    const nextButton = screen.getByRole("button", { name: /next/i });
    const previousButton = screen.getByRole("button", { name: /previous/i });

    expect(previousButton.matches("[disabled]")).toBe(true);

    fireEvent.click(nextButton);
    expect(screen.getByRole("heading", { name: "State Definition" })).toBeDefined();
    expect(previousButton.matches("[disabled]")).toBe(false);

    fireEvent.click(previousButton);
    expect(screen.getByRole("heading", { name: "Symbols" })).toBeDefined();
  });

  it("calls onExit when the exit button is clicked", () => {
    const onExit = vi.fn();
    render(<SpecificationBuilderPage onExit={onExit} />);

    fireEvent.click(screen.getByRole("button", { name: /exit builder/i }));

    expect(onExit).toHaveBeenCalledTimes(1);
  });
});

describe("SymbolsEditor", () => {
  it("adds, edits, and removes primitive symbols", () => {
    render(
      <BuilderProvider>
        <SymbolsEditor />
        <StateProbe />
      </BuilderProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: /add primitive/i }));
    expect(screen.getByTestId("state-probe").textContent).toContain("3 symbols");

    const nameInputs = screen.getAllByLabelText(/^Name$/i);
    fireEvent.change(nameInputs[nameInputs.length - 1], { target: { value: "capacity" } });
    expect(screen.getByDisplayValue("capacity")).toBeDefined();

    fireEvent.click(screen.getAllByRole("button", { name: /remove/i })[0]);
    expect(screen.getByTestId("state-probe").textContent).toContain("2 symbols");
  });

  it("adds arrays with configurable dimensions", () => {
    render(
      <BuilderProvider>
        <SymbolsEditor />
        <StateProbe />
      </BuilderProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: /add array/i }));
    expect(screen.getByTestId("state-probe").textContent).toContain("3 symbols");

    const dimensionsInputs = screen.getAllByLabelText(/^Dimensions$/i);
    fireEvent.change(dimensionsInputs[dimensionsInputs.length - 1], { target: { value: "3" } });
    expect(screen.getByDisplayValue("3")).toBeDefined();
  });

  it("adds and edits constants", () => {
    render(
      <BuilderProvider>
        <SymbolsEditor />
        <StateProbe />
      </BuilderProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: /add constant/i }));

    const valueInputs = screen.getAllByLabelText(/^Value$/i);
    fireEvent.change(valueInputs[valueInputs.length - 1], { target: { value: "1000000007" } });
    expect(screen.getAllByDisplayValue("1000000007").length).toBeGreaterThanOrEqual(1);
  });
});

describe("StateEditor", () => {
  it("updates dimensions and state variable names", () => {
    render(
      <BuilderProvider>
        <StateEditor />
        <StateProbe />
      </BuilderProvider>
    );

    fireEvent.change(screen.getByLabelText(/Number of DP dimensions/i), { target: { value: "2" } });
    expect(screen.getByTestId("state-probe").textContent).toContain("2D");

    const nameInputs = screen.getAllByLabelText(/^State variable \d+ name$/i);
    expect(nameInputs).toHaveLength(2);

    fireEvent.change(nameInputs[1], { target: { value: "j" } });
    expect(screen.getByTestId("state-probe").textContent).toContain("j");
  });

  it("updates state meaning", () => {
    render(
      <BuilderProvider>
        <StateEditor />
        <StateProbe />
      </BuilderProvider>
    );

    fireEvent.change(screen.getByLabelText(/State meaning/i), {
      target: { value: "dp[i][j] means LCS length." }
    });
    expect(screen.getByDisplayValue("dp[i][j] means LCS length.")).toBeDefined();
  });
});

describe("BoundsEditor", () => {
  it("renders bound editors for each state variable", () => {
    render(
      <BuilderProvider>
        <StateEditor />
        <BoundsEditor />
      </BuilderProvider>
    );

    fireEvent.change(screen.getByLabelText(/Number of DP dimensions/i), { target: { value: "2" } });

    const lowerBounds = screen.getAllByLabelText(/^Lower Bound$/i);
    const upperBounds = screen.getAllByLabelText(/^Upper Bound$/i);

    expect(lowerBounds).toHaveLength(2);
    expect(upperBounds).toHaveLength(2);
  });

  it("updates bounds through BuilderState", () => {
    render(
      <BuilderProvider>
        <StateEditor />
        <BoundsEditor />
        <StateProbe />
      </BuilderProvider>
    );

    fireEvent.change(screen.getByLabelText(/^Upper Bound$/i), { target: { value: "n" } });
    expect(screen.getByTestId("state-probe").textContent).toContain(":0:n");
  });
});

describe("BaseCasesEditor", () => {
  it("adds, edits, and removes base cases", () => {
    render(
      <BuilderProvider>
        <BaseCasesEditor />
        <StateProbe />
      </BuilderProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: /add base case/i }));
    expect(screen.getByTestId("state-probe").textContent).toContain("3 bases");

    const conditionInputs = screen.getAllByLabelText(/^Condition$/i);
    fireEvent.change(conditionInputs[conditionInputs.length - 1], { target: { value: "k == 0" } });
    expect(screen.getAllByDisplayValue("k == 0").length).toBeGreaterThanOrEqual(1);

    fireEvent.click(screen.getAllByRole("button", { name: /remove/i })[0]);
    expect(screen.getByTestId("state-probe").textContent).toContain("2 bases");
  });
});

describe("TransitionsEditor", () => {
  it("adds, edits, and removes transitions", () => {
    render(
      <BuilderProvider>
        <TransitionsEditor />
        <StateProbe />
      </BuilderProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: /add transition/i }));
    expect(screen.getByTestId("state-probe").textContent).toContain("2 transitions");

    const expressionInputs = screen.getAllByLabelText(/^Transition Expression$/i);
    fireEvent.change(expressionInputs[expressionInputs.length - 1], {
      target: { value: "min(dp(i) + cost(i, j))" }
    });
    expect(screen.getAllByDisplayValue("min(dp(i) + cost(i, j))").length).toBeGreaterThanOrEqual(1);

    fireEvent.click(screen.getAllByRole("button", { name: /remove/i })[0]);
    expect(screen.getByTestId("state-probe").textContent).toContain("1 transitions");
  });
});

describe("RootStateEditor", () => {
  it("updates the root state expression in BuilderState", () => {
    render(
      <BuilderProvider>
        <RootStateEditor />
        <StateProbe />
      </BuilderProvider>
    );

    fireEvent.change(screen.getByLabelText(/Root State Expression/i), {
      target: { value: "DP(n, m)" }
    });
    expect(screen.getByTestId("state-probe").textContent).toContain("DP(n, m)");
  });
});

describe("AnswerEditor", () => {
  it("updates the answer expression in BuilderState", () => {
    render(
      <BuilderProvider>
        <AnswerEditor />
        <StateProbe />
      </BuilderProvider>
    );

    fireEvent.change(screen.getByLabelText(/Answer Expression/i), {
      target: { value: "max(DP(i))" }
    });
    expect(screen.getByTestId("state-probe").textContent).toContain("max(DP(i))");
  });
});

describe("InitialValueEditor", () => {
  it("updates the initial DP value expression in BuilderState", () => {
    render(
      <BuilderProvider>
        <InitialValueEditor />
        <StateProbe />
      </BuilderProvider>
    );

    fireEvent.change(screen.getByLabelText(/Initial DP Value/i), {
      target: { value: "INF" }
    });

    expect(screen.getByDisplayValue("INF")).toBeDefined();
  });
});

describe("ReviewCompileStage", () => {
  it("renders a JSON preview and an enabled compile button", () => {
    render(
      <BuilderProvider>
        <ReviewCompileStage />
      </BuilderProvider>
    );

    expect(screen.getByText(/"name": "My Custom DP"/i)).toBeDefined();

    const compileButton = screen.getByRole("button", { name: /compile specification/i });
    expect(compileButton.matches("[disabled]")).toBe(false);
    expect(screen.getByText(/not compiled yet/i)).toBeDefined();
  });

  it("stores a ProblemSpec when compilation succeeds", () => {
    render(
      <BuilderProvider initialState={createCompilableBuilderState()}>
        <ReviewCompileStage />
        <CompilationProbe />
      </BuilderProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: /compile specification/i }));

    expect(screen.getByText(/compiled successfully/i)).toBeDefined();
    expect(screen.getByTestId("compilation-probe").textContent).toContain(
      "success | Fibonacci | 0 diagnostics"
    );
    expect(screen.getByRole("button", { name: /run specification/i })).toBeDefined();
  });

  it("displays diagnostics when compilation fails", () => {
    render(
      <BuilderProvider
        initialState={{
          ...createCompilableBuilderState(),
          transitions: [
            {
              id: "transition-1",
              conditionExpression: null,
              valueExpression: "DP(i - 1) +"
            }
          ]
        }}
      >
        <ReviewCompileStage />
        <CompilationProbe />
      </BuilderProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: /compile specification/i }));

    expect(screen.getByText(/compilation failed/i)).toBeDefined();
    expect(screen.getByText("transitions.0.valueExpression")).toBeDefined();
    expect(screen.getByTestId("compilation-probe").textContent).toContain(
      "failure | none | 1 diagnostics"
    );
    expect(screen.queryByRole("button", { name: /run specification/i })).toBeNull();
  });

  it("executes a compiled ProblemSpec through the existing playback UI", () => {
    render(
      <BuilderProvider initialState={createCompilableBuilderState()}>
        <ReviewCompileStage />
      </BuilderProvider>
    );

    expect(screen.queryByRole("button", { name: /run specification/i })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /compile specification/i }));
    fireEvent.change(screen.getByLabelText(/^n$/i), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: /run specification/i }));

    expect(screen.getByTestId("recursion-tree")).toBeDefined();
    const answerPanel = screen.getByLabelText(/execution answer/i);
    expect(within(answerPanel).getByRole("heading", { name: "Answer" })).toBeDefined();
    expect(within(answerPanel).getByText("2")).toBeDefined();
    expect(screen.getByRole("heading", { name: "DP table" })).toBeDefined();
    expect(screen.getByText(/Current event/i)).toBeDefined();
    expect(screen.getByTestId("timeline-position").textContent).toContain("1 /");

    fireEvent.click(screen.getByRole("button", { name: /^next$/i }));
    expect(screen.getByTestId("timeline-position").textContent).toContain("2 /");

    fireEvent.click(screen.getByRole("button", { name: /^reset$/i }));
    expect(screen.getByTestId("timeline-position").textContent).toContain("1 /");
  });
});

describe("ExpressionLanguageReference", () => {
  it("is available on every expression entry stage", () => {
    const expressionEditors = [
      <BoundsEditor key="bounds" />,
      <BaseCasesEditor key="base-cases" />,
      <TransitionsEditor key="transitions" />,
      <RootStateEditor key="root-state" />,
      <AnswerEditor key="answer" />
    ];

    for (const editor of expressionEditors) {
      const { unmount } = render(<BuilderProvider>{editor}</BuilderProvider>);
      expect(
        screen.getByRole("button", { name: /show expression language reference/i })
      ).toBeDefined();
      unmount();
    }
  });

  it("toggles the reference panel on and off", () => {
    render(<ExpressionLanguageReference />);

    const toggle = screen.getByRole("button", { name: /show expression language reference/i });
    expect(toggle).toBeDefined();
    expect(screen.queryByText(/Arithmetic Operators/i)).toBeNull();

    fireEvent.click(toggle);
    expect(screen.getByText(/Arithmetic Operators/i)).toBeDefined();
    expect(screen.getByText(/Bitwise Operators/i)).toBeDefined();
    expect(screen.getByText(/Comparison Operators/i)).toBeDefined();
    expect(screen.getByText(/Logical Operators/i)).toBeDefined();
    expect(screen.getByText(/Aggregate Functions/i)).toBeDefined();
    expect(screen.getByText(/Built-in Functions/i)).toBeDefined();
    expect(screen.getByText(/DP State Access/i)).toBeDefined();
    expect(screen.getByText(/Arrays/i)).toBeDefined();
    expect(screen.getByText(/Constants/i)).toBeDefined();
    expect(screen.getByText(/Common DP Examples/i)).toBeDefined();
    expect(screen.getByText(/Currently Unsupported/i)).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /hide expression language reference/i }));
    expect(screen.queryByText(/Arithmetic Operators/i)).toBeNull();
  });

  it("renders the bitwise XOR note", () => {
    render(<ExpressionLanguageReference />);
    fireEvent.click(screen.getByRole("button", { name: /show expression language reference/i }));
    expect(screen.getByText(/Use bitXor\(a, b\) for bitwise XOR/i)).toBeDefined();
  });

  it("explains DP state access and realistic DP expressions", () => {
    render(<ExpressionLanguageReference />);
    fireEvent.click(screen.getByRole("button", { name: /show expression language reference/i }));

    expect(screen.getByText(/Reference DP states with/i)).toBeDefined();
    expect(screen.getByText(/normal array access/i)).toBeDefined();
    expect(screen.getByText(/DP\(i,j,k,l\)/i)).toBeDefined();
    expect(screen.getByText("max(DP(i-1,j), DP(i,j-1))")).toBeDefined();
    expect(screen.getByText("DP(i,j) + grid[i][j]")).toBeDefined();
    expect(screen.getByText("popcount(...)")).toBeDefined();
  });
});

function createCompilableBuilderState() {
  return {
    metadata: {
      name: "Fibonacci",
      description: "Generated Fibonacci specification"
    },
    symbols: [
      {
        id: "symbol-n",
        name: "n",
        category: "primitive",
        primitiveType: "integer"
      }
    ],
    state: {
      dimensionCount: 1,
      variables: [
        {
          name: "i",
          lowerBoundExpression: "0",
          upperBoundExpression: "n"
        }
      ],
      meaning: "dp[i]"
    },
    baseCases: [
      {
        id: "base-0",
        conditionExpression: "i == 0",
        valueExpression: "0"
      },
      {
        id: "base-1",
        conditionExpression: "i == 1",
        valueExpression: "1"
      }
    ],
    transitions: [
      {
        id: "transition-1",
        conditionExpression: null,
        valueExpression: "DP(i - 1) + DP(i - 2)"
      }
    ],
    rootStateExpression: "DP(n)",
    answerExpression: "DP(n)",
    executionMode: "top-down"
  } as const;
}
