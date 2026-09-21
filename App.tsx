import "./global.css";
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, PanResponder, SafeAreaView, StatusBar, View, useWindowDimensions } from 'react-native';
import { fetchDraw } from './src/services/lottoApi';
import { useLatestDraw as useLatestDrawFromService } from './src/hooks/useLatestDraw';
import {
  AppHeader, BottomNavigation, MenuModal, RoundSelector, ServiceLoadingScreen, COLORS, DrawData, TabKey,
} from './src/components/common';
import HomeScreen from './src/screens/HomeScreen';
import RecommendScreen from './src/screens/RecommendScreen';
import StatsScreen from './src/screens/StatsScreen';
import CheckScreen from './src/screens/CheckScreen';
import TaxScreen from './src/screens/TaxScreen';
import { tw } from './App.tw';
import { fetchHistory as fetchHistoryFromService } from './src/services/lottoApi';

function App() {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = 'ko';
      document.documentElement.setAttribute('translate', 'no');
      let meta = document.querySelector('meta[name="google"]') as HTMLMetaElement | null;
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'google';
        document.head.appendChild(meta);
      }
      meta.content = 'notranslate';
      const fontHref = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css';
      if (!document.querySelector(`link[data-pretendard="true"]`)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.crossOrigin = 'anonymous';
        link.href = fontHref;
        link.dataset.pretendard = 'true';
        document.head.appendChild(link);
      }
    }
  }, []);

  const [tab, setTab] = useState<TabKey>('home');
  const [menuOpen, setMenuOpen] = useState(false);
  const { draw: latestDraw, loading, error } = useLatestDrawFromService();
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [selectedDraw, setSelectedDraw] = useState<DrawData | null>(null);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [selectedError, setSelectedError] = useState<string | null>(null);
  const swipeX = useRef(new Animated.Value(0)).current;
  const [swipeTarget, setSwipeTarget] = useState<TabKey | null>(null);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const tabRef = useRef<TabKey>(tab);
  const menuOpenRef = useRef(menuOpen);
  const tabOrder: TabKey[] = ['home', 'recommend', 'stats', 'check', 'more'];
  const { width: windowWidth } = useWindowDimensions();
  const screenWidth = Math.max(320, windowWidth);
  const screenWidthRef = useRef(screenWidth);
  screenWidthRef.current = screenWidth;
  tabRef.current = tab;
  menuOpenRef.current = menuOpen;

  const getSwipeTarget = (dx: number) => {
    const currentIndex = tabOrder.indexOf(tabRef.current);
    const nextIndex = dx < 0
      ? Math.min(tabOrder.length - 1, currentIndex + 1)
      : Math.max(0, currentIndex - 1);
    return nextIndex === currentIndex ? null : tabOrder[nextIndex];
  };

  const swipeResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        !menuOpenRef.current && Math.abs(gesture.dx) > 16 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.35,
      onPanResponderMove: (_, gesture) => {
        const target = getSwipeTarget(gesture.dx);
        if (!target) return;
        const direction = gesture.dx < 0 ? 'left' : 'right';
        setSwipeTarget(target);
        setSwipeDirection(direction);
        swipeX.setValue(Math.max(-screenWidthRef.current, Math.min(screenWidthRef.current, gesture.dx)));
      },
      onPanResponderRelease: (_, gesture) => {
        const target = getSwipeTarget(gesture.dx);
        if (!target || Math.abs(gesture.dx) < 56 || Math.abs(gesture.dx) < Math.abs(gesture.dy)) {
          Animated.spring(swipeX, { toValue: 0, damping: 20, stiffness: 240, mass: 0.7, useNativeDriver: true }).start(() => {
            setSwipeTarget(null);
            setSwipeDirection(null);
          });
          return;
        }
        const direction = gesture.dx < 0 ? 'left' : 'right';
        const destination = direction === 'left' ? -screenWidthRef.current : screenWidthRef.current;
        Animated.timing(swipeX, { toValue: destination, duration: 180, useNativeDriver: true }).start(({ finished }) => {
          if (!finished) return;
          setTab(target);
          swipeX.setValue(0);
          setSwipeTarget(null);
          setSwipeDirection(null);
        });
      },
      onPanResponderTerminationRequest: () => true,
      onPanResponderTerminate: () => {
        Animated.spring(swipeX, { toValue: 0, damping: 20, stiffness: 240, mass: 0.7, useNativeDriver: true }).start(() => {
          setSwipeTarget(null);
          setSwipeDirection(null);
        });
      },
    }),
  ).current;

  useEffect(() => {
    if (latestDraw) setSelectedRound((current) => current ?? latestDraw.round);
  }, [latestDraw]);

  useEffect(() => {
    let active = true;
    if (selectedRound === null || !latestDraw) return () => { active = false; };
    if (selectedRound === latestDraw.round) {
      setSelectedDraw(latestDraw);
      setSelectedLoading(false);
      setSelectedError(null);
      return () => { active = false; };
    }
    setSelectedLoading(true);
    setSelectedError(null);
    setSelectedDraw(null);
    fetchDraw(selectedRound).then(async (result) => {
      if (!active) return;
      if (result) { setSelectedDraw(result); setSelectedLoading(false); setSelectedError(null); return; }
      const history = await fetchHistoryFromService(1000);
      if (!active) return;
      const historyDraw = history.find((item) => item.round === selectedRound) ?? null;
      setSelectedDraw(historyDraw);
      setSelectedLoading(false);
      setSelectedError(historyDraw ? null : '정보를 가져오는 중..');
    });
    return () => { active = false; };
  }, [selectedRound, latestDraw]);

  const draw = selectedDraw;
  if (loading || selectedLoading) {
    return <SafeAreaView className={tw.safeArea} style={{ flex: 1, width: '100%', height: '100%', alignSelf: 'stretch' }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      <ServiceLoadingScreen />
    </SafeAreaView>;
  }

  if (!latestDraw || !draw || error || selectedError) {
    return <SafeAreaView className={tw.safeArea} style={{ flex: 1, width: '100%', height: '100%', alignSelf: 'stretch' }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      <ServiceLoadingScreen />
    </SafeAreaView>;
  }

  const changeTab = (nextTab: TabKey) => {
    if (nextTab === tabRef.current) return;
    setTab(nextTab);
  };

  const renderContent = (screenTab: TabKey) => {
    switch (screenTab) {
      case 'recommend': return <RecommendScreen draw={draw} />;
      case 'stats': return <StatsScreen draw={draw} />;
      case 'check': return <CheckScreen draw={draw} />;
      case 'more': return <TaxScreen draw={draw} />;
      default: return <HomeScreen onNavigate={changeTab} draw={draw} loading={loading || selectedLoading} error={error} />;
    }
  };

  const content = renderContent(tab);
  const isMobileWeb = Platform.OS === 'web' && windowWidth <= 600;
  const mobileFixedHeader = isMobileWeb ? ({ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50 } as any) : undefined;
  const mobileFixedRoundSelector = isMobileWeb ? ({ position: 'fixed', top: 60, left: 0, right: 0, zIndex: 49 } as any) : undefined;
  const mobileFixedBottomNav = isMobileWeb ? ({ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50 } as any) : undefined;
  const mobileContentOffset = isMobileWeb ? { paddingTop: 124, paddingBottom: 66 } : undefined;

  return <SafeAreaView className={tw.safeArea} style={{ flex: 1, width: '100%', height: '100%', alignSelf: 'stretch' }}>
    <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
    <View className={tw.app} style={{ flex: 1, width: '100%', minWidth: 0, alignSelf: 'stretch', ...(Platform.OS === 'web' ? { overflowX: 'hidden' } : {}) }}>
      <View style={mobileFixedHeader}>
        <AppHeader onHome={() => { changeTab('home'); setMenuOpen(false); }} onMenu={() => setMenuOpen(true)} />
      </View>
      <View className={tw.content} style={{ flex: 1, width: '100%', minWidth: 0, alignSelf: 'stretch', ...mobileContentOffset }}>
        <View style={mobileFixedRoundSelector}>
          <RoundSelector round={draw.round} latestRound={latestDraw.round} loading={selectedLoading} onChange={setSelectedRound} />
        </View>
        <Animated.View {...swipeResponder.panHandlers} style={{ flex: 1, width: '100%', minWidth: 0, alignSelf: 'stretch', ...(isMobileWeb ? ({ touchAction: 'pan-y' } as any) : {}) }}>
          <Animated.View style={{ flex: 1, width: '100%', minWidth: 0, transform: [{ translateX: swipeX }] }}>{content}</Animated.View>
          {swipeTarget && swipeDirection ? <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, width: '100%', transform: [{ translateX: swipeX }, { translateX: swipeDirection === 'left' ? screenWidth : -screenWidth }] }}>{renderContent(swipeTarget)}</Animated.View> : null}
        </Animated.View>
      </View>
      <View style={mobileFixedBottomNav}>
        <BottomNavigation active={tab} onChange={changeTab} />
      </View>
      <MenuModal visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </View>
  </SafeAreaView>;
}

export default App;
