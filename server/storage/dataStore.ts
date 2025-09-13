import { promises as fs } from "fs";
import path from "path";

export interface StoredRecord<T> {
  id: string;
  data: T;
}

export class JsonStore<T extends { id: string }> {
  private filePath: string;
  private dirPath: string;

  constructor(relativePath: string) {
    this.filePath = path.resolve(process.cwd(), relativePath);
    this.dirPath = path.dirname(this.filePath);
  }

  private async ensureFile() {
    await fs.mkdir(this.dirPath, { recursive: true });
    try {
      await fs.access(this.filePath);
    } catch {
      await fs.writeFile(this.filePath, "[]", "utf8");
    }
  }

  private async readAll(): Promise<T[]> {
    await this.ensureFile();
    const raw = await fs.readFile(this.filePath, "utf8");
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }

  private async writeAll(items: T[]) {
    const tmp = this.filePath + ".tmp";
    await fs.writeFile(tmp, JSON.stringify(items, null, 2), "utf8");
    await fs.rename(tmp, this.filePath);
  }

  async list(): Promise<T[]> {
    return this.readAll();
  }

  async get(id: string): Promise<T | null> {
    const all = await this.readAll();
    return all.find((r) => r.id === id) ?? null;
  }

  async put(item: T): Promise<void> {
    const all = await this.readAll();
    const idx = all.findIndex((r) => r.id === item.id);
    if (idx >= 0) all[idx] = item; else all.unshift(item);
    await this.writeAll(all);
  }

  async update(id: string, patch: Partial<T>): Promise<T | null> {
    const all = await this.readAll();
    const idx = all.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    const updated = { ...all[idx], ...patch } as T;
    all[idx] = updated;
    await this.writeAll(all);
    return updated;
  }
}
