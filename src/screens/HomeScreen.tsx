import { Text } from '../ui/typography';
import React, { useRef, useState } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  Image,
  useWindowDimensions,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp, useResource } from '../state/AppContext';
import { C, s } from '../ui/theme';
import { Avatar, Chips, Icon, Section, State, VideoCard } from '../ui/components';
import { User, Video, TOPICS, HistoryVideo } from '../types';
import { mediaUrl } from '../services/api';
import { ContinueWatching } from '../ui/ContinueWatching';

export function HomeScreen({
  onVideo,
  onProfile,
  onExplore,
  onCreators,
}: {
  onVideo: (v: Video) => void;
  onProfile: (id: string) => void;
  onExplore: () => void;
  onCreators: () => void;
}) {
  const { user, react, notify } = useApp();
  const [topic, setTopic] = useState('Tất cả');
  const videos = useResource<Video[]>(`/videos?topic=${encodeURIComponent(topic)}`, [], {
    cache: true,
  });
  const creators = useResource<User[]>('/users', []);
  const history = useResource<HistoryVideo[]>('/history', [], {
    enabled: !!user,
    scope: 'history',
  });
  const hasContinue =
    !!user &&
    history.data.some((video) => video.position >= 0.5 && video.position / video.duration < 0.95);
  const { width } = useWindowDimensions();
  const wide = width > 1050;
  const scroll = useRef<ScrollView>(null);
  const feedY = useRef(0);
  const save = (v: Video) => react(v, 'save').catch((e) => notify(e.message));
  return (
    <ScrollView
      ref={scroll}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={videos.loading}
          onRefresh={videos.reload}
          tintColor={C.primary}
        />
      }
      contentContainerStyle={{ padding: wide ? 30 : 20, paddingBottom: 35 }}
    >
      <View style={[s.between, { marginBottom: 20 }]}>
        <View>
          <Text style={[s.small, { marginBottom: 5 }]}>
            Chào {user?.name || 'bạn'}, mừng bạn ghé Luma.
          </Text>
          <Text style={s.h1}>Hôm nay có gì mới?</Text>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Khám phá video du lịch"
        onPress={() => {
          setTopic('Du lịch');
          scroll.current?.scrollTo({ y: feedY.current - 12, animated: true });
        }}
        style={{
          height: wide ? 220 : 182,
          borderRadius: 18,
          overflow: 'hidden',
          backgroundColor: '#DDDFD6',
        }}
      >
        <Image
          source={{ uri: mediaUrl('/media/cover-9.jpg') }}
          style={{ position: 'absolute', width: '100%', height: '100%' }}
        />
        <LinearGradient
          colors={['#18352D12', '#173227D9']}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ position: 'absolute', width: '100%', height: '100%' }}
        />
        <View style={{ padding: wide ? 26 : 20, flex: 1, justifyContent: 'space-between' }}>
          <View
            style={{
              alignSelf: 'flex-start',
              borderRadius: 6,
              paddingVertical: 5,
              paddingHorizontal: 11,
              backgroundColor: '#FFFFFF26',
              borderWidth: 1,
              borderColor: '#FFFFFF50',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '500', fontSize: 10, letterSpacing: 0.6 }}>
              GÓC DU LỊCH
            </Text>
          </View>
          <View>
            <Text
              style={{
                fontSize: wide ? 36 : 29,
                lineHeight: wide ? 44 : 36,
                fontWeight: '600',
                color: '#fff',
                letterSpacing: -1,
              }}
            >
              Ra ngoài một chút.
            </Text>
            <View style={[s.between, { marginTop: 12 }]}>
              <Text style={{ color: '#F1F1E8', fontSize: 12, flex: 1, lineHeight: 18 }}>
                Những góc nhìn từ các chuyến đi.
              </Text>
              <View
                style={{
                  width: 35,
                  height: 35,
                  borderRadius: 20,
                  backgroundColor: '#fff',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="arrow-forward" size={19} />
              </View>
            </View>
          </View>
        </View>
      </Pressable>
      {hasContinue ? (
        <ContinueWatching videos={history.data} onVideo={onVideo} />
      ) : (
        <>
          <Section title="Nhà sáng tạo" action="Xem thêm" onAction={onCreators} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 17, paddingBottom: 3 }}
          >
            {creators.data.map((person) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Hồ sơ ${person.name}`}
                key={person.id}
                onPress={() => onProfile(person.id)}
                style={{ alignItems: 'center', gap: 7, width: 62 }}
              >
                <View
                  style={{
                    borderRadius: 40,
                    padding: 3,
                    borderWidth: 1,
                    borderColor: C.line,
                  }}
                >
                  <Avatar uri={person.avatar} size={44} />
                </View>
                <Text numberOfLines={1} style={{ fontSize: 11, color: C.ink }}>
                  {person.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      )}
      <View
        onLayout={(event) => {
          feedY.current = event.nativeEvent.layout.y;
        }}
      >
        <Section title="Khám phá hôm nay" action="Tìm video" onAction={onExplore} />
      </View>
      <Chips items={TOPICS} value={topic} onChange={setTopic} />
      {videos.offline && (
        <Text style={[s.small, { color: C.green, marginTop: 15 }]}>
          Đang xem dữ liệu đã lưu · Kéo xuống để kết nối lại
        </Text>
      )}
      <State
        loading={videos.loading && !videos.data.length}
        error={videos.error}
        onRetry={videos.reload}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18, marginTop: 20 }}>
        {videos.data.map((v) => (
          <View key={v.id} style={{ width: wide ? '31.6%' : '47.4%', flexGrow: 0 }}>
            <VideoCard video={v} onPress={() => onVideo(v)} onSave={() => save(v)} large={wide} />
          </View>
        ))}
      </View>
      {!videos.loading && !videos.error && !videos.data.length && (
        <State empty="Chủ đề này đang chờ câu chuyện đầu tiên từ bạn." />
      )}
      {!videos.loading && !videos.error && videos.data.length > 0 && (
        <View style={[s.row, { justifyContent: 'center', marginTop: 32 }]}>
          <Icon name="checkmark-circle-outline" color={C.muted} size={15} />
          <Text style={s.small}>Bạn đã xem hết danh sách.</Text>
        </View>
      )}
    </ScrollView>
  );
}
