# DP Explorer Vision

## Why DP Explorer Exists

Most Dynamic Programming visualizers are collections of hardcoded animations for a handful of classical problems.

DP Explorer is intended to become a **generic Dynamic Programming visualization framework**.

The long-term goal is not to visualize Fibonacci or LCS.

The long-term goal is to visualize **any Dynamic Programming formulation**, including user-defined problems.

---

# Version Roadmap

## Version 1.0 — Generic DP Visualization Framework

Goal:

Prove that a single execution engine can visualize many different classes of Dynamic Programming problems without changing the visualization layer.

### Features

- Generic ProblemSpec abstraction
- Generic top-down execution engine
- Generic bottom-up execution engine
- Immutable execution traces
- Playback engine
- Timeline
- DP table visualization
- Recursion tree visualization
- Algorithm formulation panel
- Multiple built-in DP templates

### Supported DP Families

- Fibonacci
- Longest Common Subsequence
- Edit Distance
- 0/1 Knapsack
- Coin Change
- Grid DP
- (Additional classical templates)

At this stage, templates are implemented manually as ProblemSpec objects.

The purpose of Version 1 is to validate the architecture.
A known architecture limitation is that the current framework assumes a unique answer state.

---

## Version 1.5 — ProblemSpec Builder

Goal:

Allow users to define their own Dynamic Programming formulations without writing TypeScript.

Instead of selecting only predefined templates, users should be able to build their own ProblemSpec interactively.

Examples of configurable concepts include:

- State variables
- State dimensions
- Base cases
- Transition rules
- Execution mode
- State descriptions
- Complexity metadata

The builder should generate a valid ProblemSpec that can immediately be visualized by the existing execution engine.

No parser or DSL is introduced at this stage.

The objective is to validate that the execution engine is expressive enough for user-authored problems.

---

## Version 2.0 — DP Specification Language (DSL)

Goal:

Replace the visual ProblemSpec Builder with a dedicated declarative language.

Users should be able to describe Dynamic Programming formulations using a concise textual syntax.

Example (illustrative only):

state(i, j)

base:
i == 0 || j == 0 -> 0

transition:
if a[i] == b[j]:
1 + dp(i-1, j-1)
else:
max(
dp(i-1, j),
dp(i, j-1)
)

The DSL compiler will generate a ProblemSpec automatically.

This version focuses on parsing, validation, dependency analysis, and code generation.

---

## Version 3.0+ — AI-Assisted DP Authoring

Goal:

Allow users to describe Dynamic Programming problems in natural language.

Examples:

> Find the minimum operations required to transform one string into another.

or

> Count the number of valid arrangements of red and blue balls with streak constraints.

The LLM should:

- identify the DP state
- infer dimensions
- derive transitions
- identify base cases
- generate a ProblemSpec
- optionally generate the DSL representation

Future AI capabilities may also include:

- contextual explanations
- proof intuition
- recurrence derivation
- optimization suggestions
- alternate state formulations
- interview guidance

The visualization engine itself should remain deterministic and independent of the LLM.

The AI layer exists only to assist in generating ProblemSpecs.

---

# Design Philosophy

DP Explorer separates Dynamic Programming into independent layers.

Problem Definition

↓

Execution

↓

Trace Generation

↓

Playback

↓

Visualization

↓

Explanation

Each layer should remain replaceable without affecting the others.

The visualization should never execute DP logic.

The execution engine should never contain UI code.

The AI layer should never become part of the execution engine.

---

# End Goal

The ultimate objective of DP Explorer is to become a platform where users can define, understand, execute, and visualize arbitrary Dynamic Programming formulations—from textbook problems to original competitive programming ideas—using a common execution framework.
