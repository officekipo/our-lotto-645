import React from 'react';
import { tw } from './StatsSummary.tw';
import { Text, View } from 'react-native';

type Props = {
  averageSum: number;
  averageOdd: number;
  consecutiveRate: number;
  highNumberRate: number;
  commonPattern: string;
};

export default function StatsSummary(props: Props) {
  const items = [
    ['평균 합계', `${props.averageSum}`],
    ['평균 홀수', `${props.averageOdd}개`],
    ['연속번호 포함', `${props.consecutiveRate}%`],
    ['41~45 포함', `${props.highNumberRate}%`],
    ['최다 홀짝', props.commonPattern],
  ];

  return (
    <View className={tw.grid}>
      {items.map(([label, value]) => (
        <View key={label} className={tw.item}>
          <Text className={tw.label}>{label}</Text>
          <Text className={tw.value}>{value}</Text>
        </View>
      ))}
    </View>
  );
}


