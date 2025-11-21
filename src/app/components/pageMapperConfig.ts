import rawPageMapperConfig from "@/src/config/yaml/page-mapper.yaml";

export type PageMapperEntry = {
  type: "entity-detail" | "entity-list" | "list" | "detail";
  slug: string;
  filename: string;
};

export type PageMapperConfig = {
  PageMapper: PageMapperEntry[];
};

const isPageMapperEntry = (value: unknown): value is PageMapperEntry => {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { type?: unknown }).type === "string" &&
    typeof (value as { slug?: unknown }).slug === "string" &&
    typeof (value as { filename?: unknown }).filename === "string"
  );
};

const isPageMapperConfig = (value: unknown): value is PageMapperConfig => {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { PageMapper?: unknown }).PageMapper) &&
    ((value as { PageMapper: unknown[] }).PageMapper).every(isPageMapperEntry)
  );
};

const normalizePageMapperConfig = (config: unknown): PageMapperConfig => {
  if (isPageMapperConfig(config)) {
    return config;
  }

  console.error("Invalid page mapper config", config);
  return { PageMapper: [] };
};

export const pageMapperConfig = normalizePageMapperConfig(rawPageMapperConfig);

