import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { API_URL } from '../constants/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface RAGAssistantProps {
  questionId: string;
  subjectName?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

export function RAGAssistant({ questionId, subjectName, onFocus, onBlur }: RAGAssistantProps) {
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Client-side cost display hint (actual cost enforced server-side: AYT Matematik/Fizik is 10, others 1)
  const isHighCost = subjectName && 
    (subjectName.toLowerCase().includes('matematik') || subjectName.toLowerCase().includes('fizik')) &&
    subjectName.toUpperCase().includes('AYT');
  const creditCost = isHighCost ? 10 : 1;

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/ai/rag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          questionId,
          prompt: userMessage.content,
        }),
      });

      if (response.status === 402) {
        setMessages((prev) => [...prev, { role: 'assistant', content: 'Yetersiz kredi. Devam etmek için kredi yüklemeniz gerekiyor.' }]);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch AI response');
      }

      const data = await response.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.answer }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Bir hata oluştu. Lütfen tekrar deneyin.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AI Çözüm Asistanı</Text>
        <Text style={styles.costBadge}>{creditCost} Kredi / Soru</Text>
      </View>

      <ScrollView 
        style={styles.chatArea}
        nestedScrollEnabled={true}
        onTouchStart={onFocus}
        onTouchEnd={onBlur}
      >
        {messages.length === 0 && (
          <Text style={styles.emptyHint}>Soruyla ilgili yapay zekaya bir şey sorun…</Text>
        )}
        {messages.map((m, idx) => (
          <View key={idx} style={[styles.messageBubble, m.role === 'user' ? styles.userBubble : styles.aiBubble]}>
            <Text style={styles.messageText}>{m.content}</Text>
          </View>
        ))}
        {isLoading && <ActivityIndicator color="#B19CD9" style={{ margin: 8 }} />}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Yapay zekaya sor (Örn: Bu formül nereden geldi?)"
          placeholderTextColor="#9CA3AF"
          returnKeyType="send"
          onSubmitEditing={sendMessage}
          onFocus={onFocus}
          onBlur={onBlur}
        />
        <TouchableOpacity style={[styles.sendButton, isLoading && { opacity: 0.5 }]} onPress={sendMessage} disabled={isLoading}>
          <Text style={styles.sendButtonText}>Gönder</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    overflow: 'hidden',
    marginTop: 16,
    maxHeight: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#1F2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  title: {
    color: '#F3F4F6',
    fontWeight: 'bold',
    fontSize: 16,
  },
  costBadge: {
    backgroundColor: '#8B5CF6',
    color: '#FFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
    overflow: 'hidden',
  },
  chatArea: {
    flex: 1,
    padding: 12,
  },
  emptyHint: {
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    maxWidth: '85%',
  },
  userBubble: {
    backgroundColor: '#374151',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 0,
  },
  aiBubble: {
    backgroundColor: '#8B5CF6',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 0,
  },
  messageText: {
    color: '#F3F4F6',
  },
  inputRow: {
    flexDirection: 'row',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    backgroundColor: '#1F2937',
  },
  input: {
    flex: 1,
    backgroundColor: '#111827',
    color: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  sendButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});
