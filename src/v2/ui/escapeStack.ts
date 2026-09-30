// One Escape closes only the top-most open layer (dialog over sheet over
// pop-up). Layers register on open, most recent on top.
type Handler = () => void;
const stack: Array<{ id: number; handler: Handler }> = [];
let seq = 0;
let listening = false;

const onKeyDown = (e: KeyboardEvent) => {
  if (e.key !== 'Escape' || stack.length === 0) return;
  e.preventDefault();
  stack[stack.length - 1].handler();
};

/** Register an Escape handler; returns the unregister function. */
export const pushEscape = (handler: Handler): (() => void) => {
  const id = ++seq;
  stack.push({ id, handler });
  if (!listening) { document.addEventListener('keydown', onKeyDown); listening = true; }
  return () => {
    const i = stack.findIndex(x => x.id === id);
    if (i >= 0) stack.splice(i, 1);
    if (stack.length === 0 && listening) { document.removeEventListener('keydown', onKeyDown); listening = false; }
  };
};
