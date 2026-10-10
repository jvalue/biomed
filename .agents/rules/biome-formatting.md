# Code Formatting, Code Style & Build Validation Rule

1. Always verify build compilation (e.g. `npx vite build`) after modifying code to ensure zero TypeScript or build errors.
2. Always run `npx biome check --write --unsafe .` after writing or modifying any JavaScript or TypeScript files to ensure clean formatting and zero linter warnings.
