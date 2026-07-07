/**
 * Coordinate vector for a DP state.
 *
 * The current architecture intentionally models state as numeric coordinates,
 * not graph or tree node references. This keeps the MVP state model aligned
 * with table-like DP, interval DP, bitmask DP, and other coordinate spaces.
 */
export type StateCoordinates = readonly number[];

/**
 * Canonical identifier for a state, matching the execution trace format.
 *
 * A `StateKey` is the string form of a coordinate vector, such as `"5"` or
 * `"3,7"`. It is branded so arbitrary strings do not silently cross the
 * domain boundary.
 */
export type StateKey = string & { readonly __brand: "StateKey" };

/**
 * Convert coordinate-vector state into the canonical trace key.
 */
export function toStateKey(state: StateCoordinates): StateKey {
  return state.join(",") as StateKey;
}

/**
 * Parse a canonical state key back into its coordinate vector.
 *
 * This helper is deliberately narrow: it understands the MVP coordinate-vector
 * representation only, and does not introduce graph/tree state semantics.
 */
export function parseStateKey(stateKey: StateKey): readonly number[] {
  if (stateKey === "") {
    return [];
  }

  return stateKey.split(",").map(Number);
}
