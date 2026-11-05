import { Text } from './src/ui/typography';
import React, { useState } from 'react';
import { View, Pressable, useWindowDimensions, ActivityIndicator } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AppProvider, useApp } from './src/state/AppContext';
import { HomeScreen } from './src/screens/HomeScreen';
import { ExploreScreen } from './src/screens/ExploreScreen';
import { FollowingScreen } from './src/screens/FollowingScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { CreateScreen } from './src/screens/CreateScreen';
import { VideoModal } from './src/screens/VideoModal';
import { Avatar, Brand, Button, Icon, IconButton, IconName } from './src/ui/components';
import { C, s } from './src/ui/theme';
import { Tab, Video } from './src/types';
import { DiscoveryPanel } from './src/ui/DiscoveryPanel';
import { useInterFonts } from './src/ui/typography';

const navigation: { id: Tab; label: string; icon: IconName; active: IconName }[] = [
  { id: 'home', label: 'Trang chủ', icon: 'home-outline', active: 'home' },
  { id: 'explore', label: 'Khám phá', icon: 'compass-outline', active: 'compass' },
  { id: 'create', label: 'Tạo video', icon: 'add-circle-outline', active: 'add-circle' },
  { id: 'following', label: 'Theo dõi', icon: 'people-outline', active: 'people' },
  { id: 'profile', label: 'Cá nhân', icon: 'person-outline', active: 'person' },
];
export default function App() {
  const [fontsLoaded, fontError] = useInterFonts();
  if (!fontsLoaded && !fontError) {
    return (
      <View
        style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}
      >
        <ActivityIndicator color={C.primary} accessibilityLabel="Đang tải giao diện" />
      </View>
    );
  }
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="dark" />
        <Shell />
      </AppProvider>
    </SafeAreaProvider>
  );
}
function Shell() {
  const { user, ready, message, notify } = useApp();
  const [tab, setTab] = useState<Tab>('home');
  const [video, setVideo] = useState<Video | null>(null);
  const [profileId, setProfileId] = useState<string | undefined>();
  const [exploreTopic, setExploreTopic] = useState('Tất cả');
  const { width } = useWindowDimensions();
  const desktop = width >= 1000;
  const right = width >= 1320;
  function navigate(next: Tab) {
    setProfileId(undefined);
    setTab(next);
  }
  const openProfile = (id: string) => {
    setProfileId(id);
    setTab('profile');
  };
  const openExplore = (topic = 'Tất cả') => {
    setExploreTopic(topic);
    navigate('explore');
  };
  if (!ready)
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: C.bg,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
        }}
      >
        <Brand />
        <ActivityIndicator color={C.primary} />
      </SafeAreaView>
    );
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: C.bg }}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <View style={{ flex: 1, flexDirection: 'row' }}>
        {desktop && (
          <View
            style={{
              width: 230,
              backgroundColor: '#fff',
              borderRightWidth: 1,
              borderColor: C.line,
              padding: 24,
              paddingTop: 34,
            }}
          >
            <Brand />
            <Text style={[s.small, { marginTop: 12, fontSize: 11 }]}>Chạm vào cảm hứng.</Text>
            <View style={{ gap: 9, marginTop: 42 }}>
              {navigation
                .filter((n) => n.id !== 'create')
                .map((n) => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={n.label}
                    key={n.id}
                    onPress={() => navigate(n.id)}
                    style={[
                      s.row,
                      {
                        padding: 14,
                        borderRadius: 14,
                        backgroundColor: tab === n.id ? C.soft : 'transparent',
                      },
                    ]}
                  >
                    <Icon
                      name={tab === n.id ? n.active : n.icon}
                      size={21}
                      color={tab === n.id ? C.primary : C.muted}
                    />
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: tab === n.id ? '700' : '500',
                        color: tab === n.id ? C.primary : C.muted,
                      }}
                    >
                      {n.label}
                    </Text>
                  </Pressable>
                ))}
            </View>
            <View style={{ marginTop: 27 }}>
              <Button title="Tạo khoảnh khắc" icon="add" onPress={() => navigate('create')} />
            </View>
            <View style={{ flex: 1 }} />
            <View style={{ paddingTop: 18, borderTopWidth: 1, borderColor: C.line }}>
              <Text style={[s.small, { fontSize: 11 }]}>
                Video, bạn bè và những điều bạn thích.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => navigate('profile')}
              style={[s.row, { marginTop: 26, gap: 10 }]}
            >
              {user ? (
                <Avatar uri={user.avatar} size={34} />
              ) : (
                <Icon name="person-circle-outline" size={34} color={C.primary} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: C.ink }}>
                  {user?.name || 'Khách khám phá'}
                </Text>
                <Text style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>
                  {user ? `@${user.handle}` : 'Đăng nhập để kết nối'}
                </Text>
              </View>
              <Icon name="chevron-forward" size={15} color={C.muted} />
            </Pressable>
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <View
            style={[
              s.between,
              {
                paddingHorizontal: desktop ? 30 : 20,
                height: desktop ? 76 : 64,
                borderBottomWidth: 1,
                borderColor: C.line,
                backgroundColor: '#fff',
              },
            ]}
          >
            {desktop ? (
              <View style={s.row}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: C.ink }}>
                  {navigation.find((n) => n.id === tab)?.label}
                </Text>
              </View>
            ) : (
              <Brand />
            )}
            <View style={[s.row, { gap: 8 }]}>
              <IconButton
                name="search-outline"
                label="Mở tìm kiếm"
                onPress={() => openExplore()}
                color={C.muted}
              />
              <IconButton
                name="information-circle-outline"
                label="Thông tin ứng dụng"
                onPress={() =>
                  notify(
                    'Luma · Dự án học phần lập trình thiết bị di động. Khám phá, đăng và kết nối qua video.',
                  )
                }
                color={C.muted}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Mở hồ sơ cá nhân"
                onPress={() => navigate('profile')}
              >
                {user ? (
                  <Avatar uri={user.avatar} size={34} />
                ) : (
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 18,
                      backgroundColor: C.soft,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name="person-outline" color={C.primary} size={18} />
                  </View>
                )}
              </Pressable>
            </View>
          </View>
          <View style={{ flex: 1, minHeight: 0 }}>
            {tab === 'home' && (
              <HomeScreen
                onVideo={setVideo}
                onProfile={openProfile}
                onExplore={() => openExplore()}
                onCreators={() => navigate('following')}
              />
            )}
            {tab === 'explore' && (
              <ExploreScreen key={exploreTopic} initialTopic={exploreTopic} onVideo={setVideo} />
            )}
            {tab === 'following' && <FollowingScreen onVideo={setVideo} onProfile={openProfile} />}
            {tab === 'profile' && (
              <ProfileScreen
                userId={profileId}
                onVideo={setVideo}
                onBack={profileId ? () => navigate('following') : undefined}
              />
            )}
            {tab === 'create' && (
              <CreateScreen
                onPublished={(v) => {
                  navigate('profile');
                  setVideo(v);
                }}
              />
            )}
          </View>
          {!desktop && (
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: '#fff',
                borderTopWidth: 1,
                borderColor: C.line,
                paddingTop: 9,
                paddingBottom: 8,
              }}
            >
              {navigation.map((n) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={n.label}
                  key={n.id}
                  onPress={() => navigate(n.id)}
                  style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 5 }}
                >
                  {n.id === 'create' ? (
                    <View
                      style={{
                        width: 44,
                        height: 38,
                        borderRadius: 13,
                        backgroundColor: C.primary,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon name="add" color="#fff" size={26} />
                    </View>
                  ) : (
                    <Icon
                      name={tab === n.id ? n.active : n.icon}
                      size={23}
                      color={tab === n.id ? C.primary : C.muted}
                    />
                  )}
                  <Text
                    style={{
                      fontSize: 10,
                      color: tab === n.id ? C.primary : C.muted,
                      fontWeight: tab === n.id ? '700' : '500',
                    }}
                  >
                    {n.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
        {right && (
          <DiscoveryPanel
            onProfile={openProfile}
            onExplore={openExplore}
            onCreate={() => navigate('create')}
          />
        )}
      </View>
      {!!message && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: desktop ? 25 : 90,
            left: 20,
            right: 20,
            alignItems: 'center',
            zIndex: 100,
          }}
        >
          <View
            style={{
              backgroundColor: '#29223F',
              padding: 15,
              borderRadius: 15,
              maxWidth: 540,
              boxShadow: '0 5px 20px #00000022',
            }}
          >
            <Text accessibilityRole="alert" style={{ color: '#fff', fontSize: 13, lineHeight: 20 }}>
              {message}
            </Text>
          </View>
        </View>
      )}
      {video && (
        <VideoModal
          key={video.id}
          video={video}
          onClose={() => setVideo(null)}
          onProfile={openProfile}
        />
      )}
    </SafeAreaView>
  );
}
