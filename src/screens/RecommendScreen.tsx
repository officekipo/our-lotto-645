import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';
import { fetchHistory as fetchHistoryFromService } from '../services/lottoApi';
import { loadRecommendSavedData, saveRecommendSavedData, type RecommendSavedData } from '../storage/recommendSettings';
import { tw } from '../../App.tw';
import { cn } from '../styles/cn';
import { COLORS, DrawData, Text, TextInput, LottoBall, PageHeader, SelectionSummary, SectionHeader, rnStyle } from '../components/common';

type HistoryDraw = DrawData;
type RecommendPeriod = 10 | 30 | 50 | 100 | 300 | 500 | 1000;
type RecommendStrategy = 'random' | 'hot' | 'cold' | 'average' | 'parityHot';
type CountKey = 3 | 5 | 10;

function shuffle(numbers: number[]) {
  const copied = [...numbers];
  for (let i = copied.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copied[i], copied[j]] = [copied[j], copied[i]];
  }
  return copied;
}

function makeCombination(required: number[], excluded: number[]) {
  const base = Array.from({ length: 45 }, (_, index) => index + 1).filter(
    (number) => !excluded.includes(number) && !required.includes(number),
  );

  return [...required, ...shuffle(base).slice(0, Math.max(0, 6 - required.length))].sort(
    (a, b) => a - b,
  );
}

function weightedPickUnique(candidates: number[], weights: Map<number, number>, count: number) {
  const pool = [...candidates];
  const picked: number[] = [];
  while (pool.length && picked.length < count) {
    const total = pool.reduce((sum, number) => sum + Math.max(0.001, weights.get(number) ?? 1), 0);
    let cursor = Math.random() * total;
    let selectedIndex = pool.length - 1;
    for (let index = 0; index < pool.length; index += 1) {
      cursor -= Math.max(0.001, weights.get(pool[index]) ?? 1);
      if (cursor <= 0) { selectedIndex = index; break; }
    }
    picked.push(pool[selectedIndex]);
    pool.splice(selectedIndex, 1);
  }
  return picked;
}

function buildRecommendationProfile(draws: HistoryDraw[]) {
  const counts = new Map<number, number>();
  for (let number = 1; number <= 45; number += 1) counts.set(number, 0);
  const parity = Array.from({ length: 7 }, () => 0);
  draws.forEach((item) => {
    const numbers = [...item.numbers].sort((a, b) => a - b);
    numbers.forEach((number) => counts.set(number, (counts.get(number) ?? 0) + 1));
    parity[numbers.filter((number) => number % 2 === 1).length] += 1;
  });
  const values = [...counts.values()];
  const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const max = Math.max(...values, 0);
  return { counts, parity, average, max };
}

function makeStatCombination(
  required: number[],
  excluded: number[],
  draws: HistoryDraw[],
  strategy: RecommendStrategy,
) {
  const available = Array.from({ length: 45 }, (_, index) => index + 1).filter((number) => !required.includes(number) && !excluded.includes(number));
  const profile = buildRecommendationProfile(draws);
  const weights = new Map<number, number>();
  available.forEach((number) => {
    const frequency = profile.counts.get(number) ?? 0;
    if (strategy === 'hot' || strategy === 'parityHot') weights.set(number, frequency + 1);
    else if (strategy === 'cold') weights.set(number, profile.max - frequency + 1);
    else if (strategy === 'average') weights.set(number, 1 / (Math.abs(frequency - profile.average) + 1));
    else weights.set(number, 1);
  });

  let selected = [...required];
  const targetOdd = strategy === 'parityHot'
    ? profile.parity.reduce((best, value, odd) => value > profile.parity[best] ? odd : best, 0)
    : null;
  if (targetOdd !== null) {
    const requiredOdd = required.filter((number) => number % 2 === 1).length;
    const remainingOdd = Math.max(0, targetOdd - requiredOdd);
    const oddPool = available.filter((number) => number % 2 === 1);
    const evenPool = available.filter((number) => number % 2 === 0);
    const oddPicked = weightedPickUnique(oddPool, weights, Math.min(remainingOdd, 6 - selected.length));
    selected = [...selected, ...oddPicked];
    const evenNeeded = 6 - selected.length;
    selected = [...selected, ...weightedPickUnique(evenPool, weights, evenNeeded)];
  } else {
    selected = [...selected, ...weightedPickUnique(available, weights, Math.max(0, 6 - selected.length))];
  }
  if (selected.length < 6) {
    const fallback = Array.from({ length: 45 }, (_, index) => index + 1).filter((number) => !excluded.includes(number) && !selected.includes(number));
    selected = [...selected, ...shuffle(fallback).slice(0, 6 - selected.length)];
  }
  return selected.slice(0, 6).sort((a, b) => a - b);
}


function RecommendScreen({ draw }: { draw: DrawData }) {
  const scrollRef = useRef<ScrollView>(null);
  const resultYRef = useRef(0);
  const [required, setRequired] = useState<number[]>([]);
  const [excluded, setExcluded] = useState<number[]>([]);
  const [count, setCount] = useState<CountKey>(5);
  const [sets, setSets] = useState<number[][]>([]);
  const [selectionMode, setSelectionMode] = useState<'required' | 'excluded'>('required');
  const [strategy, setStrategy] = useState<RecommendStrategy>('random');
  const [analysisPeriod, setAnalysisPeriod] = useState<RecommendPeriod>(100);
  const [analysisInput, setAnalysisInput] = useState('100');
  const [history, setHistory] = useState<HistoryDraw[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saved, setSaved] = useState<RecommendSavedData>({ myNumbers: [], required: [], excluded: [] });
  const [savedOpen, setSavedOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);

  const availableCount = 45 - new Set([...required, ...excluded]).size;
  const conflict = required.some((number) => excluded.includes(number));
  const canGenerate = required.length <= 6 && !conflict && availableCount >= 6 - required.length;

  useEffect(() => {
    let alive = true;
    setHistoryLoading(true);
    fetchHistoryFromService(1000).then((items) => {
      if (!alive) return;
      setHistory(items.filter((item) => item.round <= draw.round).slice(0, analysisPeriod));
      setHistoryLoading(false);
    }).catch(() => {
      if (alive) setHistoryLoading(false);
    });
    return () => { alive = false; };
  }, [draw.round, analysisPeriod]);

  useEffect(() => {
    loadRecommendSavedData().then(setSaved).catch(() => undefined);
  }, []);

  async function persist(next: RecommendSavedData) {
    setSaved(next);
    try { await saveRecommendSavedData(next); } catch { /* 저장 실패 시 현재 화면 상태는 유지 */ }
  }

  function toggleRequired(number: number) {
    if (excluded.includes(number)) return;
    setRequired((current) => current.includes(number) ? current.filter((value) => value !== number) : current.length < 6 ? [...current, number].sort((a, b) => a - b) : current);
  }

  function toggleExcluded(number: number) {
    if (required.includes(number)) return;
    setExcluded((current) => current.includes(number) ? current.filter((value) => value !== number) : [...current, number].sort((a, b) => a - b));
  }

  function selectPeriod(value: RecommendPeriod) {
    setAnalysisPeriod(value);
    setAnalysisInput(String(value));
  }

  function applyPeriodInput() {
    const parsed = Number(analysisInput.replace(/[^0-9]/g, ''));
    if (!Number.isFinite(parsed)) return;
    const value = Math.min(1000, Math.max(10, Math.round(parsed))) as RecommendPeriod;
    setAnalysisPeriod(value);
    setAnalysisInput(String(value));
  }

  function generate() {
    if (!canGenerate) return;
    const source = history.length ? history : [];
    const generated: number[][] = [];
    const seen = new Set<string>();
    const maxAttempts = Math.max(20, count * 12);
    let attempts = 0;
    while (generated.length < count && attempts < maxAttempts) {
      attempts += 1;
      const next = strategy === 'random'
        ? makeCombination(required, excluded)
        : makeStatCombination(required, excluded, source, strategy);
      const key = next.join(',');
      if (next.length === 6 && !seen.has(key)) {
        seen.add(key);
        generated.push(next);
      }
    }
    setSets(generated);
    requestAnimationFrame(() => setTimeout(() => scrollRef.current?.scrollTo({ y: Math.max(0, resultYRef.current - 12), animated: true }), 80));
  }

  async function saveMyNumber(numbers: number[]) {
    const normalized = [...numbers].sort((a, b) => a - b);
    if (saved.myNumbers.some((item) => item.join(',') === normalized.join(','))) return;
    await persist({ ...saved, myNumbers: [normalized, ...saved.myNumbers].slice(0, 30) });
  }

  async function deleteMyNumber(numbers: number[]) {
    const key = numbers.join(',');
    await persist({ ...saved, myNumbers: saved.myNumbers.filter((item) => item.join(',') !== key) });
  }

  async function saveRequired() {
    if (!required.length) return;
    await persist({ ...saved, required: [...required] });
  }

  async function saveExcluded() {
    if (!excluded.length) return;
    await persist({ ...saved, excluded: [...excluded] });
  }

  function loadRequired() { setRequired(saved.required.filter((number) => !excluded.includes(number)).slice(0, 6)); }
  function loadExcluded() { setExcluded(saved.excluded.filter((number) => !required.includes(number))); }
  function applyMyNumber(numbers: number[]) { setRequired([...numbers]); setExcluded([]); setSelectionMode('required'); }

  const strategyItems: { key: RecommendStrategy; title: string; description: string }[] = [
    { key: 'random', title: '기본 생성', description: '필수·제외 조건만 반영' },
    { key: 'hot', title: '많이 나온 번호', description: `최근 ${analysisPeriod}회 출현 빈도 상위` },
    { key: 'cold', title: '가장 적게 나온 번호', description: `최근 ${analysisPeriod}회 출현 빈도 하위` },
    { key: 'average', title: '평균 번호', description: `최근 ${analysisPeriod}회 평균 빈도에 가까운 번호` },
    { key: 'parityHot', title: '많이 나온 홀·짝', description: `최근 ${analysisPeriod}회 최빈 홀·짝 패턴 반영` },
  ];

  return (
    <ScrollView ref={scrollRef} className={tw.screen} style={{ flex: 1, width: '100%', minWidth: 0, alignSelf: 'stretch', backgroundColor: COLORS.bg }} contentContainerClassName={tw.screenContent} contentContainerStyle={[{ flexGrow: 1, width: '100%', minWidth: 0, paddingBottom: 102 }, rnStyle(tw.screenContent)]} showsVerticalScrollIndicator={false}>
      <PageHeader eyebrow="번호 생성" title="번호 생성" description="필수·제외 번호와 최근 당첨 통계를 조합해 원하는 방식으로 번호를 만들어보세요." />

      <View className={tw.recommendInfoCard} style={rnStyle(tw.recommendInfoCard)}>
        <View className={tw.recommendInfoIcon} style={rnStyle(tw.recommendInfoIcon)}><Text className={tw.recommendInfoIconText} style={rnStyle(tw.recommendInfoIconText)}>✦</Text></View>
        <View className={tw.recommendInfoCopy} style={rnStyle(tw.recommendInfoCopy)}>
          <Text className={tw.recommendInfoTitle} style={rnStyle(tw.recommendInfoTitle)}>조건을 먼저 선택하세요</Text>
          <Text className={tw.recommendInfoText} style={rnStyle(tw.recommendInfoText)}>필수 번호는 반드시 포함하고, 제외 번호는 조합에서 제거합니다.</Text>
        </View>
      </View>

      <View className={tw.recommendControlCard} style={rnStyle(tw.recommendControlCard)}>
        <View className={tw.recommendControlHeader} style={rnStyle(tw.recommendControlHeader)}>
          <Text className={tw.recommendControlTitle} style={rnStyle(tw.recommendControlTitle)}>생성 설정</Text>
          <Text className={tw.recommendControlSummary} style={rnStyle(tw.recommendControlSummary)}>세트 {count} · 필수 {required.length} · 제외 {excluded.length}</Text>
        </View>
        <View className={tw.segmentRow} style={rnStyle(tw.segmentRow)}>
          {[3, 5, 10].map((value) => {
            const selected = count === value;
            return <Pressable key={value} onPress={() => setCount(value as CountKey)} style={({ pressed }) => [rnStyle(tw.segmentButton), { borderRadius: 10, minHeight: 24, justifyContent: 'center', overflow: 'hidden', paddingVertical: 5, ...(selected ? { backgroundColor: '#FFFFFF', shadowColor: '#191F28', shadowOpacity: 0.10, shadowRadius: 5, shadowOffset: { width: 0, height: 1 }, elevation: 2 } : {}), opacity: pressed ? 0.72 : 1 }]}><Text className={cn(tw.segmentText, selected && tw.segmentTextActive)} style={rnStyle(cn(tw.segmentText, selected && tw.segmentTextActive))}>{value}세트</Text></Pressable>;
          })}
        </View>
      </View>

      <View className={tw.recommendDisclosureCard} style={rnStyle(tw.recommendDisclosureCard)}>
        <Pressable
          onPress={() => setStatsOpen((value) => !value)}
          className={tw.recommendDisclosureHeader}
          style={rnStyle(tw.recommendDisclosureHeader)}
          accessibilityRole="button"
          accessibilityState={{ expanded: statsOpen }}
        >
          <View className={tw.recommendDisclosureCopy} style={rnStyle(tw.recommendDisclosureCopy)}>
            <Text className={tw.recommendDisclosureTitle} style={rnStyle(tw.recommendDisclosureTitle)}>통계 기반 생성 조건</Text>
            <Text className={tw.recommendDisclosureSummary} style={rnStyle(tw.recommendDisclosureSummary)}>최근 {analysisPeriod}회 · {strategyItems.find((item) => item.key === strategy)?.title ?? '기본 생성'}</Text>
          </View>
          <View className={tw.recommendDisclosureRight} style={rnStyle(tw.recommendDisclosureRight)}>
            {historyLoading ? <ActivityIndicator size="small" color={COLORS.primary} /> : null}
            <Text className={tw.recommendDisclosureArrow} style={rnStyle(tw.recommendDisclosureArrow)}>{statsOpen ? '⌃' : '⌄'}</Text>
          </View>
        </Pressable>
        {statsOpen ? (
          <View className={tw.recommendDisclosureBody} style={rnStyle(tw.recommendDisclosureBody)}>
            <Text className={tw.recommendDisclosureHint} style={rnStyle(tw.recommendDisclosureHint)}>최근 10~1000회 당첨번호를 기준으로 생성합니다. 과거 통계는 참고용입니다.</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
              {([10, 30, 50, 100, 300, 500, 1000] as RecommendPeriod[]).map((value) => <Pressable key={value} onPress={() => selectPeriod(value)} style={{ paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, backgroundColor: analysisPeriod === value ? COLORS.primarySoft : '#F7F8FA', borderWidth: 1, borderColor: analysisPeriod === value ? '#BFD9FF' : COLORS.line }}><Text style={{ fontSize: 11, fontWeight: '800', color: analysisPeriod === value ? COLORS.primary : COLORS.sub }}>{value}회</Text></Pressable>)}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 9 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.sub }}>직접 입력</Text>
              <TextInput value={analysisInput} onChangeText={setAnalysisInput} onBlur={applyPeriodInput} onSubmitEditing={applyPeriodInput} keyboardType="number-pad" style={{ flex: 1, height: 38, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: COLORS.line, backgroundColor: '#F7F8FA', fontSize: 13, fontWeight: '900', color: COLORS.text }} />
              <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.sub }}>회</Text>
            </View>
            <View style={{ marginTop: 12, gap: 7 }}>
              {strategyItems.map((item) => {
                const selected = strategy === item.key;
                return <Pressable key={item.key} onPress={() => setStrategy(item.key)} style={{ padding: 12, borderRadius: 12, borderWidth: selected ? 1.5 : 1, borderColor: selected ? COLORS.primary : COLORS.line, backgroundColor: selected ? COLORS.primarySoft : '#FFFFFF', flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: selected ? COLORS.primary : '#C8D0DA', marginRight: 10 }} />
                  <View style={{ flex: 1 }}><Text style={{ fontSize: 12, fontWeight: '900', color: COLORS.text }}>{item.title}</Text><Text style={{ marginTop: 2, fontSize: 10, lineHeight: 15, color: COLORS.sub }}>{item.description}</Text></View>
                  {selected ? <Text style={{ fontSize: 11, fontWeight: '900', color: COLORS.primary }}>선택</Text> : null}
                </Pressable>;
              })}
            </View>
          </View>
        ) : null}
      </View>

      <View className={tw.recommendDisclosureCard} style={rnStyle(tw.recommendDisclosureCard)}>
        <Pressable onPress={() => setSavedOpen((value) => !value)} className={tw.recommendDisclosureHeader} style={rnStyle(tw.recommendDisclosureHeader)} accessibilityRole="button" accessibilityState={{ expanded: savedOpen }}>
          <View className={tw.recommendDisclosureCopy} style={rnStyle(tw.recommendDisclosureCopy)}>
            <Text style={{ fontSize: 13, fontWeight: '900', color: COLORS.text }}>저장한 번호·조건</Text>
            <Text style={{ marginTop: 3, fontSize: 10, color: COLORS.muted }}>내 번호 {saved.myNumbers.length}개 · 필수 {saved.required.length}개 · 제외 {saved.excluded.length}개</Text>
          </View>
          <View className={tw.recommendDisclosureRight} style={rnStyle(tw.recommendDisclosureRight)}>
            <Text className={tw.recommendDisclosureArrow} style={rnStyle(tw.recommendDisclosureArrow)}>{savedOpen ? '⌃' : '⌄'}</Text>
          </View>
        </Pressable>
        {savedOpen ? <View className={tw.savedRecommendDisclosureBody} style={rnStyle(tw.savedRecommendDisclosureBody)}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={saveRequired} disabled={!required.length} style={{ flex: 1, minHeight: 40, borderRadius: 10, backgroundColor: required.length ? COLORS.primarySoft : '#F3F5F7', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 11, fontWeight: '900', color: required.length ? COLORS.primary : COLORS.muted }}>필수 번호 저장</Text></Pressable>
            <Pressable onPress={saveExcluded} disabled={!excluded.length} style={{ flex: 1, minHeight: 40, borderRadius: 10, backgroundColor: excluded.length ? COLORS.dangerSoft : '#F3F5F7', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 11, fontWeight: '900', color: excluded.length ? COLORS.danger : COLORS.muted }}>제외 번호 저장</Text></Pressable>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <Pressable onPress={loadRequired} disabled={!saved.required.length} style={{ flex: 1, minHeight: 34, borderRadius: 10, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 10, fontWeight: '800', color: COLORS.sub }}>필수 불러오기</Text></Pressable>
            <Pressable onPress={loadExcluded} disabled={!saved.excluded.length} style={{ flex: 1, minHeight: 34, borderRadius: 10, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 10, fontWeight: '800', color: COLORS.sub }}>제외 불러오기</Text></Pressable>
          </View>
          {saved.myNumbers.length ? <View style={{ gap: 7 }}>
            <Text style={{ fontSize: 11, fontWeight: '900', color: COLORS.text }}>내 번호</Text>
            {saved.myNumbers.slice(0, 5).map((numbers) => <View key={numbers.join('-')} style={{ minHeight: 44, paddingHorizontal: 8, borderRadius: 12, backgroundColor: '#F7F8FA', flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ flex: 1, fontSize: 11, fontWeight: '800', color: COLORS.text }}>{numbers.join(' · ')}</Text>
              <Pressable onPress={() => applyMyNumber(numbers)} style={{ paddingHorizontal: 8, paddingVertical: 6, borderRadius: 9, backgroundColor: COLORS.primarySoft }}><Text style={{ fontSize: 10, fontWeight: '900', color: COLORS.primary }}>적용</Text></Pressable>
              <Pressable onPress={() => deleteMyNumber(numbers)} style={{ marginLeft: 5, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 9, backgroundColor: '#FFFFFF' }}><Text style={{ fontSize: 10, fontWeight: '900', color: COLORS.danger }}>삭제</Text></Pressable>
            </View>)}
          </View> : <Text style={{ fontSize: 11, color: COLORS.muted }}>생성 결과에서 ‘내 번호 저장’을 누르면 여기에 보관됩니다.</Text>}
        </View> : null}
      </View>

      <SectionHeader title="번호 조건" />
      <View style={{ paddingHorizontal: 12 }}>
        <View className={tw.selectionModeRow} style={rnStyle(tw.selectionModeRow)}>
          <Pressable onPress={() => setSelectionMode('required')} className={tw.selectionModeButton} style={[rnStyle(tw.selectionModeButton), { backgroundColor: '#FFFFFF', borderColor: selectionMode === 'required' ? COLORS.primary : '#E5E8EB', borderWidth: selectionMode === 'required' ? 2 : 1 }]}><Text className={tw.selectionModeText} style={[rnStyle(tw.selectionModeText), { color: selectionMode === 'required' ? COLORS.primary : '#191F28', fontWeight: '800' }]}>필수 번호</Text></Pressable>
          <Pressable onPress={() => setSelectionMode('excluded')} className={tw.selectionModeButton} style={[rnStyle(tw.selectionModeButton), { backgroundColor: '#FFFFFF', borderColor: selectionMode === 'excluded' ? COLORS.danger : '#E5E8EB', borderWidth: selectionMode === 'excluded' ? 2 : 1 }]}><Text className={tw.selectionModeText} style={[rnStyle(tw.selectionModeText), { color: selectionMode === 'excluded' ? COLORS.danger : '#191F28', fontWeight: '800' }]}>제외 번호</Text></Pressable>
        </View>
        <Text className={tw.helperText} style={rnStyle(tw.helperText)}>{selectionMode === 'required' ? '파란색으로 표시된 번호가 필수 번호입니다.' : '빨간색으로 표시된 번호가 제외 번호입니다.'}</Text>
        <View className={tw.numberGridCard} style={[rnStyle(tw.numberGridCard), { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignContent: 'center', paddingHorizontal: 12, paddingVertical: 12 }]}>
          {Array.from({ length: 45 }, (_, index) => index + 1).map((number) => {
            const isRequired = required.includes(number); const isExcluded = excluded.includes(number); const isBlocked = selectionMode === 'required' ? isExcluded : isRequired; const active = selectionMode === 'required' ? isRequired : isExcluded;
            return <Pressable key={number} disabled={isBlocked} onPress={() => selectionMode === 'required' ? toggleRequired(number) : toggleExcluded(number)} className={cn(tw.selectNumber, active && (selectionMode === 'required' ? tw.selectNumberRequired : tw.selectNumberExcluded), isBlocked && tw.selectNumberBlocked)} style={[{ width: 36, height: 36, minWidth: 36, maxWidth: 36, flexGrow: 0, flexShrink: 0, borderRadius: 18, borderWidth: 1, borderColor: '#E5E8EB', backgroundColor: '#FAFBFC', alignItems: 'center', justifyContent: 'center' }, active ? { backgroundColor: selectionMode === 'required' ? COLORS.primary : COLORS.dangerSoft, borderColor: selectionMode === 'required' ? COLORS.primary : COLORS.danger, borderWidth: 2, borderRadius: 18 } : undefined]}><Text className={cn(tw.selectNumberText, active && selectionMode === 'required' && tw.selectNumberTextActive, isBlocked && tw.selectNumberTextBlocked)} style={[{ width: '100%', height: 36, lineHeight: 36, textAlign: 'center', textAlignVertical: 'center' }, active ? { color: selectionMode === 'required' ? '#FFFFFF' : COLORS.danger, fontWeight: '900' } : undefined]}>{number}</Text></Pressable>;
          })}
        </View>
        <View className={tw.selectionSummaryCard} style={rnStyle(tw.selectionSummaryCard)}><SelectionSummary title="필수" values={required} color={COLORS.primary} /><View className={tw.summaryDivider} style={rnStyle(tw.summaryDivider)} /><SelectionSummary title="제외" values={excluded} color={COLORS.danger} /></View>
        {conflict ? <View className={tw.errorBanner} style={rnStyle(tw.errorBanner)}><Text className={tw.errorBannerText} style={rnStyle(tw.errorBannerText)}>같은 번호가 필수와 제외에 동시에 들어갈 수 없습니다.</Text></View> : null}
      </View>
      <Pressable onPress={generate} disabled={!canGenerate || historyLoading && strategy !== 'random'} className={cn(tw.generateButton, (!canGenerate || historyLoading && strategy !== 'random') && tw.generateButtonDisabled)} style={rnStyle(cn(tw.generateButton, (!canGenerate || historyLoading && strategy !== 'random') && tw.generateButtonDisabled))}><Text className={tw.generateButtonText} style={rnStyle(tw.generateButtonText)}>{historyLoading && strategy !== 'random' ? '통계 불러오는 중' : `${count}세트 생성하기`}</Text></Pressable>

      {sets.length > 0 ? <View style={{ marginTop: 28 }} onLayout={(event) => { resultYRef.current = event.nativeEvent.layout.y; }}><SectionHeader title="생성 결과" /><View className={tw.resultStack} style={rnStyle(tw.resultStack)}>{sets.map((set, index) => {
        const isSaved = saved.myNumbers.some((item) => item.join(',') === set.join(','));
        return <View key={`${set.join('-')}-${index}`} className={tw.resultCard} style={rnStyle(tw.resultCard)}>
          <View className={tw.resultHeader} style={rnStyle(tw.resultHeader)}><Text className={tw.resultIndex} style={rnStyle(tw.resultIndex)}>{index + 1}번 조합</Text><Text className={tw.resultSub} style={rnStyle(tw.resultSub)}>{strategyItems.find((item) => item.key === strategy)?.title}</Text></View>
          <View className={tw.ballRow} style={rnStyle(tw.ballRow)}>{set.map((number) => <LottoBall key={number} number={number} size="small" />)}</View>
          <Pressable onPress={() => saveMyNumber(set)} disabled={isSaved} style={{ marginTop: 12, minHeight: 34, borderRadius: 10, backgroundColor: isSaved ? '#F3F5F7' : COLORS.primarySoft, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 10, fontWeight: '900', color: isSaved ? COLORS.muted : COLORS.primary }}>{isSaved ? '내 번호 저장됨' : '내 번호로 저장'}</Text></Pressable>
        </View>;
      })}</View></View> : null}
    </ScrollView>
  );
}


export default RecommendScreen;
