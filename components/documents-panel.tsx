"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, X, Upload } from "lucide-react";
import { useChatStore } from "@/lib/store";
import { useRef, useState } from "react";

export function DocumentsPanel() {
  const { documents = [], addDocument, removeDocument } = useChatStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleRemoveDocument = (id: string) => {
    removeDocument(id);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      const data = await response.json();

      addDocument({
        name: data.document.name,
        size: data.document.size,
        type: data.document.type,
        content: data.document.content,
      });
    } catch (error) {
      console.error("Upload error:", error);
      alert(error instanceof Error ? error.message : "Failed to upload document");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="flex h-full flex-col border-r bg-muted/10 overflow-hidden">
      {/* Header - Fixed */}
      <div className="shrink-0 border-b p-4 bg-background">
        <h2 className="font-semibold text-sm">Attached Documents</h2>
        <p className="text-xs text-muted-foreground mt-1">
          {documents.length} {documents.length === 1 ? "file" : "files"}
        </p>
      </div>

      {/* Scrollable Documents List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-3 space-y-2">
          {documents.length === 0 ? (
            <div className="text-center py-8 px-4">
              <FileText className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground mt-2">
                No documents attached
              </p>
            </div>
          ) : (
            documents.map((doc) => (
              <Card key={doc.id} className="hover:bg-accent/50 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {doc.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(doc.size)}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => handleRemoveDocument(doc.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Footer - Fixed */}
      <div className="shrink-0 border-t p-3 bg-background">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <Upload className="h-4 w-4 mr-2 animate-pulse" />
              Uploading...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4 mr-2" />
              Add Document
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
