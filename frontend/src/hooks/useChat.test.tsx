// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useChat } from "./useChat";
import { streamChat } from "../api/client";
vi.mock("../api/client", () => ({ streamChat: vi.fn() }));
afterEach(() => vi.clearAllMocks());

it("ignores callbacks from a reset conversation", async () => {
  const mock = vi.mocked(streamChat);
  mock.mockResolvedValue();
  const { result } = renderHook(() => useChat());
  await act(async () => { await result.current.send("Question"); });
  const cb = mock.mock.calls[0][3];
  act(() => { result.current.reset(); cb.onToken("Late token"); cb.onError(new Error("Late failure")); });
  expect(result.current.messages).toEqual([]);
  expect(result.current.error).toBeNull();
});
it("excludes empty failed assistant replies from future history", async () => {
  const mock = vi.mocked(streamChat);
  mock.mockImplementation(async (_m, _h, _s, cb) => { cb.onError(new Error("Failure")); });
  const { result } = renderHook(() => useChat());
  await act(async () => { await result.current.send("First"); });
  await act(async () => { await result.current.send("Second"); });
  expect(mock.mock.calls[1][1]).toEqual([{ role: "user", content: "First" }]);
});
