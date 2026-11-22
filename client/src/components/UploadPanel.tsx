import { useRef, useState, type DragEvent } from "react";
import { LIMITS } from "@workbench/shared";
import { validateFile } from "../api";

export interface Picked { file: File; error: string | null }

export function UploadPanel({ picked, onChange }: { picked: Picked[]; onChange: (p: Picked[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const add = (list: FileList | File[]) => {
    const next = [...picked];
    for (const f of Array.from(list)) {
      if (next.some((p) => p.file.name === f.name && p.file.size === f.size)) continue;
      next.push({ file: f, error: validateFile(f) });
    }
    onChange(next.slice(0, LIMITS.maxFiles));
  };
  const onDrop = (e: DragEvent) => { e.preventDefault(); setOver(false); add(e.dataTransfer.files); };

  return (
    <section aria-label="Upload documents">
      <div className={`drop ${over ? "drop-over" : ""}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)} onDrop={onDrop} onClick={() => input.current?.click()}
        role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && input.current?.click()}>
        <strong>Drop documents here or click to browse</strong>
        <span>{LIMITS.allowedExtensions.join(" ")} · up to {LIMITS.maxFiles} files · {LIMITS.maxFileBytes / 1024 / 1024} MB each</span>
        <input ref={input} type="file" multiple hidden accept={LIMITS.allowedExtensions.join(",")}
          onChange={(e) => { if (e.target.files) add(e.target.files); e.target.value = ""; }} />
      </div>
      <ul className="files">
        {picked.map((p, i) => (
          <li key={i} className={p.error ? "file-bad" : ""}>
            <span>{p.file.name} <small>({(p.file.size / 1024).toFixed(1)} KB)</small></span>
            {p.error && <small className="err">{p.error}</small>}
            <button type="button" aria-label={`Remove ${p.file.name}`} onClick={() => onChange(picked.filter((_, j) => j !== i))}>✕</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
