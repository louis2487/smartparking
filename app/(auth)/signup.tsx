import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { useThemeColor } from '@/hooks/use-theme-color';
import { signup } from '@/lib/api';

const AUTH_USER_KEY = 'smartparking:auth:username';
const AUTH_PASS_KEY = 'smartparking:auth:password';

export default function SignupScreen() {
  const router = useRouter();
  const tint = useThemeColor({}, 'tint');
  const text = useThemeColor({}, 'text');

  const inputStyle = useMemo(
    () => [styles.input, { borderColor: `rgba(120,120,120,0.35)`, color: text }],
    [text],
  );

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = Boolean(username.trim() && password && password2 && password === password2);

  const onSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const u = username.trim();
      await signup(u, password);
      await AsyncStorage.multiSet([
        [AUTH_USER_KEY, u],
        [AUTH_PASS_KEY, password],
      ]);
      router.replace('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ThemedView style={styles.container}>
        <View style={{ gap: 6 }}>
          <ThemedText type="title">회원가입</ThemedText>
          <ThemedText style={{ opacity: 0.8 }}>아이디/비밀번호로 계정을 생성하세요.</ThemedText>
        </View>

        {error ? (
          <ThemedView style={styles.errorBox}>
            <ThemedText style={styles.errorText}>회원가입에 실패했어요.</ThemedText>
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
            returnKeyType="next"
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

          <ThemedText type="subtitle">비밀번호 확인</ThemedText>
          <TextInput
            value={password2}
            onChangeText={setPassword2}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            placeholder="password confirm"
            placeholderTextColor="rgba(120,120,120,0.7)"
            style={inputStyle as any}
            onSubmitEditing={() => {
              if (canSubmit && !loading) onSubmit();
            }}
          />

          {password2 ? (
            password === password2 ? null : (
              <ThemedText style={{ color: 'rgba(210,60,60,0.95)', fontWeight: '700' }}>
                비밀번호가 일치하지 않아요.
              </ThemedText>
            )
          ) : null}
        </View>

        <View style={{ gap: 10 }}>
          <Button title="회원가입" onPress={onSubmit} loading={loading} disabled={!canSubmit} />
          <Pressable onPress={() => router.back()} disabled={loading} style={{ alignSelf: 'flex-start' }}>
            <ThemedText style={{ color: tint, fontWeight: '800' }}>이미 계정이 있어요</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
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
  errorBox: {
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(210,60,60,0.55)',
    backgroundColor: 'rgba(210,60,60,0.08)',
    gap: 4,
  },
  errorText: { fontWeight: '700' },
  errorTextSmall: { opacity: 0.8, fontSize: 12 },
});

