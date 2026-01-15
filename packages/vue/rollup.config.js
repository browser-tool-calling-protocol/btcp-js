import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';

const external = ['vue', '@btcp/vanilla'];

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
  // ESM build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.esm.js',
      format: 'esm',
      sourcemap: true,
    },
    external,
    plugins,
  },

  // CJS build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.cjs.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
    },
    external,
    plugins,
  },
];
