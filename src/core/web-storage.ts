import { parseProjectText, serializeProject, type Project } from './project';
import { STORAGE_KEYS, type ProjectSummary, type Storage } from './storage';

export { STORAGE_KEYS };

function readList(): ProjectSummary[] {
  const raw = localStorage.getItem(STORAGE_KEYS.list);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ProjectSummary[]) : [];
  } catch {
    return [];
  }
}

function writeList(list: ProjectSummary[]): void {
  localStorage.setItem(STORAGE_KEYS.list, JSON.stringify(list));
}

function upsertSummary(summary: ProjectSummary): void {
  const list = readList().filter((s) => s.id !== summary.id);
  list.unshift(summary);
  writeList(list);
}

function triggerDownload(filename: string, text: string, mime: string): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function pickTextFile(accept: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return reject(new Error('Tidak ada file yang dipilih.'));
      file.text().then(resolve, () => reject(new Error('Gagal membaca file.')));
    });
    input.click();
  });
}

export class WebStorage implements Storage {
  async listProjects(): Promise<ProjectSummary[]> {
    return readList();
  }

  async loadProject(id: string): Promise<Project> {
    const raw = localStorage.getItem(STORAGE_KEYS.project(id));
    if (raw === null) throw new Error(`Project "${id}" tidak ditemukan.`);
    const res = parseProjectText(raw);
    if (!res.ok) throw new Error(`Project rusak: ${res.errors.join(' ')}`);
    return res.project;
  }

  async saveProject(
    id: string,
    project: Project,
    thumbnailDataUrl: string | null = null,
  ): Promise<void> {
    const text = serializeProject(project); // throws on circular / non-serializable
    const verify = parseProjectText(text);
    if (!verify.ok)
      throw new Error(`Menolak menyimpan project tidak valid: ${verify.errors.join(' ')}`);

    localStorage.setItem(STORAGE_KEYS.tmp(id), text);
    localStorage.setItem(STORAGE_KEYS.project(id), text);
    localStorage.removeItem(STORAGE_KEYS.tmp(id));

    upsertSummary({
      id,
      name: project.meta.name,
      updatedAt: project.meta.updatedAt,
      thumbnailDataUrl,
    });
  }

  async deleteProject(id: string): Promise<void> {
    localStorage.removeItem(STORAGE_KEYS.project(id));
    localStorage.removeItem(STORAGE_KEYS.tmp(id));
    writeList(readList().filter((s) => s.id !== id));
  }

  async importFromFile(): Promise<Project> {
    const text = await pickTextFile('.json,.ghtml.json,application/json');
    const res = parseProjectText(text);
    if (!res.ok) throw new Error(`File project tidak valid: ${res.errors.join(' ')}`);
    return res.project;
  }

  async exportToFile(project: Project): Promise<void> {
    triggerDownload(
      `${project.meta.name}.ghtml.json`,
      serializeProject(project),
      'application/json',
    );
  }

  async exportHtml(name: string, html: string): Promise<void> {
    triggerDownload(`${name}.html`, html, 'text/html');
  }
}
