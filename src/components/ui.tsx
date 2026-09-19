import React from 'react';
import { Dimensions, Image, Pressable, ScrollView, StyleSheet, Text as RNText, TextInput as RNTextInput, View } from 'react-native';
import { tw } from '../../App.tw';
import { cn } from '../styles/cn';

export type TabKey = 'home' | 'recommend' | 'stats' | 'check' | 'more';
export type DrawData = import('../types/lotto').DrawData;

export const COLORS = {
  bg: '#F7F8FA', card: '#FFFFFF', text: '#191F28', sub: '#6B7684', muted: '#8B95A1',
  line: '#E5E8EB', primary: '#3182F6', primarySoft: '#EAF3FF', amber: '#F5A000', blue: '#3578E5',
  red: '#E5484D', gray: '#6B7280', green: '#22A05A', dangerSoft: '#FFF1F1', danger: '#E5484D',
};

export function Text(props: React.ComponentProps<typeof RNText>) {
  const { style, className, ...rest } = props;
  return <RNText {...rest} className={cn('font-pretendard', className)} style={[{ fontFamily: 'Pretendard Variable' }, style]} />;
}

export function TextInput(props: React.ComponentProps<typeof RNTextInput>) {
  const { style, className, ...rest } = props;
  return <RNTextInput {...rest} className={cn('font-pretendard', className)} style={[{ fontFamily: 'Pretendard Variable' }, style]} />;
}


export function getBallColor(number: number) {
  if (number <= 10) return COLORS.amber;
  if (number <= 20) return COLORS.blue;
  if (number <= 30) return COLORS.red;
  if (number <= 40) return COLORS.gray;
  return COLORS.green;
}


export function rnStyle(...classNames: Array<string | false | null | undefined>) {
  const style: Record<string, any> = {};
  const apply = (token: string) => {
    if (!token || token.includes(':')) return;
    const n = (v: string) => Number(v.replace('px',''));
    const arbitrary = (prefix: string) => { const m = token.match(new RegExp(`^${prefix}-\[(.+)\]$`)); return m ? m[1] : null; };
    if (token === 'flex-1') return void (style.flex = 1);
    if (token === 'flex-row') return void (style.flexDirection = 'row');
    if (token === 'flex-wrap') return void (style.flexWrap = 'wrap');
    if (token === 'items-center') return void (style.alignItems = 'center');
    if (token === 'items-start') return void (style.alignItems = 'flex-start');
    if (token === 'items-end') return void (style.alignItems = 'flex-end');
    if (token === 'justify-center') return void (style.justifyContent = 'center');
    if (token === 'justify-between') return void (style.justifyContent = 'space-between');
    if (token === 'justify-end') return void (style.justifyContent = 'flex-end');
    if (token === 'self-center') return void (style.alignSelf = 'center');
    if (token === 'self-end') return void (style.alignSelf = 'flex-end');
    if (token === 'text-center') return void (style.textAlign = 'center');
    if (token === 'text-right') return void (style.textAlign = 'right');
    if (token === 'align-middle') return void (style.textAlignVertical = 'center');
    if (token === 'relative') return void (style.position = 'relative');
    if (token === 'absolute') return void (style.position = 'absolute');
    if (token === 'overflow-hidden') return void (style.overflow = 'hidden');
    if (token === 'grow') return void (style.flexGrow = 1);
    if (token === 'grow-0') return void (style.flexGrow = 0);
    if (token === 'shrink-0') return void (style.flexShrink = 0);
    if (token === 'w-full') return void (style.width = '100%');
    if (token === 'h-full') return void (style.height = '100%');
    if (token === 'min-w-0') return void (style.minWidth = 0);
    if (token === 'border-0') return void (style.borderWidth = 0);
    if (token === 'shadow-sm') { Object.assign(style,{shadowColor:'#191F28',shadowOpacity:0.055,shadowRadius:10,shadowOffset:{width:0,height:3},elevation:2}); return; }
    if (token === 'shadow-2xl') { Object.assign(style,{shadowColor:'#191F28',shadowOpacity:0.12,shadowRadius:24,shadowOffset:{width:0,height:-4},elevation:8}); return; }
    let m = token.match(/^(p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap)-\[(-?[\d.]+)px\]$/);
    if (m) {
      const p=m[1], raw=n(m[2]);
      const compact = Dimensions.get('window').width <= 340;
      const v = compact
        ? (p === 'px' ? (raw >= 28 ? 16 : raw >= 18 ? 14 : raw >= 16 ? 14 : raw) : p === 'gap' ? (raw >= 8 ? 6 : raw) : raw)
        : raw;
      const map:any={p:'padding',px:'paddingHorizontal',py:'paddingVertical',pt:'paddingTop',pb:'paddingBottom',pl:'paddingLeft',pr:'paddingRight',m:'margin',mx:'marginHorizontal',my:'marginVertical',mt:'marginTop',mb:'marginBottom',ml:'marginLeft',mr:'marginRight',gap:'gap'};
      style[map[p]]=v; return;
    }
    m = token.match(/^(w|h|min-w|max-w|min-h|max-h)-\[(.+)\]$/);
    if (m) {
      const raw=m[2], compact = Dimensions.get('window').width <= 340;
      let v:any=raw==='full'?'100%':raw.endsWith('px')?n(raw):raw;
      if (compact && m[1] === 'min-w' && Number(v) >= 120) v = 0;
      const map:any={w:'width',h:'height','min-w':'minWidth','max-w':'maxWidth','min-h':'minHeight','max-h':'maxHeight'};
      style[map[m[1]]]=v; return;
    }
    m = token.match(/^basis-\[(.+)\]$/); if(m){style.flexBasis=m[1].endsWith('px')?n(m[1]):m[1];return;}
    m = token.match(/^aspect-\[(.+)\]$/); if(m){style.aspectRatio=Number(m[1])||1;return;}
    m = token.match(/^rounded(?:-(t|b|l|r))?-\[([\d.]+)px\]$/); if(m){const r=n(m[2]),d=m[1]; if(!d)style.borderRadius=r; else if(d==='t'){style.borderTopLeftRadius=r;style.borderTopRightRadius=r;} else if(d==='b'){style.borderBottomLeftRadius=r;style.borderBottomRightRadius=r;} else if(d==='l'){style.borderTopLeftRadius=r;style.borderBottomLeftRadius=r;} else {style.borderTopRightRadius=r;style.borderBottomRightRadius=r;} return;}
    m = token.match(/^border(?:-(b|t|l|r))?-\[([\d.]+)px\]$/); if(m){const w=n(m[2]),d=m[1]; if(!d) style.borderWidth=w; else { const borderMap: Record<string, 'borderBottomWidth'|'borderTopWidth'|'borderLeftWidth'|'borderRightWidth'> = {b:'borderBottomWidth',t:'borderTopWidth',l:'borderLeftWidth',r:'borderRightWidth'}; style[borderMap[d]]=w; }return;}
    m = token.match(/^(bg|text|border|border-b|border-t|border-l|border-r)-\[(.+)\]$/); if(m){const p=m[1],v=m[2]; if(p==='text' && /^-?[\d.]+px$/.test(v)) return; const map:any={bg:'backgroundColor',text:'color',border:'borderColor','border-b':'borderBottomColor','border-t':'borderTopColor','border-l':'borderLeftColor','border-r':'borderRightColor'};style[map[p]]=v;return;}
    m = token.match(/^text-\[([\d.]+)px\]$/); if(m) return void(style.fontSize=n(m[1]));
    m = token.match(/^leading-\[([\d.]+)px\]$/); if(m) return void(style.lineHeight=n(m[1]));
    m = token.match(/^font-\[([\d.]+)\]$/); if(m) return void(style.fontWeight=m[1]);
    m = token.match(/^tracking-\[(-?[\d.]+)px\]$/); if(m) return void(style.letterSpacing=n(m[1]));
    m = token.match(/^opacity-\[([\d.]+)\]$/); if(m) return void(style.opacity=Number(m[1]));
    m = token.match(/^(left|right|top|bottom)-0$/); if(m)return void(style[m[1]]=0);
    m = token.match(/^(left|right|top|bottom)-\[(-?[\d.]+)px\]$/); if(m)return void(style[m[1]]=n(m[2]));
  };
  classNames.filter((v): v is string => Boolean(v)).forEach((v) => v.split(/\s+/).forEach(apply));
  return style;
}


export function PrizeRankRow({ rank, prize, winners }: { rank: string; prize: number; winners: number }) {
  return (
    <View style={styles.prizeRankRow}>
      <Text style={styles.prizeRankLabel}>{rank}</Text>
      <View style={styles.prizeRankInfo}>
        <Text style={styles.prizeRankAmount}>{prize.toLocaleString('ko-KR')}원</Text>
        <Text style={styles.prizeRankWinners}>{winners.toLocaleString('ko-KR')}명</Text>
      </View>
    </View>
  );
}


export function MetricCard({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <View className={tw.metricCard} style={rnStyle(tw.metricCard)}>
      <Text className={tw.metricLabel} style={rnStyle(tw.metricLabel)}>{label}</Text>
      <View className={tw.metricValueRow} style={rnStyle(tw.metricValueRow)}>
        <Text className={tw.metricValue} style={rnStyle(tw.metricValue)}>{value}</Text>
        {unit ? <Text className={tw.metricUnit} style={rnStyle(tw.metricUnit)}>{unit}</Text> : null}
      </View>
    </View>
  );
}

export function PageHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <View className={tw.pageHeaderBlock} style={rnStyle(tw.pageHeaderBlock)}>
      <Text className={tw.appLabel} style={rnStyle(tw.appLabel)}>{eyebrow}</Text>
      <Text className={tw.pageTitle} style={rnStyle(tw.pageTitle)}>{title}</Text>
      <Text className={tw.pageDescription} style={rnStyle(tw.pageDescription)}>{description}</Text>
    </View>
  );
}

export function LegendItem({ dotColor, label }: { dotColor: string; label: string }) {
  return (
    <View className={tw.legendItem} style={rnStyle(tw.legendItem)}>
      <View className={tw.legendDot} style={[rnStyle(tw.legendDot), { backgroundColor: dotColor }]} />
      <Text className={tw.legendText} style={rnStyle(tw.legendText)}>{label}</Text>
    </View>
  );
}

export function SelectionSummary({ title, values, color }: { title: string; values: number[]; color: string }) {
  return (
    <View className={tw.selectionBlock} style={rnStyle(tw.selectionBlock)}>
      <View className={tw.selectionHeading} style={rnStyle(tw.selectionHeading)}>
        <Text className={tw.selectionTitle} style={rnStyle(tw.selectionTitle)}>{title}</Text>
        <Text className={tw.selectionCount} style={[rnStyle(tw.selectionCount), { color }]}>{values.length}개</Text>
      </View>
      <Text className={tw.selectionValues} style={rnStyle(tw.selectionValues)}>{values.length > 0 ? values.join(', ') : '선택 없음'}</Text>
    </View>
  );
}

export function LottoBall({ number, size = 'normal' }: { number: number; size?: 'normal' | 'small' }) {
  return (
    <View style={[styles.ball, size === 'small' && { width: Dimensions.get('window').width <= 340 ? 32 : 36, height: Dimensions.get('window').width <= 340 ? 32 : 36, borderRadius: Dimensions.get('window').width <= 340 ? 16 : 18 } as any, { backgroundColor: getBallColor(number) }]}>
      <Text style={[styles.ballText, size === 'small' && { fontSize: Dimensions.get('window').width <= 340 ? 11 : 12, lineHeight: Dimensions.get('window').width <= 340 ? 14 : 16 }]}>{number}</Text>
    </View>
  );
}


export function PlaceholderScreen({ title, description }: { title: string; description: string }) {
  return (
    <ScrollView
      className={tw.screen}
      style={{ flex: 1, width: '100%', minWidth: 0, alignSelf: 'stretch' }}
      contentContainerClassName={tw.placeholderContent}
      contentContainerStyle={[{ flexGrow: 1, width: '100%', minWidth: 0 }, rnStyle(tw.screenContent)]}
      showsVerticalScrollIndicator={false}
    >
      <Text className={tw.appLabel} style={rnStyle(tw.appLabel)}>우리의 6/45</Text>
      <Text className={tw.pageTitle} style={rnStyle(tw.pageTitle)}>{title}</Text>
      <View className={tw.placeholderCard} style={rnStyle(tw.placeholderCard)}>
        <View className={tw.placeholderIcon} style={rnStyle(tw.placeholderIcon)}>
          <Text className={tw.placeholderIconText} style={rnStyle(tw.placeholderIconText)}>준비중</Text>
        </View>
        <Text className={tw.placeholderTitle} style={rnStyle(tw.placeholderTitle)}>{title}</Text>
        <Text className={tw.placeholderDescription} style={rnStyle(tw.placeholderDescription)}>{description}</Text>
      </View>
    </ScrollView>
  );
}

export function SectionHeader({ title }: { title: string }) {
  return <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{title}</Text></View>;
}



export const styles = StyleSheet.create({
  header: { height: Dimensions.get('window').width <= 600 ? 60 : 76, paddingHorizontal: Dimensions.get('window').width <= 340 ? 16 : 28, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#EEF1F4' },
  logoButton: { flexDirection: 'row', alignItems: 'center', gap: Dimensions.get('window').width <= 600 ? 8 : 10 },
  logoMark: { width: Dimensions.get('window').width <= 600 ? 36 : 48, height: Dimensions.get('window').width <= 600 ? 36 : 48, borderRadius: Dimensions.get('window').width <= 600 ? 12 : 16, backgroundColor: '#FFF4C7', overflow: 'hidden', borderWidth: 1, borderColor: '#F5E6A6' },
  logoImage: { width: Dimensions.get('window').width <= 600 ? 36 : 48, height: Dimensions.get('window').width <= 600 ? 36 : 48 },
  logoLabel: { fontSize: Dimensions.get('window').width <= 600 ? 9 : 12, lineHeight: Dimensions.get('window').width <= 600 ? 12 : 15, fontWeight: '900', letterSpacing: 0.4, color: '#3182F6' },
  logoTitle: { marginTop: 0, fontSize: Dimensions.get('window').width <= 600 ? 17 : 21, lineHeight: Dimensions.get('window').width <= 600 ? 21 : 25, fontWeight: '900', color: '#111827' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Dimensions.get('window').width <= 600 ? 6 : 10 },
  headerActionButton: { width: Dimensions.get('window').width <= 600 ? 38 : 48, height: Dimensions.get('window').width <= 600 ? 38 : 48, borderRadius: Dimensions.get('window').width <= 600 ? 12 : 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E8EB', shadowColor: '#191F28', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  screen: { flex: 1, backgroundColor: '#F7F8FA' },
  homeContent: { width: '100%', maxWidth: 540, alignSelf: 'center', paddingHorizontal: Dimensions.get('window').width <= 340 ? 16 : 28, paddingTop: 24, paddingBottom: 28 },
  heroCard: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 22, padding: Dimensions.get('window').width <= 340 ? 18 : 24, marginBottom: 24, borderWidth: 1, borderColor: '#F0F2F4', shadowColor: '#191F28', shadowOpacity: 0.055, shadowRadius: 16, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  eyebrow: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: '#6B7684' },
  heroTitle: { marginTop: 4, fontSize: 26, lineHeight: 32, fontWeight: '900', color: '#191F28' },
  heroDate: { marginTop: 5, fontSize: 13, lineHeight: 18, color: '#8B95A1' },
  roundBadge: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 13, backgroundColor: '#EAF3FF' },
  roundBadgeText: { fontSize: 11, lineHeight: 15, fontWeight: '800', color: '#3182F6' },
  ballRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Dimensions.get('window').width <= 340 ? 6 : 10, marginTop: 18 },
  ball: { width: Dimensions.get('window').width <= 340 ? 36 : 44, height: Dimensions.get('window').width <= 340 ? 36 : 44, borderRadius: Dimensions.get('window').width <= 340 ? 18 : 22, alignItems: 'center', justifyContent: 'center' },
  ballText: { color: '#FFFFFF', fontSize: Dimensions.get('window').width <= 340 ? 12 : 14, lineHeight: Dimensions.get('window').width <= 340 ? 16 : 18, fontWeight: '900' },
  plusCircle: { width: 24, height: 44, alignItems: 'center', justifyContent: 'center' },
  plusText: { color: '#191F28', fontSize: 18, lineHeight: 22, fontWeight: '900' },
  sectionHeader: {
    width: '100%',
    marginTop: 26,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 21,
    lineHeight: 28,
    fontWeight: '900',
    color: '#191F28',
    letterSpacing: -0.35,
  },
  menuGrid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, marginBottom: 24 },
  actionCard: { width: Dimensions.get('window').width <= 340 ? '100%' : '48.5%', minHeight: 112, paddingHorizontal: 14, paddingVertical: 16, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F0F2F4', flexDirection: 'row', alignItems: 'center', shadowColor: '#191F28', shadowOpacity: 0.055, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  actionIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF3FF', marginRight: 10, flexShrink: 0 },
  actionTextWrap: { flex: 1, minWidth: 0 },
  actionTitle: { fontSize: 16, lineHeight: 21, fontWeight: '900', color: '#191F28', letterSpacing: -0.25 },
  actionDescription: { marginTop: 4, fontSize: 11, lineHeight: 16, color: '#6B7684', letterSpacing: -0.2 },
  prizeCard: { width: '100%', minHeight: 143, paddingHorizontal: Dimensions.get('window').width <= 340 ? 16 : 20, paddingVertical: 22, borderRadius: 22, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F0F2F4', flexDirection: Dimensions.get('window').width <= 340 ? 'column' : 'row', alignItems: Dimensions.get('window').width <= 340 ? 'stretch' : 'center', shadowColor: '#191F28', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  prizeCopy: { flex: 1, minWidth: 0, paddingRight: Dimensions.get('window').width <= 340 ? 0 : 10 },
  prizeLabel: { fontSize: 12, lineHeight: 16, fontWeight: '700', color: '#6B7684' },
  prizeValue: { marginTop: 5, fontSize: Dimensions.get('window').width <= 600 ? 18 : 20, lineHeight: Dimensions.get('window').width <= 600 ? 24 : 26, fontWeight: '900', color: '#191F28', letterSpacing: -0.4, flexShrink: 1 },
  prizeSubValue: { marginTop: 4, fontSize: 12, lineHeight: 16, fontWeight: '700', color: '#6B7684' },
  prizeDivider: { width: Dimensions.get('window').width <= 340 ? '100%' : 1, height: Dimensions.get('window').width <= 340 ? 1 : undefined, alignSelf: 'stretch', marginVertical: Dimensions.get('window').width <= 340 ? 12 : 2, backgroundColor: '#E5E8EB' },
  prizeMetaBox: { width: Dimensions.get('window').width <= 340 ? '100%' : (Dimensions.get('window').width <= 600 ? 108 : 128), alignItems: 'flex-start', flexShrink: 0, marginLeft: Dimensions.get('window').width <= 340 ? 0 : 10 },
  prizeMetaLabel: { fontSize: 12, lineHeight: 16, fontWeight: '700', color: '#6B7684' },
  prizeMetaValue: { marginTop: 5, fontSize: 21, lineHeight: 26, fontWeight: '900', color: '#191F28', letterSpacing: -0.3 },
  prizeMetaSmall: { marginTop: 4, fontSize: 10, lineHeight: 14, fontWeight: '700', color: '#6B7684' },
  prizeRankCard: { width: '100%', marginTop: 12, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 22, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F0F2F4', shadowColor: '#191F28', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  prizeRankRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 42 },
  prizeRankLabel: { width: 42, fontSize: 14, lineHeight: 19, fontWeight: '900', color: '#191F28' },
  prizeRankInfo: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  prizeRankAmount: { fontSize: 16, lineHeight: 21, fontWeight: '900', color: '#191F28', letterSpacing: -0.2 },
  prizeRankWinners: { fontSize: 12, lineHeight: 16, fontWeight: '800', color: '#6B7684' },
  prizeRankDivider: { height: 1, backgroundColor: '#E5E8EB' },
  noticeCard: { width: '100%', minHeight: 28, marginTop: 14, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, backgroundColor: '#EAF3FF', flexDirection: 'row', alignItems: 'center' },
  noticeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#3182F6', marginRight: 7 },
  noticeText: { fontSize: 11, lineHeight: 16, color: '#667386' },
  roundSelector: { height: Dimensions.get('window').width <= 600 ? 48 : 56, paddingHorizontal: Dimensions.get('window').width <= 340 ? 10 : (Dimensions.get('window').width <= 600 ? 14 : 24), backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#EEF1F4' },
  roundSelectorButton: { minWidth: Dimensions.get('window').width <= 600 ? 58 : 66, paddingHorizontal: Dimensions.get('window').width <= 600 ? 6 : 8, paddingVertical: Dimensions.get('window').width <= 600 ? 5 : 6, borderRadius: 10, alignItems: 'center', backgroundColor: '#FFFFFF' },
  roundSelectorButtonDisabled: { opacity: 0.45 },
  roundSelectorButtonText: { fontSize: Dimensions.get('window').width <= 600 ? 10 : 11, lineHeight: 14, fontWeight: '800', color: '#191F28' },
  roundSelectorButtonTextDisabled: { color: '#8B95A1' },
  roundSelectorCenter: { flex: 1, alignItems: 'center' },
  roundSelectorLabel: { fontSize: 9, lineHeight: 12, fontWeight: '700', color: '#8B95A1' },
  roundSelectorValue: { marginTop: 0, fontSize: Dimensions.get('window').width <= 600 ? 13 : 14, lineHeight: 18, fontWeight: '900', color: '#191F28' },
  roundSelectorLoading: { marginTop: 0, fontSize: 8, lineHeight: 11, color: '#3182F6' },
  bottomNav: { width: '100%', height: 60, minHeight: 60, paddingHorizontal: Dimensions.get('window').width <= 600 ? 8 : 12, paddingTop: 0, paddingBottom: 0, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#EEF1F4', borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  navItem: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 18, marginHorizontal: 2 },
  navItemActive: { backgroundColor: 'transparent' },
  navIconWrap: { width: 30, height: 24, borderRadius: Dimensions.get('window').width <= 600 ? 8 : 11, alignItems: 'center', justifyContent: 'center' },
  navIconWrapActive: { backgroundColor: 'transparent' },
  navLabel: { marginTop: 0, fontSize: 12, lineHeight: 15, fontWeight: '800', color: '#667386' },
  navLabelActive: { fontWeight: '900', color: '#3182F6' },
  purchaseTypeRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  purchaseTypeLabel: { fontSize: 11, fontWeight: '800', color: '#6B7684' },
  purchaseTypeButtons: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  purchaseTypeButton: { minWidth: 44, height: 28, paddingHorizontal: 9, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F8FA', borderWidth: 1, borderColor: '#E5E8EB' },
  purchaseTypeButtonActive: { backgroundColor: '#EAF3FF', borderColor: '#3182F6' },
  purchaseTypeButtonText: { fontSize: 10, fontWeight: '800', color: '#8B95A1' },
  purchaseTypeButtonTextActive: { color: '#3182F6', fontWeight: '900' },
  purchaseTypeUnset: { marginLeft: 2, fontSize: 9, fontWeight: '700', color: '#A0A8B2' },
});
