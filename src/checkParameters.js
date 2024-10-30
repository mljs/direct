export function checkParameters(objectiveFunction, lowerBoundaries, upperBoundaries) {
  if (typeof objectiveFunction !== 'function') {
    throw new TypeError('objectiveFunction should be a function');
  }

  if (!Array.isArray(lowerBoundaries) || !Array.isArray(upperBoundaries)) {
    throw new TypeError('Boundaries should be an array');
  }

  if (lowerBoundaries.length !== upperBoundaries.length) {
    throw new RangeError('Boundaries should have the same length');
  }
  for (let i = 0; i < lowerBoundaries.length; i++) {
    if (lowerBoundaries[i] >= upperBoundaries[i]) {
      throw new RangeError('Upper boundaries should be greater than lower boundaries');
    }
  }
}
