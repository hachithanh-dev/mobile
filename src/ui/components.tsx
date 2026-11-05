import { Text } from './typography';
import React from 'react';
import {
  View,
  Pressable,
  Image,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { C, s } from './theme';
import { Video } from '../types';
import { mediaUrl } from '../services/api';
export type IconName = React.ComponentProps<typeof Ionicons>['name'];
export const Icon = ({
  name,
  size = 22,
  color = C.ink,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) => <Ionicons name={name} size={size} color={color} />;
export function IconButton({
  name,
  onPress,
  label,
  color = C.ink,
  style,
}: {
  name: IconName;
  onPress: () => void;
  label: string;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: 42,
          height: 42,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: C.surface,
          opacity: pressed ? 0.6 : 1,
        },
        style,
      ]}
    >
      <Icon name={name} color={color} />
    </Pressable>
  );
}
export function Button({
  title,
  onPress,
  icon,
  secondary = false,
  loading = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  icon?: IconName;
  secondary?: boolean;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={loading || disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && { backgroundColor: C.soft },
        (pressed || disabled) && { opacity: 0.6 },
        pressed && { transform: [{ scale: 0.98 }] },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={secondary ? C.primary : '#fff'} />
      ) : (
        <>
          {icon && <Icon name={icon} size={18} color={secondary ? C.primary : '#fff'} />}
          <Text style={[s.buttonText, secondary && { color: C.primary }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}
export const Avatar = ({ uri, size = 40 }: { uri: string; size?: number }) => (
  <Image
    source={{ uri: mediaUrl(uri) }}
    style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.soft }}
  />
);
export function Brand() {
  return (
    <View style={s.row}>
      <LinearGradient
        colors={['#A58BF0', '#7056D6']}
        style={{
          width: 37,
          height: 37,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="play" color="#fff" size={22} />
      </LinearGradient>
      <Text style={{ fontSize: 28, fontWeight: '700', letterSpacing: -1.4, color: C.ink }}>
        luma<Text style={{ color: C.primary }}>.</Text>
      </Text>
    </View>
  );
}
export const compact = (n: number) =>
  n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`;
export function Section({
  title,
  subtitle,
  action,
  onAction,
}: {
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={[s.between, s.section]}>
      <View style={{ flex: 1 }}>
        <Text style={s.h2}>{title}</Text>
        {subtitle && <Text style={[s.small, { marginTop: 5 }]}>{subtitle}</Text>}
      </View>
      {action && (
        <Pressable accessibilityRole="button" onPress={onAction}>
          <Text style={{ fontSize: 12, fontWeight: '500', color: C.primary }}>{action} →</Text>
        </Pressable>
      )}
    </View>
  );
}
export function State({
  loading,
  error,
  empty,
  onRetry,
}: {
  loading?: boolean;
  error?: string;
  empty?: string;
  onRetry?: () => void;
}) {
  if (loading)
    return (
      <View style={s.empty}>
        <ActivityIndicator color={C.primary} />
        <Text style={s.small}>Đang tải video…</Text>
      </View>
    );
  if (error)
    return (
      <View style={s.empty}>
        <Icon name="cloud-offline-outline" size={32} color={C.muted} />
        <Text style={[s.body, { textAlign: 'center' }]}>{error}</Text>
        <Button title="Thử lại" onPress={onRetry!} secondary />
      </View>
    );
  if (empty)
    return (
      <View style={s.empty}>
        <Icon name="sparkles-outline" color={C.primary} size={32} />
        <Text style={[s.body, { textAlign: 'center' }]}>{empty}</Text>
      </View>
    );
  return null;
}
export function VideoCard({
  video,
  onPress,
  onSave,
  large = false,
}: {
  video: Video;
  onPress: () => void;
  onSave: () => void;
  large?: boolean;
}) {
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Xem ${video.title}`}
        onPress={onPress}
        style={({ pressed }) => [
          {
            height: large ? 310 : 225,
            borderRadius: 16,
            overflow: 'hidden',
            backgroundColor: C.soft,
            opacity: pressed ? 0.88 : 1,
          },
        ]}
      >
        <Image source={{ uri: mediaUrl(video.poster) }} style={StyleSheet.absoluteFillObject} />
        <LinearGradient
          colors={['#00000000', '#00000005', '#17132DBB']}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={[s.between, { padding: 13 }]}>
          <View
            style={{
              backgroundColor: '#FFFFFFE8',
              paddingHorizontal: 9,
              paddingVertical: 5,
              borderRadius: 8,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '700', color: C.ink }}>{video.topic}</Text>
          </View>
          <View
            style={{
              backgroundColor: '#15112288',
              padding: 6,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Icon name="play" size={12} color="#fff" />
            {!!video.duration_seconds && (
              <Text style={{ fontSize: 10, color: '#fff', fontWeight: '500' }}>
                {Math.floor(video.duration_seconds / 60)}:
                {String(Math.floor(video.duration_seconds % 60)).padStart(2, '0')}
              </Text>
            )}
          </View>
        </View>
        <View style={{ position: 'absolute', left: 15, right: 15, bottom: 15 }}>
          <Text
            numberOfLines={2}
            style={{
              fontSize: large ? 19 : 15,
              fontWeight: '600',
              color: '#fff',
              lineHeight: large ? 28 : 22,
            }}
          >
            {video.title}
          </Text>
          <View style={[s.row, { gap: 5, marginTop: 9 }]}>
            <Icon name="play-outline" size={12} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 11 }}>{compact(video.views)} lượt xem</Text>
          </View>
        </View>
      </Pressable>
      <View style={[s.between, { marginTop: 11 }]}>
        <View style={[s.row, { gap: 7, flex: 1 }]}>
          <Avatar uri={video.avatar} size={26} />
          <Text
            numberOfLines={1}
            style={{ fontSize: 12, fontWeight: '600', color: C.ink, flex: 1 }}
          >
            {video.name}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={video.saved ? 'Bỏ lưu video' : 'Lưu video'}
          onPress={onSave}
          hitSlop={8}
          style={{ padding: 6 }}
        >
          <Icon
            name={video.saved ? 'bookmark' : 'bookmark-outline'}
            size={17}
            color={video.saved ? C.primary : C.muted}
          />
        </Pressable>
      </View>
    </View>
  );
}
export function Chips({
  items,
  value,
  onChange,
}: {
  items: string[];
  value: string;
  onChange: (s: string) => void;
}) {
  return (
    <View accessibilityRole="radiogroup" style={[s.row, { flexWrap: 'wrap', gap: 8 }]}>
      {items.map((item) => (
        <Pressable
          key={item}
          accessibilityRole="radio"
          accessibilityState={{ checked: value === item }}
          aria-checked={value === item}
          onPress={() => onChange(item)}
          style={[s.pill, value === item && s.pillActive]}
        >
          <Text
            style={{
              fontSize: 12,
              color: value === item ? C.primary : C.muted,
              fontWeight: value === item ? '600' : '400',
            }}
          >
            {item}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
