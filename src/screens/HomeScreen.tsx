import React from 'react';
import { ScrollView, View } from 'react-native';
import { tw } from '../../App.tw';
import { COLORS, DrawData, TabKey, Text, LottoBall, SectionHeader, ActionCard, PrizeRankRow, styles } from '../components/common';

function HomeScreen({ onNavigate, draw, loading, error }: { onNavigate: (tab: TabKey) => void; draw: DrawData; loading: boolean; error: string | null }) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.homeContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View>
            <Text style={styles.eyebrow}>최근 추첨</Text>
            <Text style={styles.heroTitle}>{draw.round}회 결과</Text>
            <Text style={styles.heroDate}>{draw.date} 추첨</Text>
          </View>
          <View style={styles.roundBadge}>
            <Text style={styles.roundBadgeText}>최신 회차</Text>
          </View>
        </View>
        <View style={styles.ballRow}>
          {draw.numbers.map((number) => <LottoBall key={number} number={number} />)}
          <View style={styles.plusCircle}><Text style={styles.plusText}>+</Text></View>
          <LottoBall number={draw.bonus} />
        </View>
      </View>

      <SectionHeader title="빠른 메뉴" />
      <View style={styles.menuGrid}>
        <ActionCard title="번호 생성" description="원하는 조건으로 번호 조합 생성" icon="✦" onPress={() => onNavigate('recommend')} />
        <ActionCard title="통계 분석" description="최근 출현 패턴과 빈도 확인" icon="▥" onPress={() => onNavigate('stats')} />
        <ActionCard title="당첨 확인" description="내 번호와 당첨번호 비교" icon="✓" onPress={() => onNavigate('check')} />
        <ActionCard title="세후 계산" description="당첨금 실수령액 계산" icon="₩" onPress={() => onNavigate('more')} />
      </View>

      <SectionHeader title="최근 당첨금" />
      <View style={styles.prizeCard}>
        <View style={styles.prizeCopy}>
          <Text style={styles.prizeLabel}>최근 1등 당첨금</Text>
          <Text style={styles.prizeValue}>{draw.firstPrize.toLocaleString('ko-KR')}원</Text>
          <Text style={styles.prizeSubValue}>{draw.firstWinners > 0 ? `${draw.firstWinners}명 당첨` : '당첨자 정보 확인 중'}</Text>
        </View>
        <View style={styles.prizeDivider} />
        <View style={styles.prizeMetaBox}>
          <Text style={styles.prizeMetaLabel}>등수별 정보</Text>
          <Text style={styles.prizeMetaValue}>1등 {draw.firstWinners > 0 ? `${draw.firstWinners}명` : '확인 중'}</Text>
          <Text style={styles.prizeMetaSmall}>2등 {draw.secondWinners > 0 ? `${draw.secondWinners}명` : '확인 중'} · 3등 {draw.thirdWinners > 0 ? `${draw.thirdWinners}명` : '확인 중'}</Text>
        </View>
      </View>

      <View style={styles.prizeRankCard}>
        <PrizeRankRow rank="1등" prize={draw.firstPrize} winners={draw.firstWinners} />
        <View style={styles.prizeRankDivider} />
        <PrizeRankRow rank="2등" prize={draw.secondPrize} winners={draw.secondWinners} />
        <View style={styles.prizeRankDivider} />
        <PrizeRankRow rank="3등" prize={draw.thirdPrize} winners={draw.thirdWinners} />
      </View>

      <View style={styles.noticeCard}>
        <View style={styles.noticeDot} />
        <Text style={styles.noticeText}>{loading ? '최신 회차 데이터를 확인하고 있습니다.' : error ?? `${draw.round}회 데이터를 불러왔습니다.`}</Text>
      </View>
    </ScrollView>
  );
}

export default HomeScreen;
