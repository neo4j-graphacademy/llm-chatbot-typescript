import { parse } from "marked";
import { HumanMessage, AIMessage } from "langchain/schema";

export default function Message({
  message,
}: {
  message: HumanMessage | AIMessage;
}) {
  const align = message?._getType() == "ai" ? "justify-start" : "justify-end";
  const no_rounding =
    message?._getType() == "ai" ? "rounded-bl-none" : "rounded-br-none";
  const background = message?._getType() == "ai" ? "blue" : "slate";

  return (
    <div className={`w-full flex flex-row ${align}`}>
      <span className="bg-blue-100"></span>
      <div className="flex flex-col space-y-2 text-sm mx-2 max-w-[60%] order-2 items-start">
        <div className={`bg-${background}-100 p-4 rounded-xl ${no_rounding}`}>
          <div className={`text-${background}-400`}>{message.name}</div>

          <div
            dangerouslySetInnerHTML={{
              __html: !message.content
                ? JSON.stringify(message)
                : parse(message.content.toString()).replace(
                    '<a href="',
                    '<a target="_blank" href="'
                  ),
            }}
          />
          {/* <time className={`text-xs font-bold text-${background}-400`}>
            12:32
          </time> */}
        </div>
      </div>
    </div>
  );
}
