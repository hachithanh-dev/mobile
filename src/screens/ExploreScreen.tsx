import { Text, TextInput } from '../ui/typography';
import React, { useEffect, useState } from 'react';
import { View, ScrollView, useWindowDimensions } from 'react-native';
import { useApp, useResource } from '../state/AppContext';
import { Video, TOPICS } from '../types';
import { C, s } from '../ui/theme';
import { Chips, Icon, Section, State, VideoCard } from '../ui/components';
export function ExploreScreen({
  onVideo,
  initialTopic = 'Tất cả',
}: {
  onVideo: (v: Video) => void;
  initialTopic?: string;
}) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [topic, setTopic] = useState(initialTopic);
  const { react, notify } = useApp();
  const wide = useWindowDimensions().width > 1050;
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);
  const resource = useResource<Video[]>(
    `/videos?q=${encodeURIComponent(debounced)}&topic=${encodeURIComponent(topic)}`,
    [],
  );
  return (
    <ScrollView contentContainerStyle={{ padding: wide ? 30 : 20, paddingBottom: 40 }}>
      <Text style={s.h1}>Khám phá</Text>
      <Text style={[s.body, { marginTop: 8, marginBottom: 23 }]}>
        Tìm video theo tên, chủ đề hoặc hashtag.
      </Text>
      <View style={[s.row, s.input, { marginBottom: 20 }]}>
        <Icon name="search-outline" color={C.primary} />
        <TextInput
          accessibilityLabel="Tìm kiếm video"
          placeholder="Tìm video, câu chuyện, #hashtag…"
          placeholderTextColor={C.muted}
          value={query}
          onChangeText={setQuery}
          style={{ flex: 1, color: C.ink, fontSize: 14, padding: 2 }}
        />
      </View>
      <Chips items={TOPICS} value={topic} onChange={setTopic} />
      <Section
        title={query ? `Kết quả cho “${query}”` : 'Đang được khám phá'}
        subtitle={`${resource.data.length} câu chuyện để bạn bắt đầu`}
      />
      <State loading={resource.loading} error={resource.error} onRetry={resource.reload} />
      {!resource.loading && !resource.error && !resource.data.length && (
        <State empty="Chưa tìm thấy video. Thử một từ khóa hoặc chủ đề khác nhé." />
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18 }}>
        {resource.data.map((v) => (
          <View key={v.id} style={{ width: wide ? '31.6%' : '47.4%' }}>
            <VideoCard
              video={v}
              onPress={() => onVideo(v)}
              onSave={() => react(v, 'save').catch((e) => notify(e.message))}
              large={wide}
            />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
