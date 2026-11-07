// Minimal types for the one papaparse call the staff import makes (CSV text to rows).
// papaparse 5.x ships no types, and the @types package would be one more dependency.
declare module "papaparse" {
  export type ParseConfig = {
    skipEmptyLines?: boolean | "greedy";
  };

  export type ParseResult<T> = {
    data: T[];
    errors: { type?: string; message: string; row?: number }[];
  };

  const Papa: {
    parse<T = string[]>(input: string, config?: ParseConfig): ParseResult<T>;
  };

  export default Papa;
}
