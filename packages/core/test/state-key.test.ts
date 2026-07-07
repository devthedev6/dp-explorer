import { describe, expect, it } from "vitest";

import { parseStateKey, toStateKey } from "../src";

describe("StateKey", () => {
  it("serializes coordinate vectors with the canonical comma separator", () => {
    expect(toStateKey([3, 7, 12])).toBe("3,7,12");
  });

  it("parses a state key back into coordinates", () => {
    expect(parseStateKey(toStateKey([4, 0, 9]))).toEqual([4, 0, 9]);
  });
});
