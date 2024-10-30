import { xNorm, xMaxValue, xMinValue } from 'ml-spectra-processing';

import { checkParameters } from './checkParameters.js';
import { initializeState } from './initializeState.js';
import { antiLowerConvexHull } from './util/antiLowerConvexHull';

/**
 * Performs a global optimization of required parameters
 * It will return an object containing:
 * - `minFunctionValue`: The minimum value found for the objetive function
 * - `optima`: Array of Array of values for all the variables where the function reach its minimum value
 * - `iterations`: Number of this.iterations performed in the process
 * - `finalState`: Internal state allowing to continue optimization (initialState)
 * @param {Function} objectiveFunction - Function to evaluate. It should accept an array of variables
 * @param {import('cheminfo-types').NumberArray} this.lowerBoundaries - Array containing for each variable the lower boundary
 * @param {import('cheminfo-types').NumberArray} upperBoundaries - Array containing for each variable the higher boundary
 * @param {object} [options={}]
 * @param {number} [options.iterations=50] - Number of this.iterations.
 * @param {number} [options.epsilon=1e-4] - tolerance to choose best current value.
 * @param {number} [options.tolerance=1e-16] - Minimum this.tolerance of the function.
 * @param {number} [options.tolerance2=1e-12] - Minimum this.tolerance of the function.
 * @returns {object} {finalState, this.iterations, minFunctionValue}
 */

export class Direct {

  constructor(objectiveFunction, lowerBoundaries, upperBoundaries, options = {}) {
    checkParameters(objectiveFunction, lowerBoundaries, upperBoundaries);
    this.objectiveFunction = objectiveFunction;
    this.lowerBoundaries = Float64Array.from(lowerBoundaries);
    this.upperBoundaries = Float64Array.from(upperBoundaries);
    this.iterations = options.iterations ?? 50;
    this.epsilon = options.epsilon ?? 1e-4;
    this.tolerance = options.tolerance ?? 1e-16;
    this.tolerance2 = options.tolerance2 ?? 1e-12;
    initializeState(this)
  }

  optimize() {
    let iteration = 0;
    //-------------------------------------------------------------------------
    //                          Iteration loop
    //-------------------------------------------------------------------------

    while (iteration < this.iterations) {
      //----------------------------------------------------------------------
      //  STEP 2. Identify the set S of all potentially optimal rectangles
      //----------------------------------------------------------------------

      let S1 = [];
      let idx = this.differentDistances.indexOf(this.diagonalDistances[this.smallerDistance]);
      let counter = 0;
      for (let i = idx; i < this.differentDistances.length; i++) {
        for (let f = 0; f < this.functionValues.length; f++) {
          if (
            this.functionValues[f] === this.smallerValuesByDistance[i] &&
            this.diagonalDistances[f] === this.differentDistances[i]
          ) {
            S1[counter++] = f;
          }
        }
      }

      let optimumValuesIndex, S3;
      if (this.differentDistances.length - idx > 1) {
        let a1 = this.diagonalDistances[this.smallerDistance];
        let b1 = this.functionValues[this.smallerDistance];
        let a2 = this.differentDistances.at(-1);
        let b2 = this.smallerValuesByDistance[this.differentDistances.length - 1];
        let slope = (b2 - b1) / (a2 - a1);
        let constant = b1 - slope * a1;
        let S2 = [];
        for (let i = 0; i < S1.length; i++) {
          let j = S1[i];
          if (
            this.functionValues[j] <=
            slope * this.diagonalDistances[j] + constant + this.tolerance2
          ) {
            S2.push(j);
          }
        }

        let xHull = [];
        let yHull = [];
        for (let i = 0; i < S2.length; i++) {
          xHull.push(this.diagonalDistances[S2[i]]);
          yHull.push(this.functionValues[S2[i]]);
        }

        let lowerIndexHull = antiLowerConvexHull(xHull, yHull);

        S3 = [];
        for (let i = 0; i < lowerIndexHull.length; i++) {
          S3.push(S2[lowerIndexHull[i]]);
        }
      } else {
        S3 = S1.slice(0);
      }
      optimumValuesIndex = S3;
      //--------------------------------------------------------------
      // STEPS 3,5: Select any rectangle j in S
      //--------------------------------------------------------------
      for (let k = 0; k < optimumValuesIndex.length; k++) {
        let j = optimumValuesIndex[k];
        let largerSide = xMaxValue(this.edgeSizes[j]);
        let largeSidesIndex = new Uint32Array(this.edgeSizes[j].length);
        counter = 0;
        for (let i = 0; i < this.edgeSizes[j].length; i++) {
          if (Math.abs(this.edgeSizes[j][i] - largerSide) < this.tolerance) {
            largeSidesIndex[counter++] = i;
          }
        }
        let delta = (2 * largerSide) / 3;
        let bestFunctionValues = [];
        for (let r = 0; r < counter; r++) {
          let i = largeSidesIndex[r];
          let firstMiddleCenter = this.unitaryCoordinates[j].slice();
          let secondMiddleCenter = this.unitaryCoordinates[j].slice();
          firstMiddleCenter[i] += delta;
          secondMiddleCenter[i] -= delta;
          let firstMiddleValue = new Float64Array(firstMiddleCenter.length);
          let secondMiddleValue = new Float64Array(secondMiddleCenter.length);
          for (let i = 0; i < firstMiddleCenter.length; i++) {
            firstMiddleValue[i] =
              this.lowerBoundaries[i] + firstMiddleCenter[i] * this.diffBoundaries[i];
            secondMiddleValue[i] =
              this.lowerBoundaries[i] + secondMiddleCenter[i] * this.diffBoundaries[i];
          }
          let firstMinValue = this.objectiveFunction(firstMiddleValue);
          let secondMinValue = this.objectiveFunction(secondMiddleValue);
          this.nbFunctionCalls += 2;
          bestFunctionValues.push({
            minValue: Math.min(firstMinValue, secondMinValue),
            index: r,
          });
          // [Math.min(firstMinValue, secondMinValue), r];
          this.unitaryCoordinates.push(firstMiddleCenter, secondMiddleCenter);
          this.functionValues.push(firstMinValue, secondMinValue);
        }

        let b = bestFunctionValues.sort((a, b) => a.minValue - b.minValue);
        for (let r = 0; r < counter; r++) {
          let u = largeSidesIndex[b[r].index];
          let ix1 = this.numberOfRectangles + 2 * (b[r].index + 1) - 1;
          let ix2 = this.numberOfRectangles + 2 * (b[r].index + 1);
          this.edgeSizes[j][u] = delta / 2;
          this.edgeSizes[ix1] = this.edgeSizes[j].slice();
          this.edgeSizes[ix2] = this.edgeSizes[j].slice();
          this.diagonalDistances[j] = xNorm(this.edgeSizes[j]);
          this.diagonalDistances[ix1] = this.diagonalDistances[j];
          this.diagonalDistances[ix2] = this.diagonalDistances[j];
        }
        this.numberOfRectangles += 2 * counter;
      }

      //--------------------------------------------------------------
      //                  Update
      //--------------------------------------------------------------

      this.bestCurrentValue = xMinValue(this.functionValues);

      this.choiceLimit = Math.max(this.epsilon * Math.abs(this.bestCurrentValue), 1e-8);

      this.smallerDistance = getMinIndex(this)

      this.differentDistances = Array.from(new Set(this.diagonalDistances));
      this.differentDistances = this.differentDistances.sort((a, b) => a - b);

      this.smallerValuesByDistance = [];
      for (let i = 0; i < this.differentDistances.length; i++) {
        let minIndex;
        let minValue = Number.POSITIVE_INFINITY;
        for (let k = 0; k < this.diagonalDistances.length; k++) {
          if (
            this.diagonalDistances[k] === this.differentDistances[i] &&
            this.functionValues[k] < minValue
          ) {
            minValue = this.functionValues[k];
            minIndex = k;
          }
        }
        this.smallerValuesByDistance.push(this.functionValues[minIndex]);
      }

      let currentMin = [];
      for (let j = 0; j < this.functionValues.length; j++) {
        if (this.functionValues[j] === this.bestCurrentValue) {
          let temp = [];
          for (let i = 0; i < this.lowerBoundaries.length; i++) {
            temp.push(
              this.lowerBoundaries[i] + this.unitaryCoordinates[j][i] * this.diffBoundaries[i],
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


    this.minFunctionValue = this.bestCurrentValue;
    this.iterations = iteration;
    let originalCoordinates = [];
    for (let j = 0; j < this.numberOfRectangles + 1; j++) {
      let pair = [];
      for (let i = 0; i < this.lowerBoundaries.length; i++) {
        pair.push(
          this.lowerBoundaries[i] + this.unitaryCoordinates[j][i] * this.diffBoundaries[i],
        );
      }
      originalCoordinates.push(pair);
    }



    let minimizer = [];
    for (let i = 0; i < this.functionValues.length; i++) {
      if (this.functionValues[i] === this.bestCurrentValue) {
        minimizer.push(originalCoordinates[i]);
      }
    }

    this.optima = minimizer;
  }
}

function getMinIndex(direct) {
  let minIndex = -1;
  let minValue = Infinity;
  const targetValue = direct.bestCurrentValue + direct.choiceLimit;

  for (let i = 0; i < direct.functionValues.length; i++) {
    const currentValue =
      Math.abs(direct.functionValues[i] - targetValue) / direct.diagonalDistances[i];
    if (currentValue < minValue) {
      minValue = currentValue;
      minIndex = i;
    }
  }

  return minIndex;
}
