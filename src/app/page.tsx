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

  const handleFiles = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;
    
    const validFiles = Array.from(selectedFiles)
      .filter(f => f.name.toLowerCase().endsWith(".heic"))
      .slice(0, 100); // Limit to 100 files

    if (validFiles.length === 0) {
      alert("Please select .heic files");
      return;
    }

    setFiles(validFiles);
    setResults([]);
    setProgress(0);
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
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
            <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight text-left">HEIC Batch Converter</h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Convert up to 100 files at once. 100% private.</p>
          </div>
          {files.length > 0 && (
            <span className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-full text-xs font-bold">
              {files.length} {files.length === 1 ? 'file' : 'files'} selected
            </span>
          )}
        </div>
        
        <div className="flex flex-col gap-8">
          <div 
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`
              relative group cursor-pointer
              border-2 border-dashed rounded-2xl p-12
              flex flex-col items-center justify-center gap-4
              transition-all duration-200
              ${isDragging 
                ? "border-zinc-900 bg-zinc-100 dark:border-zinc-50 dark:bg-zinc-800/50 scale-[1.01]" 
                : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600"
              }
            `}
          >
            <input
              type="file"
              accept=".heic"
              multiple
              onChange={(e) => handleFiles(e.target.files)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <svg className="w-8 h-8 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">
                {files.length > 0 ? `${files.length} files ready` : "Drag up to 100 HEIC files here"}
              </p>
              <p className="text-xs text-zinc-400 mt-1">or click to browse your folders</p>
            </div>
          </div>

          {isConverting && (
            <div className="space-y-3">
              <div className="flex justify-between text-xs font-bold text-zinc-500 uppercase">
                <span>Converting...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-zinc-900 dark:bg-zinc-50 h-full transition-all duration-300 ease-out" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}
          
          {!isConverting && files.length > 0 && results.length === 0 && (
            <button
              onClick={convertImages}
              className="w-full py-4 px-6 bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 rounded-2xl font-bold text-lg transition-all hover:opacity-90 shadow-xl active:scale-[0.97]"
            >
              Start Conversion
            </button>
          )}

          {results.length > 0 && (
            <div className="flex flex-col gap-4 animate-in fade-in zoom-in duration-300">
              <button
                onClick={downloadAll}
                className="w-full py-4 px-6 bg-emerald-600 text-white rounded-2xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                </svg>
                Download All ({results.length})
              </button>
              
              <div className="max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                <div className="grid grid-cols-1 gap-2">
                  {results.map((res, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800 text-sm">
                      <span className="truncate max-w-[200px] text-zinc-700 dark:text-zinc-300 font-medium">{res.name}</span>
                      <a href={res.url} download={res.name} className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline">
                        Download
                      </a>
                    </div>
                  ))}
                </div>
              </div>
              <button 
                onClick={() => { setFiles([]); setResults([]); setProgress(0); }}
                className="text-center text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors mt-2"
              >
                Clear all and start over
              </button>
            </div>
          )}
        </div>
      </div>
      <footer className="mt-12 text-zinc-400 dark:text-zinc-600 text-[10px] tracking-[0.2em] uppercase font-bold">
        Privacy First • No Server Uploads • Batch Support
      </footer>
    </div>
  );
}
