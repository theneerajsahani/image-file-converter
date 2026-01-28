"use client";

import { useState } from "react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const convertImage = async () => {
    if (!file) return;
    setIsConverting(true);
    try {
      // Dynamic import to avoid window is not defined error during SSR
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
    <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-zinc-50 dark:bg-zinc-950 font-sans">
      <div className="w-full max-w-md p-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800">
        <h1 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-zinc-50">HEIC to JPEG</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mb-8 text-sm">Dead simple image converter. Your files never leave your device.</p>
        
        <div className="flex flex-col gap-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Select HEIC File</label>
            <input
              type="file"
              accept=".heic"
              onChange={handleFileChange}
              className="block w-full text-sm text-zinc-500
                file:mr-4 file:py-2.5 file:px-4
                file:rounded-xl file:border-0
                file:text-sm file:font-semibold
                file:bg-zinc-100 file:text-zinc-700
                hover:file:bg-zinc-200
                dark:file:bg-zinc-800 dark:file:text-zinc-300
                cursor-pointer"
            />
          </div>
          
          <button
            onClick={convertImage}
            disabled={!file || isConverting}
            className="w-full py-3 px-4 bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 rounded-xl font-medium transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg active:scale-[0.98]"
          >
            {isConverting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Converting...
              </span>
            ) : "Convert to JPEG"}
          </button>

          {result && (
            <div className="mt-2 p-6 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/50 rounded-2xl flex flex-col items-center gap-4 animate-in fade-in slide-in-from-top-4">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-800/30 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <div className="text-center">
                <p className="text-emerald-900 dark:text-emerald-400 font-semibold text-sm">Ready to download!</p>
                <p className="text-emerald-700/70 dark:text-emerald-500/50 text-xs mt-1">High quality JPEG</p>
              </div>
              <a
                href={result}
                download={`${file?.name.replace(/\.[^/.]+$/, "") || 'converted'}.jpg`}
                className="w-full text-center py-2.5 px-4 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-500/20"
              >
                Download JPEG
              </a>
            </div>
          )}
        </div>
      </div>
      <footer className="mt-8 text-zinc-400 dark:text-zinc-600 text-xs">
        Built with Next.js & heic2any
      </footer>
    </div>
  );
}
