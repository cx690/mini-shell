/** 从 FileSystemFileEntry 获取 File 对象 */
function getFileFromEntry(entry: FileSystemFileEntry): Promise<File> {
    return new Promise((resolve, reject) => {
        entry.file(resolve, reject);
    });
}

/** 递归读取目录下的所有文件 */
async function readDirectoryFiles(dir: FileSystemDirectoryEntry,): Promise<File[]> {
    const files: File[] = [];
    const reader = dir.createReader();

    const readEntries = (): Promise<FileSystemEntry[]> => {
        return new Promise((resolve, reject) => {
            reader.readEntries(resolve, reject);
        });
    };

    let entries: FileSystemEntry[] = [];
    do {
        entries = await readEntries();
        for (const entry of entries) {
            const fullPath = entry.fullPath.replace(/^\//, '');
            if (entry.isFile) {
                const file = await getFileFromEntry(entry as FileSystemFileEntry);
                // 保留相对路径，便于 Zmodem 等协议维持目录结构
                const fileWithPath = new File([file], fullPath, {
                    lastModified: file.lastModified,
                    type: file.type,
                });
                files.push(fileWithPath);
            } else if (entry.isDirectory) {
                const subFiles = await readDirectoryFiles(
                    entry as FileSystemDirectoryEntry,
                );
                files.push(...subFiles);
            }
        }
    } while (entries.length > 0);

    return files;
}

/** 从 DataTransfer 递归收集所有文件（含文件夹内文件） */
export async function getAllFilesFromDataTransfer(dt: DataTransfer): Promise<File[]> {
    const files: File[] = [];
    const entries = Array.from(dt.items).map(item => item.webkitGetAsEntry());
    for (const entry of entries) {
        if (entry?.isFile) {
            const file = await getFileFromEntry(entry as FileSystemFileEntry);
            files.push(file);
        } else if (entry?.isDirectory) {
            const dirFiles = await readDirectoryFiles(entry as FileSystemDirectoryEntry);
            files.push(...dirFiles);
        }
    }
    return files;
}