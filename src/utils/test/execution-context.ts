import { UserPayload } from '@/auth/jwt.schema';
import { User } from '@/users/users.dto';

export function createContext(requestInit?: { user?: UserPayload | User }) {
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
        else return {} as T;
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
