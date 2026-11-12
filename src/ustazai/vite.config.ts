import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';

const root = fileURLToPath(new URL('.', import.meta.url));
const outDir = resolve(root, '../../tools/ustazai');
const models = [
  ['node_modules/@vladmandic/face-api/model', 'face', /^tiny_face_detector/],
  ['node_modules/@mediapipe/hands', 'hands', /^(hands[._]|hand_landmark).+\.(js|wasm|data|binarypb|tflite)$|^hands\.binarypb$/]
] as const;

export default defineConfig({
  root,
  base: '/tools/ustazai/',
  resolve: { alias: { '@': root } },
  build: { outDir, emptyOutDir: true },
  plugins: [
    react(), tailwind(),
    {
      name: 'camera-model-assets',
      closeBundle() {
        for (const [packagePath, folder, matches] of models) {
          const source = resolve(root, packagePath);
          const target = resolve(outDir, 'models', folder);
          const files = readdirSync(source).filter(name => matches.test(name));
          if (!files.length) throw new Error('Camera model assets missing: ' + packagePath);
          mkdirSync(target, { recursive: true });
          for (const name of files) copyFileSync(resolve(source, name), resolve(target, name));
        }
      }
    }
  ]
});
