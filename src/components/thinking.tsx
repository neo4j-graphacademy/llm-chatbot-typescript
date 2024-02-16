export default function Thinking() {
  return (
    <div
      id="thinking"
      className="
        inline-flex flex-row justify-center items-center bg-emerald-100 rounded-md w-16
        text-sm mx-2 max-auto p-2 order-2 items-start
      "
    >
      <div className="inline-block w-2 h-2 bg-emerald-800 rounded-full m-1 animate-pulse"></div>
      <div className="inline-block w-2 h-2 bg-emerald-800 rounded-full animate-pulse delay-100"></div>
      <div className="inline-block w-2 h-2 bg-emerald-800 rounded-full m-1 animate-pulse delay-200"></div>
    </div>
  );
}
