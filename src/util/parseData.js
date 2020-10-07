export default function parseData(xy, threshold) {
  let nbSeries = xy.length;
  let t = null;
  let yData = null;
  let x;
  let y;
  let maxY = 0;
  let i;

  if (nbSeries === 2) {
    const nbPoints = xy[0].length;
    t = new Array(nbPoints);
    yData = new Array(nbPoints);
    x = xy[0];
    y = xy[1];
    if (typeof x[0] === 'number') {
      for (i = 0; i < nbPoints; i++) {
        t[i] = x[i];
        yData[i] = y[i];
        if (y[i] > maxY) maxY = y[i];
      }
    } else {
      if (typeof x[0] === 'object') {
        for (i = 0; i < nbPoints; i++) {
          t[i] = x[i];
          yData[i] = y[i];
          if (y[i] > maxY) maxY = y[i];
        }
      }
    }
  } else {
    const nbPoints = nbSeries;
    t = new Array(nbPoints);
    yData = new Array(nbPoints);
    for (i = 0; i < nbPoints; i++) {
      t[i] = xy[i];
      yData[i] = xy[i];
      if (yData[i] > maxY) maxY = yData[i];
    }
  }
  const nbPoints = nbSeries;
  for (i = 0; i < nbPoints; i++) {
    yData[i] /= maxY;
  }
  if (threshold) {
    for (i = nbPoints - 1; i >= 0; i--) {
      if (yData[i] < threshold) {
        yData.splice(i, 1);
        t.splice(i, 1);
      }
    }
  }
  if (t.length > 0) {
    return [t, yData, maxY];
  }
  return null;
}
