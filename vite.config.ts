import { VitePluginNode } from 'vite-plugin-node';
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import swc from 'unplugin-swc';

export default defineConfig(({ mode }) => ({
  server: {
    host: true,
    port: 3000,
  },
  resolve: {
    alias: [
      {
        find: '@',
        replacement: resolve(__dirname, 'src'),
      },
    ],
  },
  plugins: [
    mode !== 'test' &&
      VitePluginNode({
        adapter: 'nest',
        appPath: './src/main.ts',
        exportName: 'viteNodeApp',
        tsCompiler: 'swc',
      }),
    mode === 'test' &&
      swc.vite({
        module: { type: 'es6' },
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
    setupFiles: ['./src/vitest.setup.ts'],
    coverage: {
      include: ['src/**/*.ts'],
      exclude: [
        '**/*.json',
        '**/*.controller.ts',
        '**/*.module.ts',
        '**/*.decorator.ts',
        '**/*.schema.ts',
        '**/*.model.ts',
        '**/*.dto.ts',
        '**/*.types.ts',
        'src/s3/s3.service.ts',
        'src/common/exceptions/**',
        'src/_schema/index.ts',
        'src/bootstrap.ts',
        'src/handler.ts',
        'src/main.ts',
        'src/permissions.gen.ts',
      ],
    },
  },
}));
