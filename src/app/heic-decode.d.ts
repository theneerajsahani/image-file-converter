declare module 'heic-decode' {
  interface DecodeOptions {
    buffer: Uint8Array | ArrayBuffer;
  }
  interface DecodeResult {
    width: number;
    height: number;
    data: ArrayBuffer;
  }
  function decode(options: DecodeOptions): Promise<DecodeResult>;
  export default decode;
}
