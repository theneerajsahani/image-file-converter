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
      addLog("No valid HEIC/HEIF detected", "error");
      return;
    }

    setFiles(validFiles);
    setResults([]);
    setProgress(0);
    addLog(`System: ${validFiles.length} files staged. Strategy: Raw Pixel Extraction.`, "info");
  };

  const convertSingleFile = async (file: File): Promise<ConvertedFile> => {
    try {
      addLog(`[${file.name}] Strategy C: Decoding raw pixels...`, "process");
      
      const decode = (await import("heic-decode")).default;
      const buffer = await file.arrayBuffer();
      const { width, height, data } = await decode({ buffer: new Uint8Array(buffer) });

      addLog(`[${file.name}] Pixel map extracted (${width}x${height}). Painting to canvas...`, "info");

      // Use Canvas to convert raw pixels to JPEG
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      
      if (!ctx) throw new Error("Could not initialize 2D context");

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
            reject(new Error("Canvas to JPEG conversion failed"));
          }
        }, "image/jpeg", 0.9);
      });
    } catch (err: any) {
      console.error(err);
      throw new Error(err?.message || "Internal Decoder Error");
    }
  };

  const convertImages = async () => {
    if (files.length === 0) return;
    setIsConverting(true);
    setResults([]);
    setProgress(0);
    addLog("System: Initializing Low-Level Decoders...", "process");

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        addLog(`>> Processing [${i+1}/${files.length}]: ${file.name}`, "process");
        
        try {
          const res = await convertSingleFile(file);
          setResults(prev => [...prev, res]);
          addLog(`✓ SUCCESS: ${res.name}`, "success");
        } catch (err: any) {
          addLog(`✗ ERROR: ${err?.message}`, "error");
        }
        
        setProgress(Math.round(((i + 1) / files.length) * 100));
        await new Promise(r => setTimeout(r, 50));
      }
      addLog("Batch sequence completed.", "success");
    } catch (error: any) {
      addLog(`FATAL SYSTEM ERROR: ${error?.message}`, "error");
    } finally {
      setIsConverting(false);
    }
  };

  const downloadZip = async () => {
    addLog("Building ZIP package...", "process");
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    results.forEach(res => zip.file(res.name, res.blob));
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const link = document.createElement("a");
    link.href = url;
    link.download = "converted_images.zip";
    link.click();
    addLog("Download sequence initiated.", "success");
  };

  return (
    <div className="flex min-h-screen flex-col items-center py-10 px-4 bg-[#010101] text-zinc-400 font-mono">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        
        <div className="flex justify-between items-end border-b border-zinc-900 pb-8">
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-emerald-500 uppercase">HEIC_RAW_DECODER_V3.0</h1>
            <p className="text-[8px] text-zinc-700 uppercase tracking-[0.4em] mt-1">Direct Pixel Extraction • No Proxy • 100% Local</p>
          </div>
          <div className="text-[10px] text-zinc-800 font-black">CORE_STABLE</div>
        </div>

        <div 
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
          className={`
            relative h-36 border border-zinc-900 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all duration-500
            ${isDragging ? "border-emerald-500 bg-emerald-500/[0.01]" : "bg-zinc-950/10 hover:bg-zinc-950/30"}
          `}
        >
          <input type="file" accept=".heic,.heif" multiple onChange={(e) => handleFiles(e.target.files)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-800">
            {isDragging ? "Drop Data" : "Initialize Input"}
          </p>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={convertImages}
            disabled={files.length === 0 || isConverting}
            className="flex-1 py-5 bg-emerald-600 text-black rounded-xl font-black text-[10px] uppercase tracking-[0.4em] hover:bg-emerald-400 disabled:opacity-5 transition-all"
          >
            {isConverting ? "DECODING..." : `EXEC_BATCH (${files.length})`}
          </button>
          
          {results.length > 0 && !isConverting && (
            <button onClick={downloadZip} className="px-10 py-5 bg-white text-black rounded-xl font-black text-[10px] uppercase tracking-[0.4em] hover:bg-zinc-200 transition-all">
              EXPORT_ZIP
            </button>
          )}
        </div>

        {results.length > 0 && (
          <div className="bg-zinc-950/30 rounded-2xl border border-zinc-900 p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-900/50 pb-3">
              <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">Decrypted Assets</span>
              <span className="text-[8px] text-emerald-500/20 font-bold">{results.length} UNITS</span>
            </div>
            <div className="grid grid-cols-1 gap-1 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
              {results.map((res) => (
                <div key={res.id} className="flex items-center justify-between p-3 bg-black rounded-xl border border-zinc-900/50">
                  <span className="truncate text-zinc-600 text-[10px] max-w-[300px]">{res.name}</span>
                  <a href={res.url} download={res.name} className="text-emerald-500 font-black text-[9px] hover:text-emerald-300 uppercase tracking-tighter">Download</a>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col h-80 bg-black border border-zinc-900 rounded-2xl overflow-hidden shadow-2xl">
          <div className="bg-zinc-950 px-5 py-3 border-b border-zinc-900 flex justify-between items-center">
            <span className="text-[9px] font-black text-zinc-800 tracking-[0.3em] uppercase flex items-center gap-2">
              <span className={`w-1 h-1 rounded-full ${isConverting ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-900'}`}></span>
              System_Buffer
            </span>
            <div className="flex gap-4 items-center">
              <span className="text-[8px] text-zinc-900 font-mono">{progress}%</span>
              <button onClick={() => setLogs([])} className="text-[8px] text-zinc-900 hover:text-zinc-600 font-black uppercase tracking-tighter">Purge</button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-2 font-mono text-[9px] custom-scrollbar">
            {logs.length === 0 && <div className="text-zinc-900 italic tracking-[0.4em]">STANDBY...</div>}
            {logs.map((log) => (
              <div key={log.id} className="flex gap-3 leading-tight">
                <span className="text-zinc-900 shrink-0">[{log.timestamp}]</span>
                <span className={`
                  ${log.type === "success" ? "text-emerald-800" : ""}
                  ${log.type === "error" ? "text-red-950" : ""}
                  ${log.type === "process" ? "text-zinc-600" : ""}
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

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 1px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #0a0a0a; }
      `}</style>
    </div>
  );
}
