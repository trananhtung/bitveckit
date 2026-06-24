/**
 * BitSet — a dynamic bit vector backed by Uint32Array.
 *
 * API mirrors Java java.util.BitSet, with additions from Python bitarray
 * and C# System.Collections.BitArray.
 *
 * Word size: 32 bits per Uint32Array element.
 * Auto-grows on set(); never shrinks automatically (call compact() to trim).
 *
 * @example
 * const bs = new BitSet();
 * bs.set(0).set(5).set(100);
 * bs.get(5);           // true
 * bs.cardinality();    // 3  (popcount)
 * bs.nextSetBit(1);    // 5
 *
 * const a = BitSet.fromArray([1, 3, 5]);
 * const b = BitSet.fromArray([3, 5, 7]);
 * a.and(b).toArray();  // [3, 5]  (intersection)
 */

const WORD_BITS = 32;

function wordIndex(bit: number): number { return bit >>> 5; }
function bitMask(bit: number): number { return 1 << (bit & 31); }

function popcount32(x: number): number {
  x = x - ((x >>> 1) & 0x55555555);
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  x = (x + (x >>> 4)) & 0x0f0f0f0f;
  return Math.imul(x, 0x01010101) >>> 24;
}

/** Number of trailing zeros in a 32-bit int (returns 32 for 0). */
function ctz32(x: number): number {
  if (x === 0) return 32;
  let n = 0;
  if ((x & 0x0000ffff) === 0) { n += 16; x >>>= 16; }
  if ((x & 0x000000ff) === 0) { n += 8;  x >>>=  8; }
  if ((x & 0x0000000f) === 0) { n += 4;  x >>>=  4; }
  if ((x & 0x00000003) === 0) { n += 2;  x >>>=  2; }
  if ((x & 0x00000001) === 0) { n += 1; }
  return n;
}

export class BitSet {
  private _words: Uint32Array;

  constructor(initialCapacityBits = 0) {
    const words = Math.max(1, Math.ceil(initialCapacityBits / WORD_BITS));
    this._words = new Uint32Array(words);
  }

  private _ensureCapacity(bit: number): void {
    const needed = wordIndex(bit) + 1;
    if (needed > this._words.length) {
      const next = new Uint32Array(Math.max(needed, this._words.length * 2));
      next.set(this._words);
      this._words = next;
    }
  }

  /** Set bit `index` to 1. Returns `this` for chaining. */
  set(index: number, value = true): this {
    if (index < 0) throw new RangeError(`Bit index must be ≥ 0, got ${index}`);
    if (value) {
      this._ensureCapacity(index);
      this._words[wordIndex(index)]! |= bitMask(index);
    } else {
      if (wordIndex(index) < this._words.length) {
        this._words[wordIndex(index)]! &= ~bitMask(index);
      }
    }
    return this;
  }

  /** Clear bit `index` (set to 0). Returns `this` for chaining. */
  clear(index?: number): this {
    if (index === undefined) {
      this._words.fill(0);
    } else {
      if (index < 0) throw new RangeError(`Bit index must be ≥ 0, got ${index}`);
      if (wordIndex(index) < this._words.length) {
        this._words[wordIndex(index)]! &= ~bitMask(index);
      }
    }
    return this;
  }

  /** Toggle bit `index`. Returns `this`. */
  flip(index: number): this {
    if (index < 0) throw new RangeError(`Bit index must be ≥ 0, got ${index}`);
    this._ensureCapacity(index);
    this._words[wordIndex(index)]! ^= bitMask(index);
    return this;
  }

  /** Returns `true` if bit `index` is set. */
  get(index: number): boolean {
    if (index < 0) throw new RangeError(`Bit index must be ≥ 0, got ${index}`);
    const wi = wordIndex(index);
    return wi < this._words.length ? (this._words[wi]! & bitMask(index)) !== 0 : false;
  }

  /** Set all bits in range [from, to) to 1. */
  setRange(from: number, to: number): this {
    if (from >= to) return this;
    this._ensureCapacity(to - 1);
    for (let i = from; i < to; i++) this._words[wordIndex(i)]! |= bitMask(i);
    return this;
  }

  /** Clear all bits in range [from, to). */
  clearRange(from: number, to: number): this {
    for (let i = from; i < to; i++) {
      if (wordIndex(i) < this._words.length) this._words[wordIndex(i)]! &= ~bitMask(i);
    }
    return this;
  }

  /** Flip all bits in range [from, to). */
  flipRange(from: number, to: number): this {
    if (from >= to) return this;
    this._ensureCapacity(to - 1);
    for (let i = from; i < to; i++) this._words[wordIndex(i)]! ^= bitMask(i);
    return this;
  }

  // ── Bitwise ops (in-place, returns this) ───────────────────────────────────

  /** AND with `other` (intersection). Result has length = max(this, other). */
  and(other: BitSet): this {
    const len = Math.min(this._words.length, other._words.length);
    for (let i = 0; i < len; i++) this._words[i]! &= other._words[i]!;
    // Bits beyond other's length become 0
    for (let i = len; i < this._words.length; i++) this._words[i] = 0;
    return this;
  }

  /** OR with `other` (union). Grows this if needed. */
  or(other: BitSet): this {
    if (other._words.length > this._words.length) {
      const next = new Uint32Array(other._words.length);
      next.set(this._words);
      this._words = next;
    }
    for (let i = 0; i < other._words.length; i++) this._words[i]! |= other._words[i]!;
    return this;
  }

  /** XOR with `other` (symmetric difference). Grows this if needed. */
  xor(other: BitSet): this {
    if (other._words.length > this._words.length) {
      const next = new Uint32Array(other._words.length);
      next.set(this._words);
      this._words = next;
    }
    for (let i = 0; i < other._words.length; i++) this._words[i]! ^= other._words[i]!;
    return this;
  }

  /** AND NOT with `other` (this minus other / set difference). */
  andNot(other: BitSet): this {
    const len = Math.min(this._words.length, other._words.length);
    for (let i = 0; i < len; i++) this._words[i]! &= ~other._words[i]!;
    return this;
  }

  /** Invert all bits up to `length` bits. */
  not(length?: number): this {
    const len = length !== undefined ? Math.ceil(length / WORD_BITS) : this._words.length;
    if (len > this._words.length) {
      const next = new Uint32Array(len);
      next.set(this._words);
      this._words = next;
    }
    for (let i = 0; i < len; i++) this._words[i] = ~this._words[i]! >>> 0;
    // Mask out bits beyond `length`
    if (length !== undefined && length % WORD_BITS !== 0) {
      const lastWord = Math.floor(length / WORD_BITS);
      this._words[lastWord]! &= (1 << (length % WORD_BITS)) - 1;
    }
    return this;
  }

  // ── Non-mutating versions ───────────────────────────────────────────────────

  andWith(other: BitSet): BitSet { return this.clone().and(other); }
  orWith(other: BitSet): BitSet  { return this.clone().or(other); }
  xorWith(other: BitSet): BitSet { return this.clone().xor(other); }
  andNotWith(other: BitSet): BitSet { return this.clone().andNot(other); }

  // ── Cardinality / counting ──────────────────────────────────────────────────

  /** Number of set bits (popcount). O(n words). */
  cardinality(): number {
    let count = 0;
    for (const w of this._words) count += popcount32(w);
    return count;
  }

  /** True if all bits are 0. */
  isEmpty(): boolean {
    for (const w of this._words) if (w !== 0) return false;
    return true;
  }

  /** True if this and `other` share at least one set bit. */
  intersects(other: BitSet): boolean {
    const len = Math.min(this._words.length, other._words.length);
    for (let i = 0; i < len; i++) if ((this._words[i]! & other._words[i]!) !== 0) return true;
    return false;
  }

  // ── Iteration ───────────────────────────────────────────────────────────────

  /** Index of the next set bit ≥ `fromIndex`, or -1 if none. */
  nextSetBit(fromIndex = 0): number {
    let wi = wordIndex(fromIndex);
    if (wi >= this._words.length) return -1;
    // Mask out bits below fromIndex in the first word
    let word = this._words[wi]! & (~0 << (fromIndex & 31));
    while (true) {
      if (word !== 0) return wi * WORD_BITS + ctz32(word);
      wi++;
      if (wi >= this._words.length) return -1;
      word = this._words[wi]!;
    }
  }

  /** Index of the next clear bit ≥ `fromIndex`. */
  nextClearBit(fromIndex = 0): number {
    let wi = wordIndex(fromIndex);
    if (wi >= this._words.length) return fromIndex;
    let word = ~this._words[wi]! & (~0 << (fromIndex & 31));
    while (true) {
      if (word !== 0) return wi * WORD_BITS + ctz32(word);
      wi++;
      if (wi >= this._words.length) return wi * WORD_BITS;
      word = ~this._words[wi]!;
    }
  }

  /** Index of the previous set bit ≤ `fromIndex`, or -1 if none. */
  previousSetBit(fromIndex: number): number {
    let wi = Math.min(wordIndex(fromIndex), this._words.length - 1);
    if (wi < 0) return -1;
    let word = this._words[wi]! & ((fromIndex & 31) === 31 ? ~0 : (1 << ((fromIndex & 31) + 1)) - 1);
    while (true) {
      if (word !== 0) return wi * WORD_BITS + 31 - Math.clz32(word);
      wi--;
      if (wi < 0) return -1;
      word = this._words[wi]!;
    }
  }

  /** Iterate all set bit indices. */
  *[Symbol.iterator](): Iterator<number> {
    for (let wi = 0; wi < this._words.length; wi++) {
      let word = this._words[wi]!;
      while (word !== 0) {
        const bit = ctz32(word);
        yield wi * WORD_BITS + bit;
        word &= word - 1; // clear lowest set bit
      }
    }
  }

  /** All set bit indices as an array. */
  toArray(): number[] {
    return [...this];
  }

  // ── Equality / cloning ──────────────────────────────────────────────────────

  equals(other: BitSet): boolean {
    const len = Math.max(this._words.length, other._words.length);
    for (let i = 0; i < len; i++) {
      const a = i < this._words.length ? this._words[i]! : 0;
      const b = i < other._words.length ? other._words[i]! : 0;
      if (a !== b) return false;
    }
    return true;
  }

  clone(): BitSet {
    const bs = new BitSet();
    bs._words = new Uint32Array(this._words);
    return bs;
  }

  /** Trim trailing zero words to save memory. */
  compact(): this {
    let len = this._words.length;
    while (len > 1 && this._words[len - 1] === 0) len--;
    if (len < this._words.length) this._words = this._words.slice(0, len);
    return this;
  }

  /** Highest set bit index + 1, or 0 if empty. Like Java's length(). */
  length(): number {
    for (let wi = this._words.length - 1; wi >= 0; wi--) {
      if (this._words[wi] !== 0) return wi * WORD_BITS + 32 - Math.clz32(this._words[wi]!);
    }
    return 0;
  }

  // ── Serialization ───────────────────────────────────────────────────────────

  /** Hex string (little-endian words). */
  toHex(): string {
    return Array.from(this._words)
      .map(w => w.toString(16).padStart(8, "0"))
      .join("");
  }

  static fromHex(hex: string): BitSet {
    const bs = new BitSet();
    const words = new Uint32Array(Math.ceil(hex.length / 8));
    for (let i = 0; i < words.length; i++) {
      words[i] = parseInt(hex.slice(i * 8, i * 8 + 8), 16) >>> 0;
    }
    bs._words = words;
    return bs;
  }

  /** Create a BitSet from an array of set bit indices. */
  static fromArray(bits: number[]): BitSet {
    const bs = new BitSet();
    for (const b of bits) bs.set(b);
    return bs;
  }

  /** Create a BitSet from a binary string (e.g. "10110"). Index 0 = leftmost char. */
  static fromBinaryString(s: string): BitSet {
    const bs = new BitSet(s.length);
    for (let i = 0; i < s.length; i++) {
      if (s[i] === "1") bs.set(i);
    }
    return bs;
  }

  /** Binary string representation. Index 0 = leftmost char. */
  toBinaryString(length?: number): string {
    const len = length ?? this.length();
    if (len === 0) return "0";
    return Array.from({ length: len }, (_, i) => this.get(i) ? "1" : "0").join("");
  }

  toString(): string {
    return `BitSet{${this.toArray().join(",")}}`;
  }
}
