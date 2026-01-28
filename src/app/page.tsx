"use client";

import { useState, useCallback } from "react";

interface ConvertedFile {
  name: string;
  url: string;
  blob: Blob;
}

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [results, setResults] = useState<ConvertedFile[]>([]);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (selectedFiles: FileList | File[] | null) => {
    if (!selectedFiles) return;
    
    console.log("Files received:", selectedFiles.length);
    
    const validFiles = Array.from(selectedFiles)
      .filter(f => f.name.toLowerCase().endsWith(".heic"))
      .slice(0, 100);

    console.log("Valid HEIC files:", validFiles.length);

    if (validFiles.length === 0) {
      alert("No valid .heic files found. Please make sure your files end with .heic");
      return;
    }

    setFiles(validFiles);
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
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, []);

  const convertImages = async () => {
    if (files.length === 0) return;
    setIsConverting(true);
    setResults([]);
    setProgress(0);

    try {
      const heic2any = (await import("heic2any")).default;
      const converted: ConvertedFile[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const blob = await heic2any({
            blob: file,
            toType: "image/jpeg",
            quality: 0.8,
          });
          
          const resultBlob = Array.isArray(blob) ? blob[0] : blob;
          converted.push({
            name: file.name.replace(/\.[^/.]+$/, "") + ".jpg",
            url: URL.createObjectURL(resultBlob),
            blob: resultBlob
          });
        } catch (err) {
          console.error(`Failed to convert ${file.name}`, err);
        }
        setProgress(Math.round(((i + 1) / files.length) * 100));
      }
      setResults(converted);
    } catch (error) {
      console.error("Batch conversion failed", error);
      alert("Something went wrong during conversion.");
    } finally {
      setIsConverting(false);
    }
  };

  const downloadAll = async () => {
    if (results.length === 0) return;
    
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    
    results.forEach(res => {
      zip.file(res.name, res.blob);
    });
    
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const link = document.createElement("a");
    link.href = url;
    link.download = "converted_images.zip";
    link.click();
  };

  return (
    <div className="flex min-h-screen flex-col items-center py-12 px-4 bg-zinc-50 dark:bg-zinc-950 font-sans transition-colors duration-300">
      <div className="w-full max-w-2xl p-8 bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800">
        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">HEIC Batch Converter</h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1 font-medium">Local conversion. No servers. Total privacy.</p>
          </div>
          {files.length > 0 && (
            <span className="px-4 py-1.5 bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 rounded-full text-[10px] font-black uppercase tracking-widest">
              {files.length} {files.length === 1 ? 'file' : 'files'} ready
            </span>
          )}
        </div>
        
        <div className="flex flex-col gap-8">
          <div 
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`
              relative border-4 border-dashed rounded-[2rem] p-12
              flex flex-col items-center justify-center gap-5
              transition-all duration-300 ease-in-out
              ${isDragging 
                ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/5 scale-[1.01]" 
                : "border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-950/30 hover:border-zinc-400 dark:hover:border-zinc-600"
              }
            `}
          >
            <input
              type="file"
              accept=".heic"
              multiple
              onChange={(e) => handleFiles(e.target.files)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
            />
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center transition-all duration-300 ${isDragging ? 'bg-emerald-500 text-white rotate-12' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
              </svg>
            </div>
            <div className="text-center space-y-1">
              <p className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {files.length > 0 ? "Files Loaded Successfully" : "Drop your HEIC photos here"}
              </p>
              <p className="text-sm text-zinc-400">or click to browse files</p>
            </div>
          </div>

          {isConverting && (
            <div className="space-y-4 px-2">
              <div className="flex justify-between text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">
                <span>Processing Queue</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-3 rounded-full overflow-hidden shadow-inner">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-500 ease-out" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}
          
          {!isConverting && files.length > 0 && results.length === 0 && (
            <button
              onClick={convertImages}
              className="w-full py-5 px-6 bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 rounded-2xl font-black text-lg transition-all hover:scale-[1.02] active:scale-[0.98] shadow-2xl shadow-zinc-500/20"
            >
              Convert to JPEG
            </button>
          )}

          {results.length > 0 && (
            <div className="flex flex-col gap-6 animate-in fade-in zoom-in duration-500">
              <button
                onClick={downloadAll}
                className="w-full py-5 px-6 bg-emerald-600 text-white rounded-2xl font-black text-lg hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-3 active:scale-[0.98]"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                </svg>
                Download All ({results.length})
              </button>
              
              <div className="bg-zinc-50 dark:bg-zinc-800/30 rounded-3xl p-2 border border-zinc-100 dark:border-zinc-800">
                <div className="max-h-52 overflow-y-auto pr-2 custom-scrollbar space-y-1">
                  {results.map((res, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 hover:bg-white dark:hover:bg-zinc-800 rounded-2xl transition-colors text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <span className="truncate max-w-[200px] text-zinc-700 dark:text-zinc-300 font-bold">{res.name}</span>
                      </div>
                      <a href={res.url} download={res.name} className="text-emerald-600 dark:text-emerald-400 font-black text-xs uppercase tracking-widest hover:emerald-500">
                        Get File
                      </a>
                    </div>
                  ))}
                </div>
              </div>
              <button 
                onClick={() => { setFiles([]); setResults([]); setProgress(0); }}
                className="text-center text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-red-500 transition-colors py-2"
              >
                Reset Converter
              </button>
            </div>
          )}
        </div>
      </div>
      <footer className="mt-12 text-zinc-400 dark:text-zinc-600 text-[10px] tracking-[0.3em] uppercase font-black">
        Zero Latency • Private • Secure
      </footer>
    </div>
  );
}
