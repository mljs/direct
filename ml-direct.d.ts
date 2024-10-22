declare module 'ml-direct' {
  export interface DirectOptions {
    iterations?: number;
    epsilon?: number;
    tolerance?: number;
    tolerance2?: number;
    initialState?: any;
  }

  export function direct(
    objectiveFunction: (parameters: number[]) => number,
    lowerBoundaries: number[],
    upperBoundaries: number[],
    options?: DirectOptions,
  ): {
    minFunctionValue: number;
    iterations: number;
    optima: number[][];
    finalState: any;
  };
}
