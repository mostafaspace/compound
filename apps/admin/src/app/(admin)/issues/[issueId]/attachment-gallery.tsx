"use client";

import { IssueAttachment } from "@compound/contracts";
import Image from "next/image";
import { useState } from "react";

interface AttachmentGalleryProps {
  attachments: IssueAttachment[];
}

export function AttachmentGallery({ attachments }: AttachmentGalleryProps) {
  const images = attachments.filter((a) => a.mimeType?.startsWith("image/"));
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (images.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-brand/20 scrollbar-track-transparent">
        {images.map((img) => (
          <div
            key={img.id}
            className="relative h-48 w-72 flex-shrink-0 cursor-pointer overflow-hidden rounded-xl border border-line bg-panel transition-all hover:border-brand/50 hover:shadow-lg"
            onClick={() => setSelectedImage(img.url)}
          >
            <img
              src={img.url}
              alt={img.originalName}
              className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3">
              <p className="truncate text-xs font-medium text-white">{img.originalName}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm transition-all duration-300 animate-in fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-h-full max-w-full">
            <img
              src={selectedImage}
              alt="Attachment"
              className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl transition-transform animate-in zoom-in-95 duration-300"
            />
            <button
              className="absolute -top-4 -end-4 flex h-10 w-10 items-center justify-center rounded-full bg-white text-black shadow-lg hover:bg-gray-100 focus:outline-none"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImage(null);
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
