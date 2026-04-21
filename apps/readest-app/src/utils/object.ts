import { s3Storage } from './s3';
import { r2Storage } from './r2';
import { getStorageType, getSupabaseBooksBucket } from './storage';
import { createSupabaseAdminClient } from './supabase';

export const getDownloadSignedUrl = async (
  fileKey: string,
  expiresIn: number,
  bucketName?: string,
) => {
  const storageType = getStorageType();
  if (storageType === 'supabase') {
    const bucket = bucketName || getSupabaseBooksBucket();
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(fileKey, expiresIn);
    if (error) throw error;
    return data.signedUrl;
  }
  if (storageType === 'r2') {
    bucketName = bucketName || process.env['R2_BUCKET_NAME'] || '';
    return await r2Storage.getDownloadSignedUrl(bucketName, fileKey, expiresIn);
  } else {
    bucketName = bucketName || process.env['S3_BUCKET_NAME'] || '';
    return await s3Storage.getDownloadSignedUrl(bucketName, fileKey, expiresIn);
  }
};

/**
 * Server-side: create a Supabase Storage signed upload (path + token for `uploadToSignedUrl` on the client).
 * Do not use the returned `signedUrl` with a raw PUT; use {@link getSupabaseSignedUploadParts} response via `libs/storage` upload flow.
 */
export const getSupabaseSignedUploadParts = async (fileKey: string, bucketName?: string) => {
  const bucket = bucketName || getSupabaseBooksBucket();
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(fileKey, {
    upsert: true,
  });
  if (error) throw error;
  if (!data?.path || !data?.token) {
    throw new Error('Supabase Storage did not return signed upload path/token');
  }
  return {
    bucket,
    path: data.path,
    token: data.token,
    signedUrl: data.signedUrl,
  };
};

export const getUploadSignedUrl = async (
  fileKey: string,
  contentLength: number,
  expiresIn: number,
  bucketName?: string,
) => {
  const storageType = getStorageType();
  if (storageType === 'supabase') {
    throw new Error('Use getSupabaseSignedUploadParts for Supabase Storage uploads');
  }
  if (storageType === 'r2') {
    bucketName = bucketName || process.env['R2_BUCKET_NAME'] || '';
    return await r2Storage.getUploadSignedUrl(bucketName, fileKey, contentLength, expiresIn);
  } else {
    bucketName = bucketName || process.env['S3_BUCKET_NAME'] || '';
    return await s3Storage.getUploadSignedUrl(bucketName, fileKey, contentLength, expiresIn);
  }
};

export const deleteObject = async (fileKey: string, bucketName?: string) => {
  const storageType = getStorageType();
  if (storageType === 'supabase') {
    const bucket = bucketName || getSupabaseBooksBucket();
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.storage.from(bucket).remove([fileKey]);
    if (error) throw error;
    return;
  }
  if (storageType === 'r2') {
    bucketName = bucketName || process.env['R2_BUCKET_NAME'] || '';
    return await r2Storage.deleteObject(bucketName, fileKey);
  } else {
    bucketName = bucketName || process.env['S3_BUCKET_NAME'] || '';
    return await s3Storage.deleteObject(bucketName, fileKey);
  }
};
