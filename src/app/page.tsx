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
    setLogs(prev => [...prev.slice(-49), newLog]);
  };

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleFiles = (selectedFiles: FileList | File[] | null) => {
    if (!selectedFiles) return;
    
    const incoming = Array.from(selectedFiles);
    const validFiles = incoming
      .filter(f => f.name.toLowerCase().endsWith(".heic"))
      .slice(0, 100);

    if (validFiles.length === 0) {
      addLog("No valid .heic files detected", "error");
      alert("Please drop .heic files only.");
      return;
    }

    setFiles(validFiles);
    setResults([]);
    setProgress(0);
    addLog(`Loaded ${validFiles.length} files. Ready to convert.`, "success");
  };

  const convertImages = async () => {
    if (files.length === 0) return;
    setIsConverting(true);
    setResults([]);
    setProgress(0);
    addLog("System Check: Initializing engine...", "process");

    try {
      // More robust dynamic import
      const lib: any = await import("heic2any");
      const heic2any = lib.default || lib;
      
      if (typeof heic2any !== "function") {
        throw new Error("Conversion engine failed to initialize correctly (Not a function).");
      }
      
      addLog("System Check: Engine ready.", "success");

      const converted: ConvertedFile[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        addLog(`Converting [${i+1}/${files.length}]: ${file.name}`, "process");
        
        setFileStatuses(prev => ({ ...prev, [file.name]: "converting" }));

        try {
          // Verify file size
          if (file.size > 50 * 1024 * 1024) {
            throw new Error("File too large (>50MB).");
          }

          const blob = await heic2any({
            blob: file,
            toType: "image/jpeg",
            quality: 0.6, // Lower quality for better success rate on large files
          });
          
          const resultBlob = Array.isArray(blob) ? blob[0] : blob;
          const fileName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
          
          const res: ConvertedFile = {
            id: Math.random().toString(36).substr(2, 9),
            name: fileName,
            url: URL.createObjectURL(resultBlob),
            blob: resultBlob,
          };
          
          setResults(prev => [...prev, res]);
          setFileStatuses(prev => ({ ...prev, [file.name]: "done" }));
          addLog(`✓ Converted: ${fileName}`, "success");
        } catch (err: any) {
          const errorMsg = err?.message || "Internal conversion error";
          addLog(`✗ Error on ${file.name}: ${errorMsg}`, "error");
          console.error("Detailed conversion error:", err);
          setFileStatuses(prev => ({ ...prev, [file.name]: "error" }));
        }
        setProgress(Math.round(((i + 1) / files.length) * 100));
      }
      addLog("Batch processing complete.", "info");
    } catch (error: any) {
      addLog(`FATAL: ${error?.message || "Engine load failed"}`, "error");
      console.error(error);
    } finally {
      setIsConverting(false);
    }
  };

  const downloadZip = async () => {
    addLog("Generating ZIP archive...", "process");
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    results.forEach(res => zip.file(res.name, res.blob));
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const link = document.createElement("a");
    link.href = url;
    link.download = "converted_images.zip";
    link.click();
    addLog("ZIP download started.", "success");
  };

  return (
    <div className="flex min-h-screen flex-col items-center py-10 px-4 bg-[#0a0a0a] text-zinc-100 font-mono">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex justify-between items-end border-b border-zinc-800 pb-6">
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tighter text-emerald-500 uppercase">HEIC_CONVERTER_V2.0</h1>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Local Memory • Client Side • Batch Enabled</p>
          </div>
          <div className="text-[10px] text-right font-bold text-zinc-600">
            STATUS: {isConverting ? "RUNNING" : "READY"}
          </div>
        </div>

        {/* Upload Zone */}
        <div 
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
          className={`
            relative h-48 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 transition-all
            ${isDragging ? "border-emerald-500 bg-emerald-500/5" : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-700"}
          `}
        >
          <input type="file" accept=".heic" multiple onChange={(e) => handleFiles(e.target.files)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
          <svg className={`w-8 h-8 ${isDragging ? "text-emerald-500" : "text-zinc-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
          </svg>
          <p className="text-xs font-bold uppercase tracking-widest">{isDragging ? "Drop Files Now" : "Drag & Drop HEIC Files"}</p>
        </div>

        {/* Action Bar */}
        <div className="flex gap-4">
          <button 
            onClick={convertImages}
            disabled={files.length === 0 || isConverting}
            className="flex-1 py-4 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] hover:bg-emerald-500 disabled:opacity-20 disabled:grayscale transition-all shadow-lg shadow-emerald-900/20"
          >
            {isConverting ? "Converting..." : `Run Conversion (${files.length})`}
          </button>
          
          {results.length > 0 && !isConverting && (
            <button 
              onClick={downloadZip}
              className="px-8 py-4 bg-zinc-100 text-black rounded-xl font-black text-xs uppercase tracking-[0.2em] hover:bg-white transition-all"
            >
              Get ZIP
            </button>
          )}
        </div>

        {/* Result Table */}
        {results.length > 0 && (
          <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-4">
            <h2 className="text-[10px] font-black uppercase text-zinc-500 mb-4 tracking-widest">Successful Conversions</h2>
            <div className="grid grid-cols-1 gap-1 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
              {results.map((res) => (
                <div key={res.id} className="flex items-center justify-between p-3 bg-black/40 rounded-lg text-[10px] border border-zinc-800/50">
                  <span className="truncate text-zinc-400 max-w-[280px]">{res.name}</span>
                  <a href={res.url} download={res.name} className="text-emerald-500 font-black hover:text-emerald-400 underline uppercase tracking-tighter">Download</a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activity Console */}
        <div className="flex flex-col h-48 bg-black border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
          <div className="bg-zinc-900 px-4 py-2 border-b border-zinc-800 flex justify-between items-center">
            <span className="text-[9px] font-black text-zinc-500 tracking-widest uppercase flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Activity Console
            </span>
            <button onClick={() => setLogs([])} className="text-[9px] text-zinc-600 hover:text-zinc-400 font-bold uppercase">Clear</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-1.5 font-mono text-[10px] custom-scrollbar bg-[radial-gradient(#1a1a1a_1px,transparent_1px)] bg-[size:16px_16px]">
            {logs.length === 0 && <div className="text-zinc-800 italic">Waiting for input sequence...</div>}
            {logs.map((log) => (
              <div key={log.id} className="flex gap-3 leading-relaxed">
                <span className="text-zinc-700 shrink-0">[{log.timestamp}]</span>
                <span className={`
                  ${log.type === "success" ? "text-emerald-500" : ""}
                  ${log.type === "error" ? "text-red-500" : ""}
                  ${log.type === "process" ? "text-blue-400" : ""}
                  ${log.type === "info" ? "text-zinc-400" : ""}
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
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3f3f46; }
      `}</style>
    </div>
  );
}
