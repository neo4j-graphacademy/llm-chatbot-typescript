import { sleep } from "@/utils";
import { FormEvent, KeyboardEventHandler, RefObject, useState } from "react";

export default function Form({
  onSubmit,
  container,
}: {
  onSubmit: (message: string) => void;
  container: RefObject<HTMLDivElement>;
}) {
  const [message, setMessage] = useState<string>("");

  const handleSubmit = async (
    event?: FormEvent<HTMLFormElement> | SubmitEvent
  ) => {
    event?.preventDefault();

    if (message.trim().length > 0) {
      onSubmit(message);

      await sleep(100);
      setMessage("");

      container.current?.scrollBy(0, 100);
    }
  };

  const submitOnCmdEnter: KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (!e.shiftKey && e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <form
      className="border-t b-slate-200 p-4 bg-slate-100"
      onSubmit={(e) => handleSubmit(e)}
    >
      <div className="flex flex-row bg-white border border-slate-600 rounded-md w-full">
        <div className="flex-grow">
          <textarea
            value={message}
            rows={1}
            className="p-4 border-blue-600 rounded-md w-full outline-none focus:outline-none"
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={submitOnCmdEnter}
          />
        </div>
        <div className="px-4">
          <button className="px-4 py-4 border-primary-800 text-blue-700 font-bold rounded-md h-full bg-white">
            Send
          </button>
        </div>
      </div>
    </form>
  );
}
