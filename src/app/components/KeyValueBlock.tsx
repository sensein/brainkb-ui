/**
 * KeyValueBlock
 *
 * A small reusable component to display the entries of an object
 * (key–value pairs) in a consistent, styled way.
 *
 * - Accepts any plain object via the `data` prop.
 * - Loops through each entry and renders it as a line of text.
 * - Keys are shown in bold and capitalized.
 * - Values are stringified; arrays are joined with commas.
 * - Returns `null` if `data` is missing or not an object.
 *
 * Example:
 *   <KeyValueBlock data={{ ip: "1.1.1.1", isp: "Cloudflare" }} />
 *
 * Renders:
 *   Ip: 1.1.1.1
 *   Isp: Cloudflare
 */

import React from "react";

interface KeyValueBlockProps {
  data: Record<string, unknown>;
}

const KeyValueBlock: React.FC<KeyValueBlockProps> = ({ data }) => {
  if (!data || typeof data !== "object") return null;

  return (
    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 space-y-1">
      {Object.entries(data).map(([key, value]) => (
        <p key={key}>
          <span className="font-semibold capitalize">{key}:</span>{" "}
          {Array.isArray(value) ? value.join(", ") : String(value)}
        </p>
      ))}
    </div>
  );
};

export default KeyValueBlock;
