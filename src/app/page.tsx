"use client";

import Form from "@/components/form";
import Message from "@/components/message";
import Thinking from "@/components/thinking";
import useChat from "@/hooks/chat";
import React from "react";

export default function Home() {
  const { messages, thinking, container, generateResponse } = useChat();

  const thinkingText = `🤔 ${
    process.env.NEXT_PUBLIC_CHATBOT_NAME || "Chatbot"
  } is thinking...`;

  return (
    <>
      <div
        className="n- flex n- flex-col n- h-screen n-"
        style={{ height: "100vh" }}
      >
        <div className="p-4  bg-blue-800 flex flex-row justify-between">
          <h1 className="text-white">
            <span className="font-bold">
              {process.env.NEXT_PUBLIC_CHATBOT_NAME || "Chatbot"} -
            </span>
            <span className="text-blue-100">
              {" "}
              {process.env.NEXT_PUBLIC_CHATBOT_DESCRIPTION}
            </span>
          </h1>
        </div>

        <div
          ref={container}
          className="
            flex flex-grow flex-col space-y-4 p-3 overflow-y-auto
            scrollbar-thumb-blue scrollbar-thumb-rounded scrollbar-track-blue-lighter scrollbar-w-2 scrolling-touch"
        >
          {messages.map((m, i) => {
            return <Message key={i} message={m} />;
          })}

          {thinking && <Thinking />}
        </div>

        <Form
          messages={messages}
          thinking={thinking}
          container={container}
          onSubmit={(m) => generateResponse(m)}
        />

        <div className="flex flex-row justify-between b-slate-200 px-4 pb-4 bg-slate-100 text-xs text-slate-600">
          <div className="animate-pulse">{thinking ? thinkingText : " "}</div>
          <div>
            Powered by
            <a href="https://neo4j.com" target="_blank" className="font-bold">
              {" "}
              Neo4j
            </a>{" "}
            &ndash; Learn more at
            <a
              href="https://graphacademy.neo4j.com"
              target="_blank"
              className="font-bold"
            >
              {" "}
              Neo4j GraphAcademy
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
