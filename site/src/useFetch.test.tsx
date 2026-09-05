// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useFetch } from './useFetch';

afterEach(() => vi.unstubAllGlobals());

const respondWith = (body: unknown, status = 200) =>
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status })));

it('parses the body through the parse function', async () => {
  respondWith({ n: 1 });
  const { result } = renderHook(() => useFetch('x.json', (d) => (d as { n: number }).n));
  await waitFor(() => expect(result.current.data).toBe(1));
  expect(result.current.loading).toBe(false);
});

it('reports a parse failure as an error instead of throwing into the tree', async () => {
  respondWith({ n: 1 });
  const { result } = renderHook(() =>
    useFetch('x.json', () => {
      throw new Error('nope');
    }),
  );
  await waitFor(() => expect(result.current.error).toBe('nope'));
  expect(result.current.data).toBeNull();
});

it('reports an HTTP failure', async () => {
  respondWith({}, 404);
  const { result } = renderHook(() => useFetch('x.json', (d) => d));
  await waitFor(() => expect(result.current.error).toBe('HTTP 404'));
});
