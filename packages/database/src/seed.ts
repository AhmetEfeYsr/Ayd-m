import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { curriculums, subjects, topics } from './schema';
import { config } from 'dotenv';

// Load .env
config({ path: path.join(__dirname, '../../../.env') });

const DATA_PATH = path.join(__dirname, '../data/meb_curriculum.json');

function generateMockEmbedding(): number[] {
  const arr = Array.from({ length: 768 }, () => Math.random() - 0.5);
  const len = Math.sqrt(arr.reduce((sum, val) => sum + val * val, 0));
  return arr.map(v => v / (len || 1));
}

async function main() {
  if (!fs.existsSync(DATA_PATH)) {
    console.error(`Veri dosyası bulunamadı: ${DATA_PATH}`);
    console.error('Önce "pnpm run parse-pdf" komutunu çalıştırarak PDF\'ten veriyi çekin.');
    process.exit(1);
  }

  const rawData = fs.readFileSync(DATA_PATH, 'utf-8');
  const curriculumData = JSON.parse(rawData);

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL .env dosyasında bulunamadı!');
  }

  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql);

  console.log('Veritabanına bağlanıldı. Seeding işlemi başlıyor...');

  try {
    // 1. Curriculum Ekle (idempotent — varsa tekrar eklemez)
    console.log(`Müfredat ekleniyor: ${curriculumData.curriculum}`);
    const [insertedCurriculum] = await db.insert(curriculums).values({
      name: curriculumData.curriculum
    }).onConflictDoNothing().returning({ id: curriculums.id });

    // Eğer zaten varsa mevcut ID'yi al
    let curriculumId = insertedCurriculum?.id;
    if (!curriculumId) {
      const { eq } = await import('drizzle-orm');
      const existing = await db.select({ id: curriculums.id })
        .from(curriculums)
        .where(eq(curriculums.name, curriculumData.curriculum))
        .limit(1);
      curriculumId = existing[0]?.id;
      if (!curriculumId) {
        throw new Error('Müfredat oluşturulamadı ve mevcut kayıt bulunamadı.');
      }
      console.log(`  -> Müfredat zaten mevcut, mevcut ID kullanılıyor: ${curriculumId}`);
    }

    // 2. Dersleri ve Konuları Ekle
    for (const subject of curriculumData.subjects) {
      console.log(`Ders ekleniyor: ${subject.name}`);

      // Ders ekle (idempotent)
      const [insertedSubject] = await db.insert(subjects).values({
        curriculumId,
        name: subject.name
      }).onConflictDoNothing().returning({ id: subjects.id });

      let subjectId = insertedSubject?.id;
      if (!subjectId) {
        const { eq, and } = await import('drizzle-orm');
        const existing = await db.select({ id: subjects.id })
          .from(subjects)
          .where(and(
            eq(subjects.curriculumId, curriculumId),
            eq(subjects.name, subject.name)
          ))
          .limit(1);
        subjectId = existing[0]?.id;
        if (!subjectId) {
          console.warn(`  ⚠ Ders atlandı: ${subject.name}`);
          continue;
        }
        console.log(`  -> Ders zaten mevcut, mevcut ID kullanılıyor: ${subjectId}`);
      }

      const topicsToInsert = subject.topics.map((t: any) => ({
        subjectId,
        name: t.name,
        indexCode: t.index_code || null,
        isCore: t.is_core || false,
        embedding: generateMockEmbedding(),
      }));

      if (topicsToInsert.length > 0) {
        // Konuları ekle (idempotent — çakışanlarda atla)
        await db.insert(topics).values(topicsToInsert).onConflictDoNothing();
        console.log(`  -> ${topicsToInsert.length} konu işlendi.`);
      }
    }

    console.log('✅ Seeding işlemi başarıyla tamamlandı!');
  } catch (error) {
    console.error('❌ Seed hatası:', error);
    process.exit(1);
  }
}

main();
