import { StyleSheet, Text, View, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { API_URL } from '../../constants/api';

function stripHtml(text: string): string {
  if (!text) return '';
  return text.replace(/<[^>]*>?/gm, '');
}

export default function ParentDashboard() {
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
      if (json.role === 'PARENT' || json.role === 'COACH') {
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
          <Text style={styles.title}>Veli Paneli</Text>
          <Text style={styles.subtitle}>Öğrenci Durum Özeti</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <FontAwesome name="bell-o" size={18} color="#B19CD9" /> Son Bildirimler
          </Text>
          <View style={styles.card}>
            {data?.notifications && data.notifications.length > 0 ? (
              data.notifications.map((notif: any) => (
                <View key={notif.id} style={styles.notificationItem}>
                  <View style={[styles.dot, { backgroundColor: notif.status === 'FAILED' ? '#EF4444' : '#10B981' }]} />
                  <View style={styles.notificationContent}>
                    <Text style={styles.notificationTitle}>{notif.payload?.title || notif.type}</Text>
                    <Text style={styles.notificationDesc}>{stripHtml(notif.payload?.message || notif.payload?.html || '')}</Text>
                    <Text style={styles.notificationTime}>{new Date(notif.createdAt).toLocaleDateString()}</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={{ color: '#9CA3AF' }}>Herhangi bir bildirim yok.</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <FontAwesome name="line-chart" size={18} color="#B19CD9" /> Son Sınav Sonuçları
          </Text>
          <View style={styles.card}>
            {data?.recentExams && data.recentExams.length > 0 ? (
              data.recentExams.map((exam: any) => (
                <View key={exam.id} style={styles.examItem}>
                  <Text style={styles.examName}>{exam.examName}</Text>
                  <View style={styles.scoreBadge}>
                    <Text style={styles.scoreText}>{exam.netScore} Net</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={{ color: '#9CA3AF' }}>Henüz sınav sonucu bulunmuyor.</Text>
            )}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1120',
  },
  header: {
    marginVertical: 20,
    paddingHorizontal: 20,
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
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#B19CD9',
    fontWeight: '600',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    color: '#F3F4F6',
    fontWeight: 'bold',
    fontSize: 16,
  },
  notificationDesc: {
    color: '#9CA3AF',
    marginTop: 4,
  },
  notificationTime: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 8,
  },
  examItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  examName: {
    color: '#F3F4F6',
    flex: 1,
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
