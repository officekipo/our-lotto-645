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
  const hasLoadedDraw = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    async function loadLatestDraw(force = false) {
      const isInitialLoad = !hasLoadedDraw.current;
      if (isInitialLoad) setLoading(true);
      setError(null);

      const estimatedRound = getEstimatedRound();

      // 최신 회차를 먼저 직접 확인합니다. 최신 회차가 조회되지 않았다고
      // 이전 회차(예: 1240회)로 조용히 내려가지 않습니다.
      const latest = await fetchLatestDraw({ force });
      if (latest && latest.round >= estimatedRound) {
        if (!cancelled) {
          setDraw(latest);
          hasLoadedDraw.current = true;
          setLoading(false);
        }
        return;
      }

      const exact = await fetchDraw(estimatedRound, { force });
      if (exact && exact.round === estimatedRound) {
        if (!cancelled) {
          setDraw(exact);
          hasLoadedDraw.current = true;
          setLoading(false);
        }
        return;
      }

      if (!cancelled) {
        // 이미 화면에 표시 중인 실제 데이터는 유지합니다.
        // 백그라운드 재조회 실패 때문에 홈 화면 전체가 로딩 화면으로
        // 교체되거나 깜빡이는 것을 방지합니다.
        setError('최신 회차 정보를 가져오는 중입니다.');
        setLoading(false);
      }
    }

    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(async () => {
        await loadLatestDraw(true);
        if (!cancelled) scheduleRefresh();
      }, 60_000);
    };

    loadLatestDraw().finally(() => {
      if (!cancelled) scheduleRefresh();
    });

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        if (refreshTimer) clearTimeout(refreshTimer);
        refreshTimer = setTimeout(() => {
          loadLatestDraw(true).finally(() => {
            if (!cancelled) scheduleRefresh();
          });
        }, 250);
      }
    });

    return () => {
      cancelled = true;
      if (refreshTimer) clearTimeout(refreshTimer);
      subscription.remove();
    };
  }, []);

  return { draw, loading, error };
}
