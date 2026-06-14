const ASSETS = ['logo', 'stamp', 'bank'];
const ASSET_FLAGS = new Map(ASSETS.map((asset) => [`--${asset}`, asset]));

export function parseSeedBrandArgs(argv, env = {}) {
  const options = {
    url: env.QUOTA_API_URL,
    token: env.QUOTA_API_TOKEN,
    assets: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--') {
      continue;
    } else if (arg === '--url') {
      options.url = readFlagValue(argv, (index += 1), '--url');
    } else if (arg === '--token') {
      options.token = readFlagValue(argv, (index += 1), '--token');
    } else if (ASSET_FLAGS.has(arg)) {
      options.assets.push({
        asset: ASSET_FLAGS.get(arg),
        path: readFlagValue(argv, (index += 1), arg),
      });
    } else {
      throw new Error(`Unknown flag: ${arg}`);
    }
  }

  if (!options.url) {
    throw new Error('Missing --url or QUOTA_API_URL.');
  }

  if (!options.token) {
    throw new Error('Missing --token or QUOTA_API_TOKEN.');
  }

  if (options.assets.length === 0) {
    throw new Error('Provide at least one of --logo, --stamp, or --bank.');
  }

  return options;
}

export async function uploadBrandAsset({ asset, bytes, contentType, fetchImpl = fetch, token, url }) {
  const response = await fetchImpl(uploadUrl(url, asset), {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'content-type': contentType,
    },
    body: bytes,
  });

  const body = await parseResponseBody(response);

  if (!response.ok) {
    throw new Error(`Failed to upload ${asset}: HTTP ${response.status}${body.error ? ` ${body.error}` : ''}`);
  }

  return body;
}

export async function runSeedBrand({
  argv,
  env,
  fetchImpl = fetch,
  stdout = console.log,
  stderr = console.error,
} = {}) {
  try {
    const options = parseSeedBrandArgs(argv, env);
    const results = [];

    for (const assetInput of options.assets) {
      const file = await readAssetFile(assetInput.path);
      const result = await uploadBrandAsset({
        asset: assetInput.asset,
        bytes: file.bytes,
        contentType: file.contentType,
        fetchImpl,
        token: options.token,
        url: options.url,
      });

      results.push({ asset: assetInput.asset, key: result.key });
      stdout(`${assetInput.asset}: ${result.key ?? 'uploaded'}`);
    }

    return { ok: true, results };
  } catch (error) {
    stderr(error instanceof Error ? error.message : String(error));

    return { ok: false, error };
  }
}

function readFlagValue(argv, index, flag) {
  const value = argv[index];

  if (!value || value.startsWith('--')) {
    throw new Error(`Missing value for ${flag}.`);
  }

  return value;
}

function uploadUrl(url, asset) {
  const base = url.endsWith('/') ? url : `${url}/`;

  return new URL(`api/company/brand/${asset}`, base).toString();
}

async function parseResponseBody(response) {
  const text = await response.text();

  if (text.trim() === '') {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

async function readAssetFile(path) {
  const { readFile, stat } = await import('node:fs/promises');
  const fileStat = await stat(path).catch(() => null);

  if (fileStat === null || !fileStat.isFile()) {
    throw new Error(`File does not exist: ${path}`);
  }

  return {
    bytes: await readFile(path),
    contentType: contentTypeFromPath(path),
  };
}

function contentTypeFromPath(path) {
  const lowerPath = path.toLowerCase();

  if (lowerPath.endsWith('.png')) {
    return 'image/png';
  }

  if (lowerPath.endsWith('.jpg') || lowerPath.endsWith('.jpeg')) {
    return 'image/jpeg';
  }

  throw new Error(`Unsupported image extension: ${path}`);
}

function isDirectRun() {
  return (
    typeof process !== 'undefined' &&
    Array.isArray(process.argv) &&
    process.argv[1] !== undefined &&
    import.meta.url === new URL(`file://${process.argv[1]}`).href
  );
}

if (isDirectRun()) {
  const result = await runSeedBrand({
    argv: process.argv.slice(2),
    env: process.env,
  });

  if (!result.ok) {
    process.exitCode = 1;
  }
}
