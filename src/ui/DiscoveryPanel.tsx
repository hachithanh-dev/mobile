import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useApp, useResource } from '../state/AppContext';
import { put } from '../services/api';
import { User, Video, TOPICS } from '../types';
import { Avatar, Button, Icon, IconName, State } from './components';
import { Text } from './typography';
import { C, s } from './theme';

const topicIcons: Record<string, IconName> = {
  'Du lịch': 'earth-outline',
  'Đời sống': 'cafe-outline',
  'Sáng tạo': 'color-palette-outline',
  'Thể thao': 'bicycle-outline',
  'Ẩm thực': 'restaurant-outline',
};

export function DiscoveryPanel({
  onProfile,
  onExplore,
  onCreate,
}: {
  onProfile: (id: string) => void;
  onExplore: (topic: string) => void;
  onCreate: () => void;
}) {
  const { user, refresh, notify } = useApp();
  const people = useResource<User[]>('/users', []);
  const videos = useResource<Video[]>('/videos', []);
  const topics = TOPICS.slice(1).map((topic) => ({
    topic,
    count: videos.data.filter((v) => v.topic === topic).length,
  }));
  return (
    <ScrollView
      style={{
        width: 294,
        flexGrow: 0,
        borderLeftWidth: 1,
        borderColor: C.line,
        backgroundColor: C.surface,
      }}
      contentContainerStyle={{ padding: 24, paddingTop: 30 }}
    >
      <Text style={s.h3}>Có thể bạn sẽ thích</Text>
      <Text style={[s.small, { marginTop: 6, marginBottom: 22 }]}>
        Gặp thêm những người chia sẻ cùng sở thích.
      </Text>
      <State error={people.error} onRetry={people.reload} />
      <View style={{ gap: 21 }}>
        {people.data.slice(0, 3).map((person) => (
          <View key={person.id} style={[s.between, { gap: 8 }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Hồ sơ ${person.name}`}
              onPress={() => onProfile(person.id)}
              style={[s.row, { gap: 10, flex: 1 }]}
            >
              <Avatar uri={person.avatar} size={38} />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ fontWeight: '600', fontSize: 12, color: C.ink }}>
                  {person.name}
                </Text>
                <Text style={[s.small, { fontSize: 11, marginTop: 2 }]}>@{person.handle}</Text>
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${person.following ? 'Bỏ theo dõi' : 'Theo dõi'} ${person.name}`}
              hitSlop={8}
              onPress={() => {
                if (!user) {
                  notify('Đăng nhập ở mục Cá nhân để theo dõi.');
                  return;
                }
                put(`/users/${person.id}/follow`, { active: !person.following })
                  .then(refresh)
                  .catch((e) => notify(e.message));
              }}
              style={{
                width: 30,
                height: 30,
                borderRadius: 9,
                borderWidth: 1,
                borderColor: person.following ? C.line : '#DED5F7',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon
                name={person.following ? 'checkmark' : 'add'}
                color={person.following ? C.muted : C.primary}
                size={17}
              />
            </Pressable>
          </View>
        ))}
      </View>
      <View style={{ height: 1, backgroundColor: C.line, marginVertical: 27 }} />
      <Text style={s.h3}>Khám phá theo chủ đề</Text>
      <State error={videos.error} onRetry={videos.reload} />
      <View style={{ marginTop: 14, gap: 4 }}>
        {topics.map(({ topic, count }) => (
          <Pressable
            key={topic}
            accessibilityRole="button"
            accessibilityLabel={`Khám phá chủ đề ${topic}`}
            onPress={() => onExplore(topic)}
            style={({ pressed }) => [
              s.between,
              {
                paddingVertical: 11,
                paddingHorizontal: 6,
                borderRadius: 9,
                backgroundColor: pressed ? C.soft : 'transparent',
              },
            ]}
          >
            <View style={[s.row, { gap: 12 }]}>
              <Icon name={topicIcons[topic]} size={19} color={C.muted} />
              <Text style={{ fontSize: 13, color: C.ink }}>{topic}</Text>
            </View>
            <Text style={[s.small, { fontSize: 11 }]}>
              {videos.loading ? '—' : `${count} video`}
            </Text>
          </Pressable>
        ))}
      </View>
      <View
        style={[
          s.card,
          {
            marginTop: 25,
            backgroundColor: '#F6F4FC',
            borderColor: '#ECE7F6',
            padding: 17,
            gap: 12,
          },
        ]}
      >
        <View style={[s.row, { gap: 8 }]}>
          <Icon name="videocam-outline" color={C.primary} size={19} />
          <Text style={s.h3}>Đến lượt bạn</Text>
        </View>
        <Text style={s.small}>
          Một chuyến đi, một món ngon hay một ngày bình thường. Bạn có gì muốn chia sẻ?
        </Text>
        <Button title="Đăng video mới" icon="add" onPress={onCreate} />
      </View>
      <Text style={[s.small, { fontSize: 11, marginTop: 24 }]}>Luma · Chia sẻ video</Text>
    </ScrollView>
  );
}
