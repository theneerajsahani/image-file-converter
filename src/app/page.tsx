"use client";

import { useState, useCallback, useEffect } from "react";

interface ConvertedFile {
  name: string;
  url: string;
  blob: Blob;
  status: "pending" | "converting" | "done" | "error";
}

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [fileStatuses, setFileStatuses] = useState<Record<string, "pending" | "converting" | "done" | "error">>({});
  const [results, setResults] = useState<ConvertedFile[]>([]);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);

  const log = (msg: string) => {
    console.log(msg);
    setDebugLog(prev => [...prev.slice(-4), msg]);
  };

  const handleFiles = (selectedFiles: FileList | File[] | null) => {
    if (!selectedFiles) return;
    
    const incoming = Array.from(selectedFiles);
    log(`Selected ${incoming.length} files`);
    
    const validFiles = incoming
      .filter(f => f.name.toLowerCase().endsWith(".heic"))
      .slice(0, 100);

    log(`Valid HEIC: ${validFiles.length}`);

    if (validFiles.length === 0) {
      alert("Please select .heic files");
      return;
    }

    setFiles(validFiles);
    const initialStatuses: Record<string, "pending" | "converting" | "done" | "error"> = {};
    validFiles.forEach(f => initialStatuses[f.name] = "pending");
    setFileStatuses(initialStatuses);
    setResults([]);
    setProgress(0);
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    log("Files dropped");
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, []);

  const convertImages = async () => {
    if (files.length === 0) return;
    setIsConverting(true);
    setResults([]);
    setProgress(0);
    log("Starting conversion...");

    try {
      // Dynamic import with fallback
      const lib = await import("heic2any");
      const heic2any = lib.default || lib;
      log("Library loaded");

      const converted: ConvertedFile[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        log(`Converting ${file.name}...`);
        
        setFileStatuses(prev => ({ ...prev, [file.name]: "converting" }));

        try {
          const blob = await (heic2any as any)({
            blob: file,
            toType: "image/jpeg",
            quality: 0.8,
          });
          
          const resultBlob = Array.isArray(blob) ? blob[0] : blob;
          const fileName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
          
          const res: ConvertedFile = {
            name: fileName,
            url: URL.createObjectURL(resultBlob),
            blob: resultBlob,
            status: "done"
          };
          
          converted.push(res);
          setFileStatuses(prev => ({ ...prev, [file.name]: "done" }));
          setResults(prev => [...prev, res]);
        } catch (err) {
          log(`Error on ${file.name}`);
          console.error(err);
          setFileStatuses(prev => ({ ...prev, [file.name]: "error" }));
        }
        setProgress(Math.round(((i + 1) / files.length) * 100));
      }
      log("Batch complete");
    } catch (error) {
      log("Global conversion error");
      console.error(error);
      alert("Failed to load conversion engine.");
    } finally {
      setIsConverting(false);
    }
  };

  const downloadAll = async () => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    results.forEach(res => zip.file(res.name, res.blob));
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const link = document.createElement("a");
    link.href = url;
    link.download = "converted_images.zip";
    link.click();
  };

  return (
    <div className="flex min-h-screen flex-col items-center py-12 px-4 bg-zinc-50 dark:bg-zinc-950 font-sans transition-colors duration-300">
      <div className="w-full max-w-2xl p-8 bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl border border-zinc-200 dark:border-zinc-800">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">HEIC Converted</h1>
          <div className="flex gap-2">
             {debugLog.length > 0 && <span className="text-[10px] text-zinc-400 font-mono animate-pulse">{debugLog[debugLog.length-1]}</span>}
          </div>
        </div>
        
        <div className="flex flex-col gap-6">
          <div 
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`
              relative border-4 border-dashed rounded-[2rem] p-10
              flex flex-col items-center justify-center gap-4
              transition-all duration-300
              ${isDragging 
                ? "border-emerald-500 bg-emerald-500/5 scale-[1.01]" 
                : "border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 hover:border-zinc-300 dark:hover:border-zinc-700"
              }
            `}
          >
            <input type="file" accept=".heic" multiple onChange={(e) => handleFiles(e.target.files)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${isDragging ? 'bg-emerald-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
            </div>
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Drop HEIC files here</p>
          </div>

          {files.length > 0 && (
            <div className="bg-zinc-50 dark:bg-zinc-950/50 rounded-3xl p-6 border border-zinc-100 dark:border-zinc-800">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-black uppercase tracking-widest text-zinc-400">{files.length} Files Selected</span>
                {!isConverting && results.length === 0 && (
                  <button onClick={convertImages} className="px-6 py-2 bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 rounded-full font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">Convert All</button>
                )}
              </div>
              
              <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800 text-xs">
                    <span className="truncate max-w-[200px] text-zinc-600 dark:text-zinc-400 font-medium">{file.name}</span>
                    <div className="flex items-center gap-3">
                      {fileStatuses[file.name] === "pending" && <span className="text-zinc-400 font-bold uppercase text-[9px]">Waiting</span>}
                      {fileStatuses[file.name] === "converting" && <span className="text-blue-500 font-bold uppercase text-[9px] animate-pulse">Converting...</span>}
                      {fileStatuses[file.name] === "done" && <span className="text-emerald-500 font-bold uppercase text-[9px]">Done</span>}
                      {fileStatuses[file.name] === "error" && <span className="text-red-500 font-bold uppercase text-[9px]">Failed</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isConverting && (
            <div className="px-2 space-y-2">
              <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          )}

          {results.length > 0 && !isConverting && (
            <div className="flex flex-col gap-3">
              <button onClick={downloadAll} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20">Download ZIP ({results.length})</button>
              <button onClick={() => { setFiles([]); setResults([]); setProgress(0); }} className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-red-500 py-2">Start Over</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
