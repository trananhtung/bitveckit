import { BitSet } from "../src/index.js";

describe("BitSet — set / get / clear / flip", () => {
  it("set and get individual bits", () => {
    const bs = new BitSet();
    bs.set(0).set(5).set(31).set(32).set(63).set(100);
    expect(bs.get(0)).toBe(true);
    expect(bs.get(5)).toBe(true);
    expect(bs.get(31)).toBe(true);
    expect(bs.get(32)).toBe(true);
    expect(bs.get(63)).toBe(true);
    expect(bs.get(100)).toBe(true);
    expect(bs.get(1)).toBe(false);
    expect(bs.get(99)).toBe(false);
  });

  it("set(index, false) clears bit", () => {
    const bs = new BitSet();
    bs.set(5).set(5, false);
    expect(bs.get(5)).toBe(false);
  });

  it("clear(index) clears bit", () => {
    const bs = new BitSet();
    bs.set(10).set(20);
    bs.clear(10);
    expect(bs.get(10)).toBe(false);
    expect(bs.get(20)).toBe(true);
  });

  it("clear() with no args clears all", () => {
    const bs = new BitSet();
    bs.set(1).set(100).set(200);
    bs.clear();
    expect(bs.isEmpty()).toBe(true);
  });

  it("flip toggles a bit", () => {
    const bs = new BitSet();
    bs.set(7);
    bs.flip(7);
    expect(bs.get(7)).toBe(false);
    bs.flip(7);
    expect(bs.get(7)).toBe(true);
    bs.flip(99); // previously unset
    expect(bs.get(99)).toBe(true);
  });

  it("get on unset bit returns false without growing", () => {
    const bs = new BitSet();
    expect(bs.get(9999)).toBe(false);
  });

  it("throws on negative index", () => {
    const bs = new BitSet();
    expect(() => bs.set(-1)).toThrow(RangeError);
    expect(() => bs.get(-1)).toThrow(RangeError);
    expect(() => bs.clear(-1)).toThrow(RangeError);
    expect(() => bs.flip(-1)).toThrow(RangeError);
  });
});

describe("BitSet — range operations", () => {
  it("setRange sets all bits in [from, to)", () => {
    const bs = new BitSet();
    bs.setRange(5, 10);
    for (let i = 5; i < 10; i++) expect(bs.get(i)).toBe(true);
    expect(bs.get(4)).toBe(false);
    expect(bs.get(10)).toBe(false);
  });

  it("clearRange clears bits in [from, to)", () => {
    const bs = new BitSet();
    bs.setRange(0, 20);
    bs.clearRange(5, 10);
    for (let i = 5; i < 10; i++) expect(bs.get(i)).toBe(false);
    expect(bs.get(4)).toBe(true);
    expect(bs.get(10)).toBe(true);
  });

  it("flipRange flips bits in [from, to)", () => {
    const bs = new BitSet();
    bs.setRange(0, 5);
    bs.flipRange(3, 7);
    expect(bs.get(3)).toBe(false); // was 1, now 0
    expect(bs.get(4)).toBe(false); // was 1, now 0
    expect(bs.get(5)).toBe(true);  // was 0, now 1
    expect(bs.get(6)).toBe(true);  // was 0, now 1
  });
});

describe("BitSet — cardinality / isEmpty / intersects", () => {
  it("cardinality counts set bits", () => {
    const bs = BitSet.fromArray([0, 5, 10, 100]);
    expect(bs.cardinality()).toBe(4);
  });

  it("isEmpty returns true for empty set", () => {
    expect(new BitSet().isEmpty()).toBe(true);
  });

  it("isEmpty returns false when any bit is set", () => {
    const bs = new BitSet();
    bs.set(999);
    expect(bs.isEmpty()).toBe(false);
  });

  it("intersects — true when sets share a bit", () => {
    const a = BitSet.fromArray([1, 3, 5]);
    const b = BitSet.fromArray([3, 7, 9]);
    expect(a.intersects(b)).toBe(true);
  });

  it("intersects — false when disjoint", () => {
    const a = BitSet.fromArray([0, 2]);
    const b = BitSet.fromArray([1, 3]);
    expect(a.intersects(b)).toBe(false);
  });
});

describe("BitSet — bitwise operations (in-place)", () => {
  it("and — intersection", () => {
    const a = BitSet.fromArray([1, 2, 3, 5]);
    const b = BitSet.fromArray([2, 3, 4]);
    a.and(b);
    expect(a.toArray()).toEqual([2, 3]);
  });

  it("or — union", () => {
    const a = BitSet.fromArray([1, 3]);
    const b = BitSet.fromArray([2, 3, 4]);
    a.or(b);
    expect(a.toArray().sort((x, y) => x - y)).toEqual([1, 2, 3, 4]);
  });

  it("xor — symmetric difference", () => {
    const a = BitSet.fromArray([1, 2, 3]);
    const b = BitSet.fromArray([2, 3, 4]);
    a.xor(b);
    expect(a.toArray().sort((x, y) => x - y)).toEqual([1, 4]);
  });

  it("andNot — set difference", () => {
    const a = BitSet.fromArray([1, 2, 3, 4]);
    const b = BitSet.fromArray([2, 4]);
    a.andNot(b);
    expect(a.toArray()).toEqual([1, 3]);
  });

  it("not — inverts bits up to given length", () => {
    const bs = BitSet.fromArray([0, 2, 4]);
    bs.not(6);
    expect(bs.toArray()).toEqual([1, 3, 5]);
  });

  it("not with no length inverts existing words", () => {
    const bs = new BitSet(32);
    bs.set(0); // only bit 0 set in word 0
    bs.not();
    expect(bs.get(0)).toBe(false);
    expect(bs.get(1)).toBe(true);
    expect(bs.get(31)).toBe(true);
  });
});

describe("BitSet — non-mutating ops", () => {
  it("andWith does not modify original", () => {
    const a = BitSet.fromArray([1, 2, 3]);
    const b = BitSet.fromArray([2, 3, 4]);
    const c = a.andWith(b);
    expect(a.toArray()).toEqual([1, 2, 3]); // unchanged
    expect(c.toArray()).toEqual([2, 3]);
  });

  it("orWith does not modify original", () => {
    const a = BitSet.fromArray([1]);
    const b = BitSet.fromArray([2]);
    const c = a.orWith(b);
    expect(a.toArray()).toEqual([1]);
    expect(c.toArray().sort((x, y) => x - y)).toEqual([1, 2]);
  });
});

describe("BitSet — iteration", () => {
  it("nextSetBit finds next set bit", () => {
    const bs = BitSet.fromArray([5, 10, 15]);
    expect(bs.nextSetBit(0)).toBe(5);
    expect(bs.nextSetBit(6)).toBe(10);
    expect(bs.nextSetBit(10)).toBe(10);
    expect(bs.nextSetBit(11)).toBe(15);
    expect(bs.nextSetBit(16)).toBe(-1);
  });

  it("nextSetBit works across word boundaries", () => {
    const bs = new BitSet();
    bs.set(31).set(32); // bits at word boundary
    expect(bs.nextSetBit(30)).toBe(31);
    expect(bs.nextSetBit(32)).toBe(32);
  });

  it("nextClearBit finds next clear bit", () => {
    const bs = BitSet.fromArray([0, 1, 2, 4]);
    expect(bs.nextClearBit(0)).toBe(3);
    expect(bs.nextClearBit(4)).toBe(5);
  });

  it("previousSetBit finds previous set bit", () => {
    const bs = BitSet.fromArray([5, 10, 20]);
    expect(bs.previousSetBit(25)).toBe(20);
    expect(bs.previousSetBit(19)).toBe(10);
    expect(bs.previousSetBit(4)).toBe(-1);
  });

  it("Symbol.iterator yields all set bits in order", () => {
    const bs = BitSet.fromArray([3, 1, 7, 0, 100]);
    const bits = [...bs];
    expect(bits).toEqual([0, 1, 3, 7, 100]);
  });

  it("toArray returns sorted set bit indices", () => {
    const bs = new BitSet();
    bs.set(64).set(0).set(32);
    expect(bs.toArray()).toEqual([0, 32, 64]);
  });
});

describe("BitSet — equals / clone / length / compact", () => {
  it("equals returns true for identical sets", () => {
    const a = BitSet.fromArray([1, 2, 3]);
    const b = BitSet.fromArray([1, 2, 3]);
    expect(a.equals(b)).toBe(true);
  });

  it("equals returns false for different sets", () => {
    const a = BitSet.fromArray([1, 2, 3]);
    const b = BitSet.fromArray([1, 2, 4]);
    expect(a.equals(b)).toBe(false);
  });

  it("equals handles different sizes (trailing zeros)", () => {
    const a = BitSet.fromArray([1]);
    const b = BitSet.fromArray([1]);
    b.set(100); b.clear(100); // forces larger internal array
    expect(a.equals(b)).toBe(true);
  });

  it("clone produces independent copy", () => {
    const a = BitSet.fromArray([1, 5]);
    const b = a.clone();
    b.set(10);
    expect(a.get(10)).toBe(false);
  });

  it("length returns highest set bit + 1", () => {
    const bs = BitSet.fromArray([0, 5, 63]);
    expect(bs.length()).toBe(64);
    expect(new BitSet().length()).toBe(0);
  });

  it("compact trims trailing zero words", () => {
    const bs = new BitSet(256);
    bs.set(5);
    bs.compact();
    expect(bs.get(5)).toBe(true);
    expect(bs.cardinality()).toBe(1);
  });
});

describe("BitSet — serialization", () => {
  it("toHex / fromHex round-trip", () => {
    const a = BitSet.fromArray([0, 15, 31, 32, 63]);
    const b = BitSet.fromHex(a.toHex());
    expect(a.equals(b)).toBe(true);
  });

  it("fromArray / toArray round-trip", () => {
    const bits = [0, 7, 31, 32, 63, 127, 200];
    const bs = BitSet.fromArray(bits);
    expect(bs.toArray()).toEqual(bits);
  });

  it("fromBinaryString / toBinaryString round-trip", () => {
    const s = "10110100";
    const bs = BitSet.fromBinaryString(s);
    expect(bs.toBinaryString(s.length)).toBe(s);
  });

  it("toString", () => {
    const bs = BitSet.fromArray([1, 3, 5]);
    expect(bs.toString()).toBe("BitSet{1,3,5}");
  });
});

describe("BitSet — practical: bloom-filter-like membership test", () => {
  it("sieve of Eratosthenes using BitSet", () => {
    const limit = 100;
    const sieve = new BitSet(limit + 1);
    sieve.setRange(2, limit + 1); // set 2..100

    for (let i = 2; i * i <= limit; i++) {
      if (sieve.get(i)) {
        for (let j = i * i; j <= limit; j += i) sieve.clear(j);
      }
    }

    const primes = sieve.toArray();
    expect(primes).toContain(2);
    expect(primes).toContain(97);
    expect(primes).not.toContain(4);
    expect(primes).not.toContain(100);
    // There are 25 primes up to 100
    expect(primes.length).toBe(25);
  });
});

describe("BitSet — large bits across word boundaries", () => {
  it("handles bits at exact word boundaries (31, 32, 63, 64)", () => {
    const bs = new BitSet();
    [31, 32, 63, 64, 127, 128].forEach(b => bs.set(b));
    [31, 32, 63, 64, 127, 128].forEach(b => expect(bs.get(b)).toBe(true));
    [30, 33, 62, 65, 126, 129].forEach(b => expect(bs.get(b)).toBe(false));
  });

  it("or expands size when other is larger", () => {
    const a = new BitSet(32);
    const b = new BitSet();
    b.set(200);
    a.or(b);
    expect(a.get(200)).toBe(true);
  });
});
