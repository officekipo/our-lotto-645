import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { fetchDraw, fetchLatestDraw } from '../services/lottoApi';
import type { DrawData } from '../types/lotto';

const BASE_DATE = new Date('2002-12-07T20:35:00+09:00');

export function getEstimatedRound(): number {
  const now = new Date();
  const diff = now.getTime() - BASE_DATE.getTime();

  let round = Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1;

  const day = now.getDay();
  if (
    day === 6 &&
    (now.getHours() < 20 ||
      (now.getHours() === 20 && now.getMinutes() < 35))
  ) {
    round -= 1;
  }

  return Math.max(round, 1);
}

export function useLatestDraw() {
  const [draw, setDraw] = useState<DrawData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const drawRef = useRef<DrawData | null>(null);

  useEffect(() => {
    let cancelled = false;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    async function loadLatestDraw(force = false) {
      setLoading(true);
      setError(null);

      const estimatedRound = getEstimatedRound();

      // 최신 회차를 먼저 직접 확인합니다. 최신 회차가 조회되지 않았다고
      // 이전 회차(예: 1240회)로 조용히 내려가지 않습니다.
      const latest = await fetchLatestDraw({ force });
      if (latest && latest.round >= estimatedRound) {
        if (!cancelled) {
          drawRef.current = latest;
          setDraw(latest);
        }
        if (!cancelled) setLoading(false);
        return;
      }

      const exact = await fetchDraw(estimatedRound, { force });
      if (exact && exact.round === estimatedRound) {
        if (!cancelled) {
          drawRef.current = exact;
          setDraw(exact);
        }
        if (!cancelled) setLoading(false);
        return;
      }

      if (!cancelled) {
        drawRef.current = null;
        setDraw(null);
        setError('최신 회차 정보를 가져오는 중입니다.');
        setLoading(false);
      }
    }

    loadLatestDraw();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        if (refreshTimer) clearTimeout(refreshTimer);
        refreshTimer = setTimeout(() => loadLatestDraw(true), 250);
      }
    });

    const pollTimer = setInterval(() => {
      const estimatedRound = getEstimatedRound();
      if (estimatedRound > 0 && (!drawRef.current || drawRef.current.round < estimatedRound)) {
        void loadLatestDraw(true);
      }
    }, 60_000);

    return () => {
      cancelled = true;
      if (refreshTimer) clearTimeout(refreshTimer);
      clearInterval(pollTimer);
      subscription.remove();
    };
  }, []);

  return { draw, loading, error };
}
