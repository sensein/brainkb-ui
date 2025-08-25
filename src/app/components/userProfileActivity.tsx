// components/ActivityList.tsx
/**
 * ActivityList
 *
 * Renders a list of user activity objects in a readable format.
 *
 * Expected input (per item in `userActivity` array):
 * {
 *   "activity_type": "content_submission",
 *   "description": "Mobile app session started",
 *   "meta_data": { ... arbitrary key/value pairs ... },
 *   "ip_address": "172.16.0.15",
 *   "user_agent": "BrainKB/2.1.0 (iPhone; iOS 17.1; Scale/3.00)",
 *   "location": { ... location details ... },
 *   "isp": "Rogers Communications",
 *   "as_info": { ... AS network info ... },
 *   "created_at": "2025-08-25T10:30:00Z"
 * }
 *
 * Rendering logic:
 * - Shows activity type + description at the top.
 * - Uses <KeyValueBlock> to render meta_data, location, and as_info (avoids duplication).
 * - Displays IP, ISP, and User Agent as plain fields.
 * - Formats `created_at` timestamp using date-fns (PPpp format).
 * - By default, only the 10 most recent activities are shown.
 *   A "Show More / Show Less" toggle expands or collapses the full list.
 *
 * Example output (simplified):
 *   content_submission: Mobile app session started
 *   App_version: 2.1.0
 *   Platform: iOS
 *   Country: CA
 *   Region: Ontario
 *   IP: 172.16.0.15
 *   ISP: Rogers Communications
 *   User Agent: BrainKB/2.1.0 (iPhone; iOS 17.1; Scale/3.00)
 *   Aug 25, 2025 at 10:30 AM
 */

"use client";

import { useState } from "react";
import { format } from "date-fns";
import {Activity} from "@/src/app/components/types";
import KeyValueBlock from "@/src/app/components/KeyValueBlock";

export default function ActivityList({ userActivity }: { userActivity: Activity[] }) {
  const [showAll, setShowAll] = useState(false);

  const sorted = [...userActivity].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const visible = showAll ? sorted : sorted.slice(0, 10);

  return (
    <div>
      {visible.map((item) => (
        <div
          key={item.id}
          className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-md"
        >
          {/* Activity type + description */}
          <p className="text-sm text-gray-600 dark:text-gray-300">
            <span className="font-semibold text-blue-500">
              {item.activity_type}
            </span>
            : {item.description}
          </p>

          {item.meta_data && <KeyValueBlock data={item.meta_data} />}
          {item.location && <KeyValueBlock data={item.location} />}
          {item.as_info && <KeyValueBlock data={item.as_info} />}

          {(item.ip_address || item.isp || item.user_agent) && (
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 space-y-1">
              {item.ip_address && <p>IP: {item.ip_address}</p>}
              {item.isp && <p>ISP: {item.isp}</p>}
              {item.user_agent && <p>User Agent: {item.user_agent}</p>}
            </div>
          )}

          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            {format(new Date(item.created_at), "PPpp")}
          </p>
        </div>
      ))}

      {sorted.length > 10 && (
        <button
          onClick={() => setShowAll((prev) => !prev)}
          className="mt-3 text-sm text-blue-600 hover:underline"
        >
          {showAll ? "Show Less" : "Show More"}
        </button>
      )}
    </div>
  );
}
