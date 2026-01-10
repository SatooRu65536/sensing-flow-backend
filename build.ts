import { esbuildDecorators } from '@anatine/esbuild-decorators';
import { build, BuildOptions, SameShape } from 'esbuild';
import { resolve } from 'path';
import { globSync } from 'glob';

async function main() {
  const entryPoints = globSync(resolve(__dirname, 'src/handlers/*.ts'));

  const plugins = [esbuildDecorators({})];
  const options: SameShape<BuildOptions, BuildOptions> = {
    entryPoints,
    bundle: true,

    outdir: resolve(__dirname, 'dist'),
    platform: 'node',
    target: 'node20',
    sourcemap: true,
    external: [
      '@nestjs/websockets/socket-module',
      '@nestjs/microservices/microservices-module',
      '@nestjs/microservices',
      '@grpc/grpc-js',
      '@grpc/proto-loader',
      'class-transformer/storage',
      'mqtt',
      'ioredis',
      'kafkajs',
      'nats',
    ],
    format: 'esm',
    metafile: true,
    logLevel: 'info',
    minify: true,
    keepNames: true,
    mainFields: ['module', 'main'],
    outExtension: { '.js': '.mjs' },
    plugins,
  };

  await build(options);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
