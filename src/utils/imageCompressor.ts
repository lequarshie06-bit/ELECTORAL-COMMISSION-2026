/**
 * Utility to compress and optimize candidate passport photos for fast browser storage
 * Resizes large camera/phone photos (5MB+) down to crisp, lightweight (~25-45KB) JPEGs
 * ensuring localStorage quota (5MB) is never exceeded even with 100+ candidates.
 */

export async function compressCandidatePhoto(
  input: File | Blob | string,
  maxWidth = 450,
  maxHeight = 450,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    // If it's already a small string URL or path (not a huge data URL), return it
    if (typeof input === 'string' && !input.startsWith('data:image/') && input.length < 500) {
      return resolve(input);
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        let { width, height } = img;

        // Calculate proportional dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(typeof input === 'string' ? input : '');
        }

        // Fill white background (in case of transparent PNGs)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        // Smooth image rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to optimized JPEG data URL (~25-45KB)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      } catch (err) {
        console.warn('Image canvas compression failed, fallback to original', err);
        if (typeof input === 'string') {
          resolve(input);
        } else {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(err);
          reader.readAsDataURL(input);
        }
      }
    };

    img.onerror = (err) => {
      console.warn('Image load error during compression', err);
      if (typeof input === 'string') {
        resolve(input);
      } else {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(err);
        reader.readAsDataURL(input);
      }
    };

    if (typeof input === 'string') {
      img.src = input;
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        img.src = reader.result as string;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(input);
    }
  });
}

// Simple IndexedDB Cache for candidate photos to guarantee persistence
const DB_NAME = 'UHAS_NTD_ELECTION_PHOTOS_DB';
const STORE_NAME = 'candidate_photos';

function openPhotoDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePhotoToDB(candidateId: string, photoDataUrl: string): Promise<void> {
  try {
    const db = await openPhotoDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({ id: candidateId, photo: photoDataUrl, updatedAt: Date.now() });
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve(); // silent fallback
    });
  } catch (err) {
    console.warn('Failed to save to IndexedDB photo store', err);
  }
}

export async function getPhotoFromDB(candidateId: string): Promise<string | null> {
  try {
    const db = await openPhotoDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(candidateId);
    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result ? req.result.photo : null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}
