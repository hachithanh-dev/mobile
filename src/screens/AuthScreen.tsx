import { Text, TextInput } from '../ui/typography';
import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../state/AppContext';
import { C, s } from '../ui/theme';
import { Brand, Button, Icon } from '../ui/components';
export function AuthScreen() {
  const { login } = useApp();
  const [register, setRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  async function submit(demo = false) {
    setError('');
    setLoading(true);
    try {
      await login(
        demo ? 'demo@luma.vn' : email.trim(),
        demo ? 'Luma@123' : password,
        !demo && register ? name.trim() : undefined,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <ScrollView
      contentContainerStyle={{
        padding: 25,
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
      }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ width: '100%', maxWidth: 420 }}>
        <LinearGradient
          colors={['#E8E0FC', '#F5EBE5']}
          style={{ borderRadius: 28, padding: 28, marginBottom: 25, gap: 22 }}
        >
          <Brand />
          <View>
            <Text style={s.h1}>Có gì hay,{'\n'}chia sẻ cùng Luma.</Text>
            <Text style={[s.body, { marginTop: 10 }]}>
              Đăng video, theo dõi bạn bè và lưu những điều bạn thích.
            </Text>
          </View>
          <View style={s.row}>
            <Icon name="videocam-outline" color={C.primary} />
            <Text style={[s.small, { color: C.primary }]}>Video ngắn, kết nối mỗi ngày</Text>
          </View>
        </LinearGradient>
        <Text style={[s.h2, { marginBottom: 20 }]}>
          {register ? 'Tạo tài khoản Luma' : 'Chào mừng bạn trở lại'}
        </Text>
        <View style={{ gap: 13 }}>
          {register && (
            <TextInput
              style={s.input}
              accessibilityLabel="Tên hiển thị"
              placeholder="Tên hiển thị"
              value={name}
              onChangeText={setName}
            />
          )}
          <TextInput
            style={s.input}
            accessibilityLabel="Email"
            placeholder="Email của bạn"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={s.input}
            accessibilityLabel="Mật khẩu"
            placeholder="Mật khẩu (tối thiểu 8 ký tự)"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          {!!error && (
            <Text accessibilityRole="alert" style={{ color: '#BF4D68', fontSize: 13 }}>
              {error}
            </Text>
          )}
          <Button
            title={register ? 'Tạo tài khoản' : 'Đăng nhập'}
            loading={loading}
            onPress={() => submit()}
          />
          <Button
            title="Trải nghiệm tài khoản demo"
            secondary
            icon="flash-outline"
            loading={loading}
            onPress={() => submit(true)}
          />
          <Button
            title={register ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký'}
            secondary
            onPress={() => {
              setRegister(!register);
              setError('');
            }}
          />
          <Text style={[s.small, { textAlign: 'center' }]}>
            Tài khoản demo: demo@luma.vn · Luma@123
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
