import type { StateKey } from "./state-key";
import type { ExecutionTrace } from "./trace";

export interface FrozenDpTable {
  readonly size: number;
  get(state: StateKey): number | undefined;
  has(state: StateKey): boolean;
  entries(): IterableIterator<readonly [StateKey, number]>;
  keys(): IterableIterator<StateKey>;
  values(): IterableIterator<number>;
  [Symbol.iterator](): IterableIterator<readonly [StateKey, number]>;
}

export interface ExecutionResult<Input = unknown> {
  readonly trace: ExecutionTrace<Input>;
  readonly dpTable: FrozenDpTable;
}

export function freezeDpTable(table: ReadonlyMap<StateKey, number>): FrozenDpTable {
  const entries = Object.freeze(
    Array.from(table.entries(), ([state, value]) => Object.freeze([state, value] as const))
  );

  const frozenTable: FrozenDpTable = {
    size: entries.length,
    get: (state) => entries.find(([entryState]) => entryState === state)?.[1],
    has: (state) => entries.some(([entryState]) => entryState === state),
    entries: () => entries[Symbol.iterator](),
    keys: function* () {
      for (const [state] of entries) {
        yield state;
      }
    },
    values: function* () {
      for (const [, value] of entries) {
        yield value;
      }
    },
    [Symbol.iterator]: () => entries[Symbol.iterator]()
  };

  return Object.freeze(frozenTable);
}
