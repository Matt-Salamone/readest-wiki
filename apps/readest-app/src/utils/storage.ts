type ObjectStorageType = 'r2' | 's3' | 'supabase';

export const getStorageType = (): ObjectStorageType => {
  // TODO: do not expose storage type to client
  if (process.env['NEXT_PUBLIC_OBJECT_STORAGE_TYPE']) {
    return process.env['NEXT_PUBLIC_OBJECT_STORAGE_TYPE'] as ObjectStorageType;
  } else {
    return 'r2';
  }
};

/** Default bucket for user book files (Supabase Storage). */
export const getSupabaseBooksBucket = (): string =>
  process.env['SUPABASE_STORAGE_BUCKET'] || 'books';

/** Public bucket for temporary uploads e.g. wiki images (Supabase Storage). */
export const getSupabaseTempBucket = (): string =>
  process.env['SUPABASE_STORAGE_TEMP_BUCKET'] || 'temp-images';
