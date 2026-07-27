import React, { useState } from 'react';
import { Upload, X, File, Image } from 'lucide-react';

const EditorArchivos = ({ archivos, setArchivos }) => {
  const [arrastrando, setArrastrando] = useState(false);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setArchivos(prev => [...prev, ...files]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setArrastrando(false);
    const files = Array.from(e.dataTransfer.files);
    setArchivos(prev => [...prev, ...files]);
  };

  const removeArchivo = (index) => {
    setArchivos(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (nombre) => {
    const ext = nombre.split('.').pop()?.toLowerCase();
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) return '🖼️';
    if (['pdf'].includes(ext)) return '📄';
    if (['doc', 'docx'].includes(ext)) return '📝';
    if (['xls', 'xlsx'].includes(ext)) return '📊';
    if (['ppt', 'pptx'].includes(ext)) return '📑';
    if (['zip', 'rar', '7z'].includes(ext)) return '📦';
    return '📎';
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition ${
          arrastrando 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-blue-400'
        }`}
        onDragEnter={(e) => { e.preventDefault(); setArrastrando(true); }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => { e.preventDefault(); setArrastrando(false); }}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          onChange={handleFileChange}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload" className="cursor-pointer block">
          <Upload className="mx-auto text-gray-400" size={40} />
          <p className="mt-2 text-gray-600 font-medium">
            Arrastra o haz clic para subir archivos
          </p>
          <p className="text-xs text-gray-400 mt-1">
            PDF, Word, Excel, Imágenes • Máx 50MB
          </p>
        </label>
      </div>

      {archivos.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-gray-700">
            Archivos seleccionados ({archivos.length})
          </p>
          {archivos.map((archivo, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl">{getFileIcon(archivo.name)}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">
                    {archivo.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(archivo.size)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeArchivo(index)}
                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EditorArchivos;