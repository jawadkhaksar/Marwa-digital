// Separate entry point (import from "@marwa/builder/react") for React
// components, kept out of the main index.ts — packages/api imports from
// "@marwa/builder" too, and it's a plain Node/Express backend with no
// DOM lib or JSX config, so pulling a .tsx file into that program would
// break its typecheck for no reason.
export type { PhoneInputWithCountryProps } from "./src/components/PhoneInputWithCountry";
export { PhoneInputWithCountry } from "./src/components/PhoneInputWithCountry";
export { FlagIcon } from "./src/components/FlagIcon";
