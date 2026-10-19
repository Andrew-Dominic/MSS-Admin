import fs from "fs";
import path from "path";

export interface SchemeOverride {
  id: string;
  isDeleted?: boolean;
  status?: string;
  is_active?: boolean;
  scheme_code?: string;
  name_en?: string;
  state?: string;
  scheme_type?: string;
  record_json?: any;
  updated_at?: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const OVERRIDES_FILE = path.join(DATA_DIR, "catalog_overrides.json");

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(OVERRIDES_FILE)) {
    fs.writeFileSync(OVERRIDES_FILE, JSON.stringify({}, null, 2), "utf8");
  }
}

export function getOverrides(): Record<string, SchemeOverride> {
  try {
    ensureFile();
    const data = fs.readFileSync(OVERRIDES_FILE, "utf8");
    return JSON.parse(data || "{}");
  } catch (err) {
    console.warn("Could not read catalog_overrides.json:", err);
    return {};
  }
}

export function saveOverride(id: string, override: Partial<SchemeOverride>) {
  try {
    ensureFile();
    const current = getOverrides();
    current[id] = {
      ...(current[id] || { id }),
      ...override,
      id,
      updated_at: new Date().toISOString(),
    };
    fs.writeFileSync(OVERRIDES_FILE, JSON.stringify(current, null, 2), "utf8");
  } catch (err) {
    console.error("Could not write catalog_overrides.json:", err);
  }
}

export function removeOverride(id: string) {
  try {
    ensureFile();
    const current = getOverrides();
    delete current[id];
    fs.writeFileSync(OVERRIDES_FILE, JSON.stringify(current, null, 2), "utf8");
  } catch (err) {
    console.error("Could not remove from catalog_overrides.json:", err);
  }
}
