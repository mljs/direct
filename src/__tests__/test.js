import sumOfPseudoVoigt from '../functions/sumOfPseudoVoigt';
import Direct from '../index';
import getErrorFunction from '../util/getErrorFunction';
import parseData from '../util/parseData';

describe('test myModule', () => {
  it('should return 42', () => {
    let nbPoints = 1024;
    let minX = 2;
    let maxX = 4;

    let group = [];
    for (let i = 0; i < 7; i++) {
      group.push({
        x: minX + Math.random() * (maxX - minX),
        y: 2 + Math.random() * 5,
        width: 0.02 + Math.random() * 0.03,
        xL: Math.random(),
      });
    }
    let nL = group.length;
    let pTrue = new Array(group.length * 4);
    for (let i = 0; i < nL; i++) {
      pTrue[i] = group[i].x;
      pTrue[i + nL] = group[i].y;
      pTrue[i + 2 * nL] = group[i].width;
      pTrue[i + 3 * nL] = group[i].xL;
    }

    let x = new Array(nbPoints);
    let y = new Array(nbPoints).fill(0);
    let jump = (maxX - minX) / (nbPoints - 1);
    for (let i = 0; i < nbPoints; i++) {
      x[i] = minX + i * jump;
    }
    y = sumOfPseudoVoigt(x, pTrue, [0]);
    let result = optimizePseudoVoigtSum([x, y], group, {
      iterations: 60,
      initialState: {},
    });
    console.log(result.optimum[0], pTrue);
    expect(true).toEqual(true);
  });
});

function optimizePseudoVoigtSum(xy, group, options = {}) {
  let {
    percentage = 0,
    iterations = 20,
    noiseLevel = 0,
    initialState = {},
  } = options;

  let xy2 = parseData(xy, percentage);
  if (xy2 === null || xy2[0].rows < 3) {
    return null; //Cannot run an optimization with less than 3 points
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

  // return
  let result = Direct(targetFunc, pMin, pMax, { iterations }, initialState);

  // //Put back the result in the correct format
  for (let k = 0; k < result.optimum.length; k++) {
    let pFit = result.optimum[k];
    for (let i = 0; i < nL; i++) {
      pFit[i + nL] *= maxY;
    }
    result.optimum[k] = pFit;
  }
  return result;
}
