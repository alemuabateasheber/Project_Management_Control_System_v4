import { FlatCompat } from '@eslint/eslintrc';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const filePath = fileURLToPath(import.meta.url);
const baseDirectory = path.dirname(filePath);
const compat = new FlatCompat({ baseDirectory });

export default [
  ...compat.extends('next/core-web-vitals'),
  {
    ignores: ['.next/**', 'node_modules/**'],
  },
];
