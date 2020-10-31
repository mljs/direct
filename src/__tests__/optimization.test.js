import Direct from '../index';
import antiLowerConvexHull from '../util/antiLowerConvexHull';
// Test functions from https://www.sfu.ca/~ssurjano/optimization.html

describe('test Direct method', () => {
  it('Evaluating griewank test function in 3D', () => {
    const options = {
      iterations: 25,
    };
    const lowerBoundaries = [-5, -3, -2];
    const upperBoundaries = [4, 2, 1];

    const predicted = Direct(
      griewank,
      lowerBoundaries,
      upperBoundaries,
      options,
    );

    // Theoric result
    const optimum = [0, 0, 0];
    const minValue = 0;

    const predictedMinValue = predicted.minFunctionValue;
    const predictedOptimum = Array.from(predicted.optimum[0]);
    expect(predictedOptimum[0]).toBeCloseTo(optimum[0], 3);
    expect(predictedOptimum[1]).toBeCloseTo(optimum[1], 3);
    expect(predictedOptimum[2]).toBeCloseTo(optimum[2], 3);
    expect(predictedMinValue).toBeCloseTo(minValue, 7);
  });

  it('Evaluating rastrigin test function in 3D', () => {
    const options = {
      iterations: 25,
    };
    const lowerBoundaries = [-5, -1, -2];
    const upperBoundaries = [4, 2, 1];

    const predicted = Direct(
      rastrigin,
      lowerBoundaries,
      upperBoundaries,
      options,
    );

    // Theoric result
    const optimum = [0, 0, 0];
    const minValue = 0;

    const predictedMinValue = predicted.minFunctionValue;
    const predictedOptimum = Array.from(predicted.optimum[0]);
    expect(predictedOptimum[0]).toBeCloseTo(optimum[0], 3);
    expect(predictedOptimum[1]).toBeCloseTo(optimum[1], 3);
    expect(predictedOptimum[2]).toBeCloseTo(optimum[2], 3);
    expect(predictedMinValue).toBeCloseTo(minValue, 4);
  });
});

describe('testing lower convexhull function', () => {
  it('Get anti clockwise lower convex hull', () => {
    const x = [[1], [1], [2], [3], [4], [4], [2]];
    const y = [[2], [4], [7], [6], [4], [3], [0]];
    const lowerConvexHull = antiLowerConvexHull(x, y);
    expect(lowerConvexHull).toStrictEqual([0, 6, 5]);
  });
});

function griewank(x) {
  let d = x.length;
  let s = 0;
  let p = 1;
  for (let i = 0; i < d; i++) {
    s += Math.pow(x[i], 2) / Math.sqrt(4000);
    p *= Math.cos(x[i] / Math.sqrt(i + 1));
  }
  let result = s - p + 1;
  return result;
}

function rastrigin(x) {
  let d = x.length;
  let s = 0;
  for (let i = 0; i < d; i++) {
    s += Math.pow(x[i], 2) - 10 * Math.cos(2 * Math.PI * x[i]);
  }
  let result = 10 * d + s;
  return result;
}
