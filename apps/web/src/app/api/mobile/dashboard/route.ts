import { NextResponse } from 'next/server';
import { db } from '@yks-platform/database';
import { users, schedules, subjects, omrResults, exams, attendance, classes, classrooms, notificationLogs } from '@yks-platform/database';
import { eq, desc, and } from 'drizzle-orm';
import { getAuthClerkId } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const userId = await getAuthClerkId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Kullanıcıyı bul
    const [user] = await db.select().from(users).where(eq(users.firebaseUid, userId));
    
    if (!user) {
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }

    const currentDayOfWeek = new Date().getDay() || 7; // 1-7 (Pazartesi-Pazar)

    if (user.role === 'STUDENT') {
      // Öğrenci için: Bugünkü dersler, son sınav sonuçları
      const todaysSchedules = user.classId ? await db
        .select({
          id: schedules.id,
          startTime: schedules.startTime,
          endTime: schedules.endTime,
          subjectName: subjects.name,
        })
        .from(schedules)
        .leftJoin(subjects, eq(schedules.subjectId, subjects.id))
        .where(and(eq(schedules.classId, user.classId), eq(schedules.dayOfWeek, currentDayOfWeek)))
        .orderBy(schedules.startTime) : [];

      const recentExams = await db
        .select({
          id: omrResults.id,
          examName: exams.name,
          netScore: omrResults.netScore,
          date: exams.date,
        })
        .from(omrResults)
        .innerJoin(exams, eq(omrResults.examId, exams.id))
        .where(eq(omrResults.studentId, user.id))
        .orderBy(desc(omrResults.processedAt))
        .limit(5);

      const recentNotifications = await db
        .select()
        .from(notificationLogs)
        .where(eq(notificationLogs.userId, user.id))
        .orderBy(desc(notificationLogs.createdAt))
        .limit(5);

      return NextResponse.json({
        role: 'STUDENT',
        data: {
          schedules: todaysSchedules,
          recentExams,
          notifications: recentNotifications,
        }
      });
    } else if (user.role === 'TEACHER') {
      // Öğretmen için: Bugünkü girdiği dersler ve sınıflar
      const todaysSchedules = await db
        .select({
          id: schedules.id,
          startTime: schedules.startTime,
          endTime: schedules.endTime,
          subjectName: subjects.name,
          className: classes.name,
          classroomName: classrooms.name,
          classId: classes.id,
        })
        .from(schedules)
        .leftJoin(subjects, eq(schedules.subjectId, subjects.id))
        .leftJoin(classes, eq(schedules.classId, classes.id))
        .leftJoin(classrooms, eq(schedules.classroomId, classrooms.id))
        .where(and(eq(schedules.teacherId, user.id), eq(schedules.dayOfWeek, currentDayOfWeek)))
        .orderBy(schedules.startTime);

      return NextResponse.json({
        role: 'TEACHER',
        data: {
          schedules: todaysSchedules,
        }
      });
    } else if (user.role === 'COACH') {
      // Find students whose parent_phone matches this user's phone
      const studentsOfParent = user.phone ? await db
        .select()
        .from(users)
        .where(and(eq(users.parentPhone, user.phone), eq(users.role, 'STUDENT'))) : [];

      if (studentsOfParent.length > 0) {
        const student = studentsOfParent[0];
        
        const todaysSchedules = student.classId ? await db
          .select({
            id: schedules.id,
            startTime: schedules.startTime,
            endTime: schedules.endTime,
            subjectName: subjects.name,
          })
          .from(schedules)
          .leftJoin(subjects, eq(schedules.subjectId, subjects.id))
          .where(and(eq(schedules.classId, student.classId), eq(schedules.dayOfWeek, currentDayOfWeek)))
          .orderBy(schedules.startTime) : [];

        const recentExams = await db
          .select({
            id: omrResults.id,
            examName: exams.name,
            netScore: omrResults.netScore,
            date: exams.date,
          })
          .from(omrResults)
          .innerJoin(exams, eq(omrResults.examId, exams.id))
          .where(eq(omrResults.studentId, student.id))
          .orderBy(desc(omrResults.processedAt))
          .limit(5);

        const recentNotifications = await db
          .select()
          .from(notificationLogs)
          .where(eq(notificationLogs.userId, student.id))
          .orderBy(desc(notificationLogs.createdAt))
          .limit(5);

        return NextResponse.json({
          role: 'COACH',
          data: {
            studentName: student.firstName ? `${student.firstName} ${student.lastName || ''}`.trim() : student.email,
            schedules: todaysSchedules,
            recentExams,
            notifications: recentNotifications,
          }
        });
      }
      return NextResponse.json({ role: 'COACH', data: { notifications: [], recentExams: [], schedules: [] } });
    }

    return NextResponse.json({ role: user.role, data: {} });

  } catch (error) {
    console.error('Mobile Dashboard API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
