import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
  input: 'src/index.js',
  watch: true,
  // external: ['d3', 'svgcanvas'],
  output: [
    {
      file: 'docs/dist/cgview-parsers.js',
      format: 'iife',
      name: 'CGVParse',
      // globals: {d3: 'd3', svgcanvas: 'svgcanvas'},
    },
    {
      file: 'docs/dist/cgview-parsers.min.js',
      format: 'iife',
      name: 'CGVParse',
      // globals: {d3: 'd3', svgcanvas: 'svgcanvas'},
      plugins: [terser()],
    },
    // {
    //   file: 'docs/dist/cgview.esm.min.js',
    //   format: 'es',
    //   globals: {d3: 'd3', svgcanvas: 'svgcanvas'},
    //   plugins: [terser()],
    // },
    // {
    //   file: 'docs/dist/cgview.esm.js',
    //   // globals: {d3: 'd3', svgcanvas: 'svgcanvas'},
    //   format: 'es',
    // },
    // {
    //   file: 'dist/cgview.umd.min.js',
    //   format: 'umd',
    //   name: 'CGV',
    //   plugins: [terser()]
    // }
  ],
  plugins: [ nodeResolve(), json() ]
};


