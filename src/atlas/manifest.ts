import type { Grade, SourceId } from '../domain/types';

/**
 * The BodyParts3D manifest, as published by the upstream Human Atlas project.
 *
 * Geometry is packed into fifteen binary chunks of plain typed arrays, and
 * each part records byte offsets into its chunk. There is no decoder to run:
 * simplification happened at build time (meshoptimizer, 0.2% relative error
 * per structure), and what ships is directly usable as buffer attributes.
 */
export interface Bp3dPart {
  readonly id: string;          // element file id, e.g. FJ1252
  readonly name: string;        // FMA preferred English name
  readonly conceptId: string;   // FMA concept id, e.g. FMA59763
  readonly system: string;
  readonly chunk: number;
  readonly positions: number;   // byte offset, Float32 x3 per vertex
  readonly normals: number;     // byte offset, Int16 x3 per vertex, normalised
  readonly indices: number;     // byte offset, Uint32
  readonly vertexCount: number;
  readonly indexCount: number;
  readonly bounds: readonly [readonly number[], readonly number[]];
}

export interface Bp3dChunk {
  readonly url: string;
  readonly bytes: number;
  readonly gzip?: string;
  readonly gzipBytes?: number;
}

/** A named FMA concept, which may gather several element meshes. */
export interface Bp3dConcept {
  readonly id: string;
  readonly name: string;
  readonly elements: readonly string[];
}

export interface Bp3dManifest {
  readonly version: string;
  readonly source: string;
  readonly sex: string;
  readonly scope: string;
  readonly triangles: number;
  readonly sourceTriangles: number;
  readonly parts: readonly Bp3dPart[];
  readonly chunks: readonly Bp3dChunk[];
  readonly concepts: readonly Bp3dConcept[];
}

/** Everything from this manifest is BodyParts3D, so it grades uniformly. */
export const BP3D_SOURCE: SourceId = 'bodyparts3d';
export const BP3D_GRADE: Grade = 'B';

let cached: Promise<Bp3dManifest> | null = null;

export function loadManifest(): Promise<Bp3dManifest> {
  cached ??= fetch(`${import.meta.env.BASE_URL}atlas/bodyparts3d.json`).then((res) => {
    if (!res.ok) throw new Error(`Cannot load the anatomy manifest (${res.status})`);
    return res.json() as Promise<Bp3dManifest>;
  });
  return cached;
}

/**
 * Fetch one geometry chunk.
 *
 * GitHub Pages cannot set custom headers, so a .gz file may arrive either
 * already decoded by the browser (when the host sets Content-Encoding) or as
 * raw gzip bytes. Sniffing the magic number is what avoids decompressing
 * twice, and the length check catches a truncated download before it becomes
 * a confusing WebGL error.
 */
export async function loadChunk(chunk: Bp3dChunk): Promise<ArrayBuffer> {
  const canDecompress = typeof DecompressionStream !== 'undefined';
  const useGzip = Boolean(chunk.gzip) && canDecompress;
  // Manifest paths have carried both /models/ and /chunks/ prefixes; the
  // basename is the only part that is stable.
  const name = (useGzip ? chunk.gzip! : chunk.url).split('/').pop()!;

  const res = await fetch(`${import.meta.env.BASE_URL}atlas/chunks/${name}`);
  if (!res.ok) throw new Error(`Cannot load anatomy chunk ${name} (${res.status})`);

  const payload = await res.arrayBuffer();
  const magic = new Uint8Array(payload, 0, Math.min(2, payload.byteLength));
  const stillGzipped = useGzip && magic[0] === 0x1f && magic[1] === 0x8b;

  const buffer = stillGzipped
    ? await new Response(
        new Blob([payload]).stream().pipeThrough(new DecompressionStream('gzip')),
      ).arrayBuffer()
    : payload;

  if (buffer.byteLength !== chunk.bytes) {
    throw new Error(`Anatomy chunk ${name} was incomplete — reload to try again.`);
  }
  return buffer;
}
