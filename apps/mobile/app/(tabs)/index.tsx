import { StyleSheet, Text, View, SafeAreaView, ActivityIndicator, ScrollView } from 'react-native';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { API_URL } from '../../constants/api';

export default function StudentDashboard() {
  const { expoPushToken } = usePushNotifications();
  const { getToken } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/mobile/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const json = await res.json();
      if (json.role === 'STUDENT') {
        setData(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#B19CD9" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>Öğrenci Paneli</Text>
          <Text style={styles.subtitle}>Bugünkü Dersler</Text>
        </View>

        <View style={styles.card}>
          {data?.schedules && data.schedules.length > 0 ? (
            data.schedules.map((schedule: any) => (
              <View key={schedule.id} style={styles.lessonItem}>
                <Text style={styles.lessonTime}>{schedule.startTime} - {schedule.endTime}</Text>
                <Text style={styles.lessonName}>{schedule.subjectName || 'Ders'}</Text>
              </View>
            ))
          ) : (
            <Text style={{ color: '#9CA3AF' }}>Bugün ders programınız bulunmamaktadır.</Text>
          )}
        </View>

        <View style={styles.header}>
          <Text style={styles.subtitle}>Son Sınav Sonuçları</Text>
        </View>
        <View style={styles.card}>
          {data?.recentExams && data.recentExams.length > 0 ? (
            data.recentExams.map((exam: any) => (
              <View key={exam.id} style={styles.lessonItem}>
                <Text style={styles.lessonName}>{exam.examName}</Text>
                <View style={styles.scoreBadge}>
                  <Text style={styles.scoreText}>{exam.netScore} Net</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={{ color: '#9CA3AF' }}>Henüz sınav sonucunuz bulunmuyor.</Text>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1120',
    padding: 20,
  },
  header: {
    marginVertical: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F3F4F6',
  },
  subtitle: {
    fontSize: 18,
    color: '#9CA3AF',
    marginTop: 5,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1F2937',
    marginBottom: 20,
  },
  lessonItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
    alignItems: 'center',
  },
  lessonTime: {
    color: '#B19CD9',
    fontWeight: '600',
  },
  lessonName: {
    color: '#F3F4F6',
  },
  scoreBadge: {
    backgroundColor: '#3730A3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  scoreText: {
    color: '#C7D2FE',
    fontWeight: 'bold',
    fontSize: 12,
  },
});
