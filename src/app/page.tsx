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
  const [results, setResults] = useState<ConvertedFile[]>([]);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  const addLog = (message: string, type: LogEntry["type"] = "info") => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString().split(' ')[0],
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
      addLog("INVALID_INPUT: HEIC_REQUIRED", "error");
      return;
    }

    setFiles(validFiles);
    setResults([]);
    setProgress(0);
    addLog(`SYSTEM: ${validFiles.length} FILES_STAGED`, "info");
  };

  const convertSingleFile = async (file: File, heicDecode: any): Promise<ConvertedFile> => {
    try {
      const buffer = await file.arrayBuffer();
      const { width, height, data } = await heicDecode({ buffer: new Uint8Array(buffer) });

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("CANVAS_INIT_FAIL");

      const imageData = new ImageData(new Uint8ClampedArray(data), width, height);
      ctx.putImageData(imageData, 0, 0);

      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve({
              id: Math.random().toString(36).substr(2, 9),
              name: file.name.replace(/\.[^/.]+$/, "") + ".jpg",
              url: URL.createObjectURL(blob),
              blob: blob
            });
          } else {
            reject(new Error("BLOB_GEN_FAIL"));
          }
        }, "image/jpeg", 0.8);
      });
    } catch (err: any) {
      throw new Error(err?.message || "DECODE_ERR");
    }
  };

  const convertImages = async () => {
    if (files.length === 0 || isConverting) return;
    setIsConverting(true);
    setResults([]);
    setProgress(0);
    addLog("TURBO_MODE: INITIALIZING_CORES", "process");

    try {
      const lib: any = await import("heic-decode");
      const decode = lib.default || lib;
      
      const fileList = [...files];
      const total = fileList.length;
      let completed = 0;
      const CONCURRENCY = 3; // Process 3 at a time for speed without crashing

      addLog(`ENGINE: CORE_CONCURRENCY=${CONCURRENCY}`, "info");

      const processBatch = async () => {
        while (fileList.length > 0) {
          const file = fileList.shift();
          if (!file) break;

          addLog(`START: ${file.name}`, "process");
          try {
            const res = await convertSingleFile(file, decode);
            setResults(prev => [...prev, res]);
            addLog(`DONE: ${res.name}`, "success");
          } catch (err: any) {
            addLog(`FAIL: ${file.name} (${err.message})`, "error");
          }
          completed++;
          setProgress(Math.round((completed / total) * 100));
        }
      };

      // Fire off concurrent workers
      await Promise.all(Array(CONCURRENCY).fill(null).map(processBatch));
      addLog("TURBO_BATCH_COMPLETE", "success");
    } catch (error: any) {
      addLog(`FATAL: ${error?.message}`, "error");
    } finally {
      setIsConverting(false);
    }
  };

  const downloadZip = async () => {
    addLog("ZIPPING_ASSETS", "process");
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    results.forEach(res => zip.file(res.name, res.blob));
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const link = document.createElement("a");
    link.href = url;
    link.download = "batch_export.zip";
    link.click();
    addLog("ARCHIVE_READY", "success");
  };

  return (
    <div className="h-screen w-full bg-[#050505] text-zinc-400 font-mono p-4 flex items-center justify-center overflow-hidden">
      <div className="w-full max-w-5xl h-full max-h-[700px] grid grid-cols-1 md:grid-cols-12 gap-4">
        
        {/* Left Panel: Controls */}
        <div className="md:col-span-4 flex flex-col gap-4 overflow-hidden">
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 flex flex-col shrink-0">
            <h1 className="text-xl font-black tracking-tighter text-emerald-500 uppercase italic">TURBO_HEIC_V4</h1>
            <p className="text-[8px] text-zinc-700 uppercase tracking-[0.3em] mt-1">Parallel Pixel Extraction</p>
          </div>

          <div 
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
            className={`
              relative flex-1 border border-dashed rounded-2xl flex flex-col items-center justify-center gap-4 transition-all
              ${isDragging ? "border-emerald-500 bg-emerald-500/[0.02]" : "border-zinc-900 bg-zinc-950/20 hover:bg-zinc-950/40"}
            `}
          >
            <input type="file" accept=".heic,.heif" multiple onChange={(e) => handleFiles(e.target.files)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isDragging ? 'bg-emerald-500 text-black' : 'bg-zinc-900 text-zinc-700'}`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="2.5" strokeLinecap="round" /></svg>
            </div>
            <div className="text-center">
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Drop_Source_Data</p>
              {files.length > 0 && <p className="text-[8px] text-emerald-500/50 mt-1">{files.length} UNIT(S) STAGED</p>}
            </div>
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            <button 
              onClick={convertImages}
              disabled={files.length === 0 || isConverting}
              className="w-full py-4 bg-emerald-600 text-black rounded-xl font-black text-[10px] uppercase tracking-[0.4em] hover:bg-emerald-400 disabled:opacity-5 transition-all"
            >
              {isConverting ? "TURBO_ACTIVE" : "RUN_DECODER"}
            </button>
            <button 
              onClick={downloadZip}
              disabled={results.length === 0 || isConverting}
              className="w-full py-4 bg-white text-black rounded-xl font-black text-[10px] uppercase tracking-[0.4em] hover:bg-zinc-200 disabled:opacity-5 transition-all"
            >
              EXPORT_ALL ({results.length})
            </button>
          </div>
        </div>

        {/* Right Panel: Logs and Output */}
        <div className="md:col-span-8 flex flex-col gap-4 overflow-hidden h-full">
          
          {/* Output Vault */}
          <div className="flex-1 bg-zinc-950/30 rounded-2xl border border-zinc-900 p-5 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center border-b border-zinc-900/50 pb-3 mb-3">
              <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest italic">Asset_Vault</span>
              <span className="text-[8px] text-emerald-500/30 font-bold">{progress}% COMPLETE</span>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-1">
              {results.length === 0 && <div className="h-full flex items-center justify-center text-zinc-900 text-[9px] italic tracking-widest">NO_ASSETS_GENERATED</div>}
              {results.map((res) => (
                <div key={res.id} className="flex items-center justify-between p-2 bg-black rounded-lg border border-zinc-900/50 hover:border-emerald-500/20 transition-colors">
                  <span className="truncate text-zinc-600 text-[9px] max-w-[400px]">{res.name}</span>
                  <a href={res.url} download={res.name} className="text-emerald-500 font-black text-[9px] hover:text-emerald-300 uppercase tracking-tighter ml-4">Pull</a>
                </div>
              ))}
            </div>
          </div>

          {/* Console Buffer */}
          <div className="h-48 bg-black border border-zinc-900 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
            <div className="bg-zinc-950 px-5 py-2 border-b border-zinc-900 flex justify-between items-center shrink-0">
              <span className="text-[8px] font-black text-zinc-800 tracking-[0.3em] uppercase">Log_Stream</span>
              <button onClick={() => setLogs([])} className="text-[8px] text-zinc-800 hover:text-zinc-600 font-black uppercase">Purge</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1 font-mono text-[9px] custom-scrollbar bg-[radial-gradient(#111_1px,transparent_1px)] bg-[size:20px_20px]">
              {logs.map((log) => (
                <div key={log.id} className="flex gap-3 leading-tight opacity-80 hover:opacity-100 transition-opacity">
                  <span className="text-zinc-900 shrink-0 select-none">{log.timestamp}</span>
                  <span className={`
                    ${log.type === "success" ? "text-emerald-800" : ""}
                    ${log.type === "error" ? "text-red-900" : ""}
                    ${log.type === "process" ? "text-blue-900" : ""}
                    ${log.type === "info" ? "text-zinc-800" : ""}
                  `}>
                    {log.message}
                  </span>
                </div>
              ))}
              <div ref={consoleEndRef} />
            </div>
          </div>

        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 2px; height: 2px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #111; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #1a1a1a; }
        body { overflow: hidden; }
      `}</style>
    </div>
  );
}
