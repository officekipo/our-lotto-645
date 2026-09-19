import React from 'react';
import { tw } from './LottoBall.tw';
import { Text, View } from 'react-native';

type Props = { number: number; size?: number };

const getBallColor = (number: number) => {
  if (number <= 10) return '#F2B01E';
  if (number <= 20) return '#3B82F6';
  if (number <= 30) return '#EF4444';
  if (number <= 40) return '#6B7280';
  return '#22A06B';
};

export default function LottoBall({ number, size = 36 }: Props) {
  return (
    <View className={tw.ball} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: getBallColor(number) }}>
      <Text className={tw.text} style={{ fontSize: size * 0.38 }}>{number}</Text>
    </View>
  );
}


