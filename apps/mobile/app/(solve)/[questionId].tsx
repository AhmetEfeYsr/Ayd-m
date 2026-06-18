import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, Alert, Image, Dimensions, TouchableOpacity, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { DrawingCanvas, DrawingCanvasRef } from '../../components/DrawingCanvas';
import { EnhancedTestModeToggle } from '../../components/EnhancedTestModeToggle';
import { RAGAssistant } from '../../components/RAGAssistant';
import { API_URL } from '../../constants/api';
import { analyzeOptions } from '../../utils/strokeAnalyzer';

const { height } = Dimensions.get('window');

export default function QuestionSolveScreen() {
  const { questionId } = useLocalSearchParams();
  const { getToken } = useAuth();
  const [isEnhanced, setIsEnhanced] = useState(false);
  const [questionData, setQuestionData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parentScrollEnabled, setParentScrollEnabled] = useState(true);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [containerDimensions, setContainerDimensions] = useState<{ width: number; height: number } | null>(null);

  const canvasRef = useRef<DrawingCanvasRef>(null);

  useEffect(() => {
    if (imageUrl) {
      Image.getSize(imageUrl, (width, height) => {
        setImageDimensions({ width, height });
      }, (err) => {
        console.error('Failed to get image size:', err);
      });
    }
  }, [imageUrl]);

  const loadQuestion = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/questions?id=${questionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error(`Soru yüklenemedi: HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setQuestionData(data.question);
      setImageUrl(data.question.imageUrl ?? data.question.r2StorageKey);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Soru yüklenirken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  }, [questionId, getToken]);

  useEffect(() => {
    loadQuestion();
  }, [loadQuestion]);

  const submitAnswer = useCallback(async (selectedOption: string) => {
    if (!selectedOption) {
      Alert.alert('Hata', 'Lütfen bir şık seçin veya işaretleyin.');
      return;
    }
    setIsSubmitting(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          questionId,
          selectedOption,
        }),
      });

      if (!res.ok) {
        if (res.status === 402) {
          throw new Error('Yetersiz kredi. Lütfen bakiye yükleyin.');
        }
        throw new Error(`Cevap gönderilemedi: HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.success) {
        if (data.correct) {
          Alert.alert('Doğru Cevap!', data.message || 'Tebrikler, doğru cevap!');
        } else {
          Alert.alert('Yanlış Cevap', data.message || `Yanlış cevap. Doğru şık: ${data.answerKey}`);
        }
      } else {
        Alert.alert('Hata', data.error || 'Cevap gönderilirken bir hata oluştu.');
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert('Hata', err.message || 'Sunucuyla iletişim kurulurken bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  }, [questionId, getToken]);

  const handleSubmit = useCallback(() => {
    if (isEnhanced) {
      const strokes = canvasRef.current?.getStrokes();
      if (!strokes || strokes.length === 0) {
        Alert.alert('Hata', 'Çizim algılanamadı, lütfen şıkkın üzerini belirgin şekilde işaretleyin.');
        return;
      }

      const extra = imageDimensions && containerDimensions ? {
        imageWidth: imageDimensions.width,
        imageHeight: imageDimensions.height,
        canvasWidth: containerDimensions.width,
        canvasHeight: containerDimensions.height
      } : undefined;

      const { selected } = analyzeOptions(strokes, questionData?.optionBounds || [], extra);

      if (!selected) {
        Alert.alert('Hata', 'Çizimden seçilen şık algılanamadı, lütfen şıkkın üzerini belirgin şekilde işaretleyin.');
        return;
      }

      submitAnswer(selected);
    } else {
      Alert.alert('Klasik Mod', 'Lütfen aşağıdaki butonlardan birini seçin.');
    }
  }, [isEnhanced, questionData, submitAnswer, imageDimensions, containerDimensions]);

  const clearCanvas = () => {
    canvasRef.current?.clear();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#B19CD9" />
        <Text style={{ color: '#FFF', marginTop: 12 }}>Soru yükleniyor...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadQuestion}>
          <Text style={styles.retryButtonText}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!questionData) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: '#FFF' }}>Soru bulunamadı.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: `Soru #${questionId}`, headerBackTitle: 'Geri' }} />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        scrollEnabled={parentScrollEnabled}
      >

        <EnhancedTestModeToggle isEnhanced={isEnhanced} onToggle={setIsEnhanced} />

        <View 
          style={styles.questionContainer}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            setContainerDimensions({ width, height });
          }}
        >
          {imageUrl && (
            <Image
              source={{ uri: imageUrl }}
              style={styles.questionImage}
              resizeMode="contain"
            />
          )}

          {isEnhanced && (
            <DrawingCanvas ref={canvasRef} disabled={!isEnhanced} />
          )}
        </View>

        {isEnhanced && (
          <View style={styles.toolbar}>
            <TouchableOpacity style={styles.clearButton} onPress={clearCanvas} disabled={isSubmitting}>
              <Text style={styles.buttonText}>Temizle</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.submitButton, isSubmitting && { opacity: 0.5 }]} onPress={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.buttonText}>Cevapla (Yapay Zeka Analizi)</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {!isEnhanced && (
          <View style={styles.classicOptionsContainer}>
            {['A', 'B', 'C', 'D', 'E'].map(opt => (
              <TouchableOpacity
                key={opt}
                style={[styles.optionButton, isSubmitting && { opacity: 0.5 }]}
                disabled={isSubmitting}
                onPress={() => submitAnswer(opt)}
              >
                <Text style={styles.optionText}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <RAGAssistant 
          questionId={questionId as string} 
          subjectName={questionData.subjectName} 
          onFocus={() => setParentScrollEnabled(false)}
          onBlur={() => setParentScrollEnabled(true)}
        />

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1120',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0B1120',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  questionContainer: {
    width: '100%',
    height: height * 0.5,
    backgroundColor: '#FFF',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    marginVertical: 16,
  },
  questionImage: {
    width: '100%',
    height: '100%',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  clearButton: {
    backgroundColor: '#4B5563',
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  submitButton: {
    backgroundColor: '#8B5CF6',
    padding: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  classicOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 16,
  },
  optionButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0B1120',
    padding: 24,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});
