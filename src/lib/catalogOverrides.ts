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

let resolvedDataDir = process.env.VERCEL
  ? path.join("/tmp", "mss-admin-data")
  : path.join(process.cwd(), "data");
let resolvedOverridesFile = path.join(resolvedDataDir, "catalog_overrides.json");

function ensureFile() {
  try {
    if (!fs.existsSync(resolvedDataDir)) {
      fs.mkdirSync(resolvedDataDir, { recursive: true });
    }
    if (!fs.existsSync(resolvedOverridesFile)) {
      fs.writeFileSync(resolvedOverridesFile, JSON.stringify({}, null, 2), "utf8");
    }
  } catch {
    // If process.cwd() is read-only (e.g., AWS Lambda / Vercel), fallback to /tmp
    if (!resolvedDataDir.startsWith("/tmp")) {
      resolvedDataDir = path.join("/tmp", "mss-admin-data");
      resolvedOverridesFile = path.join(resolvedDataDir, "catalog_overrides.json");
      try {
        if (!fs.existsSync(resolvedDataDir)) {
          fs.mkdirSync(resolvedDataDir, { recursive: true });
        }
        if (!fs.existsSync(resolvedOverridesFile)) {
          fs.writeFileSync(resolvedOverridesFile, JSON.stringify({}, null, 2), "utf8");
        }
      } catch (tmpErr) {
        console.warn("Could not write to /tmp in serverless environment:", tmpErr);
      }
    }
  }
}

export function getOverrides(): Record<string, SchemeOverride> {
  try {
    ensureFile();
    const data = fs.readFileSync(resolvedOverridesFile, "utf8");
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
    fs.writeFileSync(resolvedOverridesFile, JSON.stringify(current, null, 2), "utf8");
  } catch (err) {
    console.error("Could not write catalog_overrides.json:", err);
  }
}

export function removeOverride(id: string) {
  try {
    ensureFile();
    const current = getOverrides();
    delete current[id];
    fs.writeFileSync(resolvedOverridesFile, JSON.stringify(current, null, 2), "utf8");
  } catch (err) {
    console.error("Could not remove from catalog_overrides.json:", err);
  }
}
