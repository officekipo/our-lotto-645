import React from 'react';
import { tw } from './RecommendationCard.tw';
import { Text, View } from 'react-native';
import LottoBall from './LottoBall';

type Recommendation = { numbers: number[]; score: number; reasons: string[] };
type Props = { item: Recommendation; index: number };

export default function RecommendationCard({ item, index }: Props) {
  return (
    <View className={tw.card}>
      <View className={tw.header}>
        <Text className={tw.title}>추천 {index + 1}</Text>
        <Text className={tw.score}>{item.score}점</Text>
      </View>
      <View className={tw.numbers}>
        {item.numbers.map(number => <LottoBall key={number} number={number} size={38} />)}
      </View>
      <View className={tw.reasons}>
        {item.reasons.map((reason, i) => <Text key={`${reason}-${i}`} className={tw.reason}>· {reason}</Text>)}
      </View>
    </View>
  );
}


