"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Import failed");
        return;
      }

      setSuccess(data.message || "Import successful");
      setJsonContent("");
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyExample = () => {
    if (example) {
      navigator.clipboard.writeText(example);
    }
  };

  return (
    <Card className="border-slate-700 bg-slate-800">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription className="text-slate-400">
          {description}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* JSON Textarea */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-200">
            JSON Data
          </label>
          <textarea
            value={jsonContent}
            onChange={handleJsonChange}
            onPaste={handleJsonPaste}
            placeholder="Paste your JSON here... (will auto-format)"
            className={`w-full h-64 p-4 rounded-lg border bg-slate-700 text-slate-50 font-mono text-sm placeholder-slate-500 ${
              jsonContent && !isValidJSON
                ? "border-red-500"
                : isValidJSON
                  ? "border-green-500"
                  : "border-slate-600"
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
                  <span className="text-sm text-green-400">Valid JSON</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <span className="text-sm text-red-400">Invalid JSON</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-red-500 bg-red-950 p-4">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="flex items-start gap-3 rounded-lg border border-green-500 bg-green-950 p-4">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-green-200">{success}</p>
          </div>
        )}

        {/* Example */}
        {example && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200">
              Example JSON
            </label>
            <div className="rounded-lg bg-slate-900 p-4">
              <pre className="overflow-x-auto text-xs text-slate-300 font-mono">
                {example}
              </pre>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyExample}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Example
            </Button>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={handleFormatJSON}
            variant="outline"
            disabled={!jsonContent}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            Format JSON
          </Button>
          <Button
            onClick={handleImport}
            disabled={!isValidJSON || isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              "Import"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
