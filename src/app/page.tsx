"use client";

import { useState, useCallback } from "react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (selectedFile: File) => {
    if (selectedFile.name.toLowerCase().endsWith(".heic")) {
      setFile(selectedFile);
      setResult(null);
    } else {
      alert("Please select a .heic file");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
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
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const convertImage = async () => {
    if (!file) return;
    setIsConverting(true);
    try {
      const heic2any = (await import("heic2any")).default;
      
      const blob = await heic2any({
        blob: file,
        toType: "image/jpeg",
        quality: 0.8,
      });
      
      const resultBlob = Array.isArray(blob) ? blob[0] : blob;
      const url = URL.createObjectURL(resultBlob);
      setResult(url);
    } catch (error) {
      console.error("Conversion failed", error);
      alert("Conversion failed. Please ensure the file is a valid HEIC image.");
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-zinc-50 dark:bg-zinc-950 font-sans transition-colors duration-300">
      <div className="w-full max-w-md p-8 bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800">
        <h1 className="text-3xl font-extrabold mb-2 text-zinc-900 dark:text-zinc-50 tracking-tight">HEIC to JPEG</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-10 text-sm">Convert your photos in seconds. Browser-based and private.</p>
        
        <div className="flex flex-col gap-8">
          <div 
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`
              relative group cursor-pointer
              border-2 border-dashed rounded-2xl p-10
              flex flex-col items-center justify-center gap-4
              transition-all duration-200
              ${isDragging 
                ? "border-zinc-900 bg-zinc-100 dark:border-zinc-50 dark:bg-zinc-800/50 scale-[1.02]" 
                : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600"
              }
            `}
          >
            <input
              type="file"
              accept=".heic"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <svg className="w-8 h-8 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">
                {file ? file.name : "Click or drag HEIC here"}
              </p>
              <p className="text-xs text-zinc-400 mt-1">Maximum 50MB per file</p>
            </div>
          </div>
          
          <button
            onClick={convertImage}
            disabled={!file || isConverting}
            className="w-full py-4 px-6 bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 rounded-2xl font-bold text-lg transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed shadow-xl active:scale-[0.97]"
          >
            {isConverting ? (
              <span className="flex items-center justify-center gap-3">
                <svg className="animate-spin h-6 w-6 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Converting...
              </span>
            ) : "Convert Now"}
          </button>

          {result && (
            <div className="p-6 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/50 rounded-3xl flex flex-col items-center gap-5 animate-in fade-in zoom-in duration-300">
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-800/30 rounded-full flex items-center justify-center shadow-inner">
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <div className="text-center">
                <p className="text-emerald-900 dark:text-emerald-300 font-bold text-lg">Conversion Successful!</p>
                <p className="text-emerald-700/60 dark:text-emerald-500/50 text-sm mt-1 leading-relaxed">Your high-quality JPEG is ready.</p>
              </div>
              <a
                href={result}
                download={`${file?.name.replace(/\.[^/.]+$/, "") || 'converted'}.jpg`}
                className="w-full text-center py-3.5 px-6 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/30 active:scale-[0.98]"
              >
                Download Image
              </a>
            </div>
          )}
        </div>
      </div>
      <footer className="mt-12 text-zinc-400 dark:text-zinc-600 text-xs tracking-widest uppercase font-medium">
        Secure • Fast • Browser-Based
      </footer>
    </div>
  );
}
