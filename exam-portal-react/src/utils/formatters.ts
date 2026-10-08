export const JSON_BASE = "https://textile-du-tech-exam.vercel.app/public/questions/";

export function engToBanglaNumber(num: number | string): string {
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return num.toString().split('').map(d => banglaDigits[Number(d)] !== undefined ? banglaDigits[Number(d)] : d).join('');
}

export function normalizeMCQAns(ans: any): string | null {
  if (!ans) return null;
  const c = String(ans)
    .toUpperCase()
    .replace(/[\-\.\)\(\[\]]/g, '')
    .replace(/OPTION/g, '')
    .replace(/অপশন/g, '')
    .replace(/উত্তর/g, '')
    .trim();

  if (!c) return null;
  const firstChar = c.charAt(0);
  const map: Record<string, string> = {
    '1': 'A', '2': 'B', '3': 'C', '4': 'D',
    '১': 'A', '২': 'B', '৩': 'C', '৪': 'D',
    'ক': 'A', 'খ': 'B', 'গ': 'C', 'ঘ': 'D'
  };

  return map[firstChar] || firstChar;
}

export function parseDate(data: any): Date | null {
  const raw = data?.timestamp || data?.date || data?.time || data?.created_at;
  if (!raw) return null;
  if (typeof raw.toDate === 'function') return raw.toDate();
  if (raw.seconds) return new Date(raw.seconds * 1000);
  const date = new Date(raw);
  return isNaN(date.getTime()) ? null : date;
}

export function cleanData(obj: any): any {
  if (obj === undefined || obj === null) return null;
  if (obj instanceof Date) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(cleanData);
  const newObj: Record<string, any> = {};
  for (const key in obj) {
    const val = obj[key];
    newObj[key] = val === undefined ? null : cleanData(val);
  }
  return newObj;
}
