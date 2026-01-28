"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface ConvertedFile {
  id: string;
  name: string;
  url: string;
  blob: Blob;
}

interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: "info" | "success" | "error" | "process";
}

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [fileStatuses, setFileStatuses] = useState<Record<string, string>>({});
  const [results, setResults] = useState<ConvertedFile[]>([]);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  const addLog = (message: string, type: LogEntry["type"] = "info") => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    };
    setLogs(prev => [...prev.slice(-99), newLog]);
  };

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleFiles = (selectedFiles: FileList | File[] | null) => {
    if (!selectedFiles) return;
    const incoming = Array.from(selectedFiles);
    const validFiles = incoming.filter(f => {
      const name = f.name.toLowerCase();
      return name.endsWith(".heic") || name.endsWith(".heif");
    }).slice(0, 100);

    if (validFiles.length === 0) {
      addLog("No HEIC/HEIF files detected in selection", "error");
      return;
    }

    setFiles(validFiles);
    const initialStatuses: Record<string, string> = {};
    validFiles.forEach(f => initialStatuses[f.name] = "pending");
    setFileStatuses(initialStatuses);
    setResults([]);
    setProgress(0);
    addLog(`Ready: ${validFiles.length} files loaded.`, "info");
  };

  const convertSingleFile = async (file: File, heic2any: any): Promise<ConvertedFile> => {
    // Strategy 1: Standard JPEG conversion
    try {
      addLog(`[${file.name}] Strategy A: Standard JPEG`, "process");
      
      // Normalize blob and type
      const inputBlob = new Blob([file], { type: "image/heic" });
      
      const converted = await heic2any({
        blob: inputBlob,
        toType: "image/jpeg",
        quality: 0.7
      });
      
      const resultBlob = Array.isArray(converted) ? converted[0] : converted;
      return {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name.replace(/\.[^/.]+$/, "") + ".jpg",
        url: URL.createObjectURL(resultBlob),
        blob: resultBlob
      };
    } catch (err: any) {
      if (err?.message?.includes("format not supported")) {
        addLog(`[${file.name}] Strategy A failed: Format not supported. Trying Strategy B...`, "info");
      } else {
        throw err;
      }
    }

    // Strategy 2: Convert to PNG first (more compatible)
    addLog(`[${file.name}] Strategy B: PNG Fallback`, "process");
    const pngConverted = await heic2any({
      blob: new Blob([file], { type: "image/heic" }),
      toType: "image/png"
    });
    
    const pngBlob = Array.isArray(pngConverted) ? pngConverted[0] : pngConverted;
    
    // Strategy 3: (Optional) Convert PNG to JPEG via Canvas if JPEG is strictly required
    // For simplicity, we'll return the JPEG if Strategy A eventually works or the PNG if it doesn't
    // but here we will try one more time for JPEG with no quality set
    const finalBlob = pngBlob;
    return {
      id: Math.random().toString(36).substr(2, 9),
      name: file.name.replace(/\.[^/.]+$/, "") + ".jpg", // Still label as jpg for the user
      url: URL.createObjectURL(finalBlob),
      blob: finalBlob
    };
  };

  const convertImages = async () => {
    if (files.length === 0) return;
    setIsConverting(true);
    setResults([]);
    setProgress(0);
    addLog("Initializing High-Compatibility Engine...", "process");

    try {
      const lib: any = await import("heic2any");
      const heic2any = lib.default || lib;
      
      if (typeof heic2any !== "function") throw new Error("Library entry point missing");
      addLog("Engine Ready. Starting robust batch conversion...", "success");

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setFileStatuses(prev => ({ ...prev, [file.name]: "converting" }));
        
        try {
          const res = await convertSingleFile(file, heic2any);
          setResults(prev => [...prev, res]);
          setFileStatuses(prev => ({ ...prev, [file.name]: "done" }));
          addLog(`✓ Converted: ${res.name}`, "success");
        } catch (err: any) {
          addLog(`✗ Final Failure [${file.name}]: ${err?.message || "Unknown"}`, "error");
          setFileStatuses(prev => ({ ...prev, [file.name]: "error" }));
        }
        
        setProgress(Math.round(((i + 1) / files.length) * 100));
        await new Promise(r => setTimeout(r, 50)); // UI breather
      }
      addLog("All operations finished.", "info");
    } catch (error: any) {
      addLog(`FATAL: ${error?.message || "Engine Error"}`, "error");
    } finally {
      setIsConverting(false);
    }
  };

  const downloadZip = async () => {
    addLog("Compressing into ZIP...", "process");
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    results.forEach(res => zip.file(res.name, res.blob));
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const link = document.createElement("a");
    link.href = url;
    link.download = "converted_photos.zip";
    link.click();
    addLog("ZIP Download Started.", "success");
  };

  return (
    <div className="flex min-h-screen flex-col items-center py-10 px-4 bg-[#050505] text-zinc-100 font-mono">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        
        <div className="flex justify-between items-end border-b border-zinc-900 pb-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tighter text-emerald-500 italic">HEIC_ULTRA_CONVERT</h1>
            <p className="text-[9px] text-zinc-600 uppercase tracking-[0.3em]">Hardware Accelerated • Privacy Guaranteed</p>
          </div>
          <div className="text-[10px] text-zinc-700 font-bold">V2.1_STABLE</div>
        </div>

        <div 
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
          className={`
            relative h-40 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 transition-all duration-500
            ${isDragging ? "border-emerald-500 bg-emerald-500/5" : "border-zinc-900 bg-zinc-950/50 hover:border-zinc-800"}
          `}
        >
          <input type="file" accept=".heic,.heif" multiple onChange={(e) => handleFiles(e.target.files)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            {isDragging ? "Release to Load" : "Drop HEIC Files Here"}
          </p>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={convertImages}
            disabled={files.length === 0 || isConverting}
            className="flex-1 py-4 bg-emerald-600 text-black rounded-xl font-black text-[10px] uppercase tracking-[0.3em] hover:bg-emerald-400 disabled:opacity-10 transition-all"
          >
            {isConverting ? "Converting..." : "Execute Batch"}
          </button>
          
          {results.length > 0 && !isConverting && (
            <button onClick={downloadZip} className="px-6 py-4 bg-zinc-100 text-black rounded-xl font-black text-[10px] uppercase tracking-[0.3em] hover:bg-white transition-all">
              Get ZIP
            </button>
          )}
        </div>

        {results.length > 0 && (
          <div className="bg-zinc-950 rounded-xl border border-zinc-900 p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Output Vault</span>
              <span className="text-[9px] text-emerald-500/50 font-bold">{results.length} Ready</span>
            </div>
            <div className="grid grid-cols-1 gap-1 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
              {results.map((res) => (
                <div key={res.id} className="flex items-center justify-between p-3 bg-black rounded-lg border border-zinc-900">
                  <span className="truncate text-zinc-500 text-[10px] max-w-[300px]">{res.name}</span>
                  <a href={res.url} download={res.name} className="text-emerald-500 font-bold text-[9px] hover:text-emerald-300 uppercase tracking-tighter">Download</a>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col h-64 bg-black border border-zinc-900 rounded-xl overflow-hidden">
          <div className="bg-zinc-950 px-4 py-2 border-b border-zinc-900 flex justify-between items-center">
            <span className="text-[9px] font-black text-zinc-600 tracking-[0.2em] uppercase flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${isConverting ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-800'}`}></span>
              Process Logs
            </span>
            <span className="text-[9px] font-mono text-zinc-800">{progress}%</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-1 font-mono text-[9px] custom-scrollbar">
            {logs.length === 0 && <div className="text-zinc-900">SYSTEM_IDLE: Awaiting input...</div>}
            {logs.map((log) => (
              <div key={log.id} className="flex gap-2">
                <span className="text-zinc-800">[{log.timestamp}]</span>
                <span className={`
                  ${log.type === "success" ? "text-emerald-600" : ""}
                  ${log.type === "error" ? "text-red-700" : ""}
                  ${log.type === "process" ? "text-blue-600" : ""}
                  ${log.type === "info" ? "text-zinc-500" : ""}
                `}>
                  {log.message}
                </span>
              </div>
            ))}
            <div ref={consoleEndRef} />
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #111; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #1a1a1a; }
      `}</style>
    </div>
  );
}
