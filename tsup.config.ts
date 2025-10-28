import { defineConfig } from 'tsup';
import { copyFileSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// 递归复制目录
function copyDir(src: string, dest: string) {
  mkdirSync(dest, { recursive: true });
  const entries = readdirSync(src);
  
  for (const entry of entries) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    
    if (statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  target: 'node18',
  dts: true,
  minify: true,
  outDir: 'dist',
  banner: {
    js: '#!/usr/bin/env node',
  },
  clean: true,
  onSuccess: async () => {
    // 复制 UI 静态文件到 dist 目录
    console.log('Copying UI public files...');
    try {
      copyDir('src/ui/public', 'dist/ui/public');
      console.log('✓ UI public files copied successfully');
    } catch (error) {
      console.error('✗ Failed to copy UI public files:', error);
    }
  },
});
