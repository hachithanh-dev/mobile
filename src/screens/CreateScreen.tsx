import { Text, TextInput } from '../ui/typography';
import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView, Pressable, Switch, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../state/AppContext';
import { api, post } from '../services/api';
import { TOPICS, Video } from '../types';
import { C, s } from '../ui/theme';
import { Button, Chips, Icon, Section } from '../ui/components';
import { AuthScreen } from './AuthScreen';

const POSTER = '/media/cover-6.jpg';
const SAMPLE = '/media/sample.mp4';
type Draft = {
  title: string;
  description: string;
  topic: string;
  music: string;
  filter: 'original' | 'warm' | 'mono';
  visibility: 'public' | 'private';
  commentsEnabled: boolean;
};
const blank: Draft = {
  title: '',
  description: '',
  topic: 'Du lịch',
  music: 'Âm thanh gốc',
  filter: 'original',
  visibility: 'public',
  commentsEnabled: true,
};
export function CreateScreen({ onPublished }: { onPublished: (v: Video) => void }) {
  const { user } = useApp();
  return user ? <Composer key={user.id} onPublished={onPublished} /> : <AuthScreen />;
}
function Composer({ onPublished }: { onPublished: (v: Video) => void }) {
  const { user, notify, refresh } = useApp();
  const [draft, setDraft] = useState<Draft>(blank);
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [sample, setSample] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const posted = useRef(false);
  const key = `luma.draft.${user!.id}`;
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(key)
      .then((value) => {
        if (!alive) return;
        if (value) {
          setDraft({ ...blank, ...JSON.parse(value) });
          setSaved(true);
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    return () => {
      alive = false;
    };
  }, [key]);
  useEffect(() => {
    if (!loaded || posted.current) return;
    setSaved(false);
    const t = setTimeout(() => {
      AsyncStorage.setItem(key, JSON.stringify(draft))
        .then(() => setSaved(true))
        .catch(() => {});
    }, 650);
    return () => clearTimeout(t);
  }, [draft, loaded, key]);
  function update<K extends keyof Draft>(field: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [field]: value }));
  }
  async function pick(camera = false) {
    setError('');
    try {
      if (camera) {
        const p = await ImagePicker.requestCameraPermissionsAsync();
        if (!p.granted) {
          setError('Bạn cần cấp quyền camera để quay video.');
          return;
        }
      }
      const result = camera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['videos'],
            videoMaxDuration: 60,
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 1 });
      if (result.canceled) return;
      const selected = result.assets[0];
      if (selected.fileSize && selected.fileSize > 100 * 1024 * 1024) {
        setError('Chọn video nhỏ hơn 100 MB nhé.');
        return;
      }
      setAsset(selected);
      setSample(false);
    } catch (e) {
      setError('Chưa mở được thư viện/camera. Kiểm tra quyền truy cập của ứng dụng.');
    }
  }
  async function publish() {
    setError('');
    if (draft.title.trim().length < 3) {
      setError('Nhập tiêu đề ít nhất 3 ký tự.');
      return;
    }
    if (!asset && !sample) {
      setError('Chọn video từ thiết bị hoặc dùng video demo.');
      return;
    }
    setBusy(true);
    try {
      let url = SAMPLE;
      if (asset) {
        const data = new FormData();
        if (Platform.OS === 'web') {
          const file = asset.file || (await (await fetch(asset.uri)).blob());
          data.append('video', file, asset.fileName || 'moment.mp4');
        } else {
          data.append('video', {
            uri: asset.uri,
            name: asset.fileName || 'moment.mp4',
            type: asset.mimeType || 'video/mp4',
          } as unknown as Blob);
        }
        const result = await api<{ url: string }>('/uploads', { method: 'POST', body: data });
        url = result.url;
      }
      const video = await post<Video>('/videos', { ...draft, url, poster: POSTER });
      posted.current = true;
      await AsyncStorage.removeItem(key);
      refresh();
      notify('Khoảnh khắc của bạn đã được đăng!');
      onPublished(video);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <ScrollView
      contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={s.between}>
        <Text style={s.h1}>Đăng video</Text>
        <Icon name="videocam-outline" color={C.primary} />
      </View>
      <Text style={[s.body, { marginTop: 8, marginBottom: 22 }]}>
        Chọn một video và chia sẻ với mọi người.
      </Text>
      <View
        style={[
          s.card,
          {
            borderStyle: 'dashed',
            borderColor: '#C8BAEC',
            backgroundColor: '#F2EEFC',
            alignItems: 'center',
            gap: 15,
            padding: 25,
          },
        ]}
      >
        {asset || sample ? (
          <>
            <View
              style={{
                width: 70,
                height: 70,
                borderRadius: 22,
                backgroundColor: C.soft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="videocam" color={C.primary} size={30} />
            </View>
            <Text style={s.h3} numberOfLines={1}>
              {sample ? 'Video mẫu đã sẵn sàng' : asset?.fileName || 'Video của bạn'}
            </Text>
            <Text style={s.small}>
              {asset?.fileSize
                ? `${(asset.fileSize / 1024 / 1024).toFixed(1)} MB`
                : 'Sẵn sàng để đăng'}{' '}
              · Bìa minh họa mặc định
            </Text>
            <Button title="Chọn video khác" secondary onPress={() => pick()} />
          </>
        ) : (
          <>
            <Icon name="cloud-upload-outline" size={42} color={C.primary} />
            <Text style={s.h3}>Chọn một khoảnh khắc</Text>
            <Text style={s.small}>MP4, MOV, WebM · Tối đa 100 MB</Text>
            <Button title="Chọn từ thư viện" icon="add" onPress={() => pick()} />
            {Platform.OS !== 'web' && (
              <Button
                title="Quay video 60 giây"
                secondary
                icon="camera-outline"
                onPress={() => pick(true)}
              />
            )}
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setSample(true);
                notify('Video demo là clip hoa mẫu CC0 từ MDN, bìa là ảnh minh họa.');
              }}
            >
              <Text style={{ color: C.primary, fontSize: 12, fontWeight: '600', padding: 6 }}>
                Hoặc sử dụng video demo →
              </Text>
            </Pressable>
          </>
        )}
      </View>
      <Section title="Thông tin video" />
      <Text style={s.label}>Tiêu đề *</Text>
      <TextInput
        accessibilityLabel="Tiêu đề video"
        style={s.input}
        placeholder="Khoảnh khắc này có gì đặc biệt?"
        value={draft.title}
        onChangeText={(v) => update('title', v)}
        maxLength={100}
      />
      <Text style={[s.label, { marginTop: 18 }]}>Câu chuyện phía sau</Text>
      <TextInput
        accessibilityLabel="Mô tả video"
        style={[s.input, { minHeight: 100, textAlignVertical: 'top' }]}
        multiline
        placeholder="Chia sẻ câu chuyện, thêm #hashtag…"
        value={draft.description}
        onChangeText={(v) => update('description', v)}
        maxLength={1000}
      />
      <Text style={[s.label, { marginTop: 18 }]}>Chủ đề</Text>
      <Chips items={TOPICS.slice(1)} value={draft.topic} onChange={(v) => update('topic', v)} />
      <Text style={[s.label, { marginTop: 18 }]}>Âm thanh khi xem</Text>
      <Chips
        items={['Âm thanh gốc', 'Tắt âm thanh']}
        value={draft.music}
        onChange={(v) => update('music', v)}
      />
      <Text style={[s.label, { marginTop: 18 }]}>Lớp màu khi xem</Text>
      <View style={s.row}>
        {(
          [
            { id: 'original', name: 'Tự nhiên', color: '#E6E5E1' },
            { id: 'warm', name: 'Ấm áp', color: '#F4D5B3' },
            { id: 'mono', name: 'Dịu nhẹ', color: '#C9CED8' },
          ] as const
        ).map((f) => (
          <Pressable
            accessibilityRole="button"
            key={f.id}
            onPress={() => update('filter', f.id)}
            style={{
              flex: 1,
              alignItems: 'center',
              padding: 14,
              borderWidth: 2,
              borderColor: draft.filter === f.id ? C.primary : C.line,
              borderRadius: 15,
              backgroundColor: f.color,
            }}
          >
            <Text style={{ fontSize: 12, color: C.ink, fontWeight: '600' }}>{f.name}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={[s.small, { marginTop: 8 }]}>
        Lớp phủ hiển thị trong Luma, không xuất lại file video. Âm nhạc trong clip gốc được giữ
        nguyên.
      </Text>
      <View style={[s.card, { marginTop: 22, gap: 17 }]}>
        <View style={s.between}>
          <View>
            <Text style={s.h3}>Video công khai</Text>
            <Text style={s.small}>
              {draft.visibility === 'public'
                ? 'Mọi người có thể khám phá'
                : 'Chỉ mình bạn xem được'}
            </Text>
          </View>
          <Switch
            accessibilityLabel="Video công khai"
            value={draft.visibility === 'public'}
            onValueChange={(v) => update('visibility', v ? 'public' : 'private')}
            trackColor={{ true: C.primary, false: '#DDD' }}
          />
        </View>
        <View style={s.between}>
          <Text style={s.h3}>Cho phép bình luận</Text>
          <Switch
            accessibilityLabel="Cho phép bình luận"
            value={draft.commentsEnabled}
            onValueChange={(v) => update('commentsEnabled', v)}
            trackColor={{ true: C.primary, false: '#DDD' }}
          />
        </View>
      </View>
      {!!error && (
        <Text accessibilityRole="alert" style={{ color: '#BF4D68', marginVertical: 15 }}>
          {error}
        </Text>
      )}
      <View style={{ gap: 13, marginTop: 23 }}>
        <Button title="Đăng khoảnh khắc" icon="arrow-up" loading={busy} onPress={publish} />
        <Text style={[s.small, { textAlign: 'center' }]}>
          {saved ? '✓ Nội dung bản nháp đã lưu trên thiết bị' : 'Đang lưu bản nháp…'} · Chọn lại
          file khi mở lại
        </Text>
      </View>
    </ScrollView>
  );
}
