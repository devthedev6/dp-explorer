import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  BoundsEditor,
  BuilderProvider,
  SpecificationBuilderPage,
  StateEditor,
  SymbolsEditor,
  useBuilderState
} from "../src/builder";

function StateProbe() {
  const state = useBuilderState();
  return (
    <pre data-testid="state-probe">
      {state.symbols.length} symbols | {state.state.dimensionCount}D |{" "}
      {state.state.variables
        .map((v) => `${v.name}:${v.lowerBoundExpression}:${v.upperBoundExpression}`)
        .join(",")}
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
