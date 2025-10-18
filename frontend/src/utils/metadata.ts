import { MetadataEntry } from '@/types/metadata';

export const normalizeMetadataArray = (input: unknown): MetadataEntry[] => {
  if (!input) {
    return [];
  }

  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      return normalizeMetadataArray(parsed);
    } catch (error) {
      return [];
    }
  }

  if (Array.isArray(input)) {
    return input.map((entry) => {
      if (!entry) {
        return {};
      }

      if (typeof entry === 'string') {
        try {
          const parsed = JSON.parse(entry);
          return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? (parsed as MetadataEntry)
            : {};
        } catch (error) {
          return {};
        }
      }

      if (typeof entry === 'object' && !Array.isArray(entry)) {
        return entry as MetadataEntry;
      }

      return {};
    });
  }

  if (typeof input === 'object' && !Array.isArray(input)) {
    return [input as MetadataEntry];
  }

  return [];
};

export const normalizeMetadataEntry = (input: unknown): MetadataEntry => {
  if (!input) {
    return {};
  }

  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as MetadataEntry)
        : {};
    } catch (error) {
      return {};
    }
  }

  if (typeof input === 'object' && !Array.isArray(input)) {
    return input as MetadataEntry;
  }

  return {};
};

export const alignMetadataLength = (
  metadata: MetadataEntry[],
  targetLength: number
): MetadataEntry[] => {
  if (targetLength <= 0) {
    return [];
  }

  if (metadata.length === targetLength) {
    return metadata;
  }

  if (metadata.length > targetLength) {
    return metadata.slice(0, targetLength);
  }

  const filler = Array.from(
    { length: targetLength - metadata.length },
    () => ({}) as MetadataEntry
  );
  return [...metadata, ...filler];
};
