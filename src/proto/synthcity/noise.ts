// Perlin noise + Alea seeded RNG, ported verbatim from SynthCity
// (jeffbeene/synthcity, MIT — js/proc-noise.js + js/alea.js) so the city block
// layout matches the original demo exactly. The math is unchanged; only the
// module/type shape is adapted for TS.

type AleaFn = () => number;

// Johannes Baagoe's Alea PRNG (http://baagoe.com/en/RandomMusings/javascript/).
function mash() {
  let n = 0xefc8249d;
  return (data: string | number) => {
    const s = data.toString();
    for (let i = 0; i < s.length; i++) {
      n += s.charCodeAt(i);
      let h = 0.02519603282416938 * n;
      n = h >>> 0;
      h -= n;
      h *= n;
      n = h >>> 0;
      h -= n;
      n += h * 0x100000000; // 2^32
    }
    return (n >>> 0) * 2.3283064365386963e-10; // 2^-32
  };
}

function alea(...args: (string | number)[]): AleaFn {
  let s0 = 0;
  let s1 = 0;
  let s2 = 0;
  let c = 1;

  if (args.length === 0) args = [+new Date()];
  let m: ReturnType<typeof mash> | null = mash();
  s0 = m(" ");
  s1 = m(" ");
  s2 = m(" ");
  for (let i = 0; i < args.length; i++) {
    s0 -= m(args[i]);
    if (s0 < 0) s0 += 1;
    s1 -= m(args[i]);
    if (s1 < 0) s1 += 1;
    s2 -= m(args[i]);
    if (s2 < 0) s2 += 1;
  }
  m = null;

  return () => {
    const t = 2091639 * s0 + c * 2.3283064365386963e-10; // 2^-32
    s0 = s1;
    s1 = s2;
    return (s2 = t - (c = t | 0));
  };
}

export class Perlin {
  private aleaRand: AleaFn;
  private octaves = 4;
  private ampFalloff = 0.5;
  private array: number[] = [];

  private readonly YWRAPB = 4;
  private readonly YWRAP = 1 << 4;
  private readonly ZWRAPB = 8;
  private readonly ZWRAP = 1 << 8;
  private readonly SIZE = 4095;
  private readonly cosLUT: number[] = [];
  private readonly TWOPI: number;
  private readonly PI: number;

  constructor(seed?: number) {
    this.aleaRand = seed != null ? alea(seed) : alea();
    const DEG_TO_RAD = 0.0174532925;
    const SINCOS_PRECISION = 0.5;
    const SINCOS_LENGTH = Math.floor(360 / SINCOS_PRECISION);
    for (let i = 0; i < SINCOS_LENGTH; i++) {
      this.cosLUT[i] = Math.cos(i * DEG_TO_RAD * SINCOS_PRECISION);
    }
    this.TWOPI = SINCOS_LENGTH;
    this.PI = SINCOS_LENGTH >> 1;
  }

  noiseDetail(lod: number, falloff?: number) {
    if (Math.floor(lod) > 0) this.octaves = Math.floor(lod);
    if (falloff != null && falloff > 0) this.ampFalloff = falloff;
  }

  private fsc(i: number) {
    return 0.5 * (1.0 - this.cosLUT[Math.floor(i * this.PI) % this.TWOPI]);
  }

  noise(x: number, y = 0, z = 0): number {
    if (this.array.length === 0) {
      for (let i = 0; i < this.SIZE + 1; i++) this.array[i] = this.aleaRand();
    }

    let xi = Math.floor(x);
    let yi = Math.floor(y);
    let zi = Math.floor(z);
    let xf = x - xi;
    let yf = y - yi;
    let zf = z - zi;
    let r = 0;
    let ampl = 0.5;
    let rxf: number, ryf: number, n1: number, n2: number, n3: number;

    for (let i = 0; i < this.octaves; i++) {
      let of = xi + (yi << this.YWRAPB) + (zi << this.ZWRAPB);
      rxf = this.fsc(xf);
      ryf = this.fsc(yf);
      n1 = this.array[of & this.SIZE];
      n1 += rxf * (this.array[(of + 1) & this.SIZE] - n1);
      n2 = this.array[(of + this.YWRAP) & this.SIZE];
      n2 += rxf * (this.array[(of + this.YWRAP + 1) & this.SIZE] - n2);
      n1 += ryf * (n2 - n1);
      of += this.ZWRAP;
      n2 = this.array[of & this.SIZE];
      n2 += rxf * (this.array[(of + 1) & this.SIZE] - n2);
      n3 = this.array[(of + this.YWRAP) & this.SIZE];
      n3 += rxf * (this.array[(of + this.YWRAP + 1) & this.SIZE] - n3);
      n2 += ryf * (n3 - n2);
      n1 += this.fsc(zf) * (n2 - n1);
      r += n1 * ampl;
      ampl *= this.ampFalloff;
      xi <<= 1;
      xf *= 2;
      yi <<= 1;
      yf *= 2;
      zi <<= 1;
      zf *= 2;
      if (xf >= 1) {
        xi++;
        xf--;
      }
      if (yf >= 1) {
        yi++;
        yf--;
      }
      if (zf >= 1) {
        zi++;
        zf--;
      }
    }
    return r;
  }
}
