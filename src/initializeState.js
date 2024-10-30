export function initializeState(direct) {
  direct.nbParameters = direct.lowerBoundaries.length;
  direct.diffBoundaries = direct.upperBoundaries.map((x, i) => x - direct.lowerBoundaries[i]);

  direct.numberOfRectangles = 0;
  direct.totalIterations = 0;
  direct.unitaryCoordinates = [new Float64Array(direct.nbParameters).fill(0.5)];
  const middlePoint = new Float64Array(direct.nbParameters).map((value, index) => {
    return (
      direct.lowerBoundaries[index] +
      direct.unitaryCoordinates[0][index] * direct.diffBoundaries[index]
    );
  });
  const bestCurrentValue = direct.objectiveFunction(middlePoint);
  direct.bestCurrentValue = bestCurrentValue;
  direct.nbFunctionCalls = 1;
  direct.smallerDistance = 0;
  direct.edgeSizes = [new Float64Array(direct.nbParameters).fill(0.5)];
  direct.diagonalDistances = [Math.sqrt(direct.nbParameters * 0.5 ** 2)];
  direct.functionValues = [direct.bestCurrentValue];
  direct.differentDistances = direct.diagonalDistances;
  direct.smallerValuesByDistance = [direct.bestCurrentValue];
  direct.choiceLimit = undefined;

  if (typeof bestCurrentValue !== 'number' || Number.isNaN(bestCurrentValue)) {
    throw new Error('The initial value is not a number');
  }
}
