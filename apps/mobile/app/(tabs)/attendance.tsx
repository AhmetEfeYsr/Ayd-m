import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { API_URL } from '../../constants/api';

export default function AttendanceScreen() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTeacherData();
  }, []);

  const fetchTeacherData = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/mobile/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const json = await res.json();
      if (json.role === 'TEACHER') {
        setSchedules(json.data.schedules);
        if (json.data.schedules.length > 0) {
          fetchClassStudents(json.data.schedules[0].classId);
        } else {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const fetchClassStudents = async (classId: string) => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/mobile/attendance?classId=${classId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const json = await res.json();
      setSelectedClassId(classId);
      setStudents(json.students || []);
      setAttendanceData({}); // reset
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markStudent = (studentId: string, status: 'PRESENT' | 'ABSENT') => {
    setAttendanceData(prev => ({ ...prev, [studentId]: status }));
  };

  const submitAttendance = async () => {
    if (!selectedClassId) return;
    
    // Check if all students marked
    if (Object.keys(attendanceData).length !== students.length) {
      Alert.alert('Eksik Yoklama', 'Lütfen tüm öğrencilerin yoklamasını girin.');
      return;
    }

    setSubmitting(true);
    try {
      const records = students.map(s => ({
        studentId: s.id,
        status: attendanceData[s.id]
      }));

      const token = await getToken();
      const res = await fetch(`${API_URL}/api/mobile/attendance`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ classId: selectedClassId, records, type: 'LESSON' })
      });

      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      
      Alert.alert('Başarılı', 'Yoklama kaydedildi.');
    } catch (err) {
      console.error(err);
      Alert.alert('Hata', 'Bağlantı hatası.');
    } finally {
      setSubmitting(false);
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
      <View style={styles.header}>
        <Text style={styles.title}>Yoklama Al</Text>
        {schedules.length > 0 ? (
          <Text style={styles.subtitle}>
            {schedules.find(s => s.classId === selectedClassId)?.className || 'Sınıf Seçiniz'}
          </Text>
        ) : (
          <Text style={styles.subtitle}>Bugün dersiniz bulunmuyor.</Text>
        )}
      </View>

      {schedules.length > 0 && (
        <View style={{ marginBottom: 16, height: 40 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {schedules.map((schedule) => {
              const isSelected = schedule.classId === selectedClassId;
              return (
                <TouchableOpacity
                  key={schedule.classId}
                  style={[styles.classTab, isSelected && styles.selectedClassTab]}
                  onPress={() => fetchClassStudents(schedule.classId)}
                >
                  <Text style={[styles.classTabLabel, isSelected && styles.selectedClassTabLabel]}>
                    {schedule.className}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {students.length > 0 ? (
        <>
          <ScrollView style={styles.card}>
            <Text style={styles.instruction}>Öğrenciyi seçip durumu işaretleyin</Text>
            
            {students.map(student => (
              <View key={student.id} style={styles.swipeContainer}>
                <TouchableOpacity 
                  style={[styles.actionBtnAbsent, attendanceData[student.id] === 'ABSENT' && styles.selectedAbsent]}
                  onPress={() => markStudent(student.id, 'ABSENT')}
                >
                  <FontAwesome name="times" size={24} color="#FFF" />
                </TouchableOpacity>
                
                <View style={styles.studentCard}>
                  <Text style={styles.studentName}>{student.firstName} {student.lastName}</Text>
                  <Text style={styles.studentNumber}>{student.studentNumber}</Text>
                </View>
                
                <TouchableOpacity 
                  style={[styles.actionBtnPresent, attendanceData[student.id] === 'PRESENT' && styles.selectedPresent]}
                  onPress={() => markStudent(student.id, 'PRESENT')}
                >
                  <FontAwesome name="check" size={24} color="#FFF" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
          
          <TouchableOpacity 
            style={[styles.submitBtn, submitting && { opacity: 0.7 }]} 
            onPress={submitAttendance}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#0B1120" />
            ) : (
              <Text style={styles.submitBtnText}>Yoklamayı Kaydet</Text>
            )}
          </TouchableOpacity>
        </>
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#9CA3AF' }}>Bu sınıfta öğrenci bulunamadı.</Text>
        </View>
      )}
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
    flex: 1,
  },
  instruction: {
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 20,
  },
  swipeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  studentCard: {
    flex: 1,
    backgroundColor: '#1F2937',
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  studentName: {
    color: '#F3F4F6',
    fontSize: 16,
    fontWeight: '600',
  },
  studentNumber: {
    color: '#9CA3AF',
  },
  actionBtnAbsent: {
    width: 50,
    height: 50,
    backgroundColor: '#374151',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedAbsent: {
    backgroundColor: '#EF4444',
  },
  actionBtnPresent: {
    width: 50,
    height: 50,
    backgroundColor: '#374151',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedPresent: {
    backgroundColor: '#10B981',
  },
  submitBtn: {
    backgroundColor: '#B19CD9',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  submitBtnText: {
    color: '#0B1120',
    fontWeight: 'bold',
    fontSize: 16,
  },
  classTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1F2937',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    height: 36,
  },
  selectedClassTab: {
    backgroundColor: '#B19CD9',
    borderColor: '#B19CD9',
  },
  classTabLabel: {
    color: '#9CA3AF',
    fontWeight: '600',
    fontSize: 14,
  },
  selectedClassTabLabel: {
    color: '#0B1120',
  },
});
