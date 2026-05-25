// Generic data-fetching hook. Pass a function returning a promise; re-runs
// when any value in `deps` changes. Returns { data, loading, error, reload }.
import {useCallback, useEffect, useState} from "react";

export default function useFetch(fn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // fn is intentionally re-created by callers each render; we key off `deps`.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps);

  const load = useCallback(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    run()
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [run]);

  useEffect(() => load(), [load]);

  return {data, loading, error, reload: load};
}
