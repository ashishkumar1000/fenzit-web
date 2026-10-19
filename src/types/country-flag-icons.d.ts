// country-flag-icons ships no types for its per-country string files. Each one default-exports
// the flag's SVG markup as a string.
declare module "country-flag-icons/string/3x2/*" {
  const svg: string;
  export default svg;
}
