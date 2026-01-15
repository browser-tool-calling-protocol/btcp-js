import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';

const external = ['@anthropic-ai/btcp-client'];

const plugins = [
  typescript({
    tsconfig: './tsconfig.json',
    declaration: true,
    declarationDir: './dist',
  }),
  resolve(),
  commonjs(),
];

export default [
  // ESM build (for bundlers)
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/btcp-vanilla.esm.js',
      format: 'esm',
      sourcemap: true,
    },
    external,
    plugins,
  },

  // CJS build (for Node.js)
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/btcp-vanilla.cjs.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
    },
    external,
    plugins,
  },

  // UMD build (for browsers, bundles dependencies)
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/btcp-vanilla.umd.js',
      format: 'umd',
      name: 'BTCP',
      sourcemap: true,
      globals: {
        '@anthropic-ai/btcp-client': 'BTCPClient',
      },
    },
    external,
    plugins,
  },

  // IIFE minified (for CDN, bundles everything)
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/btcp-vanilla.min.js',
      format: 'iife',
      name: 'BTCP',
      sourcemap: true,
    },
    plugins: [...plugins, terser()],
  },
];
