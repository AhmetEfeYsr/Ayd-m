import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';

const PDF_PATH = path.join(__dirname, '../../../26164023_2026_yks.pdf');

async function main() {
  const dataBuffer = fs.readFileSync(PDF_PATH);
  const result = await pdf(dataBuffer);
  const text = result.text;
  const lines = text.split('\n');

  console.log('Regex searching...');
  const bioRegex = /biyoloji/i;
  const dinRegex = /din.*k/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (bioRegex.test(line)) {
      console.log(`Line ${i} (Bio): "${line}"`);
    }
    if (dinRegex.test(line)) {
      console.log(`Line ${i} (Din): "${line}"`);
    }
  }
}

main().catch(console.error);
