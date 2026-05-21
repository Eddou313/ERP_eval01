import JSZip from "jszip";

export const normalizeText = (value: string): string => value.trim().toLowerCase();

export const buildImageMapFromZip = async (file: File) => {
    const imageMap = new Map<string, { blob: Blob; fileName: string }>();
    const zip = new JSZip();
    const contents = await zip.loadAsync(file);

    const imageExtensions = new Set(["jpg", "jpeg", "png", "webp", "gif", "bmp"]);
    for (const entry of Object.values(contents.files)) {
        if (entry.dir) continue;

        const entryName = entry.name || "";
        const extension = entryName.split(".").pop()?.toLowerCase() || "";
        if (!imageExtensions.has(extension)) continue;

        const fileName = entryName.split(/[\\/]/).pop() || entryName;
        const key = normalizeImageKey(fileName);
        if (!key || imageMap.has(key)) continue;

        const blob = await entry.async("blob");
        imageMap.set(key, { blob, fileName });
    }

    return imageMap;
};

const normalizeImageKey = (fileName: string) => {
    const baseName = fileName.split(/[\\/]/).pop() || fileName;
    const stem = baseName.replace(/\.[^.]+$/, "");
    return normalizeText(stem);
};
    