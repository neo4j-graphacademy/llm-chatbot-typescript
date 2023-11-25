import { useRef, useState } from "react";
import { AIMessage, HumanMessage } from "langchain/schema";

type Message = AIMessage | HumanMessage;

export default function useChat() {
  const [thinking, setThinking] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([
    new AIMessage({
      content: process.env.NEXT_PUBLIC_CHATBOT_GREETING as string
    }),
  ]);
  const container = useRef<HTMLDivElement>(null);

  const generateResponse = async (message: string): Promise<void> => {
    // Append human message
    messages.push(new HumanMessage({ content: message }));

    // Set thinking to true
    setThinking(true);

    try {
      // Scroll the thinking message into view
      setTimeout(() => {
        const thinking = document.getElementById("thinking");
        thinking?.scrollIntoView({ behavior: "smooth" });
      }, 20);

      // Send POST message to the API
      const response = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ message }),
      });

      // Append the API message to the state
      const json = await response.json();

      messages.push(new AIMessage({ content: json.message }));

      setMessages(messages);

      // Scroll the last message into view
      setTimeout(() => {
        container.current?.lastElementChild?.scrollIntoView({
          behavior: "smooth",
        });
      }, 20);
    } catch (e) {
      console.error(e);
    } finally {
      setThinking(false);
    }
  };

  return {
    thinking,
    messages,
    container,
    generateResponse,
  };
}
