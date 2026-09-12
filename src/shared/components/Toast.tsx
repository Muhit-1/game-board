/** A themed, transient notice — used in place of native alert()/error text for "you can't do that" feedback. */
export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-5 z-50 flex justify-center">
      <div className="pointer-events-none max-w-[90vw] rounded-lg border border-ember bg-walnut px-4 py-2.5 text-[12.5px] font-semibold text-parchment shadow-deep">
        {message}
      </div>
    </div>
  );
}
