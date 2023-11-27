import { useEffect, useRef, useState } from "react";
import { AIMessage, HumanMessage } from "langchain/schema";
import { sleep } from "@/utils";

type Message = AIMessage | HumanMessage;

export default function useChat() {
  const [thinking, setThinking] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([
    new AIMessage({
      content:
        process.env.NEXT_PUBLIC_CHATBOT_GREETING || "How can I help you today?",
    }),
  ]);
  const container = useRef<HTMLDivElement>(null);

  const generateResponse = async (message: string): Promise<void> => {
    // Append human message
    messages.push(new HumanMessage({ content: message }));

    // Set thinking to true
    setThinking(true);

    try {
      // Send POST message to the API
      const response = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ message }),
      });

      // Append the API message to the state
      const json = await response.json();

      messages.push(new AIMessage({ content: json.message }));

      setMessages(messages);
    } catch (e) {
      console.error(e);
    } finally {
      setThinking(false);
    }
  };

  // Scroll latest message into view
  useEffect(() => {
    if (container.current) {
      container.current.scrollTop = container.current.scrollHeight;
    }
  }, [thinking, messages]);

  return {
    thinking,
    messages,
    container,
    generateResponse,
  };
}
