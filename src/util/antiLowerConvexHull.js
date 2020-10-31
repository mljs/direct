import monotoneChainConvexHull from 'monotone-chain-convex-hull';

export default function antiLowerConvexHull(x, y) {
  x = x.map((item) => item[0]); // remove
  y = y.map((item) => item[0]); // remove
  const pairs = new Array(x.length)
    .fill()
    .map((value, index) => (value = [x[index], y[index]]));
  const convexHull = monotoneChainConvexHull(pairs);
  const lowerHull = antiClockWiseHull(convexHull);
  return lowerHull;
}

export function antiClockWiseHull(convexHull, options = {}) {
  const { hull = 'lower' } = options;
  let moveQ = true;
  let rightPoint = 0;
  if (convexHull.length > 2) {
    while (moveQ) {
      const difference =
        convexHull[rightPoint + 1][0] - convexHull[rightPoint][0];
      if (difference >= 0) {
        rightPoint++;
      } else {
        moveQ = false;
      }
    }
  }

  let result = [];
  if (hull === 'lower') {
    result[0] = 0;
    for (let i = 1; i < convexHull.length - rightPoint + 1; i++) {
      result[i] = convexHull.length - i;
    }
  } else if (hull === 'upper') {
    for (let i = 0; i < rightPoint + 1; i++) {
      result[i] = rightPoint - i;
    }
  } else {
    throw new RangeError(`Hull option ${hull} not implemented`);
  }
  return result;
}
