"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Editor = dynamic(() => import("@monaco-editor/react").then((m) => m.Editor), { ssr: false });

const DEFAULT_NAME = (language, index) =>
  language === "python" ? `module${index}.py` : `module${index}.js`;

/**
 * Edits a set of files, each with a broken and correct version.
 *
 * Files are `[{ name, broken, correct }]` and `entryFile` names the one that
 * exposes the challenge function. Kept as a distinct component from the
 * single-file editors so the simple case stays simple — most challenges are
 * still one file, and this only appears when multi-file is switched on.
 */
export function FileSetEditor({ files, entryFile, language, onChange, onEntryChange }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [variant, setVariant] = useState("broken");

  const active = files[activeIndex];

  function updateActive(patch) {
    onChange(files.map((f, i) => (i === activeIndex ? { ...f, ...patch } : f)));
  }

  function addFile() {
    const name = DEFAULT_NAME(language, files.length + 1);
    onChange([...files, { name, broken: "", correct: "" }]);
    setActiveIndex(files.length);
  }

  function removeFile(index) {
    const removed = files[index];
    const next = files.filter((_, i) => i !== index);
    onChange(next);
    setActiveIndex((current) => Math.max(0, current >= next.length ? next.length - 1 : current));
    // The entry file must always point at a file that still exists.
    if (removed?.name === entryFile) onEntryChange(next[0]?.name ?? "");
  }

  function rename(newName) {
    const oldName = active.name;
    updateActive({ name: newName });
    if (entryFile === oldName) onEntryChange(newName);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {files.map((file, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={`rounded-md px-3 py-1 font-mono text-xs transition-colors ${
              index === activeIndex
                ? "bg-primary/12 font-medium text-primary"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {file.name || "untitled"}
            {file.name === entryFile && <span className="ml-1.5 opacity-60">entry</span>}
          </button>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addFile}>
          <PlusIcon /> Add file
        </Button>
      </div>

      {active && (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor="file-name">
                File name
              </Label>
              <Input
                id="file-name"
                className="w-56 font-mono text-sm"
                value={active.name}
                onChange={(e) => rename(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Entry file</Label>
              <select
                value={entryFile ?? ""}
                onChange={(e) => onEntryChange(e.target.value)}
                className="h-8 rounded-lg border bg-background px-2 text-sm"
              >
                {files.map((f, i) => (
                  <option key={i} value={f.name}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex rounded-lg border p-0.5">
              {[
                { key: "broken", label: "Broken" },
                { key: "correct", label: "Correct" },
              ].map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setVariant(option.key)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    variant === option.key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {files.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={() => removeFile(activeIndex)}
              >
                <Trash2Icon /> Remove file
              </Button>
            )}
          </div>

          <div className="overflow-hidden rounded-lg border">
            <Editor
              // Remount per file+variant, or Monaco keeps showing the
              // previous buffer when switching tabs.
              key={`${activeIndex}-${variant}`}
              height="300px"
              language={language}
              value={active[variant] ?? ""}
              onChange={(v) => updateActive({ [variant]: v ?? "" })}
              theme="vs-dark"
              options={{ minimap: { enabled: false }, fontSize: 13 }}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            {language === "python"
              ? "Files are imported normally — use `from module import name`. The entry file must define the challenge function."
              : "Files use CommonJS — `require('./module')` and `module.exports`. The entry file must export the challenge function."}
          </p>
        </>
      )}
    </div>
  );
}
