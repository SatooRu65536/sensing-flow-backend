import 'reflect-metadata';
import { afterAll, beforeAll, vi } from 'vitest';

beforeAll(() => {
  // テスト中の console.error を無効化する
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  vi.restoreAllMocks();
});
