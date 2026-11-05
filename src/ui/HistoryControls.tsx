import React, { useState } from 'react';
import { View } from 'react-native';
import { api } from '../services/api';
import { useApp } from '../state/AppContext';
import { Button, Icon } from './components';
import { Text } from './typography';
import { C, s } from './theme';

export function HistoryControls({ hasHistory }: { hasHistory: boolean }) {
  const { notify, refreshHistory } = useApp();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  async function clear() {
    setBusy(true);
    try {
      await api('/history', { method: 'DELETE' });
      refreshHistory();
      setConfirm(false);
      notify('Đã xóa lịch sử xem.');
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 12, marginBottom: 18 }}>
      <View style={[s.between, { flexWrap: 'wrap' }]}>
        <View style={[s.row, { gap: 7 }]}>
          <Icon name="lock-closed-outline" color={C.muted} size={14} />
          <Text style={s.small}>Chỉ bạn thấy lịch sử xem của mình.</Text>
        </View>
        {hasHistory && !confirm && (
          <Button
            title="Xóa lịch sử"
            icon="trash-outline"
            secondary
            onPress={() => setConfirm(true)}
          />
        )}
      </View>
      {confirm && (
        <View style={[s.card, { gap: 14 }]}>
          <Text style={s.h3}>Xóa toàn bộ lịch sử xem?</Text>
          <Text style={s.body}>
            Lịch sử của tài khoản sẽ bị xóa. Hành động này không thể hoàn tác.
          </Text>
          <View style={[s.row, { flexWrap: 'wrap' }]}>
            <Button title="Xác nhận xóa lịch sử" loading={busy} onPress={clear} />
            <Button title="Hủy" disabled={busy} secondary onPress={() => setConfirm(false)} />
          </View>
        </View>
      )}
    </View>
  );
}
