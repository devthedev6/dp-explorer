# UI Specification

## Design Goals

- Educational before decorative.
- Every panel is synchronized.
- Smooth, deterministic animations.
- Minimal visual clutter.

## Layout

-------------------------------------------------
Problem Description
-------------------------------------------------
Recursion Tree | DP Table
-------------------------------------------------
Explanation Panel
-------------------------------------------------
Timeline + Playback Controls
-------------------------------------------------

## Visual Language

Active recursion branch:
- Orange / deep red glow

Completed branch:
- Soft green

Pruned / dead branch:
- Neutral gray

Current state:
- Bright highlight

Memoization hit:
- Purple accent

Base case:
- Blue accent

The recursion tree should feel inspired by cinematic AI interfaces (Jarvis /
Ultron): dark background, glowing active paths, inactive branches fading into
gray. The visualization should remain clean and readable rather than flashy.

## Interaction

- Play
- Pause
- Previous
- Next
- Jump to frame
- Adjustable playback speed
- Hover tooltips
- Zoom and pan on recursion tree
