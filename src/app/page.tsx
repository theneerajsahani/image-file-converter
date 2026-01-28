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
      addLog("ERROR: NO_HEIC_FILES_DETECTED", "error");
      alert("Please select .heic files.");
      return;
    }

    setFiles(validFiles);
    setResults([]);
    setProgress(0);
    addLog(`GIT: Staged ${validFiles.length} files. Ready for build.`, "info");
  };

  const convertSingleFile = async (file: File, heicDecode: any): Promise<ConvertedFile> => {
    const buffer = await file.arrayBuffer();
    const { width, height, data } = await heicDecode({ buffer: new Uint8Array(buffer) });
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("CANVAS_FAIL");
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
          reject(new Error("BLOB_FAIL"));
        }
      }, "image/jpeg", 0.85);
    });
  };

  const convertImages = async () => {
    if (files.length === 0 || isConverting) return;
    setIsConverting(true);
    setResults([]);
    setProgress(0);
    addLog("sh ./scripts/convert.sh --all", "process");

    try {
      const lib: any = await import("heic-decode");
      const decode = lib.default || lib;
      
      const total = files.length;
      for (let i = 0; i < total; i++) {
        const file = files[i];
        addLog(`compiling [${i+1}/${total}] ${file.name}...`, "process");
        try {
          const res = await convertSingleFile(file, decode);
          setResults(prev => [...prev, res]);
          addLog(`✓ success: ${res.name}`, "success");
        } catch (err: any) {
          addLog(`✗ error: ${file.name} failed`, "error");
        }
        setProgress(Math.round(((i + 1) / total) * 100));
        await new Promise(r => setTimeout(r, 20));
      }
      addLog("BUILD_COMPLETE: 100% of assets generated.", "success");
    } catch (error: any) {
      addLog(`FATAL: ${error?.message}`, "error");
    } finally {
      setIsConverting(false);
    }
  };

  const downloadZip = async () => {
    addLog("packing assets into zip archive...", "process");
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    results.forEach(res => zip.file(res.name, res.blob));
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const link = document.createElement("a");
    link.href = url;
    link.download = "heic_converted_assets.zip";
    link.click();
    addLog("ARCHIVE_EXPORTED", "success");
  };

  return (
    <div className="h-screen w-full bg-[#1e1e1e] text-[#cccccc] font-sans flex flex-col overflow-hidden">
      
      {/* Title Bar */}
      <div className="h-8 bg-[#323233] flex items-center justify-between px-3 shrink-0 select-none">
        <div className="flex items-center gap-4">
          <svg className="w-4 h-4 text-[#007acc]" viewBox="0 0 24 24" fill="currentColor"><path d="M23.15 2.58L19.85 2.1c-.27-.03-.52.11-.63.36l-3.32 7.14c-.06.13-.06.28 0 .41l3.32 7.14c.11.25.36.39.63.36l3.3-.48c.41-.06.63-.53.42-.88l-2.61-4.43c-.06-.1-.06-.23 0-.33l2.61-4.43c.21-.35-.01-.82-.42-.88zM4.68 18.12l3.32.48c.27.04.52-.11.63-.36l3.32-7.14c.06-.13.06-.28 0-.41l-3.32-7.14c-.11-.25-.36-.39-.63-.36l-3.32.48c-.41.06-.63.53-.42.88l2.61 4.43c.06.1.06.23 0 .33l-2.61 4.43c-.21.35.01.82.42.88z" /></svg>
          <span className="text-[11px] font-medium opacity-80 uppercase tracking-tighter">HEIC_COMPILER_X — V5.2</span>
        </div>
        <div className="flex-1 text-center text-[11px] opacity-40 italic">~/projects/image-file-converter</div>
        <div className="w-20" />
      </div>

      <div className="flex-1 flex overflow-hidden">
        
        {/* Activity Bar */}
        <div className="w-12 bg-[#333333] flex flex-col items-center py-4 gap-6 shrink-0 border-r border-black/20">
          <div className="text-white opacity-90 cursor-pointer p-1 rounded hover:bg-white/10 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" strokeWidth="1.5" /></svg></div>
          <div className="text-[#858585] hover:text-white cursor-pointer transition-all p-1"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2" strokeWidth="1.5" /></svg></div>
          <div className="mt-auto text-[#858585] p-1"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" strokeWidth="1.5" /><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth="1.5" /></svg></div>
        </div>

        {/* Sidebar: File Explorer */}
        <div className="w-56 bg-[#252526] flex flex-col shrink-0">
          <div className="p-3 text-[11px] font-bold text-[#bbbbbb] tracking-widest uppercase flex justify-between items-center opacity-70">
            <span>Explorer</span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
             <div className="px-3 py-1 flex items-center gap-1.5 bg-[#37373d] text-white text-[11px] font-bold">
               <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="2" /></svg>
               <span>SOURCE_FILES</span>
             </div>
             <div className="py-2">
               {files.length === 0 && <div className="px-6 text-[10px] text-zinc-600 italic">No files staged.</div>}
               {files.map((file, i) => (
                 <div key={i} className="px-6 py-1 flex items-center gap-2 hover:bg-[#2a2d2e] group cursor-default transition-colors">
                   <svg className="w-3 h-3 text-[#e3b341]" fill="currentColor" viewBox="0 0 24 24"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" /></svg>
                   <span className="text-[11px] truncate text-[#cccccc] group-hover:text-white">{file.name}</span>
                 </div>
               ))}
             </div>
          </div>
        </div>

        {/* Main Editor: THE WORKSPACE */}
        <div className="flex-1 flex flex-col bg-[#1e1e1e] overflow-hidden">
          
          {/* Breadcrumbs */}
          <div className="h-9 bg-[#1e1e1e] flex items-center px-4 gap-2 text-[11px] text-[#858585] border-b border-black/20 shrink-0">
             <span>src</span><span className="opacity-40">/</span><span>app</span><span className="opacity-40">/</span><span className="text-[#cccccc] font-medium">Converter.workspace</span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
            
            {/* LARGE ACTION AREA (UX FIX) */}
            <div className="max-w-4xl w-full mx-auto p-12 space-y-12">
              
              {/* STEP 1: UPLOAD */}
              {files.length === 0 ? (
                <div 
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
                  className={`
                    relative group border-2 border-dashed rounded-[3rem] p-24 flex flex-col items-center justify-center gap-8 transition-all duration-700
                    ${isDragging ? "border-[#007acc] bg-[#007acc]/5 scale-[1.02]" : "border-[#333] hover:border-[#555] bg-black/10"}
                  `}
                >
                  <input type="file" accept=".heic,.heif" multiple onChange={(e) => handleFiles(e.target.files)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
                  <div className="w-24 h-24 rounded-[2rem] bg-[#252526] border border-[#333] flex items-center justify-center group-hover:scale-110 transition-all shadow-2xl">
                    <svg className="w-10 h-10 text-[#007acc]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" strokeWidth="2" /></svg>
                  </div>
                  <div className="text-center space-y-4">
                    <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Drop HEIC Files Here</h2>
                    <p className="text-[#858585] text-sm font-mono tracking-widest uppercase">Or click anywhere in this box to browse</p>
                  </div>
                </div>
              ) : (
                /* STEP 2: CONVERT */
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="bg-[#252526] border border-[#333] rounded-[2.5rem] p-10 flex flex-col items-center text-center gap-6 shadow-2xl">
                    <div className="px-4 py-1.5 bg-[#007acc]/10 border border-[#007acc]/20 text-[#007acc] rounded-full text-[10px] font-black uppercase tracking-widest">Build Status: Ready</div>
                    <h2 className="text-4xl font-black text-white tracking-tighter uppercase">{files.length} Files Ready to Compile</h2>
                    
                    <button 
                      onClick={convertImages}
                      disabled={isConverting}
                      className="w-full max-w-sm py-6 bg-[#238636] hover:bg-[#2ea043] text-white rounded-3xl font-black text-xl uppercase tracking-[0.1em] shadow-[0_0_40px_rgba(35,134,54,0.3)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-30"
                    >
                      <svg className={`w-8 h-8 ${isConverting ? 'animate-spin' : ''}`} fill="currentColor" viewBox="0 0 24 24"><path d="M12 4V2m0 20v-2m8-8h2M2 12h2m15.364-7.364l-1.414 1.414M6.05 17.95l-1.414 1.414M17.95 17.95l1.414 1.414M6.05 6.05L4.636 4.636" strokeWidth="2.5" stroke="currentColor" /></svg>
                      {isConverting ? "COMPILING..." : "START CONVERSION"}
                    </button>
                    
                    <button onClick={() => setFiles([])} className="text-[10px] font-bold text-zinc-600 hover:text-red-500 uppercase tracking-widest transition-colors">Cancel Staged Changes</button>
                  </div>

                  {/* STEP 3: RESULTS */}
                  {results.length > 0 && (
                    <div className="space-y-4 animate-in fade-in zoom-in duration-500">
                      <div className="flex justify-between items-center">
                         <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#858585]">Output binaries</h3>
                         <button onClick={downloadZip} className="px-6 py-2 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-[#ccc] transition-all">Package (.zip)</button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {results.map((res) => (
                          <div key={res.id} className="p-4 bg-black/40 border border-[#333] rounded-2xl flex items-center justify-between group hover:border-[#007acc]/50 transition-all">
                            <span className="truncate text-zinc-400 text-[11px] max-w-[200px] font-mono">{res.name}</span>
                            <a href={res.url} download={res.name} className="text-[#007acc] font-black text-[10px] uppercase hover:text-white underline tracking-tighter">Download</a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
            </div>
          </div>

          {/* Terminal: The Feedback Loop */}
          <div className="h-56 bg-[#0d1117] border-t border-[#333] flex flex-col shrink-0 font-mono">
            <div className="px-6 py-2 flex items-center gap-6 border-b border-[#333] bg-[#161b22] shrink-0">
               <span className="text-[10px] font-black text-white border-b-2 border-[#007acc] pb-1 uppercase tracking-widest">Integrated Terminal</span>
               <span className="text-[10px] font-bold text-zinc-600 uppercase">Build Progress: {progress}%</span>
               <div className="flex-1" />
               <button onClick={() => setLogs([])} className="text-[10px] font-bold text-zinc-700 hover:text-white transition-colors">Clear</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-1.5 text-[12px] custom-scrollbar selection:bg-[#58a6ff]/30">
               {logs.length === 0 && <div className="text-zinc-800 italic">SYSTEM_READY: Waiting for instructions...</div>}
               {logs.map((log) => (
                 <div key={log.id} className="flex gap-4">
                   <span className="text-zinc-700 shrink-0 select-none">[{log.timestamp}]</span>
                   <span className={`
                     ${log.type === "success" ? "text-[#3fb950]" : ""}
                     ${log.type === "error" ? "text-[#f85149]" : ""}
                     ${log.type === "process" ? "text-[#58a6ff]" : ""}
                     ${log.type === "info" ? "text-zinc-600" : ""}
                   `}>
                     <span className="mr-2 opacity-50">$</span>
                     {log.message}
                   </span>
                 </div>
               ))}
               <div ref={consoleEndRef} />
            </div>
          </div>

        </div>
      </div>

      {/* Status Bar */}
      <div className="h-6 bg-[#007acc] flex items-center justify-between px-3 text-[10px] text-white shrink-0 font-bold select-none tracking-tight">
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-1.5"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2" strokeWidth="2.5" /></svg>main*</div>
           <div className="flex items-center gap-1.5 text-zinc-200 font-normal">CPU_MODE: STABLE</div>
        </div>
        <div className="flex items-center gap-4 uppercase tracking-widest text-[9px]">
           <span>UTF-8</span>
           <div className="flex items-center gap-1.5 bg-white/20 px-3 h-full"><span>COMPILING: {progress}%</span></div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; height: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #555; }
        body { overflow: hidden; background: #1e1e1e; }
      `}</style>
    </div>
  );
}
