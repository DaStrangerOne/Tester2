import React, { useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useChatContext } from '@/hooks/useChatContext';
import { useRouter } from 'expo-router';
import { useAuth } from '@/template';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { QuickActions } from '@/components/chat/QuickActions';
import { StealthMeter } from '@/components/chat/StealthMeter';
import { TTPTracker } from '@/components/chat/TTPTracker';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { Message, ChatSession } from '@/services/aiService';

export default function ChatScreen() {
  const {
    messages,
    isLoading,
    inputText,
    setInputText,
    sendUserMessage,
    newSession,
    injectPrompt,
    sessions,
    currentSessionId,
    restoreSession,
    deleteSession,
    sessionTitle,
  } = useChatContext();
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [showHistory, setShowHistory] = useState(false);
  const [showTTP, setShowTTP] = useState(false);

  const handleSend = useCallback(() => {
    if (inputText.trim()) {
      sendUserMessage(inputText);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [inputText, sendUserMessage]);

  const handleQuickAction = useCallback((prompt: string) => {
    injectPrompt(prompt);
  }, [injectPrompt]);

  const handleRestoreSession = useCallback((s: ChatSession) => {
    restoreSession(s);
    setShowHistory(false);
  }, [restoreSession]);

  const renderMessage = useCallback(({ item }: { item: Message }) => (
    <MessageBubble message={item} />
  ), []);

  const keyExtractor = useCallback((item: Message) => item.id, []);

  const formatDate = (d: Date) => {
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  };

  const hasMessages = messages.length > 1;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.statusDot} />
          <Text style={styles.headerTitle}>AXIOM</Text>
          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>v2.5</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          {/* Profile button */}
          <Pressable
            style={({ pressed }) => [styles.avatarBtn, pressed && { opacity: 0.6 }]}
            onPress={() => router.push('/profile')}
            hitSlop={8}
          >
            <Text style={styles.avatarBtnText}>
              {(user?.username || user?.email || '?')[0].toUpperCase()}
            </Text>
          </Pressable>
          {/* TTP toggle */}
          <Pressable
            style={({ pressed }) => [
              styles.iconBtn,
              showTTP && { backgroundColor: Colors.accentMuted, borderColor: Colors.accent + '44' },
              pressed && { opacity: 0.6 },
            ]}
            onPress={() => setShowTTP(v => !v)}
            hitSlop={8}
          >
            <MaterialIcons name="account-tree" size={18} color={showTTP ? Colors.accent : Colors.textSecondary} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
            onPress={() => setShowHistory(true)}
            hitSlop={8}
          >
            <MaterialIcons name="history" size={18} color={Colors.textSecondary} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.newSessionBtn, pressed && { opacity: 0.6 }]}
            onPress={newSession}
            hitSlop={8}
          >
            <MaterialIcons name="add" size={18} color={Colors.textSecondary} />
            <Text style={styles.newSessionText}>New</Text>
          </Pressable>
        </View>
      </View>

      {/* Stealth Meter — always visible when there are messages */}
      {hasMessages ? (
        <StealthMeter messages={messages} />
      ) : null}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListHeaderComponent={
            messages.length <= 1 ? (
              <View style={styles.welcomeArea}>
                <Text style={styles.welcomeTitle}>AXIOM</Text>
                <Text style={styles.welcomeSub}>RED TEAM AI · AUTHORIZED RESEARCH</Text>
                <View style={styles.featurePills}>
                  {['MITRE ATT&CK', 'CODE EXEC', 'TTP TRACKER', 'OPSEC ADVISOR'].map(f => (
                    <View key={f} style={styles.featurePill}>
                      <Text style={styles.featurePillText}>{f}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null
          }
        />

        {/* TTP Tracker panel */}
        {showTTP ? (
          <TTPTracker
            messages={messages}
            visible={showTTP}
            onClose={() => setShowTTP(false)}
          />
        ) : null}

        {/* Quick Actions */}
        {messages.length <= 2 ? (
          <QuickActions onSelect={handleQuickAction} />
        ) : null}

        {/* Input Area */}
        <View style={[styles.inputArea, { paddingBottom: insets.bottom > 0 ? insets.bottom : Spacing.base }]}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Enter tactical query..."
              placeholderTextColor={Colors.textMuted}
              multiline
              maxLength={4000}
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
            />
            <Pressable
              style={({ pressed }) => [
                styles.sendBtn,
                (!inputText.trim() || isLoading) && styles.sendBtnDisabled,
                pressed && styles.sendBtnPressed,
              ]}
              onPress={handleSend}
              disabled={!inputText.trim() || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={Colors.bg} />
              ) : (
                <MaterialIcons name="send" size={18} color={Colors.bg} />
              )}
            </Pressable>
          </View>
          <Text style={styles.disclaimer}>Authorized security research only · All sessions logged</Text>
        </View>
      </KeyboardAvoidingView>

      {/* Session History Modal */}
      <Modal
        visible={showHistory}
        transparent
        animationType="slide"
        onRequestClose={() => setShowHistory(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>SESSION HISTORY</Text>
              <Pressable onPress={() => setShowHistory(false)} hitSlop={8}>
                <MaterialIcons name="close" size={22} color={Colors.textMuted} />
              </Pressable>
            </View>

            {sessions.length === 0 ? (
              <View style={styles.emptyHistory}>
                <MaterialIcons name="history" size={36} color={Colors.textMuted} />
                <Text style={styles.emptyHistoryText}>No saved sessions yet</Text>
                <Text style={styles.emptyHistorySub}>Sessions are auto-saved as you chat</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={styles.historyList}>
                {sessions.map(s => (
                  <View key={s.id} style={[styles.sessionRow, s.id === currentSessionId && styles.sessionRowActive]}>
                    <Pressable
                      style={({ pressed }) => [styles.sessionInfo, pressed && { opacity: 0.75 }]}
                      onPress={() => handleRestoreSession(s)}
                    >
                      <View style={styles.sessionTitleRow}>
                        {s.id === currentSessionId ? (
                          <View style={styles.activeIndicator} />
                        ) : null}
                        <Text style={[styles.sessionTitle, s.id === currentSessionId && { color: Colors.primary }]} numberOfLines={1}>
                          {s.title}
                        </Text>
                      </View>
                      <View style={styles.sessionMeta}>
                        <MaterialIcons name="chat-bubble-outline" size={11} color={Colors.textMuted} />
                        <Text style={styles.sessionMetaText}>
                          {s.messages.filter(m => m.role !== 'system').length} messages
                        </Text>
                        <Text style={styles.sessionDot}>·</Text>
                        <Text style={styles.sessionMetaText}>{formatDate(new Date(s.createdAt))}</Text>
                      </View>
                    </Pressable>
                    <Pressable
                      onPress={() => deleteSession(s.id)}
                      hitSlop={8}
                      style={styles.deleteBtn}
                    >
                      <MaterialIcons name="delete-outline" size={18} color={Colors.textMuted} />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            )}

            <Pressable
              style={({ pressed }) => [styles.newSessionModalBtn, pressed && { opacity: 0.8 }]}
              onPress={() => { newSession(); setShowHistory(false); }}
            >
              <MaterialIcons name="add" size={18} color={Colors.bg} />
              <Text style={styles.newSessionModalText}>NEW SESSION</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    backgroundColor: Colors.bg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
    letterSpacing: 3,
  },
  versionBadge: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  versionText: {
    color: Colors.textMuted,
    fontSize: Typography.xs,
    fontWeight: Typography.medium,
  },
  avatarBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#00ccff18',
    borderWidth: 1,
    borderColor: '#00ccff44',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarBtnText: {
    color: '#00ccff',
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
  },
  iconBtn: {
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  newSessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  newSessionText: {
    color: Colors.textSecondary,
    fontSize: Typography.sm,
    fontWeight: Typography.medium,
  },
  listContent: {
    paddingTop: Spacing.base,
    paddingBottom: Spacing.base,
  },
  welcomeArea: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.md,
  },
  welcomeTitle: {
    color: Colors.primary,
    fontSize: Typography.hero,
    fontWeight: Typography.heavy,
    letterSpacing: 6,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },
  welcomeSub: {
    color: Colors.textMuted,
    fontSize: Typography.xs,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  featurePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  featurePill: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  featurePillText: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '700' as any,
    letterSpacing: 1,
  },
  inputArea: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    backgroundColor: Colors.bg,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    color: Colors.textPrimary,
    fontSize: Typography.base,
    maxHeight: 120,
    lineHeight: 22,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  sendBtnDisabled: {
    backgroundColor: Colors.surfaceElevated,
    shadowOpacity: 0,
    elevation: 0,
  },
  sendBtnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  disclaimer: {
    color: Colors.textMuted,
    fontSize: Typography.xs,
    textAlign: 'center',
    marginTop: Spacing.xs,
    letterSpacing: 0.5,
  },
  // History Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.bgSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: Spacing.base,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.surfaceBorder,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.base,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.base,
  },
  modalTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    letterSpacing: 2,
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    gap: Spacing.md,
  },
  emptyHistoryText: {
    color: Colors.textSecondary,
    fontSize: Typography.base,
    fontWeight: Typography.medium,
  },
  emptyHistorySub: {
    color: Colors.textMuted,
    fontSize: Typography.sm,
  },
  historyList: {
    maxHeight: 380,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  sessionRowActive: {
    backgroundColor: Colors.primaryMuted,
    marginHorizontal: -Spacing.base,
    paddingHorizontal: Spacing.base,
    borderRadius: Radius.md,
    borderBottomWidth: 0,
    marginBottom: 1,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 4,
  },
  activeIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    flexShrink: 0,
  },
  sessionTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.base,
    fontWeight: Typography.medium,
    flex: 1,
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  sessionMetaText: {
    color: Colors.textMuted,
    fontSize: Typography.xs,
  },
  sessionDot: {
    color: Colors.textMuted,
    fontSize: Typography.xs,
  },
  deleteBtn: {
    padding: Spacing.sm,
  },
  newSessionModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: Radius.xl,
    marginTop: Spacing.base,
  },
  newSessionModalText: {
    color: Colors.bg,
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    letterSpacing: 1.5,
  },
});
