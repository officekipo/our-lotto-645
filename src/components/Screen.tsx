import React from 'react';
import { tw } from './Screen.tw';
import { SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';

export function Screen({ title, subtitle, onBack, children }: { title: string; subtitle?: string; onBack?: () => void; children: React.ReactNode }) {
  return (
    <SafeAreaView className={tw.safe}>
      <View className={tw.header}>
        <View className={tw.headerSide}>
          {onBack ? <TouchableOpacity onPress={onBack} className={tw.iconButton}><Text className={tw.icon}>‹</Text></TouchableOpacity> : null}
        </View>
        <View className={tw.titleWrap}><Text className={tw.title}>{title}</Text>{subtitle ? <Text className={tw.subtitle}>{subtitle}</Text> : null}</View>
        <View className={tw.headerSide} />
      </View>
      <ScrollView contentContainerClassName={tw.content}>{children}</ScrollView>
    </SafeAreaView>
  );
}

