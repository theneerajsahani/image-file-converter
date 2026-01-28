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
      addLog("ENOENT: No HEIC/HEIF files in payload", "error");
      return;
    }

    setFiles(validFiles);
    setResults([]);
    setProgress(0);
    addLog(`GIT: Staged ${validFiles.length} changes for processing`, "info");
  };

  const convertSingleFile = async (file: File, heicDecode: any): Promise<ConvertedFile> => {
    const buffer = await file.arrayBuffer();
    const { width, height, data } = await heicDecode({ buffer: new Uint8Array(buffer) });

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("CANVAS_CONTEXT_FAIL");

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
          reject(new Error("BLOB_INVALID"));
        }
      }, "image/jpeg", 0.85);
    });
  };

  const convertImages = async () => {
    if (files.length === 0 || isConverting) return;
    setIsConverting(true);
    setResults([]);
    setProgress(0);
    addLog("NPM: Starting conversion build...", "process");

    try {
      const lib: any = await import("heic-decode");
      const decode = lib.default || lib;
      
      const total = files.length;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        addLog(`BUILD: [${i+1}/${total}] processing ${file.name}...`, "process");
        try {
          const res = await convertSingleFile(file, decode);
          setResults(prev => [...prev, res]);
          addLog(`SUCCESS: ${res.name} compiled in browser`, "success");
        } catch (err: any) {
          addLog(`ERROR: ${file.name} failed to compile`, "error");
        }
        setProgress(Math.round(((i + 1) / total) * 100));
        await new Promise(r => setTimeout(r, 50));
      }
      addLog("DONE: All assets generated.", "success");
    } catch (error: any) {
      addLog(`FATAL: ${error?.message}`, "error");
    } finally {
      setIsConverting(false);
    }
  };

  const downloadZip = async () => {
    addLog("PACK: Bundling assets into .zip archive...", "process");
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    results.forEach(res => zip.file(res.name, res.blob));
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const link = document.createElement("a");
    link.href = url;
    link.download = "assets_build.zip";
    link.click();
    addLog("PACK: Archive delivered.", "success");
  };

  return (
    <div className="h-screen w-full bg-[#0d1117] text-[#c9d1d9] font-sans flex flex-col overflow-hidden">
      
      {/* Title Bar */}
      <div className="h-9 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex gap-1.5 ml-1">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          <span className="text-[11px] text-[#8b949e] font-medium tracking-tight">image-converter — page.heic</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-[#8b949e]">
          <span className="hover:text-white cursor-pointer transition-colors">File</span>
          <span className="hover:text-white cursor-pointer transition-colors">Edit</span>
          <span className="hover:text-white cursor-pointer transition-colors">Selection</span>
          <span className="hover:text-white cursor-pointer transition-colors">View</span>
          <span className="hover:text-white cursor-pointer transition-colors">Help</span>
        </div>
        <div className="w-20" />
      </div>

      <div className="flex-1 flex overflow-hidden">
        
        {/* Sidebar */}
        <div className="w-64 bg-[#0d1117] border-r border-[#30363d] flex flex-col shrink-0">
          <div className="p-3 text-[11px] font-bold text-[#8b949e] tracking-widest uppercase flex justify-between items-center">
            <span>Explorer</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 12h14M12 5v14" strokeWidth="2.5" strokeLinecap="round" /></svg>
          </div>
          
          {/* File Drop Area in Sidebar */}
          <div 
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
            className={`
              mx-2 mb-2 p-4 border border-dashed rounded flex flex-col items-center justify-center gap-2 transition-all cursor-pointer
              ${isDragging ? "border-[#58a6ff] bg-[#58a6ff]/5" : "border-[#30363d] hover:bg-[#161b22]"}
            `}
          >
            <input type="file" accept=".heic,.heif" multiple onChange={(e) => handleFiles(e.target.files)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            <svg className="w-5 h-5 text-[#8b949e]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth="2" /></svg>
            <span className="text-[10px] text-center text-[#8b949e] leading-tight">Drag files here to stage</span>
          </div>

          <div className="flex-1 overflow-y-auto px-2 space-y-0.5 custom-scrollbar">
            {files.map((file, i) => (
              <div key={i} className="flex items-center gap-2 p-1.5 hover:bg-[#161b22] rounded group cursor-default">
                <svg className="w-3.5 h-3.5 text-[#e3b341]" fill="currentColor" viewBox="0 0 24 24"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" /></svg>
                <span className="text-[11px] truncate text-[#c9d1d9] group-hover:text-white">{file.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col bg-[#0d1117] overflow-hidden">
          
          {/* Editor Header / Action Bar */}
          <div className="h-10 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between px-4">
            <div className="flex items-center gap-1">
               <div className="bg-[#0d1117] px-4 py-2 border-t-2 border-[#f78166] text-[11px] flex items-center gap-2">
                 <svg className="w-3 h-3 text-[#f78166]" fill="currentColor" viewBox="0 0 24 24"><path d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2zM4 18V6h16v12H4z" /></svg>
                 page.tsx
               </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={convertImages}
                disabled={files.length === 0 || isConverting}
                className="px-3 py-1 bg-[#238636] hover:bg-[#2ea043] text-white text-[10px] font-bold rounded flex items-center gap-1.5 transition-all disabled:opacity-20"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                {isConverting ? "RUNNING..." : "RUN_CONVERSION"}
              </button>
              {results.length > 0 && !isConverting && (
                <button 
                  onClick={downloadZip}
                  className="px-3 py-1 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[#c9d1d9] text-[10px] font-bold rounded flex items-center gap-1.5 transition-all"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth="2.5" /></svg>
                  BUILD_ZIP
                </button>
              )}
            </div>
          </div>

          {/* Editor Content (Results) */}
          <div className="flex-1 overflow-y-auto p-6 bg-[#0d1117] custom-scrollbar">
             <div className="max-w-3xl mx-auto space-y-6">
                <div className="flex items-center gap-4 border-b border-[#30363d] pb-4">
                  <div className="w-10 h-10 rounded-full bg-[#161b22] border border-[#30363d] flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#8b949e]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeWidth="2" /></svg>
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">Asset_Vault</h2>
                    <p className="text-[10px] text-[#8b949e]">Output binaries generated in local RAM</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {results.map((res) => (
                    <div key={res.id} className="p-3 bg-[#161b22] border border-[#30363d] rounded-lg flex items-center justify-between group hover:border-[#58a6ff]/50 transition-all">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-mono text-[#c9d1d9] truncate w-32">{res.name}</span>
                        <span className="text-[9px] text-[#238636] font-bold uppercase">Success</span>
                      </div>
                      <a href={res.url} download={res.name} className="p-2 bg-[#21262d] text-[#c9d1d9] rounded hover:text-[#58a6ff] hover:bg-[#30363d] transition-all">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth="2.5" /></svg>
                      </a>
                    </div>
                  ))}
                  {results.length === 0 && (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center text-[#484f58] border border-dashed border-[#30363d] rounded-xl">
                      <p className="text-[11px] italic">Awaiting build output...</p>
                    </div>
                  )}
                </div>
             </div>
          </div>

          {/* Integrated Terminal */}
          <div className="h-56 bg-[#010409] border-t border-[#30363d] flex flex-col shrink-0 font-mono">
            <div className="px-4 py-2 flex items-center gap-6 border-b border-[#30363d] bg-[#0d1117] shrink-0">
               <span className="text-[10px] font-bold text-white border-b border-[#f78166] pb-1 cursor-default uppercase">Terminal</span>
               <span className="text-[10px] font-bold text-[#8b949e] pb-1 cursor-pointer hover:text-white uppercase">Output</span>
               <span className="text-[10px] font-bold text-[#8b949e] pb-1 cursor-pointer hover:text-white uppercase">Debug Console</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1 text-[11px] custom-scrollbar">
               {logs.length === 0 && <div className="text-[#484f58]">$ sh setup.sh --ready</div>}
               {logs.map((log) => (
                 <div key={log.id} className="flex gap-4">
                   <span className="text-[#484f58] shrink-0">{log.timestamp}</span>
                   <span className={`
                     ${log.type === "success" ? "text-[#3fb950]" : ""}
                     ${log.type === "error" ? "text-[#f85149]" : ""}
                     ${log.type === "process" ? "text-[#a5d6ff]" : ""}
                     ${log.type === "info" ? "text-[#8b949e]" : ""}
                   `}>
                     <span className="mr-2">{log.type === "process" ? "λ" : log.type === "success" ? "✓" : log.type === "error" ? "×" : "$"}</span>
                     {log.message}
                   </span>
                 </div>
               ))}
               <div ref={consoleEndRef} />
            </div>
          </div>

        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="h-6 bg-[#238636] flex items-center justify-between px-3 text-[10px] text-white shrink-0 font-medium">
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-1.5 hover:bg-white/10 px-2 h-full cursor-pointer transition-colors">
             <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M15 11l-3-3-3 3M12 8v11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
             <span>main*</span>
           </div>
           <div className="flex items-center gap-1.5">
             <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" /></svg>
             <span>0 Errors</span>
           </div>
        </div>
        <div className="flex items-center gap-4">
           <span className="hover:bg-white/10 px-2 h-full flex items-center cursor-default uppercase tracking-widest text-[9px]">Spaces: 2</span>
           <span className="hover:bg-white/10 px-2 h-full flex items-center cursor-default uppercase tracking-widest text-[9px]">UTF-8</span>
           <span className="hover:bg-white/10 px-2 h-full flex items-center cursor-default uppercase tracking-widest text-[9px]">Next.js: App Router</span>
           <div className="flex items-center gap-1 bg-white/20 px-2 h-full">
             <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
             <span className="font-bold">{progress}%</span>
           </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #30363d; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #484f58; }
        body { overflow: hidden; }
      `}</style>
    </div>
  );
}
