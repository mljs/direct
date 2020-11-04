/**
 * Preparata, F. P., & Shamos, M. I. (2012). Computational geometry: an introduction. Springer Science & Business Media.
 */
export default function antiLowerConvexHull(x, y) {
  if (x.length !== y.length) {
    throw new RangeError('X and Y vectors has different dimensions');
  }
  let m = x.length - 1;

  if (m === 0) return [0];
  if (m === 1) return [0, 1];

  let start = 0;
  let v = 0;
  let w = x.length - 1;
  let h = new Array(m + 1).fill().map((value, index) => index);
  let flag = 0;
  while (next(v, m) !== start || flag === 0) {
    if (next(v, m) === w) flag = 1;

    let a = v;
    let b = next(v, m);
    let c = next(next(v, m), m);
    let detA =
      x[c] * (y[a] - y[b]) + x[a] * (y[b] - y[c]) + x[b] * (y[c] - y[a]);
    let leftTurn;
    if (detA >= 0) {
      leftTurn = 1;
    } else {
      leftTurn = 0;
    }
    if (leftTurn === 1) {
      v = next(v, m);
    } else {
      let j = next(v, m);
      x = removeElement(x, j);
      y = removeElement(y, j);
      h = removeElement(h, j);
      m -= 1;
      w -= 1;
      v = pred(v, m);
    }
  }

  return h;
}

function removeElement(array, index) {
  let result = array.slice();
  return result.filter((x, i) => i !== index);
}

function pred(v, m) {
  return v === 0 ? m : v - 1;
}

function next(v, m) {
  return v === m ? 0 : v + 1;
}
