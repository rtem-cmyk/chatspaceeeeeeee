import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Check } from 'lucide-react';

interface CaptchaModalProps {
  ladyId: string;
  captchaImageBase64: string;
  actionType: string;
  onClose: () => void;
}

export const CaptchaModal: React.FC<CaptchaModalProps> = ({ ladyId, captchaImageBase64, actionType, onClose }) => {
  const { ws } = useAuth();
  const [code, setCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !ws) return;

    ws.send(JSON.stringify({
      event: 'OPERATOR_SOLVE_CAPTCHA',
      payload: {
        ladyId,
        captchaCode: code.trim(),
        actionType
      }
    }));

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-amber-500/60 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl animate-in fade-in">
        <div className="flex items-center space-x-2.5 text-amber-400">
          <ShieldAlert className="w-6 h-6 shrink-0" />
          <h3 className="font-bold text-white text-base">Проверка CharmDate (Капча)</h3>
        </div>

        <p className="text-xs text-slate-300">
          Сайт запросил подтверждение для анкеты <strong className="text-emerald-400 font-mono">{ladyId}</strong> ({actionType}):
        </p>

        {/* Картинка капчи */}
        <div className="bg-white p-3 rounded-xl flex items-center justify-center border border-slate-700">
          {captchaImageBase64 ? (
            <img src={captchaImageBase64} alt="Captcha" className="h-12 object-contain" />
          ) : (
            <div className="text-slate-900 font-mono text-xl tracking-widest font-black">
              4 3 G R
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            autoFocus
            maxLength={6}
            placeholder="Введите код с картинки..."
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-center text-lg font-mono tracking-widest font-bold text-white focus:outline-none focus:border-emerald-500"
          />

          <div className="flex space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-xs text-slate-400 rounded-xl"
            >
              Пропустить
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white rounded-xl flex items-center justify-center space-x-1"
            >
              <Check className="w-4 h-4" />
              <span>Отправить</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
