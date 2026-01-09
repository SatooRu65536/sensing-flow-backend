import 'reflect-metadata';
import plansConfig from '@/plans.json';
import { PlansConfigRaw } from './plans-config/plans-config.schema';

const originalPlansConfig: PlansConfigRaw = structuredClone(plansConfig);

beforeEach(() => {
  // テスト中の console.error を無効化する
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  // 全てのモックをリセット
  vi.resetAllMocks();

  // plansJson を元に戻す
  Object.assign(plansConfig, structuredClone(originalPlansConfig));
});
