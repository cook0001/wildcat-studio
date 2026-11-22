import { CartridgeSpec } from '../types/cartridge';

const STORAGE_KEY = 'wildcat_custom_cartridges';

/**
 * Load all user-saved custom cartridges from localStorage.
 */
export function loadCustomCartridges(): Record<string, CartridgeSpec> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as Record<string, CartridgeSpec>;
    }
    return {};
  } catch (err) {
    console.error('Failed to load custom cartridges from storage:', err);
    return {};
  }
}

/**
 * Save or update a custom cartridge in the user database.
 */
export function saveCustomCartridge(cartridge: CartridgeSpec): void {
  try {
    const existing = loadCustomCartridges();
    const updated = {
      ...existing,
      [cartridge.id]: {
        ...cartridge,
        standard: 'Wildcat' as const,
      }
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save custom cartridge to storage:', err);
  }
}

/**
 * Delete a custom cartridge from the user database.
 */
export function deleteCustomCartridge(id: string): void {
  try {
    const existing = loadCustomCartridges();
    if (existing[id]) {
      delete existing[id];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    }
  } catch (err) {
    console.error('Failed to delete custom cartridge from storage:', err);
  }
}

/**
 * Check if a cartridge ID belongs to a user custom cartridge.
 */
export function isCustomCartridge(id: string): boolean {
  const existing = loadCustomCartridges();
  return Boolean(existing[id]);
}

/**
 * Generate a unique ID for a newly created wildcat cartridge.
 */
export function generateCustomCartridgeId(name: string): string {
  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const timestamp = Date.now().toString(36);
  return `wildcat_${sanitized || 'custom'}_${timestamp}`;
}
