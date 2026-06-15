export function parseOMR(answer: string | null | undefined, key: string | null | undefined, type: string) {
  if (!answer || !key) return null;
  
  let subjects: { name: string; start: number; end: number }[] = [];

  if (type === 'TYT') {
    subjects = [
      { name: "Türkçe", start: 0, end: 40 },
      { name: "Sosyal Bilimler", start: 40, end: 60 },
      { name: "Matematik", start: 60, end: 100 },
      { name: "Fen Bilimleri", start: 100, end: 120 },
    ];
  } else if (type === 'AYT_SAY') {
    subjects = [
      { name: "Matematik", start: 0, end: 40 },
      { name: "Fizik", start: 40, end: 54 },
      { name: "Kimya", start: 54, end: 67 },
      { name: "Biyoloji", start: 67, end: 80 },
    ];
  } else if (type === 'AYT_EA') {
    subjects = [
      { name: "Edebiyat & Sosyal-1", start: 0, end: 40 },
      { name: "Matematik", start: 40, end: 80 },
    ];
  } else if (type === 'AYT_SOZ') {
    subjects = [
      { name: "Edebiyat & Sosyal-1", start: 0, end: 40 },
      { name: "Sosyal Bilimler-2", start: 40, end: 80 },
    ];
  } else {
    return null;
  }

  return subjects.map(sub => {
    let correct = 0;
    let incorrect = 0;
    let blank = 0;
    
    for (let i = sub.start; i < sub.end; i++) {
      if (i >= key.length) break;
      const k = (key[i] || ' ').toUpperCase();
      const a = (answer[i] || ' ').toUpperCase();
      
      // İptal edilmiş/boş cevap anahtarı sorusu ise analize katma
      if (k === '_' || k === ' ' || k === '*') {
        continue;
      }
      
      if (a === ' ' || a === '_') {
        blank++;
      } else if (a === k) {
        correct++;
      } else {
        incorrect++;
      }
    }
    
    const net = correct - (incorrect * 0.25);
    return { name: sub.name, correct, incorrect, blank, net };
  });
}
