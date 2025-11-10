export class BinaryReader {
    public buffer: Buffer;
    public offset: number;

    constructor(buffer: Buffer, offset = 0) {
        this.buffer = buffer;
        this.offset = offset;
    }

    #checkBounds(bytes: number) {
        if (this.offset + bytes > this.buffer.length) {
            throw new Error(`BinaryReader: Attempted to read ${bytes} bytes at offset ${this.offset}, but only ${this.buffer.length - this.offset} bytes remaining`);
        }
    }

    get remaining() {
        return this.buffer.length - this.offset;
    }

    seek(offset: number) {
        if (offset < 0 || offset > this.buffer.length) {
            throw new Error(`BinaryReader: Seek out of bounds (${offset})`);
        }
        this.offset = offset;
    }

    skip(bytes: number) {
        this.#checkBounds(bytes);
        this.offset += bytes;
    }

    readUInt8() {
        this.#checkBounds(1);
        const value = this.buffer.readUInt8(this.offset);
        this.offset += 1;
        return value;
    }

    readUInt16LE() {
        this.#checkBounds(2);
        const value = this.buffer.readUInt16LE(this.offset);
        this.offset += 2;
        return value;
    }

    readUInt16BE() {
        this.#checkBounds(2);
        const value = this.buffer.readUInt16BE(this.offset);
        this.offset += 2;
        return value;
    }

    readUInt32LE() {
        this.#checkBounds(4);
        const value = this.buffer.readUInt32LE(this.offset);
        this.offset += 4;
        return value;
    }

    readUInt32BE() {
        this.#checkBounds(4);
        const value = this.buffer.readUInt32BE(this.offset);
        this.offset += 4;
        return value;
    }

    readUInt64LE() {
        this.#checkBounds(8);
        const value = this.buffer.readBigUInt64LE(this.offset);
        this.offset += 8;
        return value;
    }

    readUInt64BE() {
        this.#checkBounds(8);
        const value = this.buffer.readBigUInt64BE(this.offset);
        this.offset += 8;
        return value;
    }

    readInt8() {
        this.#checkBounds(1);
        const value = this.buffer.readInt8(this.offset);
        this.offset += 1;
        return value;
    }

    readInt16LE() {
        this.#checkBounds(2);
        const value = this.buffer.readInt16LE(this.offset);
        this.offset += 2;
        return value;
    }

    readInt16BE() {
        this.#checkBounds(2);
        const value = this.buffer.readInt16BE(this.offset);
        this.offset += 2;
        return value;
    }

    readInt32LE() {
        this.#checkBounds(4);
        const value = this.buffer.readInt32LE(this.offset);
        this.offset += 4;
        return value;
    }

    readInt32BE() {
        this.#checkBounds(4);
        const value = this.buffer.readInt32BE(this.offset);
        this.offset += 4;
        return value;
    }

    readInt64LE() {
        this.#checkBounds(8);
        const value = this.buffer.readBigInt64LE(this.offset);
        this.offset += 8;
        return value;
    }

    readInt64BE() {
        this.#checkBounds(8);
        const value = this.buffer.readBigInt64BE(this.offset);
        this.offset += 8;
        return value;
    }

    readUInt32() {
        return this.readUInt32BE();
    }

    readInt32() {
        return this.readInt32BE();
    }

    readUInt64() {
        return this.readUInt64BE();
    }

    readUInt16() {
        return this.readUInt16BE();
    }

    readFloatLE() {
        this.#checkBounds(4);
        const value = this.buffer.readFloatLE(this.offset);
        this.offset += 4;
        return value;
    }

    readFloatBE() {
        this.#checkBounds(4);
        const value = this.buffer.readFloatBE(this.offset);
        this.offset += 4;
        return value;
    }

    readDoubleLE() {
        this.#checkBounds(8);
        const value = this.buffer.readDoubleLE(this.offset);
        this.offset += 8;
        return value;
    }

    readDoubleBE() {
        this.#checkBounds(8);
        const value = this.buffer.readDoubleBE(this.offset);
        this.offset += 8;
        return value;
    }

    readString(length: number, encoding: BufferEncoding = 'utf8') {
        this.#checkBounds(length);
        const value = this.buffer.toString(encoding, this.offset, this.offset + length);
        this.offset += length;
        return value;
    }

    readCString(encoding: BufferEncoding = 'utf8') {
        const start = this.offset;
        let end = start;
        
        while (end < this.buffer.length && this.buffer[end] !== 0) {
            end++;
        }
        
        const value = this.buffer.toString(encoding, start, end);
        this.offset = end + 1;
        
        return value;
    }

    readLengthPrefixedString(encoding: BufferEncoding = 'utf8') {
        const length = this.readUInt32LE();
        this.readInt32();
        return this.readString(length, encoding);
    }

    readBytes(length: number) {
        this.#checkBounds(length);
        const value = this.buffer.subarray(this.offset, this.offset + length);
        this.offset += length;
        return value;
    }

    peekBytes(length: number) {
        this.#checkBounds(length);
        return this.buffer.subarray(this.offset, this.offset + length);
    }

    peekUInt32LE() {
        this.#checkBounds(4);
        return this.buffer.readUInt32LE(this.offset);
    }

    peekUInt32BE() {
        this.#checkBounds(4);
        return this.buffer.readUInt32BE(this.offset);
    }

    peekUInt32() {
        return this.peekUInt32BE();
    }

    peekInt32() {
        this.#checkBounds(4);
        return this.buffer.readInt32BE(this.offset);
    }

    peekUInt16() {
        this.#checkBounds(2);
        return this.buffer.readUInt16BE(this.offset);
    }

    peekUInt64() {
        this.#checkBounds(8);
        return this.buffer.readBigUInt64BE(this.offset);
    }

    readRemaining() {
        const value = this.buffer.subarray(this.offset);
        this.offset = this.buffer.length;
        return value;
    }

    slice(length: number) {
        this.#checkBounds(length);
        return new BinaryReader(this.buffer.subarray(this.offset, this.offset + length));
    }

    tell() {
        return this.offset;
    }

    eof() {
        return this.offset >= this.buffer.length;
    }

    reset() {
        this.offset = 0;
    }
}