import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
  input: 'src/index.js',
  watch: true,
  // external: ['d3', 'svgcanvas'],
  output: [
    {
      file: 'dist/CGParse.js',
      format: 'iife',
      name: 'CGParse',
      // globals: {d3: 'd3', svgcanvas: 'svgcanvas'},
    },
    {
      file: 'docs/scripts/CGParse.min.js',
      format: 'iife',
      name: 'CGParse',
      // globals: {d3: 'd3', svgcanvas: 'svgcanvas'},
      plugins: [terser()],
    },
    // {
    //   file: 'docs/dist/cgview.esm.min.js',
    //   format: 'es',
    //   globals: {d3: 'd3', svgcanvas: 'svgcanvas'},
    //   plugins: [terser()],
    // },
    {
      file: 'dist/CGParse.esm.js',
      // globals: {d3: 'd3', svgcanvas: 'svgcanvas'},
      format: 'es',
    },
    // {
    //   file: 'dist/cgview.umd.min.js',
    //   format: 'umd',
    //   name: 'CGV',
    //   plugins: [terser()]
    // }
  ],
  plugins: [ nodeResolve(), json() ]
};


