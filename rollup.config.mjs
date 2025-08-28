import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';
import { nodeResolve } from '@rollup/plugin-node-resolve';

const banner_license = `/*!
 * CGParse.js – Sequence & Feature Parser for CGView.js
 * Copyright © 2024–2025 Jason R. Grant
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */`;

export default {
  input: 'src/index.js',
  watch: true,
  output: [
    // IIFE (unminified)
    {
      file: 'docs/dist/cgparse.js',
      format: 'iife',
      name: 'CGParse',
      sourcemap: true,
    },
    // IIFE (minified) for CDN <script> usage
    {
      file: 'docs/dist/cgparse.min.js',
      format: 'iife',
      name: 'CGParse',
      plugins: [terser()],
      sourcemap: true,
      banner: banner_license,
    },
    // ESM (unminified) for npm consumers
    {
      file: 'docs/dist/cgparse.esm.js',
      format: 'es',
      sourcemap: true,
    },
    // ESM (minified) for CDN <script type="module"> usage
    {
      file: 'docs/dist/cgparse.esm.min.js',
      format: 'es',
      plugins: [terser()],
      sourcemap: true,
      banner: banner_license,
    }
  ],
  plugins: [ nodeResolve(), json() ]
};


