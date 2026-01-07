import { UserPayload } from '@/auth/jwt.schema';
import { createUserPayload } from './test-factories';

export function createContext(requestInit?: { user?: UserPayload }) {
  return {
    getClass: vi.fn(),
    getHandler: vi.fn(),
    getArgs: vi.fn(),
    getArgByIndex: vi.fn(),
    switchToRpc: vi.fn(),
    switchToWs: vi.fn(),
    getType: vi.fn(),
    switchToHttp: () => ({
      getRequest<T = any>(): T {
        if (requestInit) return requestInit as T;
        else return { user: createUserPayload() } as T;
      },
      getResponse: vi.fn(),
      getNext: vi.fn(),
    }),
  };
}
export type ExecutionContextMock = ReturnType<typeof createContext>;

export function createReflectorMock() {
  return {
    get: vi.fn(),
    getAll: vi.fn(),
    getAllAndMerge: vi.fn(),
    getAllAndOverride: vi.fn(),
  };
}
export type ReflectorMock = ReturnType<typeof createReflectorMock>;
