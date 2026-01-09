import swaggerDoc from '@/swagger.json';
import request from 'supertest';
import { App } from 'supertest/types';

type Paths = typeof swaggerDoc.paths;
type PathParam = string | number;
type ReplacePathParams<P extends string> = P extends `${infer Start}/{${string}}${infer End}`
  ? `${Start}/${PathParam}${ReplacePathParams<End>}`
  : P;

// GET エンドポイント型
type GetEndpoints = {
  [P in keyof Paths]: Paths[P] extends { get: any } ? ReplacePathParams<P & string> : never;
}[keyof Paths];

// POST エンドポイント型
type PostEndpoints = {
  [P in keyof Paths]: Paths[P] extends { post: any } ? ReplacePathParams<P & string> : never;
}[keyof Paths];

// PATCH エンドポイント型
type PatchEndpoints = {
  [P in keyof Paths]: Paths[P] extends { patch: any } ? ReplacePathParams<P & string> : never;
}[keyof Paths];

// PUT エンドポイント型
type PutEndpoints = {
  [P in keyof Paths]: Paths[P] extends { put: any } ? ReplacePathParams<P & string> : never;
}[keyof Paths];

// DELETE エンドポイント型
type DeleteEndpoints = {
  [P in keyof Paths]: Paths[P] extends { delete: any } ? ReplacePathParams<P & string> : never;
}[keyof Paths];

export const typedRequest = (app: App) => {
  const agent = request(app);

  return {
    get: (url: GetEndpoints) => agent.get(url),
    post: (url: PostEndpoints) => agent.post(url),
    patch: (url: PatchEndpoints) => agent.patch(url),
    put: (url: PutEndpoints) => agent.put(url),
    delete: (url: DeleteEndpoints) => agent.delete(url),
  };
};
