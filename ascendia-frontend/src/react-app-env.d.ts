/// <reference types="react-scripts" />

// Algunos setups de TypeScript/VSCode no cargan los tipos de `process` en CRA.
// Esto tipa lo mínimo que usamos: `process.env.REACT_APP_*`.
declare const process: {
	env: Record<string, string | undefined>;
};
