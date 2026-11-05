import { Text } from '../ui/typography';
import React from 'react';
import { ScrollView, View, Pressable } from 'react-native';
import { User, Video } from '../types';
import { useApp, useResource } from '../state/AppContext';
import { put } from '../services/api';
import { s } from '../ui/theme';
import { Avatar, Button, Section, State, VideoCard } from '../ui/components';
export function FollowingScreen({
  onVideo,
  onProfile,
}: {
  onVideo: (v: Video) => void;
  onProfile: (id: string) => void;
}) {
  const { user, refresh, notify, react } = useApp();
  const people = useResource<User[]>('/users', []);
  const feed = useResource<Video[]>('/videos?feed=following', []);
  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
      <Text style={s.h1}>Đang theo dõi</Text>
      <Text style={[s.body, { marginTop: 8 }]}>Video mới từ những người bạn quan tâm.</Text>
      <Section title="Nhà sáng tạo dành cho bạn" />
      <State error={people.error} onRetry={people.reload} />
      <View style={{ gap: 12 }}>
        {people.data.map((p) => (
          <View key={p.id} style={[s.card, s.between, { padding: 15 }]}>
            <Pressable
              onPress={() => onProfile(p.id)}
              accessibilityRole="button"
              style={[s.row, { flex: 1 }]}
            >
              <Avatar uri={p.avatar} size={46} />
              <View style={{ flex: 1 }}>
                <Text style={s.h3}>{p.name}</Text>
                <Text style={s.small}>@{p.handle}</Text>
              </View>
            </Pressable>
            <Button
              title={p.following ? 'Đang theo dõi' : 'Theo dõi'}
              secondary={!!p.following}
              onPress={() => {
                if (!user) {
                  notify('Đăng nhập ở mục Cá nhân để theo dõi.');
                  return;
                }
                put(`/users/${p.id}/follow`, { active: !p.following })
                  .then(refresh)
                  .catch((e) => notify(e.message));
              }}
            />
          </View>
        ))}
      </View>
      <Section title="Từ những người bạn theo dõi" />
      <State loading={feed.loading} error={feed.error} onRetry={feed.reload} />
      {!feed.loading && !feed.data.length && !feed.error && (
        <State empty="Theo dõi nhà sáng tạo để câu chuyện của họ xuất hiện tại đây." />
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18 }}>
        {feed.data.map((v) => (
          <View key={v.id} style={{ width: '47.4%' }}>
            <VideoCard
              video={v}
              onPress={() => onVideo(v)}
              onSave={() => react(v, 'save').catch((e) => notify(e.message))}
            />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
