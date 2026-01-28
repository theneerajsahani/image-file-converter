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
      timestamp: new Date().toLocaleTimeString('en-GB', { hour12: false }),
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
    const validFiles = incoming.filter(f => {
      const name = f.name.toLowerCase();
      return name.endsWith(".heic") || name.endsWith(".heif");
    }).slice(0, 100);

    if (validFiles.length === 0) {
      addLog("Error: No HEIC files detected", "error");
      return;
    }

    setFiles(validFiles);
    setResults([]);
    setProgress(0);
    addLog(`Staged ${validFiles.length} files.`, "info");
  };

  const convertSingleFile = async (file: File, heicDecode: any): Promise<ConvertedFile> => {
    const buffer = await file.arrayBuffer();
    const { width, height, data } = await heicDecode({ buffer: new Uint8Array(buffer) });
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context failed");
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
          reject(new Error("Blob generation failed"));
        }
      }, "image/jpeg", 0.85);
    });
  };

  const convertImages = async () => {
    if (files.length === 0 || isConverting) return;
    setIsConverting(true);
    setResults([]);
    setProgress(0);
    addLog("Starting conversion...", "process");

    try {
      const lib: any = await import("heic-decode");
      const decode = lib.default || lib;
      
      const total = files.length;
      for (let i = 0; i < total; i++) {
        const file = files[i];
        addLog(`Converting ${file.name}...`, "process");
        try {
          const res = await convertSingleFile(file, decode);
          setResults(prev => [...prev, res]);
          addLog(`Success: ${res.name}`, "success");
        } catch (err: any) {
          addLog(`Error: ${file.name} failed`, "error");
        }
        setProgress(Math.round(((i + 1) / total) * 100));
        await new Promise(r => setTimeout(r, 20));
      }
      addLog("All conversions finished.", "success");
    } catch (error: any) {
      addLog(`Fatal Error: ${error?.message}`, "error");
    } finally {
      setIsConverting(false);
    }
  };

  const downloadZip = async () => {
    addLog("Generating ZIP file...", "process");
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    results.forEach(res => zip.file(res.name, res.blob));
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const link = document.createElement("a");
    link.href = url;
    link.download = "converted_images.zip";
    link.click();
    addLog("ZIP ready for download.", "success");
  };

  return (
    <div className="min-h-screen w-full bg-zinc-950 text-zinc-100 font-sans p-4 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-2xl bg-zinc-900 rounded-[2rem] border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-8 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Image Converter</h1>
            <p className="text-sm text-zinc-500 mt-1">HEIC to JPEG • Private & Browser-based</p>
          </div>
          {files.length > 0 && !isConverting && (
            <button onClick={() => setFiles([])} className="text-xs font-bold text-zinc-600 hover:text-red-500 transition-colors uppercase tracking-widest">Clear</button>
          )}
        </div>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          
          {/* Upload Section */}
          <div 
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
            className={`
              relative border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center gap-4 transition-all duration-300
              ${isDragging ? "border-emerald-500 bg-emerald-500/5" : "border-zinc-800 bg-black/20 hover:border-zinc-700"}
            `}
          >
            <input type="file" accept=".heic,.heif" multiple onChange={(e) => handleFiles(e.target.files)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${isDragging ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" strokeWidth="2" strokeLinecap="round" /></svg>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-white">
                {files.length > 0 ? `${files.length} Files Ready` : "Drop HEIC Files"}
              </p>
              <p className="text-sm text-zinc-500 mt-1">or click to browse from device</p>
            </div>
          </div>

          {/* Action Area */}
          <div className="space-y-4">
            {!isConverting && files.length > 0 && results.length === 0 && (
              <button 
                onClick={convertImages}
                className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-lg transition-all shadow-lg shadow-emerald-900/20 active:scale-[0.98]"
              >
                Convert to JPEG
              </button>
            )}

            {isConverting && (
              <div className="space-y-3 px-2">
                <div className="flex justify-between text-[10px] font-black uppercase text-zinc-500 tracking-widest">
                  <span>Converting...</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            )}

            {results.length > 0 && !isConverting && (
              <button 
                onClick={downloadZip}
                className="w-full py-5 bg-white text-black hover:bg-zinc-200 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth="2.5" strokeLinecap="round" /></svg>
                Download All (.zip)
              </button>
            )}
          </div>

          {/* Activity Console */}
          <div className="bg-black rounded-2xl border border-zinc-800 overflow-hidden flex flex-col shrink-0">
            <div className="px-4 py-2 bg-zinc-800/30 border-b border-zinc-800 flex justify-between items-center">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Process Log</span>
              <button onClick={() => setLogs([])} className="text-[10px] text-zinc-600 hover:text-zinc-400 font-bold uppercase">Clear</button>
            </div>
            <div className="h-32 overflow-y-auto p-4 font-mono text-[11px] space-y-1 custom-scrollbar">
              {logs.length === 0 && <div className="text-zinc-700 italic">Waiting for input...</div>}
              {logs.map((log) => (
                <div key={log.id} className="flex gap-3">
                  <span className="text-zinc-800 shrink-0">[{log.timestamp}]</span>
                  <span className={`
                    ${log.type === "success" ? "text-emerald-500" : ""}
                    ${log.type === "error" ? "text-red-500" : ""}
                    ${log.type === "process" ? "text-blue-400" : ""}
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
        
        <footer className="p-6 bg-black/20 border-t border-zinc-800 text-center">
           <p className="text-[10px] font-bold text-zinc-700 uppercase tracking-[0.3em]">Privacy First • Secure • Local Storage</p>
        </footer>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 10px; }
        body { background: #09090b; }
      `}</style>
    </div>
  );
}
