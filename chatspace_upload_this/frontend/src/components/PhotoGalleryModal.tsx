import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Upload, Trash2, Image as ImageIcon, Link as LinkIcon, Check } from 'lucide-react';

interface PhotoGalleryModalProps {
  ladyId: string;
  onClose: () => void;
  onInsertLink: (url: string) => void;
}

interface PhotoItem {
  filename: string;
  url: string;
}

export const PhotoGalleryModal: React.FC<PhotoGalleryModalProps> = ({ ladyId, onClose, onInsertLink }) => {
  const { token } = useAuth();
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPhotos = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/photos/${ladyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPhotos(data.photos || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, [ladyId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('photo', file);

    try {
      setIsUploading(true);
      const res = await fetch(`/api/photos/${ladyId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        await fetchPhotos();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (filename: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить это фото?')) return;
    
    try {
      const res = await fetch(`/api/photos/${ladyId}/${filename}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchPhotos();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(url);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleInsert = (url: string) => {
    onInsertLink(url);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
          <div className="flex items-center space-x-2 text-white">
            <ImageIcon className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold">Фотогалерея анкеты: {ladyId}</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-center py-12 text-slate-500">Загрузка фото...</div>
          ) : photos.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Нет загруженных фото для этой анкеты</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((photo) => (
                <div key={photo.filename} className="relative group bg-slate-950 rounded-xl border border-slate-800 overflow-hidden aspect-[3/4]">
                  <img src={photo.url} alt={photo.filename} className="w-full h-full object-cover transition duration-300 group-hover:scale-105 group-hover:opacity-75" />
                  
                  {/* Actions overlay */}
                  <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 gap-2">
                    <button
                      onClick={() => handleInsert(photo.url)}
                      className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold"
                    >
                      Вставить в чат
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCopyLink(photo.url)}
                        className="flex-1 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded flex items-center justify-center"
                        title="Скопировать ссылку"
                      >
                        {copiedLink === photo.url ? <Check className="w-4 h-4 text-emerald-400" /> : <LinkIcon className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDelete(photo.filename)}
                        className="flex-1 py-1.5 bg-red-900/50 hover:bg-red-600 text-red-200 hover:text-white rounded flex items-center justify-center border border-red-800/50"
                        title="Удалить фото"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-between items-center">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            accept="image/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            <span className="text-sm font-medium">{isUploading ? 'Загрузка...' : 'Загрузить фото'}</span>
          </button>
          
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition text-sm font-medium"
          >
            Закрыть
          </button>
        </div>

      </div>
    </div>
  );
};
