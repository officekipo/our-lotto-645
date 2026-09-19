import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, View } from 'react-native';
import { CameraView, useCameraPermissions } from '../platform/camera';
import * as Clipboard from '../platform/clipboard';
import { loadCheckTickets, saveCheckTickets, type PurchaseType, type SavedCheckTicket } from '../storage/checkTickets';
import { tw } from '../../App.tw';
import { cn } from '../styles/cn';
import { COLORS, DrawData, Text, TextInput, LottoBall, PageHeader, SectionHeader, rnStyle, getBallColor } from '../components/common';

type CheckTicket = SavedCheckTicket;

function prizeForRank(draw: DrawData, rank: string): number {
  switch (rank) {
    case '1등':
      return draw.firstPrize;
    case '2등':
      return draw.secondPrize;
    case '3등':
      return draw.thirdPrize;
    case '4등':
      return 50_000;
    case '5등':
      return 5_000;
    default:
      return 0;
  }
}

function evaluateTicket(ticket: Pick<CheckTicket, 'numbers'>, draw: DrawData) {
  const matches = ticket.numbers.filter((number) => draw.numbers.includes(number)).sort((a, b) => a - b);
  const bonusMatch = ticket.numbers.includes(draw.bonus);
  let rank = '낙첨';
  if (matches.length === 6) rank = '1등';
  else if (matches.length === 5 && bonusMatch) rank = '2등';
  else if (matches.length === 5) rank = '3등';
  else if (matches.length === 4) rank = '4등';
  else if (matches.length === 3) rank = '5등';
  return { matches, rank, bonusMatch, prize: prizeForRank(draw, rank) };
}

function CheckScreen({ draw }: { draw: DrawData }) {
  const [values, setValues] = useState(['', '', '', '', '', '']);
  type CheckResult = ReturnType<typeof evaluateTicket>;

  const [result, setResult] = useState<CheckResult | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraRetryKey, setCameraRetryKey] = useState(0);
  const [tickets, setTickets] = useState<CheckTicket[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const scanningRef = useRef(false);
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    let mounted = true;
    loadCheckTickets().then((saved) => {
      if (mounted) {
        setTickets(saved);
        setStorageReady(true);
      }
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (storageReady) void saveCheckTickets(tickets);
  }, [tickets, storageReady]);

  function applyTicket(ticket: Pick<CheckTicket, 'numbers' | 'round'>) {
    setValues(ticket.numbers.map(String));
    if (ticket.round === draw.round) {
      setResult(evaluateTicket(ticket, draw));
    } else {
      setResult(null);
    }
  }

  function addTickets(items: Array<{ round: number; numbers: number[]; source: '수기' | 'QR'; purchaseType?: PurchaseType | null }>) {
    const now = Date.now();
    const additions: CheckTicket[] = items.map((item, index) => ({
      id: `${item.round}-${item.numbers.join('-')}-${now}-${index}`,
      round: item.round,
      numbers: [...item.numbers].sort((a, b) => a - b),
      source: item.source,
      purchaseType: item.purchaseType ?? null,
      rank: null,
      matches: 0,
      bonusMatch: false,
      prize: 0,
      claimed: false,
      createdAt: now + index,
    }));
    setTickets((current) => [...additions, ...current]);
    return additions[0];
  }

  function handleQrScanned(data: string) {
    if (scanningRef.current) return;
    scanningRef.current = true;
    const valueMatch = data.match(/[?&]v=([^&]+)/i);
    const payload = decodeURIComponent(valueMatch?.[1] ?? data).trim();
    const roundMatch = payload.match(/^(\d{4})/);
    const round = roundMatch ? Number(roundMatch[1]) : 0;
    const gameMatches = [...payload.slice(4).matchAll(/([A-Za-z])([0-9]{12})/g)];
    const parsed = gameMatches.flatMap((match) => {
      const modeCode = match[1].toLowerCase();
      const segment = match[2];
      const numbers = Array.from({ length: 6 }, (_, i) => Number(segment.slice(i * 2, i * 2 + 2)));
      const purchaseType: PurchaseType | null = modeCode === 'q' ? '자동' : modeCode === 'm' ? '수동' : modeCode === 'b' ? '반자동' : null;
      const valid = round > 0 && numbers.every((n) => n >= 1 && n <= 45) && new Set(numbers).size === 6;
      return valid ? [{ round, numbers: numbers.sort((a, b) => a - b), purchaseType }] : [];
    });
    if (!parsed.length) {
      scanningRef.current = false;
      Alert.alert('QR을 읽었지만 번호를 찾지 못했습니다.', '로또 6/45 구매용 QR인지 확인해 주세요.');
      return;
    }
    addTickets(parsed.map((ticket) => ({ round: ticket.round, numbers: ticket.numbers, source: 'QR' as const, purchaseType: ticket.purchaseType })));
    setScannerOpen(false);
    scanningRef.current = false;
  }

  async function openScanner() {
    setCameraError(null);
    setCameraRetryKey((current) => current + 1);
    // Native에서는 Expo Camera의 권한 요청을 먼저 처리하고, Web에서는 CameraView가
    // navigator.mediaDevices.getUserMedia()를 직접 호출해 브라우저 권한 팝업을 띄웁니다.
    setScannerOpen(true);
    try {
      if (!permission?.granted) {
        const response = await requestPermission();
        if (!response.granted) {
          // Web에서는 실제 카메라 호출 결과를 CameraView의 onMountError로 안내합니다.
          // Native에서만 이 분기가 일반적인 권한 거부 안내 역할을 합니다.
          setCameraError('카메라 권한을 허용한 후 다시 시도해 주세요.');
        }
      }
    } catch {
      setCameraError('카메라 권한과 기기 설정을 확인한 후 다시 시도해 주세요.');
    }
  }

  function updateValue(index: number, value: string) {
    const normalized = value.replace(/[^0-9]/g, '').slice(0, 2);
    setValues((current) => current.map((item, i) => (i === index ? normalized : item)));
    setResult(null);
  }

  const numbers = values.map(Number).filter((value) => value >= 1 && value <= 45);
  const unique = new Set(numbers).size === numbers.length;
  const complete = values.every((value) => value !== '');
  const valid = complete && numbers.length === 6 && unique;

  function checkWinning() {
    if (!valid) return;
    const evaluated = evaluateTicket({ numbers }, draw);
    setResult(evaluated);
    const existing = tickets.find((ticket) => ticket.numbers.join('-') === numbers.slice().sort((a, b) => a - b).join('-') && ticket.round === draw.round);
    if (existing) {
      setTickets((current) => current.map((ticket) => ticket.id === existing.id ? {
        ...ticket,
        rank: evaluated.rank,
        matches: evaluated.matches.length,
        bonusMatch: evaluated.bonusMatch,
        prize: evaluated.prize,
      } : ticket));
    } else {
      addTickets([{ round: draw.round, numbers, source: '수기', purchaseType: '직접 입력' }]);
      setTickets((current) => current.map((ticket) => ticket.round === draw.round && ticket.numbers.join('-') === numbers.slice().sort((a, b) => a - b).join('-') && ticket.rank === null ? {
        ...ticket,
        rank: evaluated.rank,
        matches: evaluated.matches.length,
        bonusMatch: evaluated.bonusMatch,
        prize: evaluated.prize,
      } : ticket));
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  function toggleAll() {
    setSelectedIds((current) => current.length === tickets.length ? [] : tickets.map((ticket) => ticket.id));
  }

  function deleteSelected() {
    if (!selectedIds.length) return;
    setTickets((current) => current.filter((ticket) => !selectedIds.includes(ticket.id)));
    setSelectedIds([]);
  }

  function toggleClaimed(id: string) {
    setTickets((current) => current.map((ticket) => ticket.id === id ? { ...ticket, claimed: !ticket.claimed } : ticket));
  }

  return (
    <ScrollView
      className={tw.screen}
      style={{ flex: 1, width: '100%', minWidth: 0, alignSelf: 'stretch', backgroundColor: COLORS.bg }}
      contentContainerClassName={tw.screenContent}
      contentContainerStyle={[{ flexGrow: 1, width: '100%', minWidth: 0 }, rnStyle(tw.screenContent)]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <PageHeader eyebrow="당첨번호 확인" title="내 번호 당첨 확인" description="구입한 로또 번호를 저장하고 회차별 당첨 결과를 한눈에 관리합니다." />

      <View className={tw.checkDrawCard} style={rnStyle(tw.checkDrawCard)}>
        <View><Text className={tw.checkDrawLabel} style={rnStyle(tw.checkDrawLabel)}>기준 회차</Text><Text className={tw.checkDrawTitle} style={rnStyle(tw.checkDrawTitle)}>{draw.round}회 당첨번호</Text></View>
        <View className={tw.ballRowCompact} style={rnStyle(tw.ballRowCompact)}>{draw.numbers.map((number) => <LottoBall key={number} number={number} size="small" />)}<Text className={tw.checkPlus} style={rnStyle(tw.checkPlus)}>+</Text><LottoBall number={draw.bonus} size="small" /></View>
      </View>

      <SectionHeader title="내 로또 번호" />
      <Pressable
        onPress={() => {
          void openScanner();
        }}
        accessibilityRole="button"
        accessibilityLabel="QR로 번호 불러오기"
        hitSlop={8}
        android_ripple={{ color: '#D8E8FF' }}
        className={tw.qrButton}
        style={({ pressed }) => [
          rnStyle(tw.qrButton),
          pressed ? { opacity: 0.72, transform: [{ scale: 0.99 }] } : undefined,
        ]}
      >
        <View pointerEvents="none" className={tw.qrButtonIcon} style={rnStyle(tw.qrButtonIcon)}><Text className={tw.qrButtonIconText} style={rnStyle(tw.qrButtonIconText)}>▣</Text></View>
        <View pointerEvents="none" className={tw.qrButtonCopy} style={rnStyle(tw.qrButtonCopy)}><Text className={tw.qrButtonTitle} style={rnStyle(tw.qrButtonTitle)}>QR로 번호 불러오기</Text><Text className={tw.qrButtonText} style={rnStyle(tw.qrButtonText)}>복권 QR을 스캔하면 여러 게임을 한 번에 저장합니다.</Text></View>
        <Text pointerEvents="none" className={tw.qrButtonArrow} style={rnStyle(tw.qrButtonArrow)}>›</Text>
      </Pressable>


      <SectionHeader title="번호 직접 입력" />
      <View className={tw.inputGrid} style={rnStyle(tw.inputGrid)}>
        {values.map((value, index) => {
          const matched = Boolean(result && value && draw.numbers.includes(Number(value)));
          return <View key={index} className={tw.numberInputWrap} style={rnStyle(tw.numberInputWrap)}><View className={tw.numberInputInner} style={rnStyle(tw.numberInputInner)}><TextInput value={value} onChangeText={(text) => updateValue(index, text)} keyboardType="number-pad" maxLength={2} placeholder={`${index + 1}`} placeholderTextColor={COLORS.muted} className={cn(tw.numberInput, matched && tw.numberInputMatched)} style={[rnStyle(cn(tw.numberInput, matched && tw.numberInputMatched)), matched ? { borderColor: COLORS.primary, borderWidth: 2, backgroundColor: COLORS.primarySoft, color: COLORS.primary } : undefined]} textAlign="center" />{matched ? <View className={tw.numberInputMatchBadge} style={rnStyle(tw.numberInputMatchBadge)}><Text className={tw.numberInputMatchBadgeText} style={rnStyle(tw.numberInputMatchBadgeText)}>적중</Text></View> : null}</View></View>;
        })}
      </View>

      <Text className={tw.helperText} style={rnStyle(tw.helperText)}>각 칸에 1~45 번호를 입력하세요. 같은 번호는 사용할 수 없습니다.</Text>
      {!unique && values.some(Boolean) ? <View className={tw.errorBanner} style={rnStyle(tw.errorBanner)}><Text className={tw.errorBannerText} style={rnStyle(tw.errorBannerText)}>같은 번호를 두 번 입력할 수 없습니다.</Text></View> : null}
      <Pressable onPress={checkWinning} disabled={!valid} className={cn(tw.generateButton, !valid && tw.generateButtonDisabled, valid && 'active:opacity-[0.82] active:scale-[0.99]')} style={rnStyle(cn(tw.generateButton, !valid && tw.generateButtonDisabled, valid && 'active:opacity-[0.82] active:scale-[0.99]'))}><Text className={tw.generateButtonText} style={rnStyle(tw.generateButtonText)}>당첨 결과 확인 및 저장</Text></Pressable>

      {result ? <View className={tw.checkResultCard} style={rnStyle(tw.checkResultCard)}><View className={tw.checkResultTop} style={rnStyle(tw.checkResultTop)}><View><Text className={tw.checkResultLabel} style={rnStyle(tw.checkResultLabel)}>확인 결과</Text><Text className={cn(tw.checkResultRank, result.rank === '낙첨' && tw.checkResultLose)} style={rnStyle(cn(tw.checkResultRank, result.rank === '낙첨' && tw.checkResultLose))}>{result.rank}</Text></View><View className={tw.matchBadge} style={rnStyle(tw.matchBadge)}><Text className={tw.matchBadgeText} style={rnStyle(tw.matchBadgeText)}>{result.matches.length}개 일치</Text></View></View><View className={tw.checkDivider} style={rnStyle(tw.checkDivider)} /><Text className={tw.checkResultSub} style={rnStyle(tw.checkResultSub)}>당첨번호와 일치한 번호</Text><View className={tw.ballRowCompact} style={rnStyle(tw.ballRowCompact)}>{result.matches.length > 0 ? result.matches.map((number) => <LottoBall key={number} number={number} size="small" />) : <Text className={tw.noMatchText} style={rnStyle(tw.noMatchText)}>일치하는 번호가 없습니다.</Text>}</View>{result.rank === '2등' ? <Text className={tw.bonusNotice} style={rnStyle(tw.bonusNotice)}>보너스 번호 {draw.bonus}도 일치했습니다.</Text> : null}{result.rank !== '낙첨' ? <View className={tw.checkResultPrize} style={rnStyle(tw.checkResultPrize)}><Text className={tw.checkResultPrizeLabel} style={rnStyle(tw.checkResultPrizeLabel)}>당첨금</Text><Text className={tw.checkResultPrizeValue} style={rnStyle(tw.checkResultPrizeValue)}>{result.prize > 0 ? `${result.prize.toLocaleString('ko-KR')}원` : '확인 중'}</Text></View> : null}</View> : null}

      {tickets.length > 0 ? (
        <View className={tw.savedTicketCard} style={rnStyle(tw.savedTicketCard)}>
          <View className={tw.savedTicketHeader} style={rnStyle(tw.savedTicketHeader)}>
            <View><Text className={tw.savedTicketTitle} style={rnStyle(tw.savedTicketTitle)}>내 번호 목록</Text><Text className={tw.savedTicketCount} style={rnStyle(tw.savedTicketCount)}>{tickets.length}게임 저장됨 · 수령 상태는 버튼을 눌러 변경</Text></View>
            <View className={tw.savedTicketActions} style={rnStyle(tw.savedTicketActions)}>
              <Pressable onPress={toggleAll} className={tw.savedTicketActionButton} style={rnStyle(tw.savedTicketActionButton)}><Text className={tw.savedTicketActionText} style={rnStyle(tw.savedTicketActionText)}>{selectedIds.length === tickets.length ? '전체 해제' : '전체 선택'}</Text></Pressable>
              <Pressable onPress={deleteSelected} disabled={!selectedIds.length} className={cn(tw.savedTicketActionButton, !selectedIds.length && tw.savedTicketActionDisabled)} style={rnStyle(cn(tw.savedTicketActionButton, !selectedIds.length && tw.savedTicketActionDisabled))}><Text className={tw.savedTicketDeleteText} style={rnStyle(tw.savedTicketDeleteText)}>선택 삭제</Text></Pressable>
            </View>
            <View className={tw.savedTicketSummary} style={rnStyle(tw.savedTicketSummary)}>
              <View className={tw.savedTicketSummaryItem} style={rnStyle(tw.savedTicketSummaryItem)}>
                <Text className={tw.savedTicketTotalLabel} style={rnStyle(tw.savedTicketTotalLabel)}>총 당첨금</Text>
                <Text className={tw.savedTicketTotal} style={rnStyle(tw.savedTicketTotal)}>{tickets.filter((ticket) => ticket.rank && ticket.rank !== '낙첨').reduce((sum, ticket) => sum + (ticket.prize || 0), 0).toLocaleString('ko-KR')}원</Text>
              </View>
              <View className={tw.savedTicketSummaryItem} style={rnStyle(tw.savedTicketSummaryItem)}>
                <Text className={tw.savedTicketUnclaimedLabel} style={rnStyle(tw.savedTicketUnclaimedLabel)}>미수령 당첨금</Text>
                <Text className={tw.savedTicketUnclaimed} style={rnStyle(tw.savedTicketUnclaimed)}>{tickets.filter((ticket) => ticket.rank && ticket.rank !== '낙첨' && !ticket.claimed).reduce((sum, ticket) => sum + (ticket.prize || 0), 0).toLocaleString('ko-KR')}원</Text>
              </View>
            </View>
            <Text className={tw.savedTicketTotalSub} style={rnStyle(tw.savedTicketTotalSub)}>당첨금 합계 · 수령 상태는 스위치로 변경</Text>
          </View>
          {tickets.map((ticket) => (
            <View key={ticket.id} className={cn(tw.savedTicketRow, ticket.claimed && tw.savedTicketRowClaimed)} style={rnStyle(cn(tw.savedTicketRow, ticket.claimed && tw.savedTicketRowClaimed))}>
              <Pressable onPress={() => toggleSelected(ticket.id)} className={tw.savedTicketCheck} style={rnStyle(tw.savedTicketCheck)}><Text className={selectedIds.includes(ticket.id) ? tw.savedTicketCheckActive : tw.savedTicketCheckText} style={rnStyle(selectedIds.includes(ticket.id) ? tw.savedTicketCheckActive : tw.savedTicketCheckText)}>{selectedIds.includes(ticket.id) ? '✓' : '□'}</Text></Pressable>
              <Pressable onPress={() => applyTicket(ticket)} className={tw.savedTicketMain} style={rnStyle(tw.savedTicketMain)}>
                <View className={tw.savedTicketTop} style={rnStyle(tw.savedTicketTop)}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', minWidth: 0, flexShrink: 1 }}>
                    <Text className={tw.savedTicketRound} style={rnStyle(tw.savedTicketRound)}>{ticket.round}회</Text>
                    <View style={{ marginLeft: 5, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6, backgroundColor: '#F2F6FB', borderWidth: 1, borderColor: '#E1E8F0', flexShrink: 0 }}>
                      <Text style={{ fontSize: 8, lineHeight: 11, fontWeight: '900', color: '#6B7684' }}>{ticket.purchaseType ?? (ticket.source === '수기' ? '직접 입력' : '확인 필요')}</Text>
                    </View>
                  </View>
                  <Text className={ticket.rank === '낙첨' ? tw.savedTicketLose : tw.savedTicketRank} style={rnStyle(ticket.rank === '낙첨' ? tw.savedTicketLose : tw.savedTicketRank)}>{ticket.rank ?? '미확인'}</Text>
                </View>
                <View className={tw.savedTicketNumbersRow} style={rnStyle(tw.savedTicketNumbersRow)}>
                  {ticket.numbers.map((number) => {
                    const hit = Boolean(ticket.rank && ticket.rank !== '낙첨' && ticket.round === draw.round && draw.numbers.includes(number));
                    return (
                      <View key={number} className={cn(tw.savedTicketNumberBall, !hit && tw.savedTicketNumberBallMiss)} style={[rnStyle(cn(tw.savedTicketNumberBall, !hit && tw.savedTicketNumberBallMiss)), hit ? { backgroundColor: getBallColor(number) } : undefined]}>
                        <Text className={tw.savedTicketNumberBallText} style={rnStyle(tw.savedTicketNumberBallText)}>{number}</Text>
                      </View>
                    );
                  })}
                </View>
                <Text className={tw.savedTicketMeta} style={rnStyle(tw.savedTicketMeta)}>{ticket.rank ? `${ticket.matches}개 일치${ticket.bonusMatch ? ' · 보너스 일치' : ''}` : '아직 당첨 결과를 확인하지 않았습니다.'}</Text>
                {ticket.rank && ticket.rank !== '낙첨' ? <Text className={tw.savedTicketPrize} style={rnStyle(tw.savedTicketPrize)}>당첨금 {ticket.prize > 0 ? `${ticket.prize.toLocaleString('ko-KR')}원` : '확인 중'}</Text> : null}
              </Pressable>
              {ticket.rank && ticket.rank !== '낙첨' ? (
                <View className={tw.claimToggleWrap} style={rnStyle(tw.claimToggleWrap)}>
                  <Text className={ticket.claimed ? tw.claimedButtonText : tw.unclaimedButtonText} style={rnStyle(ticket.claimed ? tw.claimedButtonText : tw.unclaimedButtonText)}>{ticket.claimed ? '수령' : '미수령'}</Text>
                  <Pressable onPress={() => toggleClaimed(ticket.id)} accessibilityRole="switch" accessibilityState={{ checked: ticket.claimed }} accessibilityLabel={`수령 상태: ${ticket.claimed ? '수령' : '미수령'}. 누르면 변경됩니다.`} className={ticket.claimed ? tw.claimedButton : tw.unclaimedButton} style={rnStyle(ticket.claimed ? tw.claimedButton : tw.unclaimedButton)}>
                    <View className={ticket.claimed ? tw.switchTrackOn : tw.switchTrackOff} style={rnStyle(ticket.claimed ? tw.switchTrackOn : tw.switchTrackOff)}>
                      <View className={tw.switchKnob} style={rnStyle(tw.switchKnob)} />
                    </View>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      <View className={tw.checkNotice} style={rnStyle(tw.checkNotice)}><Text className={tw.checkNoticeTitle} style={rnStyle(tw.checkNoticeTitle)}>저장 안내</Text><Text className={tw.checkNoticeText} style={rnStyle(tw.checkNoticeText)}>내 번호는 이 기기에 저장되며, 최대 개수 제한 없이 누적해서 관리할 수 있습니다. 앱을 삭제하면 저장된 번호도 삭제될 수 있습니다.</Text></View>

      <Modal visible={scannerOpen} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setScannerOpen(false)}><View className={tw.scannerScreen} style={rnStyle(tw.scannerScreen)}><View className={tw.scannerHeader} style={rnStyle(tw.scannerHeader)}><Text className={tw.scannerTitle} style={rnStyle(tw.scannerTitle)}>로또 QR 스캔</Text><Pressable onPress={() => setScannerOpen(false)} hitSlop={10} className={tw.scannerClose} style={rnStyle(tw.scannerClose)}><Text className={tw.scannerCloseText} style={rnStyle(tw.scannerCloseText)}>닫기</Text></Pressable></View><View className={tw.scannerFrame} style={rnStyle(tw.scannerFrame)}>{cameraError ? <View style={{ paddingHorizontal: 24, alignItems: 'center' }}><Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800', textAlign: 'center' }}>카메라를 시작할 수 없습니다.</Text><Text style={{ marginTop: 8, color: '#D1D5DB', fontSize: 12, lineHeight: 18, textAlign: 'center' }}>{cameraError}</Text><Pressable onPress={openScanner} style={{ marginTop: 18, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, backgroundColor: '#222' }}><Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>다시 시도</Text></Pressable></View> : <><CameraView key={cameraRetryKey} className={tw.scannerCamera} style={rnStyle(tw.scannerCamera)} active={scannerOpen} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={({ data }: { data: string }) => handleQrScanned(data)} onMountError={(event: { message: string }) => setCameraError(event.message || '카메라 미리보기를 시작하지 못했습니다.')} /><View pointerEvents="none" className={tw.scannerGuide} style={rnStyle(tw.scannerGuide)} /></>}</View><Text className={tw.scannerHint} style={rnStyle(tw.scannerHint)}>복권 하단의 QR코드를 화면 안에 맞춰 주세요.</Text></View></Modal>
    </ScrollView>
  );
}


export default CheckScreen;
