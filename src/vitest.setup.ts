import 'reflect-metadata';

beforeEach(() => {
  // テスト中の console.error を無効化する
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.resetAllMocks();
});
