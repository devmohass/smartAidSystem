// Tiny toast helper: show(message, kind) auto-dismisses after 2.6s.
import {useCallback, useRef, useState} from "react";

export default function useToast() {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const show = useCallback((message, kind = "ok") => {
    clearTimeout(timer.current);
    setToast({message, kind});
    timer.current = setTimeout(() => setToast(null), 2600);
  }, []);
  return {toast, show};
}
