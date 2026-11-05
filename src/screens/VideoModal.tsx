import { Text, TextInput } from '../ui/typography';
import React, { useEffect, useState } from 'react';
import {
  View,
  Modal,
  Pressable,
  ScrollView,
  Share,
  Linking,
  useWindowDimensions,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEvent } from 'expo';
import { Comment, Video } from '../types';
import { api, mediaUrl, post } from '../services/api';
import { useApp, useResource } from '../state/AppContext';
import { useWatchProgress } from '../state/useWatchProgress';
import { playbackTime } from '../ui/ContinueWatching';
import { C, s } from '../ui/theme';
import { Avatar, Button, compact, Icon, IconButton, State } from '../ui/components';

export function VideoModal({
  video,
  onClose,
  onProfile,
}: {
  video: Video;
  onClose: () => void;
  onProfile: (id: string) => void;
}) {
  const { user, react, notify, refresh, message } = useApp();
  const { width, height } = useWindowDimensions();
  const wide = width > 850;
  const insets = useSafeAreaInsets();
  const updated = useResource<Video[]>(`/videos?userId=${video.user_id}`, []);
  const current = updated.data.find((v) => v.id === video.id) || video;
  const comments = useResource<Comment[]>(`/videos/${video.id}/comments`, []);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const player = useVideoPlayer({ uri: mediaUrl(video.url), useCaching: true }, (p) => {
    p.loop = true;
    p.muted = true;
  });
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  const { muted } = useEvent(player, 'mutedChange', { muted: player.muted });
  const { resumeFrom, syncError } = useWatchProgress(player, video.id);
  useEffect(() => {
    post(`/videos/${video.id}/view`, {}).catch(() => {});
    return () => {
      try {
        player.pause();
      } catch {}
    };
  }, [video.id]);
  async function comment() {
    if (!user) {
      notify('Đăng nhập để tham gia cuộc trò chuyện.');
      return;
    }
    if (!body.trim()) return;
    setBusy(true);
    try {
      await post(`/videos/${video.id}/comments`, { body });
      setBody('');
      refresh();
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    try {
      await api(`/videos/${video.id}`, { method: 'DELETE' });
      refresh();
      notify('Đã xóa video.');
      onClose();
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const action = (kind: 'like' | 'save') => react(current, kind).catch((e) => notify(e.message));
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: '#171226B8',
          justifyContent: 'center',
          alignItems: 'center',
          padding: wide ? 25 : 0,
          paddingTop: wide ? 25 : insets.top,
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 1060,
            height: wide ? Math.min(height - 50, 760) : '100%',
            backgroundColor: C.surface,
            borderRadius: wide ? 26 : 0,
            overflow: 'hidden',
            flexDirection: wide ? 'row' : 'column',
          }}
        >
          <View
            style={{
              backgroundColor: '#14121C',
              width: wide ? '56%' : '100%',
              height: wide ? '100%' : Math.min(height * 0.4, 360),
              position: 'relative',
            }}
          >
            <VideoView
              player={player}
              nativeControls
              contentFit="contain"
              style={{ width: '100%', height: '100%' }}
              fullscreenOptions={{ enable: true }}
            />
            {video.filter !== 'original' && (
              <View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFillObject,
                  { backgroundColor: video.filter === 'warm' ? '#F7AA4122' : '#788AA322' },
                ]}
              />
            )}
            <View style={{ position: 'absolute', top: 14, left: 14 }}>
              <IconButton
                name="close"
                label="Đóng video"
                onPress={onClose}
                style={{ backgroundColor: '#FFFFFFE8' }}
              />
            </View>
            <View style={{ position: 'absolute', right: 14, top: 14 }}>
              <IconButton
                name={muted ? 'volume-mute-outline' : 'volume-high-outline'}
                label={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
                onPress={() => {
                  if (video.music === 'Tắt âm thanh') {
                    notify('Tác giả đã chọn tắt âm thanh cho video này.');
                    return;
                  }
                  player.muted = !muted;
                }}
                style={{ backgroundColor: '#FFFFFFE8' }}
              />
            </View>
            {status === 'loading' && (
              <View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFillObject,
                  { justifyContent: 'center', alignItems: 'center' },
                ]}
              >
                <ActivityIndicator color="#fff" />
              </View>
            )}
            {status === 'error' && (
              <View
                style={[
                  StyleSheet.absoluteFillObject,
                  {
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 45,
                    gap: 12,
                    backgroundColor: '#14121CE0',
                  },
                ]}
              >
                <Icon name="cloud-offline-outline" color="#fff" size={32} />
                <Text style={{ color: '#fff', textAlign: 'center' }}>
                  Chưa tải được video. Kiểm tra mạng và thử mở lại.
                </Text>
                <Button title="Đóng" secondary onPress={onClose} />
              </View>
            )}
          </View>
          <View style={{ flex: 1, minHeight: 0 }}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: 22, paddingBottom: 15 }}
            >
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  onClose();
                  onProfile(video.user_id);
                }}
                style={s.row}
              >
                <Avatar uri={video.avatar} size={43} />
                <View>
                  <Text style={s.h3}>{video.name}</Text>
                  <Text style={s.small}>@{video.handle}</Text>
                </View>
              </Pressable>
              <Text style={[s.h2, { marginTop: 20, lineHeight: 28 }]}>{video.title}</Text>
              {!!video.source_url && (
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={`Nguồn video: ${video.source_author}`}
                  onPress={() =>
                    Linking.openURL(video.source_url!).catch(() =>
                      notify('Chưa mở được trang nguồn.'),
                    )
                  }
                >
                  <Text style={[s.small, { marginTop: 8, color: C.primary }]}>
                    Video mẫu · {video.source_author} / Pexels ↗
                  </Text>
                </Pressable>
              )}
              <Text style={[s.body, { marginTop: 8, color: '#6C667E' }]}>{video.description}</Text>
              <View style={[s.row, { marginTop: 15, gap: 6 }]}>
                <Icon name="musical-notes-outline" color={C.primary} size={15} />
                <Text style={[s.small, { color: C.primary }]}>{video.music}</Text>
              </View>
              {user && (
                <Text style={[s.small, { marginTop: 8, color: syncError ? '#B25A3C' : C.primary }]}>
                  {syncError
                    ? 'Chưa đồng bộ được vị trí xem'
                    : resumeFrom > 0
                      ? `Tiếp tục từ ${playbackTime(resumeFrom)}`
                      : 'Vị trí xem được lưu tự động'}
                </Text>
              )}
              <View style={[s.row, { marginTop: 7, gap: 6 }]}>
                <Icon name="play-outline" color={C.muted} size={14} />
                <Text style={s.small}>
                  {compact(current.views)} lượt xem · {video.topic}
                  {video.visibility === 'private' ? ' · Chỉ mình tôi' : ''}
                </Text>
              </View>
              <View style={[s.row, { marginVertical: 20, gap: 20 }]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Thích video"
                  onPress={() => action('like')}
                  style={[s.row, { gap: 6, padding: 5 }]}
                >
                  <Icon
                    name={current.liked ? 'heart' : 'heart-outline'}
                    color={current.liked ? '#DE6786' : C.ink}
                  />
                  <Text style={s.small}>{current.likes}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Lưu video đang xem"
                  onPress={() => action('save')}
                  style={[s.row, { gap: 6, padding: 5 }]}
                >
                  <Icon
                    name={current.saved ? 'bookmark' : 'bookmark-outline'}
                    color={current.saved ? C.primary : C.ink}
                  />
                  <Text style={s.small}>{current.saved ? 'Đã lưu' : 'Lưu'}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Chia sẻ video"
                  onPress={() =>
                    Share.share({ message: `${video.title} — Luma\n${mediaUrl(video.url)}` }).catch(
                      () => notify('Thiết bị chưa hỗ trợ chia sẻ.'),
                    )
                  }
                  style={{ padding: 5 }}
                >
                  <Icon name="share-social-outline" />
                </Pressable>
              </View>
              <View style={{ height: 1, backgroundColor: C.line, marginBottom: 18 }} />
              <Text style={s.h3}>Bình luận · {comments.data.length}</Text>
              <State loading={comments.loading} error={comments.error} onRetry={comments.reload} />
              {!comments.loading && !comments.data.length && !comments.error && (
                <Text style={[s.body, { marginVertical: 20 }]}>
                  Chưa có bình luận. Bạn nghĩ sao về video này?
                </Text>
              )}
              <View style={{ gap: 18, marginTop: 20 }}>
                {comments.data.map((c) => (
                  <View key={c.id} style={[s.row, { alignItems: 'flex-start', gap: 10 }]}>
                    <Avatar uri={c.avatar} size={32} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, color: C.ink, fontWeight: '700' }}>
                        {c.name}
                      </Text>
                      <Text style={[s.body, { fontSize: 13, color: '#6C667E' }]}>{c.body}</Text>
                    </View>
                  </View>
                ))}
              </View>
              {user?.id === video.user_id && (
                <View style={{ marginTop: 25 }}>
                  {confirmDelete ? (
                    <View style={{ gap: 10 }}>
                      <Text style={s.small}>
                        Xóa video và tất cả bình luận? Hành động này không thể hoàn tác.
                      </Text>
                      <Button title="Xác nhận xóa video" loading={busy} onPress={remove} />
                      <Button title="Giữ lại" secondary onPress={() => setConfirmDelete(false)} />
                    </View>
                  ) : (
                    <Button
                      title="Xóa video của tôi"
                      secondary
                      onPress={() => setConfirmDelete(true)}
                    />
                  )}
                </View>
              )}
            </ScrollView>
            <View
              style={{
                padding: 16,
                paddingBottom: Math.max(16, insets.bottom),
                borderTopWidth: 1,
                borderColor: C.line,
              }}
            >
              {current.comments_enabled ? (
                <View style={[s.row, { gap: 8 }]}>
                  <TextInput
                    accessibilityLabel="Nội dung bình luận"
                    placeholder={user ? 'Viết bình luận…' : 'Đăng nhập để bình luận'}
                    value={body}
                    onChangeText={setBody}
                    maxLength={500}
                    style={[s.input, { flex: 1 }]}
                    onSubmitEditing={comment}
                  />
                  <IconButton
                    name="send"
                    color={C.primary}
                    label="Gửi bình luận"
                    onPress={() => {
                      if (!busy) comment();
                    }}
                  />
                </View>
              ) : (
                <Text style={s.small}>Bình luận đã được tắt cho video này.</Text>
              )}
            </View>
          </View>
        </View>
        {!!message && (
          <View
            pointerEvents="none"
            style={{ position: 'absolute', bottom: 25, left: 20, right: 20, alignItems: 'center' }}
          >
            <Text
              accessibilityRole="alert"
              style={{
                backgroundColor: '#29223F',
                color: '#fff',
                padding: 14,
                borderRadius: 14,
                fontSize: 13,
                maxWidth: 500,
              }}
            >
              {message}
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}
