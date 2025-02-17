import { xNorm, xMaxValue, xMinValue } from 'ml-spectra-processing';

import { antiLowerConvexHull } from './util/antiLowerConvexHull';

/**
 * Performs a global optimization of required parameters
 * It will return an object containing:
 * - `minFunctionValue`: The minimum value found for the objetive function
 * - `optima`: Array of Array of values for all the variables where the function reach its minimum value
 * - `iterations`: Number of iterations performed in the process
 * - `finalState`: Internal state allowing to continue optimization (initialState)
 * @param {Function} objectiveFunction - Function to evaluate. It should accept an array of variables
 * @param {import('cheminfo-types').NumberArray} lowerBoundaries - Array containing for each variable the lower boundary
 * @param {import('cheminfo-types').NumberArray} upperBoundaries - Array containing for each variable the higher boundary
 * @param {object} [options={}]
 * @param {number} [options.iterations=50] - Number of iterations.
 * @param {number} [options.epsilon=1e-4] - Tolerance to choose best current value.
 * @param {number} [options.tolerance=1e-16] - Minimum tolerance of the function.
 * @param {number} [options.tolerance2=1e-12] - Minimum tolerance of the function.
 * @param {object} [options.initialState={}] - finalState of previous optimization.
 * @returns {object} {finalState, iterations, minFunctionValue}
 */

export function direct(
  objectiveFunction,
  lowerBoundaries,
  upperBoundaries,
  options = {},
) {
  const {
    iterations = 50,
    epsilon = 1e-4,
    tolerance = 1e-16,
    tolerance2 = 1e-12,
    initialState = {},
  } = options;

  if (
    objectiveFunction === undefined ||
    lowerBoundaries === undefined ||
    upperBoundaries === undefined
  ) {
    throw new RangeError('There is something undefined');
  }

  if (lowerBoundaries.length !== upperBoundaries.length) {
    throw new Error(
      'Lower bounds and Upper bounds for x are not of the same length',
    );
  }

  lowerBoundaries = Float64Array.from(lowerBoundaries);
  upperBoundaries = Float64Array.from(upperBoundaries);

  //-------------------------------------------------------------------------
  //                        STEP 1. Initialization
  //-------------------------------------------------------------------------
  let nbParameters = lowerBoundaries.length;
  let diffBoundaries = upperBoundaries.map((x, i) => x - lowerBoundaries[i]);

  let {
    numberOfRectangles = 0,
    totalIterations = 0,
    unitaryCoordinates = [new Float64Array(nbParameters).fill(0.5)],
    middlePoint = new Float64Array(nbParameters).map((value, index) => {
      return (
        lowerBoundaries[index] +
        unitaryCoordinates[0][index] * diffBoundaries[index]
      );
    }),
    bestCurrentValue = objectiveFunction(middlePoint),
    nbFunctionCalls = 1,
    smallerDistance = 0,
    edgeSizes = [new Float64Array(nbParameters).fill(0.5)],
    diagonalDistances = [Math.sqrt(nbParameters * 0.5 ** 2)],
    functionValues = [bestCurrentValue],
    differentDistances = diagonalDistances,
    smallerValuesByDistance = [bestCurrentValue],
    choiceLimit = undefined,
  } = initialState;

  if (typeof bestCurrentValue !== 'number' || Number.isNaN(bestCurrentValue)) {
    throw new Error('The initial value is not a number');
  }

  if (
    initialState.originalCoordinates &&
    initialState.originalCoordinates.length > 0
  ) {
    bestCurrentValue = xMinValue(functionValues);
    choiceLimit = Math.max(epsilon * Math.abs(bestCurrentValue), 1e-8);

    smallerDistance = getMinIndex(
      functionValues,
      diagonalDistances,
      choiceLimit,
      bestCurrentValue,
    );

    unitaryCoordinates = initialState.originalCoordinates.slice();
    for (let j = 0; j < unitaryCoordinates.length; j++) {
      for (let i = 0; i < lowerBoundaries.length; i++) {
        unitaryCoordinates[j][i] =
          (unitaryCoordinates[j][i] - lowerBoundaries[i]) / diffBoundaries[i];
      }
    }
  }

  let iteration = 0;
  //-------------------------------------------------------------------------
  //                          Iteration loop
  //-------------------------------------------------------------------------

  while (iteration < iterations) {
    //----------------------------------------------------------------------
    //  STEP 2. Identify the set S of all potentially optimal rectangles
    //----------------------------------------------------------------------

    let S1 = [];
    let idx = differentDistances.indexOf(diagonalDistances[smallerDistance]);
    let counter = 0;
    for (let i = idx; i < differentDistances.length; i++) {
      for (let f = 0; f < functionValues.length; f++) {
        if (
          functionValues[f] === smallerValuesByDistance[i] &&
          diagonalDistances[f] === differentDistances[i]
        ) {
          S1[counter++] = f;
        }
      }
    }

    let optimumValuesIndex, S3;
    if (differentDistances.length - idx > 1) {
      let a1 = diagonalDistances[smallerDistance];
      let b1 = functionValues[smallerDistance];
      let a2 = differentDistances.at(-1);
      let b2 = smallerValuesByDistance[differentDistances.length - 1];
      let slope = (b2 - b1) / (a2 - a1);
      let constant = b1 - slope * a1;
      let S2 = new Uint32Array(counter);
      counter = 0;
      for (let i = 0; i < S2.length; i++) {
        let j = S1[i];
        if (
          functionValues[j] <=
          slope * diagonalDistances[j] + constant + tolerance2
        ) {
          S2[counter++] = j;
        }
      }

      let xHull = [];
      let yHull = [];
      for (let i = 0; i < counter; i++) {
        xHull.push(diagonalDistances[S2[i]]);
        yHull.push(functionValues[S2[i]]);
      }

      let lowerIndexHull = antiLowerConvexHull(xHull, yHull);

      S3 = [];
      for (let i = 0; i < lowerIndexHull.length; i++) {
        S3.push(S2[lowerIndexHull[i]]);
      }
    } else {
      S3 = S1.slice(0, counter);
    }
    optimumValuesIndex = S3;
    //--------------------------------------------------------------
    // STEPS 3,5: Select any rectangle j in S
    //--------------------------------------------------------------
    for (let k = 0; k < optimumValuesIndex.length; k++) {
      let j = optimumValuesIndex[k];
      let largerSide = xMaxValue(edgeSizes[j]);
      let largeSidesIndex = new Uint32Array(edgeSizes[j].length);
      counter = 0;
      for (let i = 0; i < edgeSizes[j].length; i++) {
        if (Math.abs(edgeSizes[j][i] - largerSide) < tolerance) {
          largeSidesIndex[counter++] = i;
        }
      }
      let delta = (2 * largerSide) / 3;
      let bestFunctionValues = [];
      for (let r = 0; r < counter; r++) {
        let i = largeSidesIndex[r];
        let firstMiddleCenter = unitaryCoordinates[j].slice();
        let secondMiddleCenter = unitaryCoordinates[j].slice();
        firstMiddleCenter[i] += delta;
        secondMiddleCenter[i] -= delta;
        let firstMiddleValue = new Float64Array(firstMiddleCenter.length);
        let secondMiddleValue = new Float64Array(secondMiddleCenter.length);
        for (let i = 0; i < firstMiddleCenter.length; i++) {
          firstMiddleValue[i] =
            lowerBoundaries[i] + firstMiddleCenter[i] * diffBoundaries[i];
          secondMiddleValue[i] =
            lowerBoundaries[i] + secondMiddleCenter[i] * diffBoundaries[i];
        }
        let firstMinValue = objectiveFunction(firstMiddleValue);
        let secondMinValue = objectiveFunction(secondMiddleValue);
        nbFunctionCalls += 2;
        bestFunctionValues.push({
          minValue: Math.min(firstMinValue, secondMinValue),
          index: r,
        });
        // [Math.min(firstMinValue, secondMinValue), r];
        unitaryCoordinates.push(firstMiddleCenter, secondMiddleCenter);
        functionValues.push(firstMinValue, secondMinValue);
      }

      let b = bestFunctionValues.sort((a, b) => a.minValue - b.minValue);
      for (let r = 0; r < counter; r++) {
        let u = largeSidesIndex[b[r].index];
        let ix1 = numberOfRectangles + 2 * (b[r].index + 1) - 1;
        let ix2 = numberOfRectangles + 2 * (b[r].index + 1);
        edgeSizes[j][u] = delta / 2;
        edgeSizes[ix1] = edgeSizes[j].slice();
        edgeSizes[ix2] = edgeSizes[j].slice();
        diagonalDistances[j] = xNorm(edgeSizes[j]);
        diagonalDistances[ix1] = diagonalDistances[j];
        diagonalDistances[ix2] = diagonalDistances[j];
      }
      numberOfRectangles += 2 * counter;
    }

    //--------------------------------------------------------------
    //                  Update
    //--------------------------------------------------------------

    bestCurrentValue = xMinValue(functionValues);

    choiceLimit = Math.max(epsilon * Math.abs(bestCurrentValue), 1e-8);

    smallerDistance = getMinIndex(
      functionValues,
      diagonalDistances,
      choiceLimit,
      bestCurrentValue,
    );

    differentDistances = Array.from(new Set(diagonalDistances));
    differentDistances = differentDistances.sort((a, b) => a - b);

    smallerValuesByDistance = [];
    for (let i = 0; i < differentDistances.length; i++) {
      let minIndex;
      let minValue = Number.POSITIVE_INFINITY;
      for (let k = 0; k < diagonalDistances.length; k++) {
        if (
          diagonalDistances[k] === differentDistances[i] &&
          functionValues[k] < minValue
        ) {
          minValue = functionValues[k];
          minIndex = k;
        }
      }
      smallerValuesByDistance.push(functionValues[minIndex]);
    }

    let currentMin = [];
    for (let j = 0; j < functionValues.length; j++) {
      if (functionValues[j] === bestCurrentValue) {
        let temp = [];
        for (let i = 0; i < lowerBoundaries.length; i++) {
          temp.push(
            lowerBoundaries[i] + unitaryCoordinates[j][i] * diffBoundaries[i],
          );
        }
        currentMin.push(temp);
      }
    }
    iteration += 1;
  }
  //--------------------------------------------------------------
  //                  Saving results
  //--------------------------------------------------------------

  let result = {};
  result.minFunctionValue = bestCurrentValue;
  result.iterations = iteration;
  let originalCoordinates = [];
  for (let j = 0; j < numberOfRectangles + 1; j++) {
    let pair = [];
    for (let i = 0; i < lowerBoundaries.length; i++) {
      pair.push(
        lowerBoundaries[i] + unitaryCoordinates[j][i] * diffBoundaries[i],
      );
    }
    originalCoordinates.push(pair);
  }

  result.finalState = {
    numberOfRectangles,
    totalIterations: (totalIterations += iterations),
    originalCoordinates,
    middlePoint,
    nbFunctionCalls,
    smallerDistance,
    edgeSizes,
    diagonalDistances,
    functionValues,
    differentDistances,
    smallerValuesByDistance,
    choiceLimit,
  };

  let minimizer = [];
  for (let i = 0; i < functionValues.length; i++) {
    if (functionValues[i] === bestCurrentValue) {
      minimizer.push(originalCoordinates[i]);
    }
  }

  result.optima = minimizer;
  return result;
}

function getMinIndex(
  functionValues,
  diagonalDistances,
  choiceLimit,
  bestCurrentValue,
) {
  let minIndex = -1;
  let minValue = Infinity;
  const targetValue = bestCurrentValue + choiceLimit;

  for (let i = 0; i < functionValues.length; i++) {
    const currentValue =
      Math.abs(functionValues[i] - targetValue) / diagonalDistances[i];
    if (currentValue < minValue) {
      minValue = currentValue;
      minIndex = i;
    }
  }

  return minIndex;
}
