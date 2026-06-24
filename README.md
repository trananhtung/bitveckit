# bitveckit

> Zero-dependency TypeScript BitSet (bit vector). Full bitwise ops, popcount, nextSetBit/previousSetBit, ranges, serialization. Port of Java `java.util.BitSet` / Python `bitarray` / C# `BitArray`.

[![npm](https://img.shields.io/npm/v/bitveckit)](https://www.npmjs.com/package/bitveckit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Backed by `Uint32Array`, auto-grows on demand, O(1) `get`/`set`, O(popcount) iteration.

## Install

```bash
npm install bitveckit
```

## Quick start

```typescript
import { BitSet } from "bitveckit";

const bs = new BitSet();
bs.set(0).set(5).set(31).set(100);

bs.get(5);           // true
bs.cardinality();    // 4  (popcount)
bs.nextSetBit(1);    // 5
bs.toArray();        // [0, 5, 31, 100]

// Set operations
const a = BitSet.fromArray([1, 3, 5, 7]);
const b = BitSet.fromArray([3, 5, 9]);

a.andWith(b).toArray();    // [3, 5]  — intersection (non-mutating)
a.orWith(b).toArray();     // [1, 3, 5, 7, 9]  — union
a.xorWith(b).toArray();    // [1, 7, 9]  — symmetric difference
a.andNotWith(b).toArray(); // [1, 7]  — set difference (a minus b)
```

## Sieve of Eratosthenes

```typescript
import { BitSet } from "bitveckit";

const limit = 1_000_000;
const sieve = new BitSet(limit + 1);
sieve.setRange(2, limit + 1);

for (let i = 2; i * i <= limit; i++) {
  if (sieve.get(i)) {
    for (let j = i * i; j <= limit; j += i) sieve.clear(j);
  }
}

// Iterate all primes — O(primes), not O(limit)
for (const prime of sieve) console.log(prime);
```

## Bitwise operations

All mutating ops return `this` for chaining. All have a non-mutating `*With` variant that returns a new `BitSet`.

```typescript
bs.and(other)    // intersection — in-place
bs.or(other)     // union
bs.xor(other)    // symmetric difference
bs.andNot(other) // set difference (this minus other)
bs.not(length?)  // invert bits [0, length); length defaults to current internal size
bs.flip(index)   // toggle single bit

bs.andWith(other)    // → new BitSet
bs.orWith(other)     // → new BitSet
bs.xorWith(other)    // → new BitSet
bs.andNotWith(other) // → new BitSet
```

## Range operations

```typescript
bs.setRange(from, to)    // set bits [from, to)
bs.clearRange(from, to)  // clear bits [from, to)
bs.flipRange(from, to)   // toggle bits [from, to)
```

## Searching

```typescript
bs.nextSetBit(from?)      // next set bit ≥ from, or -1
bs.nextClearBit(from?)    // next clear bit ≥ from
bs.previousSetBit(from)   // previous set bit ≤ from, or -1
```

## Full API

```typescript
new BitSet(initialCapacityBits?: number)

// Single-bit ops
.set(index, value?: boolean): this
.clear(index?: number): this      // clear one bit, or all if no arg
.flip(index): this
.get(index): boolean

// Range ops
.setRange(from, to): this
.clearRange(from, to): this
.flipRange(from, to): this

// Bitwise (in-place)
.and(other) .or(other) .xor(other) .andNot(other) .not(length?): this

// Bitwise (non-mutating)
.andWith(other) .orWith(other) .xorWith(other) .andNotWith(other): BitSet

// Counting
.cardinality(): number    // popcount — O(words)
.isEmpty(): boolean
.intersects(other): boolean
.length(): number         // highest set bit + 1

// Iteration
.nextSetBit(from?): number
.nextClearBit(from?): number
.previousSetBit(from): number
[Symbol.iterator](): Iterator<number>  // yields set bit indices
.toArray(): number[]

// Equality
.equals(other): boolean
.clone(): BitSet
.compact(): this          // trim trailing zero words

// Serialization
.toHex(): string
.toBinaryString(length?): string
.toString(): string        // "BitSet{1,3,5}"

static fromArray(bits: number[]): BitSet
static fromHex(hex: string): BitSet
static fromBinaryString(s: string): BitSet
```

## Comparison

| | bitveckit | bitset (BitSet.js) | typedfastbitset |
|---|---|---|---|
| TypeScript-first | ✅ | bundled .d.ts since 2024 | partial |
| AND/OR/XOR/NOT | ✅ | AND/OR/XOR/NOT | union/intersect/diff (no NOT) |
| nextSetBit / previousSetBit | ✅ | lsb / msb | ❌ |
| Range ops | ✅ | slice | ❌ |
| fromBinaryString | ✅ | ❌ | ❌ |
| Zero deps | ✅ | ✅ | ✅ |

## License

MIT © [trananhtung](https://github.com/trananhtung)
