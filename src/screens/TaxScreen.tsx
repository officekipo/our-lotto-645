import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, Pressable, ScrollView, View } from 'react-native';
import { tw } from '../../App.tw';
import { cn } from '../styles/cn';
import { COLORS, DrawData, Text, TextInput, PageHeader, SectionHeader, rnStyle } from '../components/common';

function TaxScreen({ draw }: { draw: DrawData }) {
  const [amount, setAmount] = useState(String(draw.firstPrize));

  useEffect(() => {
    setAmount(String(draw.firstPrize));
  }, [draw.round, draw.firstPrize]);
  const parsed = Number(amount.replace(/,/g, '')) || 0;
  const exemptThreshold = 2_000_000;
  const threshold = 300_000_000;
  const lowerRate = 0.22;
  const upperRate = 0.33;

  // 200만원 이하 당첨금은 비과세입니다.
  // 200만원을 초과하면 당첨금 전체에 22%를 적용하고,
  // 3억원 초과분에 대해서만 33%를 적용합니다.
  const taxableAmount = parsed > exemptThreshold ? parsed : 0;
  const lowerBase = Math.min(taxableAmount, threshold);
  const upperBase = Math.max(0, taxableAmount - threshold);
  const lowerTax = lowerBase * lowerRate;
  const upperTax = upperBase * upperRate;
  const tax = lowerTax + upperTax;
  const received = Math.max(0, parsed - tax);
  const effectiveTaxRate = parsed > 0 ? (tax / parsed) * 100 : 0;
  const receivedRate = parsed > 0 ? (received / parsed) * 100 : 0;
  const isNarrow = Dimensions.get('window').width <= 340;

  const formatMoney = (value: number) => `${Math.round(value).toLocaleString('ko-KR')}원`;

  return (
    <ScrollView
      className={tw.screen}
      style={{ flex: 1, width: '100%', minWidth: 0, alignSelf: 'stretch', backgroundColor: COLORS.bg }}
      contentContainerClassName={tw.screenContent}
      contentContainerStyle={[{ flexGrow: 1, width: '100%', minWidth: 0 }, rnStyle(tw.screenContent)]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <PageHeader
        eyebrow="세후 계산"
        title="당첨금 세후 계산"
        description={`${draw.round}회 당첨금 기준입니다. 아래 1~3등 금액을 누르면 해당 금액이 계산 입력값으로 적용됩니다.`}
      />

      <View className={tw.taxRankCard} style={rnStyle(tw.taxRankCard)}>
        <Text className={tw.taxRankHint} style={rnStyle(tw.taxRankHint)}>등수를 선택하면 해당 회차의 당첨금이 아래 계산에 자동 입력됩니다.</Text>
        {([['1등', draw.firstPrize, draw.firstWinners], ['2등', draw.secondPrize, draw.secondWinners], ['3등', draw.thirdPrize, draw.thirdWinners]] as const).map(([rank, prize, winners]) => (
          <Pressable
            key={rank}
            onPress={() => setAmount(String(prize))}
            className={cn(tw.taxRankButton, 'active:opacity-70 active:scale-[0.99]')} style={rnStyle(cn(tw.taxRankButton, 'active:opacity-70 active:scale-[0.99]'))}
          >
            <View>
              <Text className={tw.taxRankButtonTitle} style={rnStyle(tw.taxRankButtonTitle)}>{rank}</Text>
              <Text className={tw.taxRankButtonPrize} style={rnStyle(tw.taxRankButtonPrize)}>{prize.toLocaleString('ko-KR')}원</Text>
            </View>
            <Text className={tw.taxRankButtonWinners} style={rnStyle(tw.taxRankButtonWinners)}>{winners > 0 ? `${winners.toLocaleString('ko-KR')}명` : '확인 중'}</Text>
          </Pressable>
        ))}
      </View>

      <View className={tw.taxInputCard} style={rnStyle(tw.taxInputCard)}>
        <Text className={tw.inputLabel} style={rnStyle(tw.inputLabel)}>세전 당첨금</Text>
        <View className={tw.moneyInputWrap} style={rnStyle(tw.moneyInputWrap)}>
          <TextInput
            value={Number(amount.replace(/,/g, '') || 0).toLocaleString('ko-KR')}
            onChangeText={(value) => setAmount(value.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={COLORS.muted}
            className={tw.moneyInput} style={rnStyle(tw.moneyInput)}
          />
          <Text className={tw.moneyUnit} style={rnStyle(tw.moneyUnit)}>원</Text>
        </View>
        <Text className={tw.taxHint} style={rnStyle(tw.taxHint)}>200만원 이하 당첨금은 비과세이며, 200만원을 초과하면 해당 당첨금에 22%, 3억원 초과분에 33%를 적용합니다.</Text>
      </View>

      <SectionHeader title="얼마를 받게 되나요?" />
      <View className={tw.taxSummaryCard} style={rnStyle(tw.taxSummaryCard)}>
        <View className={tw.taxSummaryHeadline} style={rnStyle(tw.taxSummaryHeadline)}>
          <Text className={tw.taxSummaryLabel} style={rnStyle(tw.taxSummaryLabel)}>총 당첨금</Text>
          <Text className={tw.taxSummaryAmount} style={rnStyle(tw.taxSummaryAmount)}>{formatMoney(parsed)}</Text>
        </View>
        <Text className={tw.taxSummaryDescription} style={rnStyle(tw.taxSummaryDescription)}>먼저 당첨금 전체 금액에서 예상 세금을 계산합니다.</Text>

        <View className={tw.taxBreakdownBox} style={rnStyle(tw.taxBreakdownBox)}>
          <Text className={tw.taxBreakdownTitle} style={rnStyle(tw.taxBreakdownTitle)}>예상 세금 계산</Text>
          <View className={tw.taxBreakdownRow} style={rnStyle(tw.taxBreakdownRow)}>
            <View className={tw.taxBreakdownTextWrap} style={rnStyle(tw.taxBreakdownTextWrap)}>
              <Text className={tw.taxBreakdownLabel} style={rnStyle(tw.taxBreakdownLabel)}>200만원 초과 ~ 3억원 이하 구간</Text>
              <Text className={tw.taxBreakdownCaption} style={rnStyle(tw.taxBreakdownCaption)}>22%</Text>
            </View>
            <Text className={tw.taxBreakdownValue} style={rnStyle(tw.taxBreakdownValue)}>{formatMoney(lowerTax)}</Text>
          </View>
          <View className={tw.taxDividerSmall} style={rnStyle(tw.taxDividerSmall)} />
          <View className={tw.taxBreakdownRow} style={rnStyle(tw.taxBreakdownRow)}>
            <View className={tw.taxBreakdownTextWrap} style={rnStyle(tw.taxBreakdownTextWrap)}>
              <Text className={tw.taxBreakdownLabel} style={rnStyle(tw.taxBreakdownLabel)}>3억원 초과분</Text>
              <Text className={tw.taxBreakdownCaption} style={rnStyle(tw.taxBreakdownCaption)}>33%</Text>
            </View>
            <Text className={tw.taxBreakdownValue} style={rnStyle(tw.taxBreakdownValue)}>{formatMoney(upperTax)}</Text>
          </View>
          <View className={tw.taxDividerSmall} style={rnStyle(tw.taxDividerSmall)} />
          <View className={tw.taxBreakdownRow} style={rnStyle(tw.taxBreakdownRow)}>
            <View className={tw.taxBreakdownTextWrap} style={rnStyle(tw.taxBreakdownTextWrap)}>
              <Text className={tw.taxBreakdownTotalLabel} style={rnStyle(tw.taxBreakdownTotalLabel)}>예상 세금 합계</Text>
              <Text className={tw.taxBreakdownCaption} style={rnStyle(tw.taxBreakdownCaption)}>총 당첨금의 약 {effectiveTaxRate.toFixed(2)}%</Text>
            </View>
            <Text className={tw.taxBreakdownTotalValue} style={rnStyle(tw.taxBreakdownTotalValue)}>-{formatMoney(tax)}</Text>
          </View>
        </View>

        <View className={tw.taxReceivedHighlight} style={[rnStyle(tw.taxReceivedHighlight), isNarrow ? { flexDirection: 'column', alignItems: 'flex-start' } : null]}>
          <View>
            <Text className={tw.taxReceivedLabel} style={rnStyle(tw.taxReceivedLabel)}>세금 제외 후 순수령액</Text>
            <Text className={tw.taxReceivedCaption} style={rnStyle(tw.taxReceivedCaption)}>{receivedRate.toFixed(2)}%를 남깁니다.</Text>
          </View>
          <Text className={tw.taxReceivedValue} style={rnStyle(tw.taxReceivedValue)}>{formatMoney(received)}</Text>
        </View>
      </View>

      <View className={tw.taxExplainCard} style={rnStyle(tw.taxExplainCard)}>
        <Text className={tw.taxExplainTitle} style={rnStyle(tw.taxExplainTitle)}>한눈에 보면</Text>
        <Text className={tw.taxExplainText} style={rnStyle(tw.taxExplainText)}>
          총 {formatMoney(parsed)}을 받는다고 가정하면, 예상 세금 {formatMoney(tax)}을 제외하고 약 {formatMoney(received)}을 받게 됩니다.
        </Text>
      </View>

      <View className={tw.taxInfoCard} style={rnStyle(tw.taxInfoCard)}>
        <Text className={tw.taxInfoTitle} style={rnStyle(tw.taxInfoTitle)}>알아두세요</Text>
        <Text className={tw.taxInfoText} style={rnStyle(tw.taxInfoText)}>• 200만원 이하 당첨금은 비과세이며, 200만원을 초과하면 해당 당첨금에 22%, 3억원 초과분에 33%를 적용한 예상치입니다.</Text>
        <Text className={tw.taxInfoText} style={rnStyle(tw.taxInfoText)}>• 실제 원천징수액은 적용 세율과 지급 조건 등에 따라 달라질 수 있습니다.</Text>
        <Text className={tw.taxInfoText} style={rnStyle(tw.taxInfoText)}>• 정확한 금액은 실제 지급 시점의 세법과 지급기관 기준을 확인해야 합니다.</Text>
      </View>
    </ScrollView>
  );
}


export default TaxScreen;
