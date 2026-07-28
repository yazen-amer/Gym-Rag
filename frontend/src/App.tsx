import { ChatInput } from "./components/ChatInput";
import { MessageList } from "./components/MessageList";
import { Sidebar } from "./components/Sidebar";
import { useChat } from "./hooks/useChat";

function App() {
  const { messages, isStreaming, error, send, stop, reset } = useChat();

  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-100">
      <Sidebar onNewChat={reset} />

      <div className="flex flex-1 flex-col">
        {error && (
          <div className="border-b border-red-900/50 bg-red-950/40 px-4 py-2 text-center text-sm text-red-300">
            {error} — is the backend running on port 8000?
          </div>
        )}

        <MessageList messages={messages} onSuggestion={send} />
        <ChatInput isStreaming={isStreaming} onSend={send} onStop={stop} />
      </div>
    </div>
  );
}

export default App;
