import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, Image, Linking, Modal, PanResponder, Platform, Pressable,
  SafeAreaView, ScrollView, StatusBar, View, useWindowDimensions,
} from 'react-native';
import { tw } from '../../App.tw';
import { COLORS, DrawData, TabKey, Text, TextInput, rnStyle, styles } from './ui';
import { cn } from '../styles/cn';
import * as Clipboard from '../platform/clipboard';

export type IconName =
  | 'home' | 'menu' | 'star' | 'chart' | 'check' | 'calculator'
  | 'book' | 'document' | 'shield' | 'mail' | 'info' | 'arrow'
  | 'back' | 'close' | 'copy';

const ICON_SOURCES: Record<IconName, any> = {
  home: require('../../assets/home.png'), menu: require('../../assets/menu.png'), star: require('../../assets/star.png'),
  chart: require('../../assets/chart.png'), check: require('../../assets/check.png'), calculator: require('../../assets/calculator.png'),
  book: require('../../assets/book.png'), document: require('../../assets/document.png'), shield: require('../../assets/shield.png'),
  mail: require('../../assets/mail.png'), info: require('../../assets/info.png'), arrow: require('../../assets/arrow.png'),
  back: require('../../assets/back.png'), close: require('../../assets/close.png'), copy: require('../../assets/copy.png'),
};


export function AppIcon({ name, color, size = 22 }: { name: IconName; color?: string; size?: number }) {
  return (
    <Image
      source={ICON_SOURCES[name]}
      resizeMode="contain"
      style={{
        width: size,
        height: size,
        ...(color === COLORS.primary
          ? Platform.OS === 'web'
            ? { filter: 'brightness(0) saturate(100%) invert(46%) sepia(98%) saturate(2381%) hue-rotate(197deg) brightness(99%) contrast(96%)' }
            : { tintColor: color }
          : color === '#66717F'
            ? Platform.OS === 'web'
              ? { filter: 'brightness(0) saturate(100%) invert(43%) sepia(8%) saturate(748%) hue-rotate(176deg) brightness(91%) contrast(87%)' }
              : { tintColor: color }
            : color
              ? { tintColor: color }
              : {}),
      } as any}
    />
  );
}

export function AppHeader({ onHome, onMenu }: { onHome: () => void; onMenu: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onHome} style={styles.logoButton}>
        <View style={styles.logoMark}>
          <Image source={require('../../assets/icon.png')} style={styles.logoImage} resizeMode="cover" />
        </View>
        <View>
          <Text style={styles.logoLabel}>OUR LOTTO</Text>
          <Text style={styles.logoTitle}>우리의 6/45</Text>
        </View>
      </Pressable>
      <View style={styles.headerActions}>
        <Pressable onPress={onHome} style={styles.headerActionButton} accessibilityLabel="홈">
          <AppIcon name="home" size={18} />
        </Pressable>
        <Pressable onPress={onMenu} style={styles.headerActionButton} accessibilityLabel="메뉴">
          <AppIcon name="menu" size={18} />
        </Pressable>
      </View>
    </View>
  );
}

type MenuDetailKey = 'terms' | 'privacy' | 'support' | 'guide' | 'about';

const MENU_CONTENT: Record<MenuDetailKey, { title: string; subtitle: string; body: string[] }> = {
  terms: {
    title: '이용약관',
    subtitle: '시행일자 2026년 9월 14일',
    body: [
      '제1조 (목적)\n이 약관은 우리의 6/45가 제공하는 로또 6/45 번호 생성, 통계 분석, 당첨 확인 및 세후 계산 서비스의 이용 조건과 절차를 안내합니다.',
      '제2조 (서비스 이용)\n서비스는 누구나 무료로 이용할 수 있으며, 제공되는 번호 생성과 통계는 참고용 정보입니다. 실제 구매 또는 당첨을 보장하지 않습니다.',
      '제3조 (정보의 정확성)\n외부 데이터 제공처의 사정에 따라 정보가 지연되거나 일시적으로 제공되지 않을 수 있습니다. 중요한 당첨 확인은 공식 채널의 결과를 함께 확인해 주세요.',
      '제4조 (서비스 변경 및 중단)\n서비스 품질 개선, 점검 또는 외부 사정에 따라 일부 기능이 변경되거나 중단될 수 있습니다.',
      '제5조 (책임의 제한)\n서비스에서 제공하는 생성·통계·계산 결과는 참고 정보이며, 이를 이용한 구매 또는 의사결정에 대한 결과를 보장하지 않습니다.',
    ],
  },
  privacy: {
    title: '개인정보처리방침',
    subtitle: '시행일자 2026년 9월 14일',
    body: [
      '우리의 6/45는 현재 회원가입과 로그인을 제공하지 않으며, 서비스 이용을 위해 이용자의 이름, 전화번호, 주소 등의 개인정보를 별도로 수집하지 않습니다.',
      '번호 생성 조건과 당첨 확인을 위해 입력한 번호는 현재 서비스 화면에서 기능을 수행하기 위한 용도로만 사용되며, 별도의 회원 계정에 저장하지 않습니다.',
      '문의 이메일을 통해 이용자가 개인정보를 직접 보내는 경우에는 해당 문의를 처리하기 위해 필요한 범위에서 정보를 확인할 수 있습니다.',
      '향후 광고, 통계 분석 도구, 오류 분석 서비스 등 개인정보를 처리하는 기능이 추가되면 그 내용과 보유·이용 기간 등을 반영하여 본 방침을 변경하고 안내하겠습니다.',
      '문의: officekipo@gmail.com',
    ],
  },
  support: {
    title: '고객센터',
    subtitle: '서비스 문의 및 오류 제보',
    body: [
      '서비스 이용 중 불편한 점이나 오류를 알려주세요.',
      '문의 메일\nofficekipo@gmail.com',
      '가능하면 문제가 발생한 화면, 조회 회차, 재현 방법을 함께 보내주시면 확인에 도움이 됩니다.',
      '문의 내용을 확인한 뒤 가능한 범위에서 답변드리겠습니다.',
    ],
  },
  guide: {
    title: '서비스 이용안내',
    subtitle: '우리의 6/45 주요 기능',
    body: [
      '번호 생성\n필수 번호와 제외 번호를 설정하여 원하는 조건의 조합을 생성할 수 있습니다.',
      '통계 분석\n과거 당첨 데이터를 기준으로 번호 출현 빈도와 패턴을 확인할 수 있습니다.',
      '당첨 확인\n선택한 회차의 당첨번호와 입력한 번호를 비교할 수 있습니다.',
      '세후 계산\n당첨금과 등수를 기준으로 예상 실수령액을 계산할 수 있습니다.',
      '※ 모든 기능은 참고용이며 실제 복권 당첨을 보장하지 않습니다.',
    ],
  },
  about: {
    title: '앱 정보',
    subtitle: '우리의 6/45 · Lotto 6/45',
    body: [
      '우리의 6/45는 로또 6/45 결과를 쉽고 편하게 확인하고 번호 생성, 통계 분석, 당첨 확인, 세후 계산을 한 곳에서 이용할 수 있도록 만든 서비스입니다.',
      '서비스명\n우리의 6/45',
      '문의\nofficekipo@gmail.com',
      '정책 기준일\n2026년 9월 14일',
    ],
  },
};

export function MenuModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [detail, setDetail] = useState<MenuDetailKey | null>(null);
  const [mounted, setMounted] = useState(visible);
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslate = useRef(new Animated.Value(420)).current;
  const sheetDragStartY = useRef(0);
  const sheetPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderGrant: () => {
        sheetTranslate.stopAnimation((value) => {
          sheetDragStartY.current = value;
        });
      },
      onPanResponderMove: (_, gesture) => {
        const nextY = Math.max(0, sheetDragStartY.current + gesture.dy);
        sheetTranslate.setValue(nextY);
      },
      onPanResponderRelease: (_, gesture) => {
        const shouldClose = gesture.dy > 110 || gesture.vy > 1.1;
        if (shouldClose) {
          Animated.parallel([
            Animated.timing(overlayOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
            Animated.timing(sheetTranslate, { toValue: 420, duration: 190, useNativeDriver: true }),
          ]).start(({ finished }) => {
            if (finished) {
              setMounted(false);
              onClose();
            }
          });
          return;
        }
        Animated.spring(sheetTranslate, {
          toValue: 0,
          damping: 24,
          stiffness: 260,
          mass: 0.75,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(sheetTranslate, {
          toValue: 0,
          damping: 24,
          stiffness: 260,
          mass: 0.75,
          useNativeDriver: true,
        }).start();
      },
    }),
  ).current;
  const detailOpacity = useRef(new Animated.Value(1)).current;
  const detailTranslateX = useRef(new Animated.Value(0)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTranslateY = useRef(new Animated.Value(12)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setDetail(null);
      detailOpacity.setValue(1);
      detailTranslateX.setValue(0);
      overlayOpacity.setValue(0);
      sheetTranslate.setValue(420);
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(sheetTranslate, { toValue: 0, damping: 24, stiffness: 210, mass: 0.8, useNativeDriver: true }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 0, duration: 170, useNativeDriver: true }),
        Animated.timing(sheetTranslate, { toValue: 420, duration: 210, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible]);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  if (!mounted) return null;

  const menuItems: { key: MenuDetailKey; title: string; description: string; icon: IconName; color: string; bg: string }[] = [
    { key: 'guide', title: '서비스 이용안내', description: '우리의 6/45 주요 기능과 이용 방법', icon: 'book', color: '#2EAD63', bg: '#E8F8EF' },
    { key: 'terms', title: '이용약관', description: '서비스 이용에 필요한 기본 약관', icon: 'document', color: '#3182F6', bg: '#EAF3FF' },
    { key: 'privacy', title: '개인정보처리방침', description: '개인정보 처리 및 보호 안내', icon: 'shield', color: '#8B5CF6', bg: '#F0EAFE' },
    { key: 'support', title: '고객센터', description: '문의 및 오류 제보 · officekipo@gmail.com', icon: 'mail', color: '#F59E0B', bg: '#FFF3DC' },
    { key: 'about', title: '앱 정보', description: '우리의 6/45 · Lotto 6/45', icon: 'info', color: '#EC5B83', bg: '#FFEAF1' },
  ];

  const showToast = (message: string) => {
    setToastMessage(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastOpacity.setValue(0);
    toastTranslateY.setValue(12);
    Animated.parallel([
      Animated.timing(toastOpacity, { toValue: 1, duration: 160, useNativeDriver: true }),
      Animated.spring(toastTranslateY, { toValue: 0, damping: 18, stiffness: 260, mass: 0.55, useNativeDriver: true }),
    ]).start();
    toastTimer.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(toastOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(toastTranslateY, { toValue: 12, duration: 180, useNativeDriver: true }),
      ]).start(() => setToastMessage(''));
    }, 1800);
  };

  const openDetail = (key: MenuDetailKey) => {
    if (detail === key) return;
    Animated.parallel([
      Animated.timing(detailOpacity, { toValue: 0, duration: 110, useNativeDriver: true }),
      Animated.timing(detailTranslateX, { toValue: -18, duration: 110, useNativeDriver: true }),
    ]).start(() => {
      setDetail(key);
      detailTranslateX.setValue(18);
      Animated.parallel([
        Animated.timing(detailOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(detailTranslateX, { toValue: 0, damping: 20, stiffness: 250, mass: 0.6, useNativeDriver: true }),
      ]).start();
    });
  };

  const closeDetail = () => {
    Animated.parallel([
      Animated.timing(detailOpacity, { toValue: 0, duration: 100, useNativeDriver: true }),
      Animated.timing(detailTranslateX, { toValue: 18, duration: 100, useNativeDriver: true }),
    ]).start(() => {
      setDetail(null);
      detailTranslateX.setValue(-18);
      Animated.parallel([
        Animated.timing(detailOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(detailTranslateX, { toValue: 0, damping: 20, stiffness: 250, mass: 0.6, useNativeDriver: true }),
      ]).start();
    });
  };

  const copyEmail = async () => {
    try {
      await Clipboard.setStringAsync('officekipo@gmail.com');
      showToast('메일이 복사 되었습니다.');
    } catch {
      showToast('메일 복사에 실패했습니다.');
    }
  };

  const selected = detail ? MENU_CONTENT[detail] : null;
  const closeAnimated = () => {
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(sheetTranslate, { toValue: 420, duration: 190, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) {
        setMounted(false);
        onClose();
      }
    });
  };

  const openMail = () => {
    Linking.openURL('mailto:officekipo@gmail.com?subject=우리의%20로또%20문의').catch(() => undefined);
  };

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={closeAnimated}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View
          style={{
            position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.58)',
            opacity: overlayOpacity,
          }}
        >
          <Pressable style={{ flex: 1 }} onPress={closeAnimated} />
        </Animated.View>

        <Animated.View
          style={{
            width: '100%', maxWidth: 760, maxHeight: '84%', alignSelf: 'center',
            backgroundColor: '#FFFFFF', borderTopLeftRadius: 30, borderTopRightRadius: 30,
            overflow: 'hidden', transform: [{ translateY: sheetTranslate }],
            shadowColor: '#0F172A', shadowOpacity: 0.22, shadowRadius: 24,
            shadowOffset: { width: 0, height: -8 }, elevation: 20, zIndex: 2,
          }}
        >
          <View
            {...sheetPanResponder.panHandlers}
            accessibilityRole="adjustable"
            accessibilityLabel="메뉴 닫기 핸들"
            style={{ height: 34, width: '100%', alignItems: 'center', justifyContent: 'center' }}
          >
            <View style={{ height: 5, width: 42, borderRadius: 3, backgroundColor: '#D8DEE6' }} />
          </View>

          {selected ? (
            <Animated.View style={{ flex: 1, opacity: detailOpacity, transform: [{ translateX: detailTranslateX }] }}>
              <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F0F2F5' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Pressable
                    onPress={closeDetail}
                    style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 14, backgroundColor: pressed ? '#EAF3FF' : '#F5F7FA', alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.94 : 1 }] })}
                    accessibilityLabel="메뉴로 돌아가기"
                  >
                    <AppIcon name="back" color="#233044" size={19} />
                  </Pressable>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ fontSize: 20, lineHeight: 25, fontWeight: '900', color: '#191F28' }}>{selected.title}</Text>
                    <Text style={{ marginTop: 3, fontSize: 11, color: '#8B95A1' }}>{selected.subtitle}</Text>
                  </View>
                  <Pressable
                    onPress={closeAnimated}
                    style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 14, backgroundColor: pressed ? '#EEF1F4' : '#F7F8FA', alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.94 : 1 }] })}
                    accessibilityLabel="닫기"
                  >
                    <AppIcon name="close" color="#66717F" size={20} />
                  </Pressable>
                </View>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28 }}>
                {detail === 'support' ? (
                  <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28 }}>
                    <View style={{ alignItems: 'center', paddingTop: 4, paddingBottom: 10 }}>
                      <Image source={require('../../assets/support-illustration.png')} resizeMode="contain" style={{ width: 210, height: 122 }} />
                      <Text style={{ marginTop: 6, fontSize: 15, lineHeight: 23, fontWeight: '800', color: '#172033', textAlign: 'center' }}>서비스 이용 중 불편한 점이나 오류를 알려주세요.</Text>
                      <Text style={{ marginTop: 3, fontSize: 12, lineHeight: 19, color: '#6B7684', textAlign: 'center' }}>빠르게 확인 후 답변드리겠습니다.</Text>
                    </View>
                    <View style={{ marginTop: 14, padding: 16, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8ECF1', shadowColor: '#172033', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#8B95A1' }}>문의 이메일</Text>
                      <View style={{ marginTop: 7, flexDirection: 'row', alignItems: 'center' }}>
                        <Text selectable style={{ flex: 1, fontSize: 16, fontWeight: '900', color: '#172033' }}>officekipo@gmail.com</Text>
                        <Pressable accessibilityLabel="이메일 주소 복사" onPress={copyEmail} style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 12, backgroundColor: pressed ? '#EAF3FF' : '#F5F8FC', alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.94 : 1 }] })}>
                          <AppIcon name="copy" color="#3182F6" size={20} />
                        </Pressable>
                      </View>
                    </View>
                    <Text style={{ marginTop: 18, fontSize: 13, lineHeight: 21, color: '#5F6B7A' }}>문의 시 발생한 화면, 조회 회차, 재현 방법을 함께 보내주시면 확인에 도움이 됩니다.</Text>
                    <Text style={{ marginTop: 14, fontSize: 13, lineHeight: 21, color: '#5F6B7A' }}>문의 내용을 확인한 뒤 가능한 범위에서 답변드리겠습니다.</Text>
                    <Pressable onPress={openMail} style={({ pressed }) => ({ marginTop: 22, minHeight: 56, borderRadius: 17, backgroundColor: pressed ? '#246FD8' : '#3182F6', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, transform: [{ scale: pressed ? 0.985 : 1 }], shadowColor: '#3182F6', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 3 })}>
                      <AppIcon name="mail" color="#FFFFFF" size={18} />
                      <Text style={{ marginLeft: 9, color: '#FFFFFF', fontSize: 14, fontWeight: '900' }}>이메일 앱으로 문의하기</Text>
                      <AppIcon name="arrow" color="#FFFFFF" size={18} />
                    </Pressable>
                  </View>
                ) : (
                  selected.body.map((paragraph, index) => (
                    <View key={`${detail}-${index}`} style={{ paddingVertical: 13 }}>
                      <Text style={{ fontSize: 14, lineHeight: 23, color: '#4B5563' }}>{paragraph}</Text>
                    </View>
                  ))
                )}
              </ScrollView>
            </Animated.View>
          ) : (
            <Animated.View style={{ flex: 1, opacity: detailOpacity, transform: [{ translateX: detailTranslateX }] }}>
              <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: '#F0F2F5' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View>
                    <Text style={{ fontSize: 22, lineHeight: 28, fontWeight: '900', color: '#191F28' }}>메뉴</Text>
                    <Text style={{ marginTop: 3, fontSize: 11, color: '#8B95A1' }}>우리의 6/45를 더 편하게 이용하세요</Text>
                  </View>
                  <Pressable
                    onPress={closeAnimated}
                    style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 14, backgroundColor: pressed ? '#EEF1F4' : '#F7F8FA', alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.94 : 1 }] })}
                    accessibilityLabel="닫기"
                  >
                    <AppIcon name="close" color="#66717F" size={20} />
                  </Pressable>
                </View>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 28 }}>
                <View style={{ backgroundColor: '#F7F9FC', borderRadius: 22, padding: 8, borderWidth: 1, borderColor: '#EDF0F4' }}>
                  {menuItems.map((item, index) => (
                    <Pressable
                      key={item.key}
                      onPress={() => openDetail(item.key)}
                      style={({ pressed }) => ({
                        minHeight: 72, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10,
                        backgroundColor: pressed ? '#F0F6FF' : '#FFFFFF', borderRadius: 17,
                        marginBottom: index === menuItems.length - 1 ? 0 : 6,
                        transform: [{ scale: pressed ? 0.985 : 1 }], opacity: pressed ? 0.9 : 1,
                      })}
                    >
                      <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: item.bg, alignItems: 'center', justifyContent: 'center' }}>
                        <AppIcon name={item.icon} color={item.color} size={20} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={{ fontSize: 15, fontWeight: '900', color: '#191F28' }}>{item.title}</Text>
                        <Text style={{ marginTop: 4, fontSize: 11, lineHeight: 16, color: '#8B95A1' }}>{item.description}</Text>
                      </View>
                      <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: '#F7F8FA', alignItems: 'center', justifyContent: 'center' }}>
                        <AppIcon name="arrow" color="#8B95A1" size={18} />
                      </View>
                    </Pressable>
                  ))}
                </View>
                <Text style={{ marginTop: 15, textAlign: 'center', fontSize: 10, fontWeight: '700', color: '#A0A8B2' }}>우리의 6/45 · 문의 officekipo@gmail.com</Text>
              </ScrollView>
            </Animated.View>
          )}

          {toastMessage ? (
            <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 20, right: 20, bottom: 18, alignItems: 'center', opacity: toastOpacity, transform: [{ translateY: toastTranslateY }], zIndex: 20 }}>
              <View style={{ minHeight: 42, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 21, backgroundColor: 'rgba(25,31,40,0.94)', shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 8 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>{toastMessage}</Text>
              </View>
            </Animated.View>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}


export function ServiceLoadingScreen() {
  return (
    <View className={tw.screen} style={{ flex: 1, width: '100%', minWidth: 0, alignSelf: 'stretch', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="small" color={COLORS.primary} />
      <Text style={{ marginTop: 12, color: COLORS.sub }}>정보 가져오는 중..</Text>
    </View>
  );
}

export function RoundSelector({ round, latestRound, loading, onChange }: { round: number; latestRound: number; loading: boolean; onChange: (round: number) => void }) {
  const { width } = useWindowDimensions();
  const compact = width <= 600;
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState(String(round));
  const [inputError, setInputError] = useState('');
  const quickRounds = Array.from({ length: Math.min(8, latestRound) }, (_, index) => latestRound - index);
  const canNext = round < latestRound;

  useEffect(() => {
    setInput(String(round));
    setInputError('');
  }, [round]);

  function selectRound(nextRound: number) {
    if (nextRound < 1 || nextRound > latestRound) return;
    onChange(nextRound);
    setOpen(false);
  }

  function submitManualRound() {
    const nextRound = Number(input.replace(/[^0-9]/g, ''));
    if (!Number.isInteger(nextRound) || nextRound < 1 || nextRound > latestRound) {
      setInputError(`1~${latestRound}회 사이에서 입력해 주세요.`);
      return;
    }
    selectRound(nextRound);
  }

  return (
    <>
      <View style={[styles.roundSelector, compact ? { height: 46, paddingHorizontal: width <= 390 ? 10 : 12 } : { height: 52, paddingHorizontal: 18 }]}>
        <Pressable disabled={round <= 1 || loading} onPress={() => selectRound(Math.max(1, round - 1))} style={[styles.roundSelectorButton, compact ? { minWidth: 64, paddingVertical: 6, paddingHorizontal: 8 } : { minWidth: 72, paddingVertical: 7, paddingHorizontal: 9 }]}>
          <Text style={[styles.roundSelectorButtonText, { fontSize: compact ? 11 : 12, fontWeight: '800' }]}>‹ 이전</Text>
        </Pressable>
        <Pressable onPress={() => setOpen(true)} disabled={loading} style={styles.roundSelectorCenter}>
          <Text style={[styles.roundSelectorLabel, { fontSize: compact ? 9 : 10 }]}>조회 회차</Text>
          <Text style={[styles.roundSelectorValue, { fontSize: compact ? 14 : 15 }]}>{round}회 ▾</Text>
          {loading ? <Text style={styles.roundSelectorLoading}>불러오는 중…</Text> : null}
        </Pressable>
        <Pressable disabled={!canNext || loading} onPress={() => selectRound(Math.min(latestRound, round + 1))} className={cn(tw.roundSelectorButton, (!canNext || loading) && tw.roundSelectorButtonDisabled)} style={[rnStyle(cn(tw.roundSelectorButton, (!canNext || loading) && tw.roundSelectorButtonDisabled)), compact ? { minWidth: 64, paddingVertical: 6, paddingHorizontal: 8 } : { minWidth: 72, paddingVertical: 7, paddingHorizontal: 9 }]} >
          <Text className={cn(tw.roundSelectorButtonText, (!canNext || loading) && tw.roundSelectorButtonTextDisabled)} style={[rnStyle(cn(tw.roundSelectorButtonText, (!canNext || loading) && tw.roundSelectorButtonTextDisabled)), { fontSize: compact ? 11 : 12, fontWeight: '800' }]}>다음 ›</Text>
        </Pressable>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View className={tw.roundModalOverlay} style={rnStyle(tw.roundModalOverlay)}>
          <View className={tw.roundModalCard} style={[rnStyle(tw.roundModalCard), { width: '100%', minWidth: 0, maxWidth: 520 }]}>
            <View className={tw.roundModalHeader} style={rnStyle(tw.roundModalHeader)}>
              <View>
                <Text className={tw.roundModalTitle} style={rnStyle(tw.roundModalTitle)}>조회 회차 선택</Text>
                <Text className={tw.roundModalHint} style={rnStyle(tw.roundModalHint)}>최신 {latestRound}회까지 조회할 수 있습니다.</Text>
              </View>
              <Pressable onPress={() => setOpen(false)} className={tw.modalCloseButton} style={rnStyle(tw.modalCloseButton)}>
                <Text className={tw.modalCloseText} style={rnStyle(tw.modalCloseText)}>×</Text>
              </Pressable>
            </View>

            <Text className={tw.roundModalSectionTitle} style={rnStyle(tw.roundModalSectionTitle)}>최근 회차</Text>
            <View className={tw.roundQuickGrid} style={rnStyle(tw.roundQuickGrid)}>
              {quickRounds.map((item) => {
                const active = item === round;
                return (
                  <Pressable key={item} onPress={() => selectRound(item)} className={cn(tw.roundQuickButton, active && tw.roundQuickButtonActive)} style={rnStyle(cn(tw.roundQuickButton, active && tw.roundQuickButtonActive))}>
                    <Text className={cn(tw.roundQuickText, active && tw.roundQuickTextActive)} style={rnStyle(cn(tw.roundQuickText, active && tw.roundQuickTextActive))}>{item}회</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text className={tw.roundModalSectionTitle} style={rnStyle(tw.roundModalSectionTitle)}>직접 입력</Text>
            <View className={tw.roundManualRow} style={[rnStyle(tw.roundManualRow), { width: '100%', minWidth: 0, flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap' }]}>
              <TextInput
                value={input}
                onChangeText={(value) => { setInput(value.replace(/[^0-9]/g, '').slice(0, 4)); setInputError(''); }}
                keyboardType="number-pad"
                maxLength={4}
                placeholder="회차 입력"
                placeholderTextColor={COLORS.muted}
                className={tw.roundManualInput} style={[rnStyle(tw.roundManualInput), { flex: 1, minWidth: 0, width: 0, height: 46 }]}
              />
              <Pressable onPress={submitManualRound} className={tw.roundManualButton} style={[rnStyle(tw.roundManualButton), { flexShrink: 0, minWidth: 64, height: 46 }]}>
                <Text className={tw.roundManualButtonText} style={rnStyle(tw.roundManualButtonText)}>조회</Text>
              </Pressable>
            </View>
            {inputError ? <Text className={tw.roundInputError} style={rnStyle(tw.roundInputError)}>{inputError}</Text> : null}
          </View>
        </View>
      </Modal>
    </>
  );
}


export function ActionCard({ title, description, icon, onPress }: { title: string; description: string; icon: string; onPress: () => void }) {
  const iconName = (icon === '✦' ? 'star' : icon === '▥' ? 'chart' : icon === '✓' ? 'check' : 'calculator') as IconName;
  return (
    <Pressable onPress={onPress} style={styles.actionCard}>
      <View style={styles.actionIcon}><AppIcon name={iconName} color={COLORS.primary} size={21} /></View>
      <View style={styles.actionTextWrap}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionDescription}>{description}</Text>
      </View>
      <AppIcon name="arrow" color="#8B95A1" size={18} />
    </Pressable>
  );
}

export function BottomNavigation({ active, onChange }: { active: TabKey; onChange: (tab: TabKey) => void }) {
  const items: { key: TabKey; label: string; icon: IconName }[] = [
    { key: 'home', label: 'Home', icon: 'home' },
    { key: 'recommend', label: '번호 생성', icon: 'star' },
    { key: 'stats', label: '로또 통계', icon: 'chart' },
    { key: 'check', label: '당첨 확인', icon: 'check' },
    { key: 'more', label: '당첨금', icon: 'calculator' },
  ];
  return (
    <View style={styles.bottomNav}>
      {items.map((item) => {
        const selected = active === item.key;
        return (
          <Pressable key={item.key} style={[styles.navItem, selected && styles.navItemActive]} onPress={() => onChange(item.key)} accessibilityState={{ selected }}>
            <View style={[styles.navIconWrap, selected && styles.navIconWrapActive]}>
              <AppIcon name={item.icon} color={selected ? COLORS.primary : '#66717F'} size={20} />
            </View>
            <Text style={[styles.navLabel, selected && styles.navLabelActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
