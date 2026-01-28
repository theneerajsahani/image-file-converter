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
    addLog(`System: ${validFiles.length} files staged for conversion.`, "info");
  };

  const convertSingleFile = async (file: File, heic2any: any): Promise<ConvertedFile> => {
    // Diagnostic: Read first 16 bytes
    const buf = await file.slice(0, 16).arrayBuffer();
    const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join(' ');
    addLog(`Header [${file.name.slice(-10)}]: ${hex}`, "info");

    // Attempt 1: JPEG with Multiple Support
    try {
      addLog(`Task: Primary JPEG Extract...`, "process");
      const converted = await heic2any({
        blob: file,
        toType: "image/jpeg",
        quality: 0.7,
        multiple: true // Handle multi-image containers
      });
      
      const resultBlob = Array.isArray(converted) ? converted[0] : converted;
      return {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name.replace(/\.[^/.]+$/, "") + ".jpg",
        url: URL.createObjectURL(resultBlob),
        blob: resultBlob
      };
    } catch (err: any) {
      addLog(`JPEG Method Failed. Trying PNG Fallback...`, "info");
    }

    // Attempt 2: PNG Fallback
    try {
      addLog(`Task: Safe-Mode PNG Extract...`, "process");
      const pngConverted = await heic2any({
        blob: file,
        toType: "image/png",
        multiple: true
      });
      
      const pngBlob = Array.isArray(pngConverted) ? pngConverted[0] : pngConverted;
      return {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name.replace(/\.[^/.]+$/, "") + ".jpg",
        url: URL.createObjectURL(pngBlob),
        blob: pngBlob
      };
    } catch (err: any) {
      throw new Error("HEIF Decoder failed to read this specific encoding profile.");
    }
  };

  const convertImages = async () => {
    if (files.length === 0) return;
    setIsConverting(true);
    setResults([]);
    setProgress(0);
    addLog("System: Loading WASM Decoders...", "process");

    try {
      const lib: any = await import("heic2any");
      const heic2any = lib.default || lib;
      
      addLog("System: Decoders Active.", "success");

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        addLog(`>> UNIT [${i+1}/${files.length}]: ${file.name}`, "process");
        
        try {
          const res = await convertSingleFile(file, heic2any);
          setResults(prev => [...prev, res]);
          addLog(`✓ SUCCESS: ${res.name}`, "success");
        } catch (err: any) {
          addLog(`✗ ERROR: ${err?.message || "Incompatible format"}`, "error");
        }
        
        setProgress(Math.round(((i + 1) / files.length) * 100));
        await new Promise(r => setTimeout(r, 100));
      }
      addLog("Sequence terminated. Check Output Vault.", "info");
    } catch (error: any) {
      addLog(`CRITICAL SYSTEM ERROR: ${error?.message}`, "error");
    } finally {
      setIsConverting(false);
    }
  };

  const downloadZip = async () => {
    addLog("Packaging results...", "process");
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    results.forEach(res => zip.file(res.name, res.blob));
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const link = document.createElement("a");
    link.href = url;
    link.download = "converted_images.zip";
    link.click();
    addLog("Archive delivered.", "success");
  };

  return (
    <div className="flex min-h-screen flex-col items-center py-10 px-4 bg-[#020202] text-zinc-300 font-mono">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        
        <div className="flex justify-between items-center border-b border-zinc-900 pb-8">
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-emerald-500 uppercase">HEIC_ENGINE_V2.2</h1>
            <p className="text-[8px] text-zinc-600 uppercase tracking-[0.4em] mt-1 italic">Multi-Threaded Virtual Decoders • 100% Local</p>
          </div>
          <div className="flex flex-col items-end">
             <span className={`text-[10px] font-bold ${isConverting ? 'text-emerald-500 animate-pulse' : 'text-zinc-800'}`}>
               {isConverting ? "EXECUTING_BATCH" : "SYSTEM_READY"}
             </span>
             <span className="text-[8px] text-zinc-900">KERNEL_MODE: STABLE</span>
          </div>
        </div>

        <div 
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
          className={`
            relative h-44 border border-zinc-900 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all duration-700
            ${isDragging ? "border-emerald-500 bg-emerald-500/[0.02]" : "bg-zinc-950/20 hover:bg-zinc-950/40"}
          `}
        >
          <input type="file" accept=".heic,.heif" multiple onChange={(e) => handleFiles(e.target.files)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isDragging ? 'bg-emerald-500 text-black rotate-12' : 'bg-zinc-900 text-zinc-700'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">
            {isDragging ? "Deploy Sequence" : "Initialize Input Sequence"}
          </p>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={convertImages}
            disabled={files.length === 0 || isConverting}
            className="flex-1 py-5 bg-emerald-600 text-black rounded-xl font-black text-[10px] uppercase tracking-[0.4em] hover:bg-emerald-400 disabled:opacity-5 transition-all shadow-[0_0_20px_rgba(16,185,129,0.1)]"
          >
            {isConverting ? "PROCESSING..." : `RUN_BATCH (${files.length})`}
          </button>
          
          {results.length > 0 && !isConverting && (
            <button onClick={downloadZip} className="px-10 py-5 bg-white text-black rounded-xl font-black text-[10px] uppercase tracking-[0.4em] hover:bg-zinc-200 transition-all">
              GET_ZIP
            </button>
          )}
        </div>

        {results.length > 0 && (
          <div className="bg-zinc-950/50 rounded-2xl border border-zinc-900 p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-900/50 pb-3">
              <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Decrypted Assets</span>
              <span className="text-[8px] text-emerald-500/30 font-bold">{results.length} UNITS_READY</span>
            </div>
            <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
              {results.map((res) => (
                <div key={res.id} className="flex items-center justify-between p-3 bg-black/40 rounded-xl border border-zinc-900/50 hover:border-emerald-500/20 transition-colors">
                  <span className="truncate text-zinc-500 text-[10px] max-w-[280px] font-bold">{res.name}</span>
                  <a href={res.url} download={res.name} className="text-emerald-500 font-black text-[9px] hover:text-emerald-300 uppercase tracking-tighter border-b border-emerald-500/20">Extract</a>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col h-72 bg-black border border-zinc-900 rounded-2xl overflow-hidden shadow-2xl">
          <div className="bg-zinc-950 px-5 py-3 border-b border-zinc-900 flex justify-between items-center">
            <span className="text-[9px] font-black text-zinc-700 tracking-[0.3em] uppercase flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${isConverting ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-800'}`}></span>
              Log_Buffer
            </span>
            <div className="flex gap-4 items-center">
              <span className="text-[8px] text-zinc-800 font-mono">FLOW_RATE: {progress}%</span>
              <button onClick={() => setLogs([])} className="text-[8px] text-zinc-800 hover:text-zinc-500 font-black uppercase tracking-tighter">Flush</button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-2 font-mono text-[10px] custom-scrollbar">
            {logs.length === 0 && <div className="text-zinc-900 italic tracking-widest">Awaiting Command...</div>}
            {logs.map((log) => (
              <div key={log.id} className="flex gap-3 leading-tight border-l border-zinc-900 pl-3">
                <span className="text-zinc-800 shrink-0 select-none">[{log.timestamp}]</span>
                <span className={`
                  ${log.type === "success" ? "text-emerald-700" : ""}
                  ${log.type === "error" ? "text-red-900" : ""}
                  ${log.type === "process" ? "text-zinc-500" : ""}
                  ${log.type === "info" ? "text-zinc-700" : ""}
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
        .custom-scrollbar::-webkit-scrollbar { width: 2px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #0f0f0f; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #1a1a1a; }
      `}</style>
    </div>
  );
}
