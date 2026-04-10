import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { useThemeColor } from '@/hooks/use-theme-color';
import { checkParkingUserForPasswordReset, login, resetParkingPassword } from '@/lib/api';

const AUTH_USER_KEY = 'smartparking:auth:username';
const AUTH_PASS_KEY = 'smartparking:auth:password';

export default function LoginScreen() {
  const router = useRouter();
  const tint = useThemeColor({}, 'tint');
  const text = useThemeColor({}, 'text');

  const inputStyle = useMemo(
    () => [
      styles.input,
      { borderColor: `rgba(120,120,120,0.35)`, color: text },
    ],
    [text],
  );

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetUsername, setResetUsername] = useState('');
  const [resetUserChecked, setResetUserChecked] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetDoneMessage, setResetDoneMessage] = useState<string | null>(null);

  const onSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await login(username.trim(), password);
      await AsyncStorage.multiSet([
        [AUTH_USER_KEY, username.trim()],
        [AUTH_PASS_KEY, password],
      ]);
      router.replace('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const openResetModal = () => {
    setResetModalVisible(true);
    setResetUsername('');
    setResetUserChecked(false);
    setResetPassword('');
    setResetPasswordConfirm('');
    setResetError(null);
    setResetDoneMessage(null);
  };

  const closeResetModal = () => {
    if (resetLoading) return;
    setResetModalVisible(false);
  };

  const onCheckResetUser = async () => {
    const trimmed = resetUsername.trim();
    if (!trimmed) {
      setResetError('아이디를 입력해주세요.');
      return;
    }
    setResetLoading(true);
    setResetError(null);
    setResetDoneMessage(null);
    try {
      const res = await checkParkingUserForPasswordReset(trimmed);
      if (!res.exists) {
        setResetUserChecked(false);
        setResetError('가입된 회원이 아니에요. 아이디를 다시 확인해주세요.');
        return;
      }
      setResetUserChecked(true);
    } catch (e) {
      setResetUserChecked(false);
      setResetError(e instanceof Error ? e.message : String(e));
    } finally {
      setResetLoading(false);
    }
  };

  const onResetPassword = async () => {
    const trimmed = resetUsername.trim();
    if (!trimmed) {
      setResetError('아이디를 입력해주세요.');
      return;
    }
    if (!resetUserChecked) {
      setResetError('먼저 회원 확인을 해주세요.');
      return;
    }
    if (!resetPassword || !resetPasswordConfirm) {
      setResetError('새 비밀번호와 확인 값을 모두 입력해주세요.');
      return;
    }
    if (resetPassword !== resetPasswordConfirm) {
      setResetError('새 비밀번호와 확인 값이 일치하지 않아요.');
      return;
    }
    setResetLoading(true);
    setResetError(null);
    setResetDoneMessage(null);
    try {
      await resetParkingPassword(trimmed, resetPassword);
      setResetDoneMessage('비밀번호가 재설정되었어요. 새 비밀번호로 로그인해주세요.');
      setResetPassword('');
      setResetPasswordConfirm('');
    } catch (e) {
      setResetError(e instanceof Error ? e.message : String(e));
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ThemedView style={styles.container}>
        <View style={{ gap: 6 }}>
          <ThemedText type="title">로그인</ThemedText>
          <ThemedText style={{ opacity: 0.8 }}>계정으로 로그인하세요.</ThemedText>
        </View>

        {error ? (
          <ThemedView style={styles.errorBox}>
            <ThemedText style={styles.errorText}>로그인에 실패했어요.</ThemedText>
            <ThemedText style={styles.errorTextSmall}>{error}</ThemedText>
          </ThemedView>
        ) : null}

        <View style={styles.form}>
          <ThemedText type="subtitle">아이디</ThemedText>
          <TextInput
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="username"
            placeholderTextColor="rgba(120,120,120,0.7)"
            style={inputStyle as any}
          />

          <ThemedText type="subtitle">비밀번호</ThemedText>
          <TextInput
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            placeholder="password"
            placeholderTextColor="rgba(120,120,120,0.7)"
            style={inputStyle as any}
          />
        </View>

        <View style={{ gap: 10 }}>
          <Button title="로그인" onPress={onSubmit} loading={loading} disabled={!username.trim() || !password} />

          <Pressable onPress={openResetModal} disabled={loading} style={{ alignSelf: 'flex-start' }}>
            <ThemedText style={{ color: tint, fontWeight: '800' }}>비밀번호를 잊어버리셨나요?</ThemedText>
          </Pressable>

          <Pressable onPress={() => router.push('/(auth)/signup')} disabled={loading} style={{ alignSelf: 'flex-start' }}>
            <ThemedText style={{ color: tint, fontWeight: '800' }}>아직 회원이 아니라면 등록해주세요.</ThemedText>
          </Pressable>
        </View>
      </ThemedView>

      <Modal visible={resetModalVisible} transparent animationType="fade" onRequestClose={closeResetModal}>
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalCard}>
            <View style={{ gap: 4 }}>
              <ThemedText type="subtitle">비밀번호 재설정</ThemedText>
              <ThemedText style={{ opacity: 0.8 }}>아이디 확인 후 새 비밀번호를 설정할 수 있어요.</ThemedText>
            </View>

            <View style={styles.form}>
              <ThemedText type="subtitle">아이디</ThemedText>
              <TextInput
                value={resetUsername}
                onChangeText={(v) => {
                  setResetUsername(v);
                  setResetUserChecked(false);
                  setResetDoneMessage(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="username"
                placeholderTextColor="rgba(120,120,120,0.7)"
                style={inputStyle as any}
                editable={!resetLoading}
              />
              <Button
                title={resetUserChecked ? '회원 확인 완료' : '회원 확인'}
                onPress={onCheckResetUser}
                loading={resetLoading}
                disabled={!resetUsername.trim() || resetLoading}
              />

              {resetUserChecked ? (
                <>
                  <ThemedText type="subtitle">새 비밀번호</ThemedText>
                  <TextInput
                    value={resetPassword}
                    onChangeText={setResetPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry
                    placeholder="new password"
                    placeholderTextColor="rgba(120,120,120,0.7)"
                    style={inputStyle as any}
                    editable={!resetLoading}
                  />

                  <ThemedText type="subtitle">새 비밀번호 확인</ThemedText>
                  <TextInput
                    value={resetPasswordConfirm}
                    onChangeText={setResetPasswordConfirm}
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry
                    placeholder="confirm new password"
                    placeholderTextColor="rgba(120,120,120,0.7)"
                    style={inputStyle as any}
                    editable={!resetLoading}
                  />
                </>
              ) : null}
            </View>

            {resetError ? <ThemedText style={[styles.errorTextSmall, { color: '#d64545' }]}>{resetError}</ThemedText> : null}
            {resetDoneMessage ? <ThemedText style={styles.resetDoneText}>{resetDoneMessage}</ThemedText> : null}

            <View style={styles.modalActions}>
              <Button title="닫기" variant="secondary" onPress={closeResetModal} disabled={resetLoading} style={{ flex: 1 }} />
              <Button
                title="비밀번호 재설정"
                onPress={onResetPassword}
                loading={resetLoading}
                disabled={!resetUserChecked || !resetPassword || !resetPasswordConfirm || resetLoading}
                style={{ flex: 1 }}
              />
            </View>
          </ThemedView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingBottom: 18,
    paddingTop: 28,
    gap: 12,
  },
  form: {
    gap: 10,
  },
  input: {
    height: 46,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorBox: {
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(210,60,60,0.55)',
    backgroundColor: 'rgba(210,60,60,0.08)',
    gap: 4,
  },
  errorText: {
    fontWeight: '700',
  },
  errorTextSmall: {
    opacity: 0.8,
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  modalCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(120,120,120,0.35)',
    padding: 14,
    gap: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  resetDoneText: {
    fontSize: 12,
    color: '#2f8f4e',
    fontWeight: '700',
  },
});

