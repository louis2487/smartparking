import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  createParkingPostComment,
  deleteParkingPost,
  deleteParkingPostComment,
  getMe,
  getParkingPost,
  getParkingPostComments,
  updateParkingPostComment,
  type ParkingPost,
  type ParkingPostComment,
} from '@/lib/api';

const AUTH_USER_KEY = 'smartparking:auth:username';
const AUTH_PASS_KEY = 'smartparking:auth:password';
type CommentNode = ParkingPostComment & { children: CommentNode[] };

function formatPostDateTime(raw?: string | null) {
  if (!raw) return '';
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return '';
  const d = dt.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const t = dt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${d} ${t}`;
}

export default function NoticeDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [item, setItem] = useState<ParkingPost | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<ParkingPostComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [updatingComment, setUpdatingComment] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);
  const [replyTarget, setReplyTarget] = useState<CommentNode | null>(null);

  const handleFocus = () => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 120);
  };

  useEffect(() => {
    const id = Number(params.id);
    if (!Number.isFinite(id) || id <= 0) {
      setError('유효하지 않은 공지사항 ID입니다.');
      return;
    }
    (async () => {
      setLoading(true);
      setError(null);
      setLoadingComments(true);
      setCommentError(null);
      try {
        const u = (await AsyncStorage.getItem(AUTH_USER_KEY))?.trim() || null;
        const p = (await AsyncStorage.getItem(AUTH_PASS_KEY))?.trim() || null;
        setUsername(u);
        if (u && p) {
          try {
            const me = await getMe(u, p);
            setIsOwner(me.grade === 'owner');
          } catch {
            setIsOwner(false);
          }
        } else {
          setIsOwner(false);
        }
        const post = await getParkingPost(id);
        setItem(post);
      } catch (e) {
        setError(e instanceof Error ? e.message : '공지사항을 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }

      try {
        const commentRes = await getParkingPostComments(id, undefined, 50);
        const sorted = [...(commentRes.items ?? [])].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );
        setComments(sorted);
      } catch (e) {
        setCommentError(e instanceof Error ? e.message : '댓글을 불러오지 못했습니다.');
      } finally {
        setLoadingComments(false);
      }
    })();
  }, [params.id]);

  const submitComment = async () => {
    const id = Number(params.id);
    const content = newComment.trim();
    if (!Number.isFinite(id) || id <= 0) return;
    if (!username) {
      Alert.alert('로그인 필요', '로그인 후 댓글을 작성할 수 있습니다.');
      return;
    }
    if (!content) {
      Alert.alert('입력 필요', '댓글 내용을 입력해주세요.');
      return;
    }

    setSubmittingComment(true);
    try {
      const created = await createParkingPostComment(id, username, content, replyTarget?.id);
      setComments((prev) =>
        [...prev, created].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
      );
      setNewComment('');
      setReplyTarget(null);
      setCommentError(null);
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '댓글 등록에 실패했습니다.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const buildCommentTree = (items: ParkingPostComment[]): CommentNode[] => {
    const map = new Map<number, CommentNode>();
    const roots: CommentNode[] = [];

    items.forEach((c) => map.set(c.id, { ...c, children: [] }));
    items.forEach((c) => {
      const node = map.get(c.id);
      if (!node) return;
      if (c.parent_id) {
        const parent = map.get(c.parent_id);
        if (parent) parent.children.push(node);
        else roots.push(node);
      } else {
        roots.push(node);
      }
    });
    return roots;
  };

  const renderCommentNode = (node: CommentNode, depth: number): React.ReactNode => {
    const isDeleted = !!node.is_deleted;
    const isMine = !!username && node.username === username;
    const isEditing = editingCommentId === node.id;
    return (
      <View key={node.id}>
        <View style={[styles.commentRow, depth > 0 ? styles.replyRow : null, { marginLeft: depth * 14 }]}>
          {depth > 0 ? <ThemedText style={styles.replyMark}>↳</ThemedText> : null}
          <View style={styles.commentHeader}>
            <View style={styles.commentHeaderLeft}>
              <ThemedText style={styles.commentUser}>{node.username || '익명'}</ThemedText>
              {!isDeleted ? (
                <Pressable
                  onPress={() => {
                    setReplyTarget(node);
                  }}>
                  <ThemedText style={styles.replyText}>답글</ThemedText>
                </Pressable>
              ) : null}
              {!isDeleted && !isEditing && isMine ? (
                <View style={styles.inlineMineActions}>
                  <Pressable
                    onPress={() => {
                      setEditingCommentId(node.id);
                      setEditingText(node.content || '');
                    }}>
                    <ThemedText style={styles.mineEditText}>수정</ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      Alert.alert('댓글 삭제', '이 댓글을 삭제하시겠습니까?', [
                        { text: '취소', style: 'cancel' },
                        {
                          text: '삭제',
                          style: 'destructive',
                          onPress: async () => {
                            if (!username) return;
                            try {
                              await deleteParkingPostComment(node.id, username);
                              setComments((prev) =>
                                prev.map((c) => (c.id === node.id ? { ...c, is_deleted: true, content: '[삭제된 댓글입니다.]' } : c)),
                              );
                            } catch (e) {
                              Alert.alert('오류', e instanceof Error ? e.message : '댓글 삭제에 실패했습니다.');
                            }
                          },
                        },
                      ]);
                    }}>
                    <ThemedText style={styles.mineDeleteText}>삭제</ThemedText>
                  </Pressable>
                </View>
              ) : null}
            </View>
            <ThemedText style={styles.commentDate}>{formatPostDateTime(node.created_at)}</ThemedText>
          </View>
          {isEditing ? (
            <View style={styles.editWrap}>
              <TextInput
                value={editingText}
                onChangeText={setEditingText}
                editable={!updatingComment}
                multiline
                style={styles.editInput}
                textAlignVertical="top"
              />
              <View style={styles.editActions}>
                <Pressable
                  onPress={() => {
                    setEditingCommentId(null);
                    setEditingText('');
                  }}
                  disabled={updatingComment}>
                  <ThemedText style={styles.editCancelText}>취소</ThemedText>
                </Pressable>
                <Pressable
                  onPress={async () => {
                    if (!username || !editingText.trim()) return;
                    setUpdatingComment(true);
                    try {
                      const updated = await updateParkingPostComment(node.id, username, editingText.trim());
                      setComments((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
                      setEditingCommentId(null);
                      setEditingText('');
                    } catch (e) {
                      Alert.alert('오류', e instanceof Error ? e.message : '댓글 수정에 실패했습니다.');
                    } finally {
                      setUpdatingComment(false);
                    }
                  }}
                  disabled={updatingComment}>
                  <ThemedText style={styles.editSaveText}>{updatingComment ? '저장 중...' : '저장'}</ThemedText>
                </Pressable>
              </View>
            </View>
          ) : (
            <ThemedText style={styles.commentContent}>{isDeleted ? '[삭제된 댓글입니다.]' : node.content}</ThemedText>
          )}
        </View>
        {node.children.map((child) => renderCommentNode(child, depth + 1))}
      </View>
    );
  };

  const commentTree = buildCommentTree(comments);
  const canManagePost = !!item && !!username && (item.author?.username === username || isOwner);

  const onDeletePost = () => {
    if (!item || deletingPost) return;
    Alert.alert('게시글 삭제', '이 공지사항을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          setDeletingPost(true);
          try {
            await deleteParkingPost(item.id);
            Alert.alert('완료', '공지사항이 삭제되었습니다.');
            router.back();
          } catch (e) {
            Alert.alert('오류', e instanceof Error ? e.message : '삭제에 실패했습니다.');
          } finally {
            setDeletingPost(false);
          }
        },
      },
    ]);
  };

  return (
    <ThemedView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 48}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator />
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorBox}>
              <ThemedText style={styles.errorTitle}>오류</ThemedText>
              <ThemedText style={styles.errorText}>{error}</ThemedText>
            </View>
          ) : null}

          {!loading && !error && item ? (
            <>
              <View style={styles.card}>
                <View style={styles.cardHead}>
                  <ThemedText type="title" style={styles.title}>
                    {item.title}
                  </ThemedText>
                </View>
                <View style={styles.metaRow}>
                  <ThemedText style={styles.meta}>
                    {item.author?.username ? `${item.author.username} · ` : ''}
                    {formatPostDateTime(item.created_at)}
                  </ThemedText>
                  {canManagePost ? (
                    <View style={styles.postActions}>
                      <Pressable
                        onPress={async () => {
                          const body = (item.content || '').trim();
                          if (!body) {
                            Alert.alert('안내', '복사할 본문이 없습니다.');
                            return;
                          }
                          await Clipboard.setStringAsync(body);
                          Alert.alert('완료', '본문을 복사했습니다.');
                        }}>
                        <ThemedText style={styles.postCopyText}>복사</ThemedText>
                      </Pressable>
                      <Pressable onPress={() => router.push(`/write?id=${item.id}` as any)}>
                        <ThemedText style={styles.postEditText}>수정</ThemedText>
                      </Pressable>
                      <Pressable onPress={onDeletePost} disabled={deletingPost}>
                        <ThemedText style={[styles.postDeleteText, deletingPost ? { opacity: 0.5 } : null]}>
                          {deletingPost ? '삭제 중...' : '삭제'}
                        </ThemedText>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
                <View style={styles.divider} />
                <ThemedText style={styles.content}>{item.content}</ThemedText>
              </View>

              <View style={styles.commentCard}>
                <ThemedText style={styles.commentTitle}>댓글</ThemedText>
                {loadingComments ? (
                  <View style={styles.centerBox}>
                    <ActivityIndicator />
                  </View>
                ) : null}
                {commentError ? <ThemedText style={styles.commentError}>{commentError}</ThemedText> : null}
                {!loadingComments && comments.length === 0 ? (
                  <ThemedText style={styles.commentEmpty}>첫 댓글을 남겨보세요.</ThemedText>
                ) : null}
                {commentTree.map((node) => renderCommentNode(node, 0))}
              </View>
            </>
          ) : null}
        </ScrollView>

        <View style={[styles.bottomInputBar, { paddingBottom: insets.bottom }]}>
          {replyTarget ? (
            <View style={styles.replyTargetInline}>
              <ThemedText style={styles.replyTargetInlineText}>{replyTarget.username || '익명'}님에게 답글 작성 중</ThemedText>
              <Pressable onPress={() => setReplyTarget(null)}>
                <ThemedText style={styles.replyTargetInlineCancel}>취소</ThemedText>
              </Pressable>
            </View>
          ) : null}
          <View style={styles.inputRow}>
            <TextInput
              value={newComment}
              onChangeText={setNewComment}
              placeholder={replyTarget ? '답글을 입력하세요' : '댓글을 입력하세요'}
              placeholderTextColor="rgba(100,116,139,0.9)"
              editable={!submittingComment}
              onFocus={handleFocus}
              style={styles.commentInput}
              multiline
            />
            <Pressable
              onPress={submitComment}
              disabled={submittingComment}
              style={({ pressed }) => [styles.commentSubmitBtn, { opacity: submittingComment ? 0.55 : pressed ? 0.9 : 1 }]}>
              <ThemedText style={styles.commentSubmitText}>{submittingComment ? '등록 중...' : '등록'}</ThemedText>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { padding: 14, paddingBottom: 156 },
  centerBox: { paddingVertical: 16 },
  errorBox: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(210,60,60,0.55)',
    backgroundColor: 'rgba(210,60,60,0.08)',
    padding: 10,
    gap: 4,
  },
  errorTitle: { fontWeight: '700' },
  errorText: { fontSize: 12, opacity: 0.9 },
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(120,120,120,0.35)',
    backgroundColor: 'rgba(120,120,120,0.05)',
    padding: 14,
    gap: 8,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  title: {
    fontSize: 22,
    flex: 1,
    paddingRight: 0,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 8,
  },
  postEditText: {
    fontSize: 13,
    color: '#2F6BFF',
    fontWeight: '700',
  },
  postCopyText: {
    fontSize: 13,
    color: 'rgba(55,65,81,0.95)',
    fontWeight: '700',
  },
  postDeleteText: {
    fontSize: 13,
    color: '#cc4444',
    fontWeight: '700',
  },
  meta: { opacity: 0.8, fontSize: 12, flex: 1 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(120,120,120,0.35)',
    marginVertical: 4,
  },
  content: { fontSize: 15, lineHeight: 22 },
  commentCard: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(120,120,120,0.35)',
    backgroundColor: 'rgba(120,120,120,0.05)',
    padding: 12,
    gap: 8,
  },
  commentTitle: { fontSize: 18, fontWeight: '700' },
  commentError: { color: 'rgba(220,38,38,1)', fontSize: 12, fontWeight: '700' },
  commentEmpty: { opacity: 0.8, fontSize: 13 },
  commentRow: {
    position: 'relative',
    paddingTop: 7,
    paddingBottom: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(120,120,120,0.28)',
    gap: 3,
  },
  replyRow: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    paddingHorizontal: 0,
  },
  replyMark: {
    position: 'absolute',
    top: 5,
    left: -10,
    fontSize: 12,
    opacity: 0.65,
    fontWeight: '700',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  commentHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  commentUser: { fontSize: 13, fontWeight: '700' },
  commentDate: { fontSize: 11, opacity: 0.75 },
  commentContent: { fontSize: 14, lineHeight: 20, marginTop: 5, marginBottom: 1 },
  inlineMineActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 2,
  },
  mineActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  mineEditText: {
    fontSize: 12,
    color: 'rgba(55,65,81,0.9)',
    fontWeight: '700',
  },
  mineDeleteText: {
    fontSize: 12,
    color: '#cc4444',
    fontWeight: '700',
  },
  editWrap: {
    marginTop: 4,
    gap: 6,
  },
  editInput: {
    minHeight: 64,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(120,120,120,0.55)',
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#111827',
    fontSize: 14,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    alignItems: 'center',
  },
  editCancelText: {
    fontSize: 12,
    opacity: 0.8,
    fontWeight: '700',
  },
  editSaveText: {
    fontSize: 12,
    color: '#2F6BFF',
    fontWeight: '800',
  },
  replyText: {
    fontSize: 12,
    color: '#2F6BFF',
    fontWeight: '700',
  },
  bottomInputBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 10,
    paddingHorizontal: 10,
    paddingBottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(120,120,120,0.45)',
    backgroundColor: 'rgba(255,255,255,0.98)',
  },
  replyTargetInline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  replyTargetInlineText: {
    fontSize: 12,
    opacity: 0.82,
  },
  replyTargetInlineCancel: {
    fontSize: 12,
    color: '#2F6BFF',
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentInput: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(120,120,120,0.55)',
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#111827',
    fontSize: 14,
    maxHeight: 120,
  },
  commentSubmitBtn: {
    marginLeft: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#2F6BFF',
    height: 40,
  },
  commentSubmitText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
