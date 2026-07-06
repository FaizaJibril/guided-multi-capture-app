// Exponential moving average helper used to smooth the per-frame pose score
// so the guiding<->validating transition doesn't flicker at the 0.85 boundary.
// See guided-multi-capture-spec.md Section 3/4 ("[REVISED] Note on weights").

export function createEma(alpha: number, initial = 0) {
  let value = initial;
  let initialized = false;

  return {
    next(sample: number): number {
      if (!initialized) {
        value = sample;
        initialized = true;
      } else {
        value = alpha * sample + (1 - alpha) * value;
      }
      return value;
    },
    reset(resetValue = 0) {
      value = resetValue;
      initialized = false;
    },
    get current() {
      return value;
    },
  };
}
