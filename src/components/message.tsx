import { parse } from "marked";
import { Message } from "@/hooks/chat";

function fixMarkdown(message: Message): string {
  return parse(message.content).replace(
    '<a href="',
    '<a target="_blank" href="'
  );
}

export default function Message({ message }: { message: Message }) {
  const align = message.role == "ai" ? "justify-start" : "justify-end";
  const no_rounding =
    message.role == "ai" ? "rounded-bl-none" : "rounded-br-none";
  const background = message.role == "ai" ? "blue" : "slate";

  return (
    <div className={`w-full flex flex-row ${align}`}>
      <span className="bg-blue-100"></span>
      <div className="flex flex-col space-y-2 text-sm mx-2 max-w-[60%] order-2 items-start">
        <div className={`bg-${background}-100 p-4 rounded-xl ${no_rounding}`}>
          {/* <div className={`text-${background}-400`}>{message.role}</div> */}

          <div
            dangerouslySetInnerHTML={{
              __html: fixMarkdown(message),
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
