const sumOfPseudoVoigt = require('../functions/sumOfPseudoVoigt');
const Direct = require('../index');
const getErrorFunction = require('../util/getErrorFunction');
const parseData = require('../util/parseData');

export default function optimizePseudoVoigtSum(xy, group, options = {}) {
  let {
    percentage = 0,
    iterations = 20,
    noiseLevel = 0,
    initialState = {},
  } = options;

  let xy2 = parseData(xy, percentage);
  if (xy2 === null || xy2[0].rows < 3) {
    return null; // Cannot run an optimization with less than 3 points
  }

  let t = xy2[0];
  let yData = xy2[1];
  let maxY = xy2[2];
  let consts = [noiseLevel / maxY]; // optional vector of constants
  let nL = group.length;
  let pMin = new Array(nL * 4, 1);
  let pMax = new Array(nL * 4, 1);
  let dt = Math.abs(t[0] - t[1]);

  for (let i = 0; i < nL; i++) {
    pMin[i] = group[i].x - dt;
    pMin[i + nL] = 0;
    pMin[i + 2 * nL] = group[i].width * 0.8;
    pMin[i + 3 * nL] = 0;

    pMax[i] = group[i].x + dt;
    pMax[i + nL] = (group[i].y / maxY) * 1.1;
    pMax[i + 2 * nL] = group[i].width * 1.2;
    pMax[i + 3 * nL] = 1;
  }

  let targetFunc = getErrorFunction(
    sumOfPseudoVoigt,
    { x: t, y: yData },
    consts,
  );

  let result = Direct(targetFunc, pMin, pMax, { iterations }, initialState);

  for (let k = 0; k < result.optimum.length; k++) {
    let pFit = result.optimum[k];
    for (let i = 0; i < nL; i++) {
      pFit[i + nL] *= maxY;
    }
    result.optimum[k] = pFit;
  }
  return result;
}
