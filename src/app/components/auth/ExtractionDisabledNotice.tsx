"use client";

/**
 * Shown in place of an extraction tool while ENABLE_EXTRACTION_TOOLS is off.
 *
 * The tools are hidden from the dashboard and sidebar, but their routes still exist,
 * so anyone with a bookmark or a stale tab lands on the page. Without this they would
 * get a UI that looks fine and then fails on WebSocket connect — ml_service does not
 * register /ws/ner, /ws/extract-resources or /ws/pdf2reproschema when the structsense
 * package is absent.
 *
 * Deliberately explicit that already-extracted data is still readable, because that
 * is the first thing someone will wonder.
 */

import Link from "next/link";
import { AlertCircle } from "lucide-react";

export function ExtractionDisabledNotice({ toolName }: { toolName: string }) {
  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" aria-hidden />
          <div>
            <h1 className="text-lg font-semibold text-amber-900">
              {toolName} is temporarily unavailable
            </h1>
            <p className="mt-2 text-sm text-amber-900">
              The multi-agent extraction service is not running, so new extractions
              cannot be started. This is a server-side dependency problem, not
              something wrong with your account or your file.
            </p>
            <p className="mt-3 text-sm text-amber-900">
              Previously extracted data is unaffected and still browsable in the{" "}
              <Link href="/knowledge-base/ner" className="underline font-medium">
                knowledge base
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
      <div className="mt-6">
        <Link href="/user/dashboard" className="text-sm text-gray-700 underline">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}

export default ExtractionDisabledNotice;
