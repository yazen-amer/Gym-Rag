import { afterEach, describe, expect, it, vi } from "vitest";
import { streamChat } from "./client";

const callbacks = () => ({ onSources: vi.fn(), onToken: vi.fn(), onDone: vi.fn(), onError: vi.fn() });
const frame = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
const streamResponse = (chunks: string[]) => new Response(new ReadableStream({
  start(controller) { for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk)); controller.close(); },
}));
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("streamChat", () => {
  it("handles split frames, citations and exactly one completion", async () => {
    const body = frame("sources", { sources: [] }) + frame("token", { text: "Evidence [1]" }) + frame("done", {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(streamResponse([body.slice(0, 15), body.slice(15)])));
    const cb = callbacks();
    await streamChat("Question", [], new AbortController().signal, cb);
    expect(cb.onToken).toHaveBeenCalledWith("Evidence [1]");
    expect(cb.onDone).toHaveBeenCalledTimes(1);
    expect(cb.onError).not.toHaveBeenCalled();
  });
  it("reports SSE errors without treating the response as successful", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(streamResponse([frame("error", { message: "Index the papers" })])));
    const cb = callbacks();
    await streamChat("Question", [], new AbortController().signal, cb);
    expect(cb.onError.mock.calls[0][0].message).toBe("Index the papers");
    expect(cb.onDone).not.toHaveBeenCalled();
  });
  it("reports a truncated response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(streamResponse([frame("token", { text: "Partial" })])));
    const cb = callbacks();
    await streamChat("Question", [], new AbortController().signal, cb);
    expect(cb.onError.mock.calls[0][0].message).toContain("before completion");
    expect(cb.onDone).not.toHaveBeenCalled();
  });
  it("shows JSON configuration errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ detail: "Set GEMINI_API_KEY" }, { status: 503 })));
    const cb = callbacks();
    await streamChat("Question", [], new AbortController().signal, cb);
    expect(cb.onError.mock.calls[0][0].message).toBe("Set GEMINI_API_KEY");
  });
  it("handles HTML gateway errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>missing</html>", { status: 404 })));
    const cb = callbacks();
    await streamChat("Question", [], new AbortController().signal, cb);
    expect(cb.onError.mock.calls[0][0].message).toContain("404");
  });
  it("uses the configured backend API URL", async () => {
    vi.stubEnv("VITE_API_URL", "https://example.com/api/");
    const fetchMock = vi.fn().mockResolvedValue(streamResponse([frame("done", {})]));
    vi.stubGlobal("fetch", fetchMock);
    await streamChat("Question", [], new AbortController().signal, callbacks());
    expect(fetchMock.mock.calls[0][0]).toBe("https://example.com/api/chat");
  });
  it("does not report deliberate cancellation as an error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("Aborted", "AbortError")));
    const cb = callbacks();
    await streamChat("Question", [], new AbortController().signal, cb);
    expect(cb.onError).not.toHaveBeenCalled();
    expect(cb.onDone).not.toHaveBeenCalled();
  });
  it("accepts CRLF frames and finishes without waiting for the server to close", async () => {
    const cancel = vi.fn();
    const body = frame("token", { text: "Done" }).replaceAll("\n", "\r\n") + frame("done", {}).replaceAll("\n", "\r\n");
    const stream = new ReadableStream({
      start(controller) { controller.enqueue(new TextEncoder().encode(body)); }, cancel,
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(stream)));
    const cb = callbacks();
    await streamChat("Question", [], new AbortController().signal, cb);
    expect(cb.onDone).toHaveBeenCalledTimes(1);
    expect(cancel).toHaveBeenCalledTimes(1);
  });
  it("reports missing production routing configuration before making a request", async () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_API_URL", "");
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    const cb = callbacks();
    await streamChat("Question", [], new AbortController().signal, cb);
    expect(cb.onError.mock.calls[0][0].message).toContain("Set VITE_API_URL");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});


describe("deployed chat routing", () => {
  it.each([
    ["gym-rag-production.up.railway.app", "https://gym-rag-production.up.railway.app/api/chat"],
    ["https://backend.example.com", "https://backend.example.com/api/chat"],
    ["https://backend.example.com/", "https://backend.example.com/api/chat"],
    ["https://backend.example.com/api/", "https://backend.example.com/api/chat"],
    ["http://localhost:8000", "http://localhost:8000/api/chat"],
    ["/api", "/api/chat"],
    ["/gateway/api/", "/gateway/api/chat"],
    ["https://backend.example.com/gateway/api", "https://backend.example.com/gateway/api/chat"],
  ])("routes %s to the backend API", async (base, expected) => {
    vi.stubEnv("VITE_API_URL", base);
    const fetchMock = vi.fn().mockResolvedValue(streamResponse([frame("done", {})]));
    vi.stubGlobal("fetch", fetchMock);
    const cb = callbacks();
    await streamChat("Question", [], new AbortController().signal, cb);
    expect(fetchMock.mock.calls[0][0]).toBe(expected);
    expect(cb.onError).not.toHaveBeenCalled();
  });
  it.each(["ftp://backend.example.com", "https://backend.example.com?token=x", "https://user:password@backend.example.com", "not a host"])("rejects invalid API configuration: %s", async (base) => {
    vi.stubEnv("VITE_API_URL", base);
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    const cb = callbacks();
    await streamChat("Question", [], new AbortController().signal, cb);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(cb.onError.mock.calls[0][0].message).toContain("VITE_API_URL");
  });
});
