declare module "upng-js" {
  export function encode(
    imgs: ArrayBuffer[],
    w: number,
    h: number,
    cnum: number,
    dels?: number[]
  ): ArrayBuffer;

  export function decode(buffer: ArrayBuffer): {
    width: number;
    height: number;
    depth: number;
    ctype: number;
    frames: unknown[];
    tabs: Record<string, unknown>;
    data: Uint8Array;
  };

  export function toRGBA8(img: ReturnType<typeof decode>): ArrayBuffer[];

  const _default: {
    encode: typeof encode;
    decode: typeof decode;
    toRGBA8: typeof toRGBA8;
  };
  export default _default;
}
