import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, View } from 'react-native';
import { tw } from '../../App.tw';
import { cn } from '../styles/cn';
import { fetchHistory as fetchHistoryFromService } from '../services/lottoApi';
import { fetchWinnerStoreHistory, type WinnerStore } from '../services/lottoWinners';
import { COLORS, DrawData, Text, LottoBall, PageHeader, LegendItem, SelectionSummary, MetricCard, SectionHeader, rnStyle } from '../components/common';

type HistoryDraw = DrawData;
type AnalysisPeriod = 100 | 500 | 1000;
type WinnerAnalysisPeriod = 20 | 100 | 500;

async function fetchHistory(limit = 52, options: { force?: boolean } = {}): Promise<HistoryDraw[]> {
  return fetchHistoryFromService(limit, options);
}

function buildStats(draws: HistoryDraw[]) {
  const source = draws;
  const counts = Array.from({ length: 46 }, () => 0);
  let sumTotal = 0;
  let oddTotal = 0;
  let consecutiveCount = 0;
  let highNumberCount = 0;
  const parityCounts = Array.from({ length: 7 }, () => 0);

  source.forEach((item) => {
    const sorted = [...item.numbers].sort((a, b) => a - b);
    sorted.forEach((n) => { counts[n] += 1; });
    sumTotal += sorted.reduce((acc, n) => acc + n, 0);
    const oddCount = sorted.filter((n) => n % 2 === 1).length;
    oddTotal += oddCount;
    parityCounts[oddCount] += 1;
    if (sorted.some((n, i) => i > 0 && n === sorted[i - 1] + 1)) consecutiveCount += 1;
    if (sorted.some((n) => n >= 41)) highNumberCount += 1;
  });

  const frequency = counts
    .slice(1)
    .map((count, index) => ({ number: index + 1, count }))
    .sort((a, b) => b.count - a.count || a.number - b.number)
    .slice(0, 5)
    .map((item, index) => ({ ...item, tone: index < 2 ? 'hot' : 'warm' }));

  const parityPatterns = parityCounts
    .map((count, odd) => ({ odd, even: 6 - odd, count }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);

  return {
    frequency,
    avgSum: source.length ? sumTotal / source.length : 0,
    avgOdd: source.length ? oddTotal / source.length : 0,
    consecutiveRate: source.length ? (consecutiveCount / source.length) * 100 : 0,
    highNumberRate: source.length ? (highNumberCount / source.length) * 100 : 0,
    parityPatterns,
    rounds: source.length,
  };
}

function getWinnerStoreKey(store: WinnerStore) {
  return store.storeId || `${store.name}|${store.address}`;
}

function normalizeProvince(value: string) {
  const text = value.trim();
  const aliases: Record<string, string> = {
    '서울특별시': '서울', '서울시': '서울',
    '부산광역시': '부산', '부산시': '부산',
    '대구광역시': '대구', '대구시': '대구',
    '인천광역시': '인천', '인천시': '인천',
    '광주광역시': '광주', '광주시': '광주',
    '대전광역시': '대전', '대전시': '대전',
    '울산광역시': '울산', '울산시': '울산',
    '세종특별자치시': '세종', '세종시': '세종',
    '경기도': '경기', '강원특별자치도': '강원', '강원도': '강원',
    '충청북도': '충북', '충청남도': '충남', '전라북도': '전북', '전북특별자치도': '전북',
    '전라남도': '전남', '경상북도': '경북', '경상남도': '경남', '제주특별자치도': '제주', '제주도': '제주',
  };
  if (aliases[text]) return aliases[text];
  const match = text.match(/^(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)/);
  return match?.[1] ?? text.split(/\s+/)[0] ?? '지역 미상';
}

function getStoreRegion(store: WinnerStore) {
  return normalizeProvince(store.region || store.address);
}

function getStoreCity(store: WinnerStore) {
  const address = `${store.address || ''} ${store.region || ''}`.replace(/\s+/g, ' ').trim();
  const match = address.match(/(?:^|\s)([가-힣]+(?:시|군|구))(?:\s|$)/);
  if (match?.[1]) return match[1];
  return getStoreRegion(store);
}

function summarizeWinnerStores(stores: WinnerStore[]) {
  const regionMap = new Map<string, number>();
  const cityMap = new Map<string, number>();
  const storeMap = new Map<string, { store: WinnerStore; count: number }>();
  stores.forEach((store) => {
    const province = getStoreRegion(store);
    regionMap.set(province, (regionMap.get(province) ?? 0) + 1);
    const city = getStoreCity(store);
    cityMap.set(city, (cityMap.get(city) ?? 0) + 1);
    const key = getWinnerStoreKey(store);
    const current = storeMap.get(key);
    storeMap.set(key, current ? { ...current, count: current.count + 1 } : { store, count: 1 });
  });
  return {
    regions: [...regionMap.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko')),
    cities: [...cityMap.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko')),
    topStores: [...storeMap.values()].sort((a, b) => b.count - a.count || a.store.name.localeCompare(b.store.name, 'ko')),
  };
}

function StatsScreen({ draw }: { draw: DrawData }) {
  const [period, setPeriod] = useState<AnalysisPeriod>(100);
  const [history, setHistory] = useState<HistoryDraw[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [winnerPeriod, setWinnerPeriod] = useState<WinnerAnalysisPeriod>(20);
  const [winnerStores, setWinnerStores] = useState<{ first: WinnerStore[]; second: WinnerStore[] }>({ first: [], second: [] });
  const [winnerLoading, setWinnerLoading] = useState(true);
  const [winnerError, setWinnerError] = useState<string | null>(null);
  const [winnerListLimits, setWinnerListLimits] = useState<{ first: number; second: number }>({ first: 5, second: 5 });

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fetchHistory(1000).then((items) => {
      if (!alive) return;
      const scoped = items.filter((item) => item.round <= draw.round).slice(0, period);
      setHistory(scoped);
      setError(scoped.length === 0 ? '통계 데이터를 불러오지 못했습니다.' : null);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [draw.round, period]);

  useEffect(() => {
    let alive = true;
    setWinnerLoading(true);
    setWinnerError(null);
    const startRound = Math.max(1, draw.round - winnerPeriod + 1);
    fetchWinnerStoreHistory(startRound, draw.round).then((result) => {
      if (!alive) return;
      setWinnerStores(result);
      if (result.first.length === 0 && result.second.length === 0) {
        setWinnerError('당첨 판매점 정보를 불러오지 못했습니다.');
      }
      setWinnerLoading(false);
    }).catch(() => {
      if (!alive) return;
      setWinnerError('당첨 판매점 정보를 불러오지 못했습니다.');
      setWinnerLoading(false);
    });
    return () => { alive = false; };
  }, [draw.round, winnerPeriod]);

  async function retryStats() {
    setLoading(true);
    setError(null);
    const items = await fetchHistory(1000, { force: true });
    const scoped = items.filter((item) => item.round <= draw.round).slice(0, period);
    setHistory(scoped);
    setError(scoped.length === 0 ? '통계 데이터를 불러오지 못했습니다.' : null);
    setLoading(false);
  }


  const stats = useMemo(() => buildStats(history), [history]);
  const maxCount = Math.max(...stats.frequency.map((item) => item.count), 1);

  if (loading) {
    return (
      <View className={tw.screen} style={{ flex: 1, width: '100%', minWidth: 0, alignSelf: 'stretch', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="small" color={COLORS.primary} />
        <Text style={{ marginTop: 12, color: COLORS.sub }}>정보 가져오는 중..</Text>
      </View>
    );
  }

  if (error || history.length === 0) {
    return (
      <View className={tw.screen} style={{ flex: 1, width: '100%', minWidth: 0, alignSelf: 'stretch', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
        <Text className={tw.statsErrorTitle} style={rnStyle(tw.statsErrorTitle)}>정보 가져오는 중..</Text>
        <Text className={tw.statsErrorText} style={rnStyle(tw.statsErrorText)}>{error ?? '통계 데이터를 불러오지 못했습니다.'}</Text>
        <Pressable onPress={retryStats} className={tw.statsRetryButton} style={rnStyle(tw.statsRetryButton)}>
          <Text className={tw.statsRetryText} style={rnStyle(tw.statsRetryText)}>다시 불러오기</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView className={tw.screen} style={{ flex: 1, width: '100%', minWidth: 0, alignSelf: 'stretch' }} contentContainerClassName={tw.screenContent} contentContainerStyle={[{ flexGrow: 1, width: '100%', minWidth: 0 }, rnStyle(tw.screenContent)]} showsVerticalScrollIndicator={false}>
      <PageHeader
        eyebrow="통계 분석"
        title="통계 분석"
        description="기준 회차와 분석 범위를 선택해 실제 당첨번호의 출현 빈도와 패턴을 비교합니다."
      />

      <View className={tw.statsNotice} style={rnStyle(tw.statsNotice)}>
        <Text className={tw.statsNoticeTitle} style={rnStyle(tw.statsNoticeTitle)}>통계는 예측이 아닙니다</Text>
        <Text className={tw.statsNoticeText} style={rnStyle(tw.statsNoticeText)}>선택한 최근 {stats.rounds}회 실제 당첨번호를 집계한 참고용 통계입니다. 과거 빈도가 다음 회차 당첨 확률을 높여주지는 않습니다.</Text>
      </View>


      <View className={tw.statsPeriodCard} style={rnStyle(tw.statsPeriodCard)}>
        <View className={tw.statsPeriodCopy} style={rnStyle(tw.statsPeriodCopy)}>
          <Text className={tw.statsPeriodLabel} style={rnStyle(tw.statsPeriodLabel)}>분석 구간</Text>
          <Text className={tw.statsPeriodValue} style={rnStyle(tw.statsPeriodValue)}>최근 {stats.rounds}회 분석</Text>
          <Text className={tw.statsPeriodHint} style={rnStyle(tw.statsPeriodHint)}>주 1회 추첨이라 기간보다 회차 수 기준 분석이 더 명확합니다. 아래에서 최근 100·500·1000회를 선택하세요.</Text>
          <Text className={tw.statsPeriodHint} style={rnStyle(tw.statsPeriodHint)}>100회 ≈ 1.9년 · 500회 ≈ 9.6년 · 1000회 ≈ 19.2년</Text>
        </View>
        <View className={tw.statsPeriodBadge} style={rnStyle(tw.statsPeriodBadge)}>
          <Text className={tw.statsPeriodBadgeText} style={rnStyle(tw.statsPeriodBadgeText)}>{loading ? '불러오는 중' : `${draw.round}회 기준`}</Text>
        </View>
      </View>

      <View className={tw.periodSelector} style={rnStyle(tw.periodSelector)}>
        {[100, 500, 1000].map((value) => {
          const selected = period === value;
          return (
            <Pressable key={value} onPress={() => setPeriod(value as AnalysisPeriod)} className={cn(tw.periodButton, selected && tw.periodButtonActive)} style={rnStyle(cn(tw.periodButton, selected && tw.periodButtonActive))}>
              <Text className={cn(tw.periodButtonText, selected && tw.periodButtonTextActive)} style={rnStyle(cn(tw.periodButtonText, selected && tw.periodButtonTextActive))}>{value}회</Text>
            </Pressable>
          );
        })}
      </View>

      <SectionHeader title="핵심 지표" />
      <View className={tw.statMetricGrid} style={rnStyle(tw.statMetricGrid)}>
        <MetricCard label="번호 합 평균" value={stats.avgSum.toFixed(1)} unit="" />
        <MetricCard label="홀수 개수 평균" value={stats.avgOdd.toFixed(2)} unit="개" />
        <MetricCard label="연속 번호 출현" value={stats.consecutiveRate.toFixed(1)} unit="%" />
        <MetricCard label="41~45 포함" value={stats.highNumberRate.toFixed(1)} unit="%" />
      </View>

      <SectionHeader title="출현 빈도 TOP 5" />
      <View className={tw.frequencyCard} style={rnStyle(tw.frequencyCard)}>
        {stats.frequency.map((item, index) => {
          const ratio = item.count / maxCount;
          return (
            <View key={item.number} className={tw.frequencyRow} style={rnStyle(tw.frequencyRow)}>
              <Text className={tw.frequencyRank} style={rnStyle(tw.frequencyRank)}>{index + 1}</Text>
              <LottoBall number={item.number} size="small" />
              <View className={tw.frequencyInfo} style={rnStyle(tw.frequencyInfo)}>
                <View className={tw.frequencyTopLine} style={rnStyle(tw.frequencyTopLine)}>
                  <Text className={tw.frequencyNumber} style={rnStyle(tw.frequencyNumber)}>{item.number}번</Text>
                  <Text className={tw.frequencyCount} style={rnStyle(tw.frequencyCount)}>{item.count}회</Text>
                </View>
                <View className={tw.frequencyTrack} style={rnStyle(tw.frequencyTrack)}>
                  <View className={tw.frequencyFill} style={[rnStyle(tw.frequencyFill), { width: `${Math.max(ratio * 100, 8)}%`, backgroundColor: item.tone === 'hot' ? COLORS.primary : '#8EA9C9' }]} />
                </View>
              </View>
            </View>
          );
        })}
      </View>

      <SectionHeader title="홀짝 패턴" />
      <View className={tw.parityCard} style={rnStyle(tw.parityCard)}>
        <Text className={tw.parityDescription} style={rnStyle(tw.parityDescription)}>한 회차의 6개 번호 중 홀수와 짝수가 각각 몇 개인지 보여줍니다. 예: 3:3 = 홀수 3개 + 짝수 3개.</Text>
        {stats.parityPatterns.map((item) => (
          <View key={`${item.odd}:${item.even}`} className={tw.parityPatternRow} style={rnStyle(tw.parityPatternRow)}>
            <Text className={tw.parityPatternLabel} style={rnStyle(tw.parityPatternLabel)}>홀 {item.odd} : 짝 {item.even}</Text>
            <View className={tw.parityPatternTrack} style={rnStyle(tw.parityPatternTrack)}><View className={tw.parityPatternFill} style={[rnStyle(tw.parityPatternFill), { width: `${Math.max((item.count / stats.rounds) * 100, 2)}%` }]} /></View>
            <Text className={tw.parityPatternCount} style={rnStyle(tw.parityPatternCount)}>{item.count}회</Text>
          </View>
        ))}
      </View>

      <SectionHeader title="당첨 판매점 분석" />
      <View className={tw.winnerPeriodSelector} style={rnStyle(tw.winnerPeriodSelector)}>
        {[20, 100, 500].map((value) => {
          const selected = winnerPeriod === value;
          return (
            <Pressable key={value} onPress={() => setWinnerPeriod(value as WinnerAnalysisPeriod)} className={cn(tw.periodButton, selected && tw.periodButtonActive)} style={rnStyle(cn(tw.periodButton, selected && tw.periodButtonActive))}>
              <Text className={cn(tw.periodButtonText, selected && tw.periodButtonTextActive)} style={rnStyle(cn(tw.periodButtonText, selected && tw.periodButtonTextActive))}>{value}회</Text>
            </Pressable>
          );
        })}
      </View>
      {winnerLoading ? (
        <View className={tw.winnerCard} style={rnStyle(tw.winnerCard)}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text className={tw.winnerLoadingText} style={rnStyle(tw.winnerLoadingText)}>최근 {winnerPeriod}회 당첨 판매점 정보를 집계하는 중입니다.</Text>
        </View>
      ) : winnerError ? (
        <View className={tw.winnerCard} style={rnStyle(tw.winnerCard)}>
          <Text className={tw.winnerErrorText} style={rnStyle(tw.winnerErrorText)}>{winnerError}</Text>
          <Text className={tw.winnerHint} style={rnStyle(tw.winnerHint)}>동행복권 당첨 판매점 API가 일시적으로 응답하지 않을 수 있습니다.</Text>
        </View>
      ) : (
        <WinnerStoreSection stores={winnerStores} period={winnerPeriod} listLimits={winnerListLimits} setListLimit={(rank, value) => setWinnerListLimits((prev) => ({ ...prev, [rank]: value }))} />
      )}

    </ScrollView>
  );
}

async function openWinnerStoreMap(store: WinnerStore) {
  const query = [store.name, store.address || store.region].filter(Boolean).join(' ');
  if (!query) return;
  const naverUrl = `https://map.naver.com/p/search/${encodeURIComponent(query)}`;
  const googleUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  try {
    await Linking.openURL(naverUrl);
  } catch {
    try {
      await Linking.openURL(googleUrl);
    } catch {
      Alert.alert('지도 열기 실패', '지도 검색을 열 수 없습니다.');
    }
  }
}

function WinnerStoreSection({ stores, period, listLimits, setListLimit }: { stores: { first: WinnerStore[]; second: WinnerStore[] }; period: WinnerAnalysisPeriod; listLimits: { first: number; second: number }; setListLimit: (rank: 'first' | 'second', value: number) => void }) {
  const [selectedRegions, setSelectedRegions] = useState<{ first: string | null; second: string | null }>({ first: null, second: null });
  const [selectedCities, setSelectedCities] = useState<{ first: string | null; second: string | null }>({ first: null, second: null });
  const [expandedRegions, setExpandedRegions] = useState<{ first: boolean; second: boolean }>({ first: false, second: false });
  const first = summarizeWinnerStores(stores.first);
  const second = summarizeWinnerStores(stores.second);
  const renderRank = (rank: '1등' | '2등', items: WinnerStore[], summary: ReturnType<typeof summarizeWinnerStores>, selectedRegion: string | null) => {
    const rankKey = rank === '1등' ? 'first' : 'second';
    const listLimit = listLimits[rankKey];
    const selectedCity = selectedCities[rankKey];
    const filteredItems = items.filter((store) => {
      if (selectedCity) return getStoreCity(store) === selectedCity;
      if (selectedRegion) return getStoreRegion(store) === selectedRegion;
      return true;
    });
    const filteredSummary = summarizeWinnerStores(filteredItems);
    const cityOptions = selectedRegion
      ? summarizeWinnerStores(items.filter((store) => getStoreRegion(store) === selectedRegion)).cities
      : [];
    return (
      <View className={tw.winnerRankCard} style={rnStyle(tw.winnerRankCard)}>
        <View className={tw.winnerRankHeader} style={rnStyle(tw.winnerRankHeader)}>
          <Text className={tw.winnerRankTitle} style={rnStyle(tw.winnerRankTitle)}>{rank} 당첨 판매점</Text>
          <Text className={tw.winnerRankCount} style={rnStyle(tw.winnerRankCount)}>{items.length.toLocaleString('ko-KR')}곳</Text>
        </View>
        <View className={tw.winnerListLimitRow} style={rnStyle(tw.winnerListLimitRow)}>
          <Text className={tw.winnerListLimitLabel} style={rnStyle(tw.winnerListLimitLabel)}>표시 개수</Text>
          {[5, 10, 15, 20].map((value) => (
            <Pressable key={value} onPress={() => setListLimit(rankKey, value)} className={cn(tw.winnerListLimitButton, listLimit === value && tw.winnerListLimitButtonActive)} style={rnStyle(cn(tw.winnerListLimitButton, listLimit === value && tw.winnerListLimitButtonActive))}>
              <Text className={cn(tw.winnerListLimitText, listLimit === value && tw.winnerListLimitTextActive)} style={rnStyle(cn(tw.winnerListLimitText, listLimit === value && tw.winnerListLimitTextActive))}>{value}개</Text>
            </Pressable>
          ))}
        </View>
        {summary.regions.length > 0 ? (
          <View style={rnStyle(tw.winnerRegionFilter)}>
            <Pressable
              onPress={() => setExpandedRegions((prev) => ({ ...prev, [rankKey]: !prev[rankKey] }))}
              className={tw.winnerRegionFilterHeader}
              style={rnStyle(tw.winnerRegionFilterHeader)}
              accessibilityRole="button"
              accessibilityState={{ expanded: expandedRegions[rankKey] }}
            >
              <View className={tw.winnerRegionFilterCopy} style={rnStyle(tw.winnerRegionFilterCopy)}>
                <Text className={tw.winnerRegionFilterTitle} style={rnStyle(tw.winnerRegionFilterTitle)}>당첨 판매점 지역</Text>
                <Text className={tw.winnerRegionFilterSummary} style={rnStyle(tw.winnerRegionFilterSummary)}>
                  {selectedCity ? `${selectedRegion} · ${selectedCity}` : selectedRegion ? selectedRegion : '전체 지역'}
                </Text>
              </View>
              <View className={tw.winnerRegionFilterRight} style={rnStyle(tw.winnerRegionFilterRight)}>
                <Text className={tw.winnerRegionFilterCount} style={rnStyle(tw.winnerRegionFilterCount)}>
                  {selectedCity ? filteredItems.length : selectedRegion ? items.filter((store) => getStoreRegion(store) === selectedRegion).length : items.length}곳
                </Text>
                <Text className={tw.winnerRegionFilterArrow} style={rnStyle(tw.winnerRegionFilterArrow)}>{expandedRegions[rankKey] ? '⌃' : '⌄'}</Text>
              </View>
            </Pressable>
            {expandedRegions[rankKey] ? (
              <View style={rnStyle(tw.winnerRegionFilterBody)}>
                <View className={tw.winnerRegionRow} style={rnStyle(tw.winnerRegionRow)}>
                  <Pressable
                    onPress={() => {
                      setSelectedRegions((prev) => ({ ...prev, [rankKey]: null }));
                      setSelectedCities((prev) => ({ ...prev, [rankKey]: null }));
                    }}
                    className={cn(tw.winnerRegionChip, !selectedRegion && tw.winnerRegionChipActive)} style={rnStyle(cn(tw.winnerRegionChip, !selectedRegion && tw.winnerRegionChipActive))}
                  >
                    <Text className={tw.winnerRegionName} style={rnStyle(tw.winnerRegionName)}>전체</Text>
                    <Text className={tw.winnerRegionCount} style={rnStyle(tw.winnerRegionCount)}>{items.length}곳</Text>
                  </Pressable>
                  {summary.regions.map(([region, count]) => (
                    <Pressable
                      key={region}
                      onPress={() => {
                        const next = selectedRegion === region ? null : region;
                        setSelectedRegions((prev) => ({ ...prev, [rankKey]: next }));
                        setSelectedCities((prev) => ({ ...prev, [rankKey]: null }));
                      }}
                      className={cn(tw.winnerRegionChip, selectedRegion === region && !selectedCity && tw.winnerRegionChipActive)} style={rnStyle(cn(tw.winnerRegionChip, selectedRegion === region && !selectedCity && tw.winnerRegionChipActive))}
                    >
                      <Text className={tw.winnerRegionName} style={rnStyle(tw.winnerRegionName)}>{region}</Text>
                      <Text className={tw.winnerRegionCount} style={rnStyle(tw.winnerRegionCount)}>{count}곳</Text>
                    </Pressable>
                  ))}
                </View>
                {selectedRegion && cityOptions.length > 0 ? (
                  <View style={rnStyle(tw.winnerCityFilter)}>
                    <Text className={tw.winnerCityFilterTitle} style={rnStyle(tw.winnerCityFilterTitle)}>{selectedRegion} 시·군·구</Text>
                    <View className={tw.winnerRegionRow} style={rnStyle(tw.winnerRegionRow)}>
                      <Pressable
                        onPress={() => setSelectedCities((prev) => ({ ...prev, [rankKey]: null }))}
                        className={cn(tw.winnerRegionChip, !selectedCity && tw.winnerRegionChipActive)} style={rnStyle(cn(tw.winnerRegionChip, !selectedCity && tw.winnerRegionChipActive))}
                      >
                        <Text className={tw.winnerRegionName} style={rnStyle(tw.winnerRegionName)}>전체</Text>
                        <Text className={tw.winnerRegionCount} style={rnStyle(tw.winnerRegionCount)}>{items.filter((store) => getStoreRegion(store) === selectedRegion).length}곳</Text>
                      </Pressable>
                      {cityOptions.map(([city, count]) => (
                        <Pressable
                          key={city}
                          onPress={() => setSelectedCities((prev) => ({ ...prev, [rankKey]: prev[rankKey] === city ? null : city }))}
                          className={cn(tw.winnerRegionChip, selectedCity === city && tw.winnerRegionChipActive)} style={rnStyle(cn(tw.winnerRegionChip, selectedCity === city && tw.winnerRegionChipActive))}
                        >
                          <Text className={tw.winnerRegionName} style={rnStyle(tw.winnerRegionName)}>{city}</Text>
                          <Text className={tw.winnerRegionCount} style={rnStyle(tw.winnerRegionCount)}>{count}곳</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}
        <Text className={tw.winnerTopLabel} style={rnStyle(tw.winnerTopLabel)}>{selectedCity ? `${selectedCity} 판매점` : selectedRegion ? `${selectedRegion} 판매점` : `최근 ${period}회 최다 당첨 지점`}</Text>
        {filteredSummary.topStores.length > 0 ? filteredSummary.topStores.slice(0, listLimit).map(({ store, count }) => (
          <View key={`${getWinnerStoreKey(store)}-${rank}`} className={tw.winnerStoreRow} style={rnStyle(tw.winnerStoreRow)}>
            <View className={tw.winnerStoreCopy} style={rnStyle(tw.winnerStoreCopy)}>
              <Text className={tw.winnerStoreName} style={rnStyle(tw.winnerStoreName)}>{store.name}</Text>
              <Text className={tw.winnerStoreAddress} style={rnStyle(tw.winnerStoreAddress)}>{store.address || `${store.region} 지역`}</Text>
            </View>
            <View className={tw.winnerStoreActions} style={rnStyle(tw.winnerStoreActions)}>
              {!(store.name.includes('인터넷') || store.name.includes('온라인') || store.address?.includes('인터넷')) ? (
                <Pressable onPress={() => openWinnerStoreMap(store)} className={tw.winnerMapButton} style={rnStyle(tw.winnerMapButton)} accessibilityRole="button" accessibilityLabel={`${store.name} 지도에서 보기`}>
                  <Text className={tw.winnerMapButtonText} style={rnStyle(tw.winnerMapButtonText)}>지도</Text>
                </Pressable>
              ) : null}
              <Text className={tw.winnerStoreCount} style={rnStyle(tw.winnerStoreCount)}>{count}회</Text>
            </View>
          </View>
        )) : (
          <Text className={tw.winnerHint} style={rnStyle(tw.winnerHint)}>표시할 판매점 데이터가 없습니다.</Text>
        )}
      </View>
    );
  };

  return (
    <View className={tw.winnerGrid} style={rnStyle(tw.winnerGrid)}>
      {renderRank('1등', stores.first, first, selectedRegions.first)}
      {renderRank('2등', stores.second, second, selectedRegions.second)}
      <Text className={tw.winnerFootnote} style={rnStyle(tw.winnerFootnote)}>동행복권 공식 당첨 판매점 데이터를 기준으로 선택한 최근 {period}회를 집계합니다. 100회·500회로 늘리면 회차별 판매점 조회가 많아져 집계에 시간이 걸릴 수 있습니다.</Text>
    </View>
  );
}


export default StatsScreen;
