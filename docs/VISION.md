# Vision

## Mission

Make Dynamic Programming intuitive by allowing users to observe every state,
transition, and decision made by an algorithm.

Rather than teaching recurrence relations directly, DP Explorer teaches the
reasoning process behind them.

## Target Audience

- Beginners learning DP
- Competitive programmers
- Teachers and mentors
- Anyone interested in algorithm visualization

## Educational Philosophy

The project visualizes execution, not just results.

The learner should understand:

- what each state represents,
- why transitions exist,
- when memoization occurs,
- how values propagate,
- and how the final answer emerges.

## Two lenses, one problem

Every built-in problem can be watched in two execution modes without
changing the underlying specification:

- **Top-down (memoized recursion)** — shows _why_ a state is needed, via a
  call tree. Good for building recursive intuition and seeing memoization
  fire.
- **Bottom-up (tabulation)** — shows the table filling in dependency order.
  Good for seeing DP as "build small answers into bigger ones."

Letting a learner toggle between the two for the same input is intended to
be one of the project's sharpest teaching moments — most DP resources only
ever show one or the other.
