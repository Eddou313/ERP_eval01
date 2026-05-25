import JSZip from "jszip";

export const normalizeText = (value: string): string => value.trim().toLowerCase();

export type ZipImportProgress = {
    processed: number;
    total: number;
    label: string;
    detail: string;
};

export const buildImageMapFromZip = async (
    file: File,
    onProgress?: (progress: ZipImportProgress) => void,
) => {
    const imageMap = new Map<string, { blob: Blob; fileName: string }>();
    const zip = new JSZip();
    const contents = await zip.loadAsync(file);

    const imageExtensions = new Set(["jpg", "jpeg", "png", "webp", "gif", "bmp"]);
    const entries = Object.values(contents.files).filter((entry) => !entry.dir);
    const total = entries.length;
    let processed = 0;

    onProgress?.({
        processed: 0,
        total,
        label: "ZIP",
        detail: total > 0 ? "Lecture des fichiers du ZIP..." : "ZIP vide",
    });

    for (const entry of entries) {
        const entryName = entry.name || "";
        const extension = entryName.split(".").pop()?.toLowerCase() || "";
        if (!imageExtensions.has(extension)) {
            processed += 1;
            onProgress?.({
                processed,
                total,
                label: "ZIP",
                detail: `Fichier ignoré: ${entryName}`,
            });
            continue;
        }

        const fileName = entryName.split(/[\\/]/).pop() || entryName;
        const key = normalizeImageKey(fileName);
        if (!key || imageMap.has(key)) {
            processed += 1;
            onProgress?.({
                processed,
                total,
                label: "ZIP",
                detail: `Fichier ignoré: ${fileName}`,
            });
            continue;
        }

        const blob = await entry.async("blob");
        imageMap.set(key, { blob, fileName });

        processed += 1;
        onProgress?.({
            processed,
            total,
            label: "ZIP",
            detail: `Image importée: ${fileName}`,
        });
    }

    onProgress?.({
        processed: total,
        total,
        label: "ZIP",
        detail: `ZIP traité: ${imageMap.size} image(s) exploitée(s)`,
    });

    return imageMap;
};

const normalizeImageKey = (fileName: string) => {
    const baseName = fileName.split(/[\\/]/).pop() || fileName;
    const stem = baseName.replace(/\.[^.]+$/, "");
    return normalizeText(stem);
};
    