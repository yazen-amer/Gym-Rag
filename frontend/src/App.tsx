import { ChatInput } from "./components/ChatInput";
import { MessageList } from "./components/MessageList";
import { Sidebar } from "./components/Sidebar";
import { useChat } from "./hooks/useChat";

export default function App() {
  const { messages, isStreaming, send, stop, reset } = useChat();

  return (
    <div className="flex h-screen bg-neutral-900 text-neutral-100">
      <Sidebar onNewChat={reset} />
      <main className="flex flex-1 flex-col">
        <MessageList messages={messages} onSuggestion={send} />
        <ChatInput onSend={send} onStop={stop} isStreaming={isStreaming} />
      </main>
    </div>
  );
}
