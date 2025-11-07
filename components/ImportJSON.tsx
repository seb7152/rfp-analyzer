"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, CheckCircle, AlertCircle, Copy } from "lucide-react";

interface ImportJSONProps {
  title: string;
  description: string;
  endpoint: string;
  onSuccess?: () => void;
  example?: string;
}

export function ImportJSON({
  title,
  description,
  endpoint,
  onSuccess,
  example,
}: ImportJSONProps) {
  const [jsonContent, setJsonContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isValidJSON, setIsValidJSON] = useState(false);

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setJsonContent(value);
    setError(null);
    setSuccess(null);

    if (value.trim() === "") {
      setIsValidJSON(false);
      return;
    }

    try {
      JSON.parse(value);
      setIsValidJSON(true);
    } catch {
      setIsValidJSON(false);
    }
  };

  const handleJsonPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData("text");

    try {
      const parsed = JSON.parse(pastedText);
      const formatted = JSON.stringify(parsed, null, 2);
      setJsonContent(formatted);
      setIsValidJSON(true);
      setError(null);
    } catch (err) {
      setError("Invalid JSON in clipboard");
      setIsValidJSON(false);
    }
  };

  const handleFormatJSON = () => {
    try {
      const parsed = JSON.parse(jsonContent);
      const formatted = JSON.stringify(parsed, null, 2);
      setJsonContent(formatted);
      setIsValidJSON(true);
      setError(null);
    } catch (err) {
      setError("Invalid JSON format");
      setIsValidJSON(false);
    }
  };

  const handleCopyExample = () => {
    if (example) {
      navigator.clipboard.writeText(example);
    }
  };

  const handleImport = async () => {
    if (!isValidJSON) {
      setError("Invalid JSON format");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ json: jsonContent }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(
          errorData.error ||
            `Import failed with status ${response.status}`
        );
        return;
      }

      const result = await response.json();
      setSuccess(result.message || "Import successful!");
      setJsonContent("");
      setIsValidJSON(false);

      setTimeout(() => {
        onSuccess?.();
      }, 1500);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An error occurred during import"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription className="text-slate-500 dark:text-slate-400">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* JSON Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            JSON Data
          </label>
          <textarea
            value={jsonContent}
            onChange={handleJsonChange}
            onPaste={handleJsonPaste}
            placeholder="Paste your JSON here... (will auto-format)"
            className={`w-full h-64 p-3 rounded border font-mono text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 placeholder-slate-400 dark:placeholder-slate-500 ${
              jsonContent && !isValidJSON
                ? "border-red-500"
                : isValidJSON
                  ? "border-green-500"
                  : "border-slate-200 dark:border-slate-700"
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-4">
          {jsonContent && (
            <div className="flex items-center gap-2">
              {isValidJSON ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-green-600 dark:text-green-400">Valid JSON</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <span className="text-sm text-red-600 dark:text-red-400">Invalid JSON</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-start gap-3 rounded border border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30 p-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="flex items-start gap-3 rounded border border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/30 p-3">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-green-700 dark:text-green-200">{success}</p>
          </div>
        )}

        {/* Example */}
        {example && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Example JSON
            </label>
            <div className="rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3">
              <pre className="overflow-x-auto text-xs text-slate-700 dark:text-slate-300 font-mono">
                {example}
              </pre>
            </div>
            <button
              onClick={handleCopyExample}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded border border-slate-200 dark:border-slate-700"
            >
              <Copy className="h-4 w-4" />
              Copy Example
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleFormatJSON}
            disabled={!jsonContent}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded border border-slate-200 dark:border-slate-700"
          >
            Format JSON
          </button>
          <button
            onClick={handleImport}
            disabled={!isValidJSON || isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded border border-blue-600 flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              "Import"
            )}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
