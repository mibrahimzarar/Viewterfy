/**
 * Viewterfy Project File Utilities
 * Handles saving and loading project state as .vtfy files (JSON).
 *
 * Blob URLs (blob:http://...) cannot be persisted across sessions,
 * so we convert any image blobs to base64 data-URLs before saving,
 * and restore them as object-URLs on load.
 */

// ─── Blob URL helpers ────────────────────────────────────────────────────────

/** Convert a blob: URL to a base64 data-URL so it can be stored in JSON. */
async function blobUrlToDataUrl(blobUrl: string): Promise<string> {
    if (!blobUrl || !blobUrl.startsWith('blob:')) return blobUrl
    const res = await fetch(blobUrl)
    const blob = await res.blob()
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
    })
}

/** Convert a base64 data-URL back to an object-URL. */
function dataUrlToObjectUrl(dataUrl: string): string {
    if (!dataUrl || !dataUrl.startsWith('data:')) return dataUrl
    const [header, base64] = dataUrl.split(',')
    const mimeMatch = header.match(/data:(.*?);/)
    const mime = mimeMatch?.[1] ?? 'image/png'
    const binary = atob(base64)
    const array = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i)
    const blob = new Blob([array], { type: mime })
    return URL.createObjectURL(blob)
}

// ─── Serialization ────────────────────────────────────────────────────────────

/** Recursively walk an object and convert every blob: URL string to base64. */
async function serializeValue(val: unknown): Promise<unknown> {
    if (typeof val === 'string' && val.startsWith('blob:')) {
        return blobUrlToDataUrl(val)
    }
    if (Array.isArray(val)) {
        return Promise.all(val.map(serializeValue))
    }
    if (val && typeof val === 'object') {
        const out: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
            out[k] = await serializeValue(v)
        }
        return out
    }
    return val
}

/** Recursively walk a deserialized object and convert every data: URL back to a blob object-URL. */
function deserializeValue(val: unknown): unknown {
    if (typeof val === 'string' && val.startsWith('data:')) {
        return dataUrlToObjectUrl(val)
    }
    if (Array.isArray(val)) {
        return val.map(deserializeValue)
    }
    if (val && typeof val === 'object') {
        const out: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
            out[k] = deserializeValue(v)
        }
        return out
    }
    return val
}

// ─── Keys to exclude (runtime/transient state) ───────────────────────────────
const EXCLUDED_KEYS = new Set([
    'isPlaying',
    'isExporting',
    'isFullCyclePreview',
    'animationFinished',
    'lockedDimensions',
    'resetScrollSignal',
    'videoDuration',
])

// ─── Public API ───────────────────────────────────────────────────────────────

export const PROJECT_FILE_VERSION = 1

export interface ViewterfyProject {
    _version: number
    _savedAt: string
    state: Record<string, unknown>
}

/**
 * Serialize the given state snapshot to a .vtfy project file and download it.
 * @param state  Plain Zustand state object (functions stripped by caller).
 * @param filename  Suggested download filename (default: "project.vtfy").
 */
export async function saveProject(
    state: Record<string, unknown>,
    filename = 'project.vtfy',
): Promise<void> {
    // Strip functions and excluded runtime keys
    const stripped: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(state)) {
        if (typeof v === 'function') continue
        if (EXCLUDED_KEYS.has(k)) continue
        stripped[k] = v
    }

    const serialized = await serializeValue(stripped) as Record<string, unknown>

    const project: ViewterfyProject = {
        _version: PROJECT_FILE_VERSION,
        _savedAt: new Date().toISOString(),
        state: serialized,
    }

    const json = JSON.stringify(project, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
}

/**
 * Open a file-picker, read the chosen .vtfy file, and return the deserialized
 * state object (with blob URLs restored).  Returns null if the user cancels.
 */
export async function loadProject(): Promise<Record<string, unknown> | null> {
    return new Promise((resolve) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.vtfy,application/json'

        input.onchange = async () => {
            const file = input.files?.[0]
            if (!file) { resolve(null); return }

            try {
                const text = await file.text()
                const project = JSON.parse(text) as ViewterfyProject

                if (!project.state || typeof project.state !== 'object') {
                    throw new Error('Invalid project file: missing state.')
                }

                const restored = deserializeValue(project.state) as Record<string, unknown>
                resolve(restored)
            } catch (err) {
                console.error('[Viewterfy] Failed to load project:', err)
                alert('Could not load project file. The file may be corrupt or from an incompatible version.')
                resolve(null)
            }
        }

        // Handle user cancel (no change event fires)
        input.oncancel = () => resolve(null)
        input.click()
    })
}
