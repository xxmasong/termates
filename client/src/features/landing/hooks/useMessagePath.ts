import { useEffect, useState, type RefObject } from 'react';

interface MessagePath {
  width: number;
  height: number;
  d: string;
}
const EMPTY_PATH: MessagePath = { width: 0, height: 0, d: '' };

export const useMessagePath = (
  gridRef: RefObject<HTMLDivElement>,
  toastRef: RefObject<HTMLParagraphElement>,
  codexBodyRef: RefObject<HTMLElement>,
  visible: boolean,
) => {
  const [path, setPath] = useState<MessagePath>(EMPTY_PATH);
  useEffect(() => {
    if (!visible || !gridRef.current || !toastRef.current || !codexBodyRef.current) {
      setPath(EMPTY_PATH);
      return undefined;
    }
    const update = () => {
      const grid = gridRef.current?.getBoundingClientRect();
      const toast = toastRef.current?.getBoundingClientRect();
      const codex = codexBodyRef.current?.getBoundingClientRect();
      if (!grid || !toast || !codex) return;
      const y = toast.top - grid.top + toast.height / 2;
      setPath({
        width: grid.width,
        height: grid.height,
        d: `M ${codex.left - grid.left + codex.width * 0.45} ${y} H ${toast.right - grid.left + 4}`,
      });
    };
    const observer = new ResizeObserver(update);
    observer.observe(gridRef.current);
    observer.observe(toastRef.current);
    observer.observe(codexBodyRef.current);
    update();
    return () => observer.disconnect();
  }, [codexBodyRef, gridRef, toastRef, visible]);
  return path;
};
