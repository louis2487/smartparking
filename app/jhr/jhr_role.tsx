import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getJhrRole, JhrRole, setJhrRole } from '@/lib/api';

const AUTH_USER_KEY = 'smartparking:auth:username';
const AUTH_PASS_KEY = 'smartparking:auth:password';

export default function JhrRoleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(null);
  const [role, setRole] = useState<JhrRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingRole, setSavingRole] = useState<JhrRole | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const pairs = await AsyncStorage.multiGet([AUTH_USER_KEY, AUTH_PASS_KEY]);
        const u = pairs[0]?.[1] ?? null;
        const p = pairs[1]?.[1] ?? null;
        if (!u || !p) {
          router.replace('/(auth)/login');
          return;
        }
        if (!mounted) return;
        setUsername(u);
        setPassword(p);
        const me = await getJhrRole(u, p);
        if (!mounted) return;
        setRole(me.role);
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  const roleLabel = useMemo(() => {
    if (role === 'CREATOR') return '크리에이터';
    if (role === 'STUDENT') return '수강생';
    return '미선택';
  }, [role]);

  const onSelectRole = async (nextRole: JhrRole) => {
    if (!username || !password) {
      router.replace('/(auth)/login');
      return;
    }
    setError(null);
    setSavingRole(nextRole);
    try {
      const res = await setJhrRole(username, password, nextRole);
      setRole(res.role);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingRole(null);
    }
  };

  return (
    <ThemedView style={[styles.container, { paddingBottom: 18 + insets.bottom }]}>
      <ThemedText type="title">역할 설정</ThemedText>
      <ThemedText style={styles.subtitle}>수강생/크리에이터 역할을 선택하면 서버에 즉시 저장됩니다.</ThemedText>
      <ThemedText style={styles.currentRole}>현재 역할: {loading ? '불러오는 중...' : roleLabel}</ThemedText>

      <View style={styles.selectorWrap}>
        <Pressable
          style={({ pressed }) => [
            styles.roleBox,
            role === 'STUDENT' ? styles.activeBox : null,
            pressed ? styles.pressed : null,
          ]}
          disabled={!!savingRole || loading}
          onPress={() => onSelectRole('STUDENT')}>
          <ThemedText style={styles.roleTitle}>수강생</ThemedText>
          <ThemedText style={styles.roleDesc}>강의를 신청하고 결제/취소를 진행합니다.</ThemedText>
          {savingRole === 'STUDENT' ? <ThemedText style={styles.statusText}>저장 중...</ThemedText> : null}
        </Pressable>

        <View style={styles.divider} />

        <Pressable
          style={({ pressed }) => [
            styles.roleBox,
            role === 'CREATOR' ? styles.activeBox : null,
            pressed ? styles.pressed : null,
          ]}
          disabled={!!savingRole || loading}
          onPress={() => onSelectRole('CREATOR')}>
          <ThemedText style={styles.roleTitle}>크리에이터</ThemedText>
          <ThemedText style={styles.roleDesc}>강의를 개설하고 수강생을 관리합니다.</ThemedText>
          {savingRole === 'CREATOR' ? <ThemedText style={styles.statusText}>저장 중...</ThemedText> : null}
        </Pressable>
      </View>

      {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
      <View style={styles.bottomActions}>
        <Pressable onPress={() => router.replace('/jhr/jhr_list' as any)} style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1 }]}>
          <ThemedText style={styles.goListText}>클래스 목록으로 이동</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 18,
    gap: 10,
  },
  subtitle: {
    opacity: 0.8,
  },
  currentRole: {
    marginTop: 6,
    fontWeight: '700',
  },
  selectorWrap: {
    marginTop: 14,
    flex: 1,
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(120,120,120,0.45)',
    borderRadius: 18,
    overflow: 'hidden',
    minHeight: 220,
  },
  roleBox: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    gap: 10,
  },
  roleTitle: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  roleDesc: {
    textAlign: 'center',
    opacity: 0.85,
    lineHeight: 20,
  },
  activeBox: {
    backgroundColor: 'rgba(59,130,246,0.14)',
  },
  divider: {
    width: 1,
    backgroundColor: 'rgba(120,120,120,0.55)',
  },
  pressed: {
    opacity: 0.9,
  },
  statusText: {
    textAlign: 'center',
    fontWeight: '700',
  },
  errorText: {
    marginTop: 4,
    color: 'rgba(220,38,38,1)',
    fontWeight: '700',
  },
  bottomActions: {
    marginTop: 2,
    alignItems: 'flex-end',
  },
  goListText: {
    color: '#2F6BFF',
    fontWeight: '700',
  },
});
