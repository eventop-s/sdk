import resolve  from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import babel    from '@rollup/plugin-babel';
import { copyFileSync, mkdirSync } from 'fs';

// Copy .d.ts files into dist after build
// Rollup doesn't process .d.ts — we just need them in the right place
function copyTypes() {
  return {
    name: 'copy-types',
    closeBundle() {
      // Main types
      mkdirSync('dist', { recursive: true });
      copyFileSync('src/index.d.ts', 'dist/index.d.ts');

      // React subpath types
      mkdirSync('dist/react', { recursive: true });
      copyFileSync('src/react/index.d.ts', 'dist/react/index.d.ts');

      console.log('✓ Type declarations copied to dist/');
    },
  };
}

const babelPlugin = babel({
  babelHelpers: 'bundled',
  presets:      ['@babel/preset-react'],
  extensions:   ['.js', '.jsx'],
});

export default [

  // ── Main SDK ──────────────────────────────────────────────────────────────
  {
    input:    'src/index.js',
    external: ['react'],
    output: [
      { file: 'dist/index.js',  format: 'esm' },
      { file: 'dist/index.cjs', format: 'cjs' },
    ],
    plugins: [
      resolve(),
      commonjs(),
      babelPlugin,
      copyTypes(), // runs once after all outputs are written
    ],
  },

  // ── React subpath ─────────────────────────────────────────────────────────
  {
    input:    'src/react/index.js',
    external: ['react'],
    output: [
      { file: 'dist/react/index.js',  format: 'esm' },
      { file: 'dist/react/index.cjs', format: 'cjs' },
    ],
    plugins: [
      resolve(),
      commonjs(),
      babelPlugin,
    ],
  },

];