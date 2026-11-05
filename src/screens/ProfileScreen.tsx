import { Text, TextInput } from '../ui/typography';
import React, { useState } from 'react';
import { View, ScrollView, Modal } from 'react-native';
import { useApp, useResource } from '../state/AppContext';
import { api, put } from '../services/api';
import { User, Video, HistoryVideo } from '../types';
import { HistoryControls } from '../ui/HistoryControls';
import { playbackTime } from '../ui/ContinueWatching';
import { C, s } from '../ui/theme';
import {
  Avatar,
  Button,
  Chips,
  compact,
  Icon,
  IconButton,
  State,
  VideoCard,
} from '../ui/components';
import { AuthScreen } from './AuthScreen';
export function ProfileScreen({
  userId,
  onVideo,
  onBack,
}: {
  userId?: string;
  onVideo: (v: Video) => void;
  onBack?: () => void;
}) {
  const { user } = useApp();
  if (!user && !userId) return <AuthScreen />;
  return (
    <ProfileContent
      key={userId || user!.id}
      id={userId || user!.id}
      onVideo={onVideo}
      onBack={onBack}
    />
  );
}
function ProfileContent({
  id,
  onVideo,
  onBack,
}: {
  id: string;
  onVideo: (v: Video) => void;
  onBack?: () => void;
}) {
  const { user, logout, refresh, notify, react, setUser } = useApp();
  const own = id === user?.id;
  const [tab, setTab] = useState('Video');
  const profile = useResource<User | null>(`/users/${id}`, null);
  const videos = useResource<Video[]>(
    tab === 'Lịch sử'
      ? '/history'
      : tab === 'Đã lưu'
        ? '/videos?feed=saved'
        : `/videos?userId=${id}`,
    [],
    { scope: tab === 'Lịch sử' ? 'history' : 'default' },
  );
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [busy, setBusy] = useState(false);
  const p = profile.data;
  async function save() {
    setBusy(true);
    try {
      const updated = await api<User>('/me', {
        method: 'PATCH',
        body: JSON.stringify({ name, bio }),
      });
      setUser(updated);
      refresh();
      setEdit(false);
      notify('Đã cập nhật hồ sơ.');
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
      {onBack && (
        <View style={{ alignItems: 'flex-start', marginBottom: 15 }}>
          <Button title="Quay lại" icon="arrow-back" secondary onPress={onBack} />
        </View>
      )}
      <State loading={profile.loading} error={profile.error} onRetry={profile.reload} />
      {p && (
        <>
          <View
            style={[s.card, { alignItems: 'center', paddingTop: 30, backgroundColor: C.surface }]}
          >
            <View style={{ padding: 4, borderRadius: 60, borderWidth: 1, borderColor: C.line }}>
              <Avatar uri={p.avatar} size={86} />
            </View>
            <Text style={[s.h1, { marginTop: 15, fontSize: 26 }]}>{p.name}</Text>
            <Text style={[s.small, { marginTop: 5 }]}>@{p.handle}</Text>
            <Text style={[s.body, { marginTop: 14, textAlign: 'center', maxWidth: 330 }]}>
              {p.bio}
            </Text>
            <View style={[s.row, { gap: 30, marginVertical: 23 }]}>
              {[
                [p.followers || 0, 'Người theo dõi'],
                [p.followingCount || 0, 'Đang theo dõi'],
                [p.totalLikes || 0, 'Lượt thích'],
              ].map(([n, label]) => (
                <View key={label} style={{ alignItems: 'center', gap: 5 }}>
                  <Text style={s.h2}>{compact(Number(n))}</Text>
                  <Text style={[s.small, { fontSize: 10 }]}>{label}</Text>
                </View>
              ))}
            </View>
            {own ? (
              <View style={[s.row, { flexWrap: 'wrap', justifyContent: 'center' }]}>
                <Button
                  title="Chỉnh sửa hồ sơ"
                  secondary
                  icon="create-outline"
                  onPress={() => {
                    setName(p.name);
                    setBio(p.bio);
                    setEdit(true);
                  }}
                />
                <Button
                  title="Đăng xuất"
                  secondary
                  onPress={() => logout().catch((e) => notify(e.message))}
                />
              </View>
            ) : (
              <Button
                title={p.following ? 'Đang theo dõi' : 'Theo dõi'}
                secondary={p.following}
                onPress={() => {
                  if (!user) {
                    notify('Đăng nhập để theo dõi nhà sáng tạo.');
                    return;
                  }
                  put(`/users/${id}/follow`, { active: !p.following })
                    .then(refresh)
                    .catch((e) => notify(e.message));
                }}
              />
            )}
          </View>
          {own && (
            <View
              style={[
                s.card,
                s.between,
                { marginTop: 16, backgroundColor: C.mint, borderColor: C.mint },
              ]}
            >
              <View style={[s.row, { flex: 1 }]}>
                <Icon name="stats-chart" color={C.green} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.h3, { color: C.green }]}>Thống kê video</Text>
                  <Text style={[s.small, { color: C.green, marginTop: 4 }]}>
                    {compact(p.totalViews || 0)} lượt xem trên các video của bạn
                  </Text>
                </View>
              </View>
              <Icon name="trending-up" color={C.green} />
            </View>
          )}
          <View style={{ marginVertical: 22 }}>
            <Chips
              items={own ? ['Video', 'Đã lưu', 'Lịch sử'] : ['Video']}
              value={tab}
              onChange={setTab}
            />
          </View>
          {own && tab === 'Lịch sử' && <HistoryControls hasHistory={videos.data.length > 0} />}
          <State loading={videos.loading} error={videos.error} onRetry={videos.reload} />
          {!videos.loading && !videos.data.length && !videos.error && (
            <State
              empty={
                tab === 'Lịch sử'
                  ? 'Chưa có lịch sử xem. Mở một video để bắt đầu.'
                  : tab === 'Đã lưu'
                    ? 'Nhấn biểu tượng lưu trên một video để thêm vào bộ sưu tập.'
                    : 'Chưa có câu chuyện nào. Đăng khoảnh khắc đầu tiên nhé.'
              }
            />
          )}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18 }}>
            {videos.data.map((v) => (
              <View key={v.id} style={{ width: '47.4%' }}>
                <VideoCard
                  video={v}
                  onPress={() => onVideo(v)}
                  onSave={() => react(v, 'save').catch((e) => notify(e.message))}
                />
                {tab === 'Lịch sử' && (
                  <View style={{ marginTop: 9, gap: 7 }}>
                    <View
                      style={{
                        height: 3,
                        borderRadius: 2,
                        backgroundColor: C.line,
                        overflow: 'hidden',
                      }}
                    >
                      <View
                        style={{
                          height: '100%',
                          width: `${Math.min(100, ((v as HistoryVideo).position / (v as HistoryVideo).duration) * 100)}%`,
                          backgroundColor: C.primary,
                        }}
                      />
                    </View>
                    <Text style={s.small}>
                      Đã xem {playbackTime((v as HistoryVideo).position)} /{' '}
                      {playbackTime((v as HistoryVideo).duration)}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </>
      )}
      <Modal transparent visible={edit} animationType="fade" onRequestClose={() => setEdit(false)}>
        <View
          style={{ flex: 1, backgroundColor: '#17112966', justifyContent: 'center', padding: 24 }}
        >
          <View style={[s.card, { width: '100%', maxWidth: 440, alignSelf: 'center', gap: 16 }]}>
            <View style={s.between}>
              <Text style={s.h2}>Câu chuyện của bạn</Text>
              <IconButton name="close" label="Đóng chỉnh sửa" onPress={() => setEdit(false)} />
            </View>
            <TextInput
              accessibilityLabel="Tên hiển thị mới"
              value={name}
              onChangeText={setName}
              maxLength={60}
              style={s.input}
            />
            <TextInput
              accessibilityLabel="Tiểu sử"
              value={bio}
              onChangeText={setBio}
              maxLength={160}
              multiline
              style={[s.input, { minHeight: 100, textAlignVertical: 'top' }]}
            />
            <Button title="Lưu thay đổi" loading={busy} onPress={save} />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
