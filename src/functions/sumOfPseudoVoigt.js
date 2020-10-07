export default function sumOfPseudoVoigt(t, p, c) {
  let nL = p.length / 4;
  let factorG;
  let factorL;
  let cols = t.length;
  let p2;
  let result = new Array(t.length).fill(c[0]);
  // console.log('the first is %s', result[0][0])
  for (let i = 0; i < nL; i++) {
    let xL = p[i + nL * 3];
    let xG = 1 - xL;
    p2 = Math.pow(p[i + nL * 2], 2);
    factorL = xL * p[i + nL] * p2;
    factorG = xG * p[i + nL];
    for (let j = 0; j < cols; j++) {
      result[j] +=
        factorG * Math.exp(-Math.pow(t[j] - p[i], 2) / p2) +
        factorL / (Math.pow(t[j] - p[i], 2) + p2);
    }
  }
  return result;
}
