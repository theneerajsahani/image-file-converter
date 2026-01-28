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
      addLog("err: no_valid_heic_found", "error");
      return;
    }

    setFiles(validFiles);
    setResults([]);
    setProgress(0);
    addLog(`git: staged ${validFiles.length} files for conversion`, "info");
  };

  const convertSingleFile = async (file: File, heicDecode: any): Promise<ConvertedFile> => {
    const buffer = await file.arrayBuffer();
    const { width, height, data } = await heicDecode({ buffer: new Uint8Array(buffer) });

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas_fail");

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
          reject(new Error("blob_fail"));
        }
      }, "image/jpeg", 0.85);
    });
  };

  const convertImages = async () => {
    if (files.length === 0 || isConverting) return;
    setIsConverting(true);
    setResults([]);
    setProgress(0);
    addLog("npm run build:converter", "process");

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
          addLog(`success: ${res.name}`, "success");
        } catch (err: any) {
          addLog(`error: ${file.name} failed`, "error");
        }
        setProgress(Math.round(((i + 1) / total) * 100));
        await new Promise(r => setTimeout(r, 20));
      }
      addLog("build finished successfully.", "success");
    } catch (error: any) {
      addLog(`fatal: ${error?.message}`, "error");
    } finally {
      setIsConverting(false);
    }
  };

  const downloadZip = async () => {
    addLog("sh package-assets.sh", "process");
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    results.forEach(res => zip.file(res.name, res.blob));
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const link = document.createElement("a");
    link.href = url;
    link.download = "heic_converted.zip";
    link.click();
    addLog("package: binary_archive_generated", "success");
  };

  return (
    <div className="h-screen w-full bg-[#1e1e1e] text-[#cccccc] font-sans flex flex-col overflow-hidden selection:bg-[#264f78]">
      
      {/* Title Bar */}
      <div className="h-8 bg-[#323233] flex items-center justify-between px-3 shrink-0 select-none">
        <div className="flex items-center gap-4">
          <svg className="w-4 h-4 text-[#007acc]" viewBox="0 0 24 24" fill="currentColor"><path d="M23.15 2.58L19.85 2.1c-.27-.03-.52.11-.63.36l-3.32 7.14c-.06.13-.06.28 0 .41l3.32 7.14c.11.25.36.39.63.36l3.3-.48c.41-.06.63-.53.42-.88l-2.61-4.43c-.06-.1-.06-.23 0-.33l2.61-4.43c.21-.35-.01-.82-.42-.88zM4.68 18.12l3.32.48c.27.04.52-.11.63-.36l3.32-7.14c.06-.13.06-.28 0-.41l-3.32-7.14c-.11-.25-.36-.39-.63-.36l-3.32.48c-.41.06-.63.53-.42.88l2.61 4.43c.06.1.06.23 0 .33l-2.61 4.43c-.21.35.01.82.42.88z" /></svg>
          <span className="text-[12px] opacity-80">HEIC Converter — Visual Studio Code</span>
        </div>
        <div className="flex-1 text-center text-[12px] opacity-50 truncate px-20">
          image-file-converter — main
        </div>
        <div className="flex items-center">
          <div className="px-3 py-1.5 hover:bg-white/10 transition-colors cursor-pointer"><div className="w-3 h-[1px] bg-[#cccccc]" /></div>
          <div className="px-3 py-1.5 hover:bg-white/10 transition-colors cursor-pointer"><div className="w-3 h-3 border border-[#cccccc]" /></div>
          <div className="px-3 py-1.5 hover:bg-[#e81123] transition-colors cursor-pointer"><div className="relative w-3 h-3"><div className="absolute top-1/2 left-0 w-full h-[1px] bg-[#cccccc] rotate-45" /><div className="absolute top-1/2 left-0 w-full h-[1px] bg-[#cccccc] -rotate-45" /></div></div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        
        {/* Activity Bar (Extreme Left) */}
        <div className="w-12 bg-[#333333] flex flex-col items-center py-2 gap-4 shrink-0">
          <div className="w-full border-l-2 border-[#007acc] py-2 flex justify-center text-white cursor-pointer">
            <svg className="w-6 h-6 opacity-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" strokeWidth="1.5" /></svg>
          </div>
          <div className="w-full py-2 flex justify-center text-[#858585] hover:text-white cursor-pointer transition-colors relative">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="1.5" /></svg>
          </div>
          <div className="w-full py-2 flex justify-center text-[#858585] hover:text-white cursor-pointer transition-colors relative">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2" strokeWidth="1.5" /></svg>
            {files.length > 0 && <span className="absolute top-1 right-2 bg-[#007acc] text-white text-[9px] font-bold px-1 rounded-full min-w-[14px] h-3.5 flex items-center justify-center">{files.length}</span>}
          </div>
          <div className="w-full py-2 flex justify-center text-[#858585] hover:text-white cursor-pointer transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" strokeWidth="1.5" /><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="1.5" /></svg>
          </div>
        </div>

        {/* Sidebar: Explorer */}
        <div className="w-60 bg-[#252526] flex flex-col shrink-0">
          <div className="p-3 text-[11px] font-medium text-[#bbbbbb] flex justify-between items-center select-none uppercase tracking-tight">
            <span>Explorer: PROJECT</span>
            <div className="flex gap-1">
              <svg className="w-4 h-4 hover:bg-white/10 rounded" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 13h6m-3-3v6" strokeWidth="2" /></svg>
              <svg className="w-4 h-4 hover:bg-white/10 rounded" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeWidth="2" /></svg>
            </div>
          </div>
          
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Folder Header */}
            <div className="flex items-center gap-1.5 px-3 py-1 hover:bg-[#2a2d2e] cursor-pointer text-[#cccccc] font-bold text-[11px]">
               <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3" /></svg>
               <span>IMAGE-CONVERTER</span>
            </div>

            {/* Staging Area (Explorer Style) */}
            <div className="ml-4 flex flex-col gap-0.5 mt-1 overflow-y-auto custom-scrollbar">
               <div className="flex items-center gap-1.5 px-3 py-1 hover:bg-[#2a2d2e] cursor-pointer text-[#cccccc] text-[11px] opacity-60">
                 <svg className="w-3.5 h-3.5 text-[#3fb950]" fill="currentColor" viewBox="0 0 24 24"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                 <span>src</span>
               </div>
               <div className="flex items-center gap-1.5 px-3 py-1 hover:bg-[#2a2d2e] cursor-pointer text-[#cccccc] text-[11px]">
                 <svg className="w-3.5 h-3.5 text-[#519aba]" fill="currentColor" viewBox="0 0 24 24"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" /></svg>
                 <span>package.json</span>
               </div>
               
               {/* Upload Zone disguised as a file/folder */}
               <div 
                 onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                 onDragLeave={() => setIsDragging(false)}
                 onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
                 className={`
                   mt-4 mx-2 p-4 border border-dashed rounded flex flex-col items-center justify-center gap-2 transition-all cursor-pointer
                   ${isDragging ? "border-[#007acc] bg-[#007acc]/5" : "border-[#3c3c3c] hover:bg-[#2a2d2e]"}
                 `}
               >
                 <input type="file" accept=".heic,.heif" multiple onChange={(e) => handleFiles(e.target.files)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                 <svg className="w-4 h-4 text-[#858585]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" strokeWidth="2.5" /></svg>
                 <span className="text-[10px] text-center text-[#858585] leading-tight font-medium">Stage HEIC Files</span>
               </div>

               {/* File List */}
               {files.map((file, i) => (
                 <div key={i} className="flex items-center justify-between px-6 py-1 hover:bg-[#2a2d2e] group cursor-default">
                    <div className="flex items-center gap-2">
                      <svg className="w-3 h-3 text-[#e3b341]" fill="currentColor" viewBox="0 0 24 24"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" /></svg>
                      <span className="text-[11px] truncate w-24 text-[#cccccc]">{file.name}</span>
                    </div>
                    <span className="text-[10px] text-[#e3b341] font-bold opacity-0 group-hover:opacity-100">U</span>
                 </div>
               ))}
            </div>
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col bg-[#1e1e1e] overflow-hidden">
          
          {/* Tabs Header */}
          <div className="h-9 bg-[#252526] flex shrink-0">
             <div className="h-full bg-[#1e1e1e] border-t border-t-[#007acc] px-4 flex items-center gap-2 text-[12px] border-r border-[#1e1e1e]">
                <svg className="w-3.5 h-3.5 text-[#519aba]" fill="currentColor" viewBox="0 0 24 24"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" /></svg>
                <span>converter.ts</span>
                <svg className="w-3.5 h-3.5 hover:bg-white/10 rounded p-0.5 ml-2 cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2" /></svg>
             </div>
             <div className="flex-1 bg-[#2d2d2d]" />
          </div>

          {/* Breadcrumbs */}
          <div className="h-6 bg-[#1e1e1e] flex items-center px-4 gap-2 text-[11px] text-[#858585] border-b border-black/10 shrink-0 select-none">
             <span>projects</span>
             <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="2" /></svg>
             <span>image-converter</span>
             <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="2" /></svg>
             <span className="text-[#cccccc]">output</span>
          </div>

          {/* Editor Body / Content */}
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {results.length > 0 ? (
              <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8 border-b border-[#3c3c3c] pb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#252526] border border-[#3c3c3c] flex items-center justify-center">
                       <svg className="w-6 h-6 text-[#3fb950]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" /></svg>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white tracking-tight uppercase">Output_Binaries</h2>
                      <p className="text-[11px] text-[#858585]">Assets compiled successfully in browser heap</p>
                    </div>
                  </div>
                  {!isConverting && (
                    <button onClick={downloadZip} className="bg-[#0e639c] hover:bg-[#1177bb] text-white px-6 py-2.5 rounded text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth="2.5" /></svg>
                      Package (.zip)
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {results.map((res) => (
                    <div key={res.id} className="p-4 bg-[#252526] border border-[#3c3c3c] rounded-xl flex items-center justify-between group hover:border-[#007acc] transition-all">
                      <div className="flex flex-col gap-1">
                        <span className="text-[12px] font-mono text-[#cccccc] truncate w-40">{res.name}</span>
                        <span className="text-[9px] text-[#3fb950] font-black uppercase tracking-tighter">Compiled_OK</span>
                      </div>
                      <a href={res.url} download={res.name} className="p-2.5 bg-[#1e1e1e] text-[#cccccc] rounded-lg hover:text-[#007acc] hover:bg-[#2d2d2d] transition-all">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth="2.5" /></svg>
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-20 pointer-events-none select-none">
                <svg className="w-40 h-40 mb-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="1" /></svg>
                <div className="text-center space-y-2">
                  <p className="text-2xl font-black uppercase tracking-[0.2em]">Ready_To_Build</p>
                  <div className="flex gap-4 text-[12px] font-mono justify-center">
                    <span>Drop Files [Ctrl+D]</span>
                    <span>•</span>
                    <span>Run [F5]</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Terminal Pane */}
          <div className="h-64 bg-[#1e1e1e] border-t border-[#3c3c3c] flex flex-col shrink-0 font-mono shadow-[0_-10px_30px_rgba(0,0,0,0.3)]">
            <div className="px-6 py-2 flex items-center gap-6 border-b border-[#3c3c3c] bg-[#252526] shrink-0">
               <span className="text-[11px] font-bold text-white border-b-2 border-[#007acc] pb-1 cursor-default uppercase tracking-tight">Terminal</span>
               <span className="text-[11px] font-medium text-[#858585] pb-1 cursor-pointer hover:text-white uppercase tracking-tight">Output</span>
               <span className="text-[11px] font-medium text-[#858585] pb-1 cursor-pointer hover:text-white uppercase tracking-tight">Debug Console</span>
               <div className="flex-1" />
               <button 
                 onClick={convertImages}
                 disabled={files.length === 0 || isConverting}
                 className="bg-[#0e639c] hover:bg-[#1177bb] disabled:opacity-20 text-white px-4 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition-all"
               >
                 <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                 Run Task
               </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-1.5 text-[12px] custom-scrollbar bg-[#1e1e1e]">
               {logs.length === 0 && <div className="text-[#858585] flex gap-2"><span>neeraj@dev:~/converter$</span> <span className="animate-pulse">_</span></div>}
               {logs.map((log) => (
                 <div key={log.id} className="flex gap-4 group">
                   <span className="text-[#858585] opacity-50 shrink-0 select-none group-hover:opacity-100">{log.timestamp}</span>
                   <span className={`
                     ${log.type === "success" ? "text-[#3fb950]" : ""}
                     ${log.type === "error" ? "text-[#f85149]" : ""}
                     ${log.type === "process" ? "text-[#58a6ff]" : ""}
                     ${log.type === "info" ? "text-[#d1d5da] opacity-70" : ""}
                   `}>
                     <span className="text-[#858585] mr-2 select-none">$</span>
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
      <div className="h-6 bg-[#007acc] flex items-center justify-between px-3 text-[11px] text-white shrink-0 font-medium select-none">
        <div className="flex items-center gap-4 h-full">
           <div className="flex items-center gap-1.5 hover:bg-white/10 px-2 h-full cursor-pointer transition-colors">
             <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2" strokeWidth="2" /></svg>
             <span>main*</span>
           </div>
           <div className="flex items-center gap-1.5 hover:bg-white/10 px-2 h-full cursor-pointer">
             <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2.5" /></svg>
             <span>0</span>
             <svg className="w-3.5 h-3.5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth="2.5" /></svg>
             <span>0</span>
           </div>
        </div>
        <div className="flex items-center gap-4 h-full">
           <span className="hover:bg-white/10 px-2 h-full flex items-center cursor-default uppercase tracking-tight text-[10px] opacity-80">Spaces: 2</span>
           <span className="hover:bg-white/10 px-2 h-full flex items-center cursor-default uppercase tracking-tight text-[10px] opacity-80">UTF-8</span>
           <span className="hover:bg-white/10 px-2 h-full flex items-center cursor-default uppercase tracking-tight text-[10px] opacity-80">TypeScript React</span>
           <div className="flex items-center gap-1.5 bg-white/20 px-3 h-full font-bold">
             <div className={`w-1.5 h-1.5 rounded-full bg-white ${isConverting ? 'animate-pulse' : ''}`} />
             <span>{progress}%</span>
           </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #3c3c3c; border-radius: 0; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #4f4f4f; }
        body { overflow: hidden; background: #1e1e1e; }
      `}</style>
    </div>
  );
}
