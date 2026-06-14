interface BrandEnv {
  FILES: R2Bucket;
}

export async function getBrandAsset(env: BrandEnv, key: string): Promise<ArrayBuffer | null> {
  const object = await env.FILES.get(key);

  if (object === null) {
    return null;
  }

  return object.arrayBuffer();
}

export async function putBrandAsset(
  env: BrandEnv,
  key: string,
  bytes: ArrayBuffer | ArrayBufferView,
  contentType: string
): Promise<void> {
  await env.FILES.put(key, bytes, {
    httpMetadata: {
      contentType,
    },
  });
}
