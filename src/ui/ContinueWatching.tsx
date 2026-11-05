import React from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { HistoryVideo, Video } from '../types';
import { mediaUrl } from '../services/api';
import { C, s } from './theme';
import { Text } from './typography';
import { Icon, Section } from './components';

export const playbackTime = (seconds: number) => {
  const value = Math.max(0, Math.floor(seconds));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
};

export function ContinueWatching({
  videos,
  onVideo,
}: {
  videos: HistoryVideo[];
  onVideo: (video: Video) => void;
}) {
  const unfinished = videos
    .filter((video) => video.position >= 0.5 && video.position / video.duration < 0.95)
    .slice(0, 6);
  if (!unfinished.length) return null;
  return (
    <View>
      <Section title="Xem tiếp" subtitle="Tiếp tục từ chỗ bạn đã dừng" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingBottom: 4 }}
      >
        {unfinished.map((video) => (
          <Pressable
            key={video.id}
            accessibilityRole="button"
            accessibilityLabel={`Xem tiếp ${video.title}`}
            onPress={() => onVideo(video)}
            style={({ pressed }) => ({
              width: 246,
              padding: 10,
              borderRadius: 13,
              borderWidth: 1,
              borderColor: C.line,
              backgroundColor: pressed ? C.soft : C.surface,
            })}
          >
            <View style={[s.row, { gap: 11 }]}>
              <View style={{ width: 70, height: 67, borderRadius: 8, overflow: 'hidden' }}>
                <Image
                  source={{ uri: mediaUrl(video.poster) }}
                  style={{ width: '100%', height: '100%' }}
                />
                <View style={{ position: 'absolute', top: 23, left: 25 }}>
                  <Icon name="play" size={20} color="#fff" />
                </View>
              </View>
              <View style={{ flex: 1, gap: 7 }}>
                <Text
                  numberOfLines={2}
                  style={{ fontSize: 12, lineHeight: 17, color: C.ink, fontWeight: '500' }}
                >
                  {video.title}
                </Text>
                <Text style={{ fontSize: 10, color: C.muted }}>
                  {playbackTime(video.position)} / {playbackTime(video.duration)}
                </Text>
              </View>
            </View>
            <View
              style={{
                height: 3,
                borderRadius: 2,
                marginTop: 10,
                backgroundColor: C.line,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  height: '100%',
                  width: `${Math.min(100, (video.position / video.duration) * 100)}%`,
                  backgroundColor: C.primary,
                }}
              />
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
