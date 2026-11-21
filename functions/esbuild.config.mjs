import { build } from 'esbuild';

// Empacota as functions embutindo @vai-chover/shared (o deploy do Firebase não resolve workspaces).
await build({
  entryPoints: ['src/index.ts'],
  outfile: 'lib/index.js',
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  sourcemap: true,
  external: ['firebase-admin', 'firebase-functions', 'date-fns-tz', 'zod'],
  loader: { '.json': 'json' },
});
