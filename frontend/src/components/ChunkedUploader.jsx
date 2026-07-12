import { useState, useRef } from 'react';
import api from '../services/api';
import { Upload, X, File, CheckCircle, AlertCircle } from 'lucide-react';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB por chunk

export default function ChunkedUploader({ taskId, onComplete, onCancel }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadId, setUploadId] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [aborted, setAborted] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Validar tamaño (sin límite estricto para chunked upload)
      if (selectedFile.size === 0) {
        setMessage({ text: '❌ El archivo está vacío', type: 'error' });
        return;
      }
      
      setFile(selectedFile);
      setMessage({ text: `📎 ${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(2)} MB)`, type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    }
  };

  const startUpload = async () => {
    if (!file) {
      setMessage({ text: '❌ Selecciona un archivo', type: 'error' });
      return;
    }

    setUploading(true);
    setProgress(0);
    setAborted(false);

    try {
      // 1. Iniciar sesión de subida
      const startResponse = await api.post(`/tasks/${taskId}/evidence/chunk/start`, null, {
        params: {
          file_name: file.name,
          file_size: file.size
        }
      });

      const { upload_id, total_chunks } = startResponse.data;
      setUploadId(upload_id);

      // 2. Subir chunks
      const totalChunks = total_chunks;
      let uploadedChunks = 0;

      for (let i = 0; i < totalChunks; i++) {
        // Verificar si se canceló
        if (aborted) {
          setMessage({ text: '⏹️ Subida cancelada', type: 'error' });
          setUploading(false);
          return;
        }

        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append('file', chunk);
        formData.append('chunk_number', i);
        formData.append('upload_id', upload_id);

        await api.post(`/tasks/${taskId}/evidence/chunk`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            const chunkProgress = (progressEvent.loaded / chunk.size) * 100;
            const totalProgress = ((i * CHUNK_SIZE + progressEvent.loaded) / file.size) * 100;
            setProgress(Math.min(totalProgress, 100));
          },
        });

        uploadedChunks++;
        setProgress((uploadedChunks / totalChunks) * 100);
      }

      // 3. Completar subida
      const completeFormData = new FormData();
      completeFormData.append('upload_id', upload_id);
      
      await api.post(`/tasks/${taskId}/evidence/chunk/complete`, completeFormData);

      setMessage({ text: '✅ Archivo subido exitosamente', type: 'success' });
      setProgress(100);
      setUploading(false);
      
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 1500);

    } catch (error) {
      console.error('Error en subida:', error);
      setMessage({ 
        text: error.response?.data?.detail || '❌ Error al subir archivo', 
        type: 'error' 
      });
      setUploading(false);
    }
  };

  const cancelUpload = () => {
    if (uploading) {
      setAborted(true);
      setUploading(false);
      setMessage({ text: '⏹️ Subida cancelada', type: 'error' });
    }
    if (onCancel) onCancel();
  };

  const resetUpload = () => {
    setFile(null);
    setUploadId(null);
    setProgress(0);
    setMessage({ text: '', type: '' });
    setAborted(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="chunked-uploader">
      {message.text && (
        <div className={`upload-message ${message.type}`}>
          {message.text}
        </div>
      )}

      {!uploading && !file && (
        <div className="upload-area">
          <label className="upload-label">
            <File size={32} />
            <span>Seleccionar archivo (sin límite de tamaño)</span>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              className="upload-input"
            />
          </label>
          <p className="upload-hint">Se subirá en partes de 5MB. Soporta archivos de cualquier tamaño.</p>
        </div>
      )}

      {file && !uploading && (
        <div className="file-info">
          <div className="file-details">
            <File size={20} />
            <span className="file-name">{file.name}</span>
            <span className="file-size">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
          </div>
          <div className="file-actions">
            <button onClick={startUpload} className="btn-upload-start">
              <Upload size={16} />
              Subir
            </button>
            <button onClick={resetUpload} className="btn-upload-cancel">
              <X size={16} />
              Cambiar
            </button>
          </div>
        </div>
      )}

      {uploading && (
        <div className="upload-progress-container">
          <div className="progress-info">
            <span>Subiendo: {file?.name}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            />
          </div>
          <button onClick={cancelUpload} className="btn-upload-cancel">
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}