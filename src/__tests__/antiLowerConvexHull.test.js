import antiLowerConvexHull from '../util/antiLowerConvexHull';

describe('testing lower convexhull function', () => {
  it('Get anti clockwise lower convex hull', () => {
    const x = [1, 1, 2, 3, 4, 4, 2];
    const y = [2, 4, 7, 6, 4, 3, 0];
    const lowerConvexHull = antiLowerConvexHull(x, y);
    expect(lowerConvexHull).toStrictEqual([0, 6, 5]);
  });
});
