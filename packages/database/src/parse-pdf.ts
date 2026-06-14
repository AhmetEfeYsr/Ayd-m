import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';

const PDF_PATH = path.join(__dirname, '../../../26164023_2026_yks.pdf');
const DATA_DIR = path.join(__dirname, '../data');
const OUT_PATH = path.join(DATA_DIR, 'meb_curriculum.json');

async function main() {
  console.log('PDF dosyası okunuyor...');
  
  if (!fs.existsSync(PDF_PATH)) {
    console.error('curriculum.pdf bulunamadı!');
    return;
  }
  
  const dataBuffer = fs.readFileSync(PDF_PATH);
  const result = await pdf(dataBuffer);
  const text = result.text;
  
  console.log(`Metin başarıyla okundu. Toplam karakter: ${text.length}`);
  console.log('Metin ayrıştırılıyor (Regex Tabanlı)...');

  const lines = text.split('\n');
  const curriculumData = {
    curriculum: "YKS 2026",
    subjects: [] as any[]
  };

  let currentSubject: any = null;
  let isTableOfContents = true;
  
  // Relaxed regex to match multi-letter prefixes (e.g., TD.11.1.1.1.) and arbitrary path depths
  const kazanımRegex = /^([A-ZÇĞİÖŞÜ]+\.\d+(?:\.\d+)*\.?|\d+\.\d+(?:\.\d+)*\.?)\s+(.*)/;
  
  // Ders başlıklarını yakalamak için
  const subjectKeywords = [
    'TÜRK DİLİ VE EDEBİYATI', 'MATEMATİK', 'FİZİK', 'KİMYA', 'BİYOLOJİ', 
    'TARİH', 'T.C. İNKILAP TARİHİ VE ATATÜRKÇÜLÜK', 'COĞRAFYA', 'FELSEFE', 
    'MANTIK', 'SOSYOLOJİ', 'PSİKOLOJİ', 'DİN KÜLTÜRÜ VE AHLAK BİLGİSİ'
  ];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) continue;

    // İçindekiler tablosunu atlamak için 
    if (isTableOfContents && line.includes('3.2. KONU, KAZANIM VE AÇIKLAMALARI')) {
      isTableOfContents = false;
      // Initialize with TÜRK DİLİ VE EDEBİYATI since it starts right here
      currentSubject = { name: 'TÜRK DİLİ VE EDEBİYATI', topics: [] as any[] };
      curriculumData.subjects.push(currentSubject);
      continue;
    }
    if (isTableOfContents) continue;

    // Biyoloji ve Türkçe gibi ders başlıklarında gereksiz sayı/boşluk varsa temizle
    const cleanLine = line.replace(/[\d\.]+/g, '').trim().toLocaleUpperCase('tr-TR');

    // Ders başlığı kontrolü (relaxed check to allow headers containing extra text like "MATEMATİK DERSİ ÖĞRETİM PROGRAMI")
    const matchedSubject = subjectKeywords.find(kw => cleanLine.includes(kw));
    
    if (matchedSubject) {
      const isHeader = line === line.toLocaleUpperCase('tr-TR') || 
                       line.includes('ÖĞRETİM PROGRAMI') || 
                       line.includes('KAZANIM VE AÇIKLAMALARI') ||
                       line.includes('DERSİ');
      const isShortEnough = cleanLine.length <= matchedSubject.length + 30;
      if (isHeader && isShortEnough) {
        if (!currentSubject || currentSubject.name !== matchedSubject) {
          currentSubject = { name: matchedSubject, topics: [] as any[] };
          curriculumData.subjects.push(currentSubject);
          console.log(`Ders algılandı: ${matchedSubject}`);
        }
        continue;
      }
    }

    // Kazanım satırı kontrolü
    const match = line.match(kazanımRegex);
    if (match && currentSubject) {
      // PDF'ten kaynaklı rastgele harf/sayı eşleşmelerini elemek için kontrol
      if (match[2].length < 5) continue; 
      
      const indexCode = match[1].replace(/\s+/g, ''); // A.1. 1. -> A.1.1.
      let topicName = match[2].trim();
      
      // Aynı konu kodu varsa tekrar ekleme
      if (!currentSubject.topics.find((t: any) => t.index_code === indexCode)) {
        currentSubject.topics.push({
          name: topicName,
          index_code: indexCode,
          is_core: true // Varsayılan
        });
      }
    }
  }

  // Boş olan dersleri temizle
  curriculumData.subjects = curriculumData.subjects.filter(s => s.topics.length > 0);

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(curriculumData, null, 2), 'utf-8');
  console.log(`Başarılı! Toplam ${curriculumData.subjects.length} ders ayrıştırıldı ve kaydedildi: ${OUT_PATH}`);
}

main();
