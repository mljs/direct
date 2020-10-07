import { sumOfGaussianLorentzians } from 'ml-optimize-lorentzian';

import Direct from '../index';
import getErrorFunction from '../util/getErrorFunction';
import parseData from '../util/parseData';

export default function optimizeGLSum(xy, group, options = {}) {
  let {
    percentage = 0,
    iterations = 20,
    noiseLevel = 0,
    initialState = {},
  } = options;

  let xy2 = parseData(xy, percentage);
  if (xy2 === null || xy2[0].rows < 3) {
    return null;
  }

  let t = xy2[0];
  let yData = xy2[1];
  let maxY = xy2[2];
  let consts = [noiseLevel / maxY];
  let nL = group.length;
  let pMin = new Array(nL * 4, 1);
  let pMax = new Array(nL * 4, 1);
  let dt = Math.abs(t[0] - t[1]);

  for (let i = 0; i < nL; i++) {
    pMin[i] = group[i].x - dt;
    pMin[i + nL] = 0;
    pMin[i + 2 * nL] = group[i].width / 4;
    pMin[i + 3 * nL] = 0;

    pMax[i] = group[i].x + dt;
    pMax[i + nL] = 1.5;
    pMax[i + 2 * nL] = group[i].width * 4;
    pMax[i + 3 * nL] = 1;
  }
  let targetFunc = getErrorFunction(
    sumOfGaussianLorentzians,
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
