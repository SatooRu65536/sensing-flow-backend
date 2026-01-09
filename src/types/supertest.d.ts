import { typedRequest as typedRequestFn } from '@/common/utils/test/typed-request';

declare global {
  // グローバル変数として定義
  var request: typeof typedRequestFn;
}
