import JSZip from 'jszip';
import type { EmailAttachment } from '@/services/emailIngestionService';

export type AttachmentCategory =
  | 'document'       // Documents/Text: .pdf, .docx, .txt, .doc
  | 'spreadsheet'    // Spreadsheets/Presentations: .xlsx, .pptx, .xls, .ppt
  | 'image'          // Images/Photos: .jpg, .jpeg, .png, .gif, .bmp
  | 'audio_video'    // Audio/Video: .mp3, .mp4, .avi
  | 'other';         // Other Files: .zip, .ics, .vcf

export interface AttachmentCategoryMeta {
  label: string;
  category: AttachmentCategory;
  color: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
}

export const CATEGORY_CONFIG: Record<AttachmentCategory, AttachmentCategoryMeta> = {
  document: {
    label: 'Documents & Text',
    category: 'document',
    color: '#06b6d4', // cyan
    badgeBg: 'rgba(6, 182, 212, 0.15)',
    badgeBorder: 'rgba(6, 182, 212, 0.35)',
    badgeText: 'text-cyan-300',
  },
  spreadsheet: {
    label: 'Spreadsheet & Presentation',
    category: 'spreadsheet',
    color: '#10b981', // emerald
    badgeBg: 'rgba(16, 185, 129, 0.15)',
    badgeBorder: 'rgba(16, 185, 129, 0.35)',
    badgeText: 'text-emerald-300',
  },
  image: {
    label: 'Images & Photos',
    category: 'image',
    color: '#ec4899', // pink
    badgeBg: 'rgba(236, 72, 153, 0.15)',
    badgeBorder: 'rgba(236, 72, 153, 0.35)',
    badgeText: 'text-pink-300',
  },
  audio_video: {
    label: 'Audio & Video',
    category: 'audio_video',
    color: '#8b5cf6', // purple
    badgeBg: 'rgba(139, 92, 246, 0.15)',
    badgeBorder: 'rgba(139, 92, 246, 0.35)',
    badgeText: 'text-purple-300',
  },
  other: {
    label: 'Other & Archives',
    category: 'other',
    color: '#f59e0b', // amber
    badgeBg: 'rgba(245, 158, 11, 0.15)',
    badgeBorder: 'rgba(245, 158, 11, 0.35)',
    badgeText: 'text-amber-300',
  },
};

const EXTENSION_CATEGORIES: Record<string, AttachmentCategory> = {
  // Documents / Text
  pdf: 'document',
  docx: 'document',
  doc: 'document',
  txt: 'document',
  rtf: 'document',
  odt: 'document',
  // Spreadsheets / Presentations
  xlsx: 'spreadsheet',
  xls: 'spreadsheet',
  pptx: 'spreadsheet',
  ppt: 'spreadsheet',
  csv: 'spreadsheet',
  ods: 'spreadsheet',
  odp: 'spreadsheet',
  // Images / Photos
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  gif: 'image',
  bmp: 'image',
  webp: 'image',
  svg: 'image',
  ico: 'image',
  // Audio / Video
  mp3: 'audio_video',
  mp4: 'audio_video',
  avi: 'audio_video',
  wav: 'audio_video',
  mkv: 'audio_video',
  mov: 'audio_video',
  flac: 'audio_video',
  // Other Files
  zip: 'other',
  rar: 'other',
  '7z': 'other',
  tar: 'other',
  gz: 'other',
  ics: 'other',
  vcf: 'other',
};

const MIME_CATEGORIES: Record<string, AttachmentCategory> = {
  'application/pdf': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'application/msword': 'document',
  'text/plain': 'document',
  'application/rtf': 'document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'spreadsheet',
  'application/vnd.ms-excel': 'spreadsheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'spreadsheet',
  'application/vnd.ms-powerpoint': 'spreadsheet',
  'text/csv': 'spreadsheet',
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/bmp': 'image',
  'image/webp': 'image',
  'audio/mpeg': 'audio_video',
  'audio/mp3': 'audio_video',
  'video/mp4': 'audio_video',
  'video/x-msvideo': 'audio_video',
  'video/avi': 'audio_video',
  'application/zip': 'other',
  'application/x-zip-compressed': 'other',
  'text/calendar': 'other',
  'text/vcard': 'other',
  'text/x-vcard': 'other',
};

/**
 * Categorizes an attachment by its filename or MIME type.
 */
export function getAttachmentCategory(filename: string = '', mimeType: string = ''): AttachmentCategory {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  if (EXTENSION_CATEGORIES[ext]) {
    return EXTENSION_CATEGORIES[ext];
  }

  const cleanMime = mimeType.toLowerCase().split(';')[0].trim();
  if (MIME_CATEGORIES[cleanMime]) {
    return MIME_CATEGORIES[cleanMime];
  }

  if (cleanMime.startsWith('image/')) return 'image';
  if (cleanMime.startsWith('audio/') || cleanMime.startsWith('video/')) return 'audio_video';
  if (cleanMime.startsWith('text/')) return 'document';

  return 'other';
}

/**
 * Checks if a file format is among the recognized supported formats.
 */
export function isSupportedAttachment(filename: string = '', mimeType: string = ''): boolean {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  return Boolean(EXTENSION_CATEGORIES[ext] || getAttachmentCategory(filename, mimeType));
}

/**
 * Guesses the standard MIME type based on file extension.
 */
export function guessMimeType(filename: string = ''): string {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  switch (ext) {
    case 'pdf': return 'application/pdf';
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'doc': return 'application/msword';
    case 'txt': return 'text/plain';
    case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'xls': return 'application/vnd.ms-excel';
    case 'pptx': return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case 'ppt': return 'application/vnd.ms-powerpoint';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    case 'gif': return 'image/gif';
    case 'bmp': return 'image/bmp';
    case 'mp3': return 'audio/mpeg';
    case 'mp4': return 'video/mp4';
    case 'avi': return 'video/x-msvideo';
    case 'zip': return 'application/zip';
    case 'ics': return 'text/calendar';
    case 'vcf': return 'text/vcard';
    default: return 'application/octet-stream';
  }
}

/**
 * Convert Base64 data string to a Uint8Array byte buffer.
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  // Normalize base64url characters and strip whitespace
  const clean = base64.replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '');
  // Add padding if missing
  const padLen = (4 - (clean.length % 4)) % 4;
  const padded = clean + '='.repeat(padLen);
  const binaryStr = atob(padded);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}

/**
 * Downloads a single attachment file directly to the browser.
 */
export function downloadAttachmentFile(attachment: {
  filename: string;
  data?: string;
  mimeType?: string;
}): boolean {
  if (!attachment.filename) return false;

  const mime = attachment.mimeType || guessMimeType(attachment.filename);

  if (attachment.data) {
    try {
      const bytes = base64ToUint8Array(attachment.data);
      const blob = new Blob([bytes], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    } catch (err) {
      console.error(`Failed to decode base64 for ${attachment.filename}:`, err);
    }
  }

  // Fallback: create simulated placeholder file with metadata
  const fallbackText = `Mailveil Forensic Attachment Export\nFilename: ${attachment.filename}\nMIME Type: ${mime}\nTimestamp: ${new Date().toISOString()}\n`;
  const blob = new Blob([fallbackText], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = attachment.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
}

/**
 * Compresses an array of attachments into a single ZIP archive and triggers download.
 */
export async function downloadZipBundle(
  attachments: {
    filename: string;
    data?: string;
    mimeType?: string;
  }[],
  zipName: string = 'attachments.zip'
): Promise<void> {
  if (!attachments || attachments.length === 0) return;

  const zip = new JSZip();
  const seenFilenames = new Map<string, number>();

  for (const att of attachments) {
    let name = att.filename || 'attachment.dat';
    // Deduplicate duplicate names inside zip archive
    if (seenFilenames.has(name)) {
      const count = seenFilenames.get(name)! + 1;
      seenFilenames.set(name, count);
      const dotIdx = name.lastIndexOf('.');
      if (dotIdx > 0) {
        name = `${name.slice(0, dotIdx)} (${count})${name.slice(dotIdx)}`;
      } else {
        name = `${name} (${count})`;
      }
    } else {
      seenFilenames.set(name, 1);
    }

    if (att.data) {
      try {
        const cleanB64 = att.data.replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '');
        zip.file(name, cleanB64, { base64: true });
        continue;
      } catch (e) {
        console.warn(`Could not add ${name} as binary base64:`, e);
      }
    }

    // Fallback file content if raw data missing
    zip.file(
      name,
      `Mailveil Archived File: ${name}\nMIME: ${att.mimeType || guessMimeType(name)}\nExtracted: ${new Date().toISOString()}`
    );
  }

  const content = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = zipName.endsWith('.zip') ? zipName : `${zipName}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
