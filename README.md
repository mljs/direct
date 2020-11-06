# ml-direct

[![NPM version][npm-image]][npm-url]
[![npm download][download-image]][download-url]

# Direct - DIviding RECTangles algorithm. 

The algorithm is intended to minimize real valued multivariate scalar fields over a hyper-rectangular region of N, theoretically the only prerequisite to achieve convergence is that the function must be continuous in the domain or at least continuous over a neighborhood of the global minimum. 

<p align="center">
  <img src="image/griewandContourplotDirect.png">
</p>

<p align="center">
  A tool for global optimization of real valued functions .
</p>

## Installation

`$ npm i ml-direct`

## Usage

```js
import direct from 'ml-direct';

const options = {
    iterations: 25,
};

// for x we explore values between -5 and 4
// for y we explore values between -2 and 3

const lowerBoundaries = [-5, -2]; 
const upperBoundaries = [4, 3];

const quadratic = function (parameters) {
  let [x, y] = parameters;
  return Math.pow(x, 2) + Math.pow(y, 2);
};

const predicted = direct(
    quadratic,
    lowerBoundaries,
    upperBoundaries,
    options,
);

// predicted.minFunctionValue = 0
// Array.from(predicted.optimum[0]) = [0, 0];

```

## [API Documentation](https://cheminfo.github.io/ml-direct/)

## References

* Jones, D. R., Perttunen, C. D., & Stuckman, B. E. (1993). Lipschitzian optimization without the Lipschitz constant. Journal of optimization Theory and Applications, 79(1), 157-181.
 
* Björkman, M., & Holmström, K. (1999). Global optimization using the DIRECT algorithm in Matlab.
 
* Preparata, F. P., & Shamos, M. I. (2012). Computational geometry: an introduction. Springer Science & Business Media.

## License

[MIT](./LICENSE)

[npm-image]: https://img.shields.io/npm/v/ml-direct.svg
[npm-url]: https://www.npmjs.com/package/ml-direct
[ci-image]: https://github.com/cheminfo/ml-direct/workflows/Node.js%20CI/badge.svg?branch=master
[ci-url]: https://github.com/cheminfo/ml-direct/actions?query=workflow%3A%22Node.js+CI%22
[download-image]: https://img.shields.io/npm/dm/ml-direct.svg
[download-url]: https://www.npmjs.com/package/ml-direct
