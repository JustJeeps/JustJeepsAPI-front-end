// Incremental SHA-256.
//
// Why not crypto.subtle: its digest() takes the whole message at once, so
// hashing a file means holding every byte in memory. The panel accepts files in
// the 100MB class, and on a low-end laptop that allocation is what freezes (or
// kills) the tab before a single byte has been uploaded. This version takes the
// file slice by slice and keeps only the 64-byte block state.
//
// Straight FIPS 180-4, no dependencies. Checked against Node's crypto for
// empty, sub-block, block-aligned, 1MB and 8MB+123 inputs, fed both in one call
// and in uneven slices, so the slicing above cannot change the result.

const K = new Uint32Array([
	0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
	0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
	0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
	0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
	0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
	0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
	0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
	0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

const rotr = (x, n) => (x >>> n) | (x << (32 - n));

export class Sha256 {
	constructor() {
		this.state = new Uint32Array([
			0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
		]);
		this.buffer = new Uint8Array(64);
		this.bufferLength = 0;
		this.totalBytes = 0;
		this.words = new Uint32Array(64);
	}

	compress(block, offset) {
		const w = this.words;
		for (let i = 0; i < 16; i += 1) {
			const j = offset + i * 4;
			w[i] = (block[j] << 24) | (block[j + 1] << 16) | (block[j + 2] << 8) | block[j + 3];
		}
		for (let i = 16; i < 64; i += 1) {
			const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
			const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
			w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
		}

		let [a, b, c, d, e, f, g, h] = this.state;
		for (let i = 0; i < 64; i += 1) {
			const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
			const ch = (e & f) ^ (~e & g);
			const temp1 = (h + s1 + ch + K[i] + w[i]) | 0;
			const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
			const maj = (a & b) ^ (a & c) ^ (b & c);
			const temp2 = (s0 + maj) | 0;

			h = g; g = f; f = e;
			e = (d + temp1) | 0;
			d = c; c = b; b = a;
			a = (temp1 + temp2) | 0;
		}

		const s = this.state;
		s[0] = (s[0] + a) | 0; s[1] = (s[1] + b) | 0; s[2] = (s[2] + c) | 0; s[3] = (s[3] + d) | 0;
		s[4] = (s[4] + e) | 0; s[5] = (s[5] + f) | 0; s[6] = (s[6] + g) | 0; s[7] = (s[7] + h) | 0;
	}

	update(bytes) {
		this.totalBytes += bytes.length;
		let position = 0;

		// Whatever was left over from the previous slice is topped up to a full
		// block first, so slices of any size behave like one continuous stream.
		if (this.bufferLength > 0) {
			const needed = Math.min(64 - this.bufferLength, bytes.length);
			this.buffer.set(bytes.subarray(0, needed), this.bufferLength);
			this.bufferLength += needed;
			position = needed;
			if (this.bufferLength < 64) return this;
			this.compress(this.buffer, 0);
			this.bufferLength = 0;
		}

		for (; position + 64 <= bytes.length; position += 64) this.compress(bytes, position);

		if (position < bytes.length) {
			this.buffer.set(bytes.subarray(position), 0);
			this.bufferLength = bytes.length - position;
		}
		return this;
	}

	// Finishing consumes the state (the padding block is compressed into it), so
	// the result is kept and returned again on a second call.
	hex() {
		if (this.digest) return this.digest;
		const bitLength = this.totalBytes * 8;
		const tail = new Uint8Array(this.bufferLength < 56 ? 64 : 128);
		tail.set(this.buffer.subarray(0, this.bufferLength), 0);
		tail[this.bufferLength] = 0x80;

		// The length goes in as 64 bits. Files here are far below 2^53 bytes, so
		// the high word is derived with division rather than 64-bit arithmetic.
		const view = new DataView(tail.buffer);
		view.setUint32(tail.length - 8, Math.floor(bitLength / 0x100000000));
		view.setUint32(tail.length - 4, bitLength >>> 0);

		for (let offset = 0; offset < tail.length; offset += 64) this.compress(tail, offset);

		let hex = '';
		for (const word of this.state) hex += word.toString(16).padStart(8, '0');
		this.digest = hex;
		return hex;
	}
}
