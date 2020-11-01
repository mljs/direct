import getMaxValue from 'ml-array-max';
import getMinValue from 'ml-array-min';

import antiLowerConvexHull from './util/antiLowerConvexHull';

/**
 * Evaluate how...
 * @param {function} fun - Evaluating function.
 * @param {Array} xU - Upper boundaries.
 * @param {Array} xL - Lower boundaries.
 * @param {Object} [options]
 * @param {number} [options.iterations] - Number of iterations.
 * @param {number} [options.epsilon] - Epsilon.
 * @param {number} [options.tol] - Minimum tollerance of the function.
 * */

export default function Direct(
  objectiveFunction,
  lowerBoundaries,
  upperBoundaries,
  options = {},
  initialState = {},
) {
  const {
    iterations = 50,
    epsilon = 1e-4,
    tolerance = 1e-16,
    tolerance2 = 1e-12,
  } = options;

  if (
    objectiveFunction === undefined ||
    lowerBoundaries === undefined ||
    upperBoundaries === undefined
  ) {
    throw new RangeError('There is something undefined');
  }

  lowerBoundaries = new Float64Array(lowerBoundaries);
  upperBoundaries = new Float64Array(upperBoundaries);

  if (lowerBoundaries.length !== upperBoundaries.length) {
    throw new Error(
      'Lower bounds and Upper bounds for x are not of the same length',
    );
  }

  //-------------------------------------------------------------------------
  //                        STEP 1. Initialization
  //-------------------------------------------------------------------------
  let n = lowerBoundaries.length;
  let diffBorders = upperBoundaries.map((x, i) => x - lowerBoundaries[i]);
  let empty = new Array(n).fill();
  let {
    numberOfRectangles = 0,
    unitaryCoordinates = [new Float64Array(n).fill(0.5)],
    middlePoint = new Float64Array(
      empty.map((value, index) => {
        return (
          lowerBoundaries[index] +
          unitaryCoordinates[0][index] * diffBorders[index]
        );
      }),
    ),
    bestCurrentValue = objectiveFunction(middlePoint),
    fCalls = 1,
    smallerDistance = 0,
    edgeSizes = [new Float64Array(n).fill(0.5)],
    diagonalDistances = [Math.sqrt(n * Math.pow(0.5, 2))],
    functionValues = [bestCurrentValue],
    differentDistances = diagonalDistances,
    smallerValuesByDistance = [bestCurrentValue],
    choiceLimit = undefined,
  } = initialState;

  if (
    initialState.unitaryCoordinates &&
    initialState.unitaryCoordinates.length > 0
  ) {
    bestCurrentValue = getMinValue(functionValues);
    choiceLimit =
      epsilon * Math.abs(bestCurrentValue) > 1e-8
        ? epsilon * Math.abs(bestCurrentValue)
        : 1e-8;

    smallerDistance = getMinIndex(
      functionValues,
      diagonalDistances,
      choiceLimit,
      bestCurrentValue,
    );

    unitaryCoordinates = initialState.unitaryCoordinates.slice(); //porqué usar slice aqui?
    for (let j = 0; j < functionValues.length; j++) {
      for (let i = 0; i < lowerBoundaries.length; i++) {
        unitaryCoordinates[j][i] =
          (unitaryCoordinates[j][i] - lowerBoundaries[i]) / diffBorders[i];
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
    let idx = differentDistances.findIndex(
      // eslint-disable-next-line no-loop-func
      (e) => e === diagonalDistances[smallerDistance],
    );
    let counter = 0;
    for (let i = idx; i < differentDistances.length; i++) {
      for (let f = 0; f < functionValues.length; f++) {
        if (
          (functionValues[f] === smallerValuesByDistance[i]) &
          (diagonalDistances[f] === differentDistances[i])
        ) {
          S1[counter++] = f;
        }
      }
    }

    let optimumValuesIndex, S3;
    if (differentDistances.length - idx > 1) {
      let a1 = diagonalDistances[smallerDistance];
      let b1 = functionValues[smallerDistance];
      let a2 = differentDistances[differentDistances.length - 1];
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
      let xHull = new Array(counter);
      let yHull = new Array(counter);
      for (let i = 0; i < xHull.length; i++) {
        xHull[i] = [diagonalDistances[S2[i]]];
        yHull[i] = [functionValues[S2[i]]];
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
      let largerSide = getMaxValue(edgeSizes[j]);
      let largeSidesIndex = new Uint32Array(edgeSizes[j].length);
      counter = 0;
      for (let i = 0; i < edgeSizes[j].length; i++) {
        if (Math.abs(edgeSizes[j][i] - largerSide) < tolerance) {
          largeSidesIndex[counter++] = i;
        }
      }
      let delta = (2 * largerSide) / 3;
      let bestFunctionValues = new Array(counter);
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
            lowerBoundaries[i] + firstMiddleCenter[i] * diffBorders[i];
          secondMiddleValue[i] =
            lowerBoundaries[i] + secondMiddleCenter[i] * diffBorders[i];
        }
        let firstMinValue = objectiveFunction(firstMiddleValue);
        let secondMinValue = objectiveFunction(secondMiddleValue);
        fCalls += 2;
        bestFunctionValues[r] = [Math.min(firstMinValue, secondMinValue), r];
        unitaryCoordinates.push(firstMiddleCenter, secondMiddleCenter);
        functionValues.push(firstMinValue, secondMinValue);
      }

      let b = bestFunctionValues.sort((a, b) => a[0] - b[0]);
      for (let r = 0; r < counter; r++) {
        let u = largeSidesIndex[b[r][1]];
        let ix1 = numberOfRectangles + 2 * (b[r][1] + 1) - 1;
        let ix2 = numberOfRectangles + 2 * (b[r][1] + 1);
        edgeSizes[j][u] = delta / 2;
        edgeSizes[ix1] = edgeSizes[j].slice();
        edgeSizes[ix2] = edgeSizes[j].slice();
        let sumSquare = 0;
        for (let i = 0; i < edgeSizes[j].length; i++) {
          sumSquare += Math.pow(edgeSizes[j][i], 2);
        }
        diagonalDistances[j] = Math.sqrt(sumSquare);
        diagonalDistances[ix1] = diagonalDistances[j];
        diagonalDistances[ix2] = diagonalDistances[j];
      }
      numberOfRectangles += 2 * counter;
    }

    //--------------------------------------------------------------
    //                  Update
    //--------------------------------------------------------------

    bestCurrentValue = getMinValue(functionValues);

    choiceLimit =
      epsilon * Math.abs(bestCurrentValue) > 1e-8
        ? epsilon * Math.abs(bestCurrentValue)
        : 1e-8;

    smallerDistance = getMinIndex(
      functionValues,
      diagonalDistances,
      choiceLimit,
      bestCurrentValue,
      iteration,
    );

    differentDistances = Array.from(new Set(diagonalDistances));
    differentDistances = differentDistances.sort((a, b) => a - b);

    smallerValuesByDistance = new Array(differentDistances.length);
    for (let i = 0; i < differentDistances.length; i++) {
      let minIndex;
      let minValue = Number.POSITIVE_INFINITY;
      for (let k = 0; k < diagonalDistances.length; k++) {
        if (diagonalDistances[k] === differentDistances[i]) {
          if (functionValues[k] < minValue) {
            minValue = functionValues[k];
            minIndex = k;
          }
        }
      }
      smallerValuesByDistance[i] = functionValues[minIndex];
    }

    let currentMin = [];
    for (let j = 0; j < functionValues.length; j++) {
      if (functionValues[j] === bestCurrentValue) {
        let temp = [];
        for (let i = 0; i < lowerBoundaries.length; i++) {
          temp[i] =
            lowerBoundaries[i] + unitaryCoordinates[j][i] * diffBorders[i];
        }
        currentMin.push(temp.slice());
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
      pair.push(lowerBoundaries[i] + unitaryCoordinates[j][i] * diffBorders[i]);
    }
    originalCoordinates.push(pair);
  }

  result.finalState = {
    originalCoordinates,
    functionValues,
    diagonalDistances,
    edgeSizes,
    differentDistances,
    smallerValuesByDistance,
    fCalls,
  };

  let minimizer = [];
  for (let i = 0; i < functionValues.length; i++) {
    if (functionValues[i] === bestCurrentValue) {
      minimizer.push(originalCoordinates[i]);
    }
  }

  result.optimum = minimizer;
  return result;
}

function getMinIndex(
  functionValues,
  diagonalDistances,
  choiceLimit,
  bestCurrentValue,
) {
  let item = [];
  for (let i = 0; i < functionValues.length; i++) {
    item[i] =
      Math.abs(functionValues[i] - (bestCurrentValue + choiceLimit)) /
      diagonalDistances[i];
  }
  let result = item.findIndex((x) => x === getMinValue(item));
  return result;
}
