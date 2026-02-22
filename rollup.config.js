import resolve  from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import babel    from '@rollup/plugin-babel';
import { copyFileSync, mkdirSync } from 'fs';

// Copy .d.ts files into dist after build
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
  presets: [
    ['@babel/preset-env', { 
      targets: { node: '14' },
    }],
    ['@babel/preset-react', { runtime: 'automatic' }]
  ],
  extensions: ['.js', '.jsx'],
});

export default [

  // ── Main SDK ──────────────────────────────────────────────────────────────
  {
    input:    'src/index.js',
    external: ['react', 'react/jsx-runtime'],
    output: [
      { 
        dir: 'dist',
        format: 'esm',
        entryFileNames: 'index.js',
        chunkFileNames: '[name].js'
      },
      { 
        dir: 'dist',
        format: 'cjs',
        entryFileNames: 'index.cjs',
        chunkFileNames: '[name].cjs'
      },
    ],
    plugins: [
      resolve(),
      commonjs({ transformMixedEsModules: true }),
      babelPlugin,
      copyTypes(),
    ],
  },

  // ── React subpath ─────────────────────────────────────────────────────────
  {
    input:    'src/react/index.js',
    external: ['react', 'react/jsx-runtime'],
    output: [
      { 
        dir: 'dist/react',
        format: 'esm',
        entryFileNames: 'index.js',
        chunkFileNames: '[name].js'
      },
      { 
        dir: 'dist/react',
        format: 'cjs',
        entryFileNames: 'index.cjs',
        chunkFileNames: '[name].cjs'
      },
    ],
    plugins: [
      resolve(),
      commonjs({ transformMixedEsModules: true }),
      babelPlugin,
    ],
  },

];