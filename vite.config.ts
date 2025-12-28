import { VitePluginNode } from 'vite-plugin-node';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  server: {
    host: true,
    port: 3000,
  },
  resolve: {
    alias: [
      {
        find: '@',
        replacement: './src',
      },
    ],
  },
  plugins: [
    VitePluginNode({
      adapter: 'nest',
      appPath: './src/main.ts',
      exportName: 'viteNodeApp',
      tsCompiler: 'swc',
    }),
  ],
  optimizeDeps: {
    exclude: [
      '@nestjs/microservices',
      '@nestjs/websockets',
      'class-transformer',
      'class-transformer/storage',
      'class-validator',
    ],
  },
  test: {
    globals: true,
  },
});
