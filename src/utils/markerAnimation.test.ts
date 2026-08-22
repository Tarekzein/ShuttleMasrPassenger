import { interpolateLatLng, bearing, shortestHeadingTarget } from './markerAnimation';

describe('markerAnimation (smooth shuttle marker)', () => {
  const a = { latitude: 30.0, longitude: 31.0 };
  const b = { latitude: 30.1, longitude: 31.2 };

  it('interpolates the midpoint at t=0.5', () => {
    const mid = interpolateLatLng(a, b, 0.5);
    expect(mid.latitude).toBeCloseTo(30.05, 6);
    expect(mid.longitude).toBeCloseTo(31.1, 6);
  });

  it('clamps t to [0,1] so the marker never overshoots', () => {
    expect(interpolateLatLng(a, b, -1)).toEqual(a);
    expect(interpolateLatLng(a, b, 2)).toEqual(b);
  });

  it('computes a bearing in [0,360)', () => {
    const brg = bearing(a, b);
    expect(brg).toBeGreaterThanOrEqual(0);
    expect(brg).toBeLessThan(360);
    // Heading north-east → roughly between 0 and 90 degrees.
    expect(brg).toBeGreaterThan(0);
    expect(brg).toBeLessThan(90);
  });

  it('rotates across north using the shortest heading arc', () => {
    expect(shortestHeadingTarget(350, 10)).toBe(370);
    expect(shortestHeadingTarget(10, 350)).toBe(-10);
  });
});
