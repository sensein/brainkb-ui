import rawEntityCardMapperConfig from "./enititycardmapper.yaml";

export type EntityCardMapperEntry = {
  card: string;
  slug: string;
  filename: string;
};

export type EntityCardMapperConfig = {
  EntityViewCardsMaper: EntityCardMapperEntry[];
};

const isEntityCardMapperEntry = (value: unknown): value is EntityCardMapperEntry => {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { card?: unknown }).card === "string" &&
    typeof (value as { slug?: unknown }).slug === "string" &&
    typeof (value as { filename?: unknown }).filename === "string"
  );
};

const isEntityCardMapperConfig = (value: unknown): value is EntityCardMapperConfig => {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { EntityViewCardsMaper?: unknown }).EntityViewCardsMaper) &&
    ((value as { EntityViewCardsMaper: unknown[] }).EntityViewCardsMaper).every(isEntityCardMapperEntry)
  );
};

const normalizeEntityCardMapperConfig = (config: unknown): EntityCardMapperConfig => {
  if (isEntityCardMapperConfig(config)) {
    return config;
  }

  console.error("Invalid entity card mapper config", config);
  return { EntityViewCardsMaper: [] };
};

export const entityCardMapperConfig = normalizeEntityCardMapperConfig(rawEntityCardMapperConfig);
