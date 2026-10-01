import React, { useState } from 'react';
import { Settings, Play, X, ShieldCheck } from 'lucide-react';

interface InviterModalProps {
  ladyId: string;
  onClose: () => void;
  onStart: (settings: any) => void;
}

export const InviterModal: React.FC<InviterModalProps> = ({ ladyId, onClose, onStart }) => {
  const [minAge, setMinAge] = useState(30);
  const [maxAge, setMaxAge] = useState(65);
  const [minDelay, setMinDelay] = useState(8);
  const [maxDelay, setMaxDelay] = useState(16);
  const [countries, setCountries] = useState('United States, Canada, United Kingdom, Australia');

  const handleStart = () => {
    onStart({
      ladyId,
      minAge,
      maxAge,
      minDelay,
      maxDelay,
      countries: countries.split(',').map(c => c.trim())
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <Settings className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-base">Настройки рассыльщика инвайтов</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-xs text-slate-300">
          Настройка автоматических приглашений в Живой Чат для анкеты <strong className="text-emerald-400 font-mono">{ladyId}</strong>:
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Мин. возраст</label>
              <input
                type="number"
                value={minAge}
                onChange={(e) => setMinAge(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Макс. возраст</label>
              <input
                type="number"
                value={maxAge}
                onChange={(e) => setMaxAge(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Рандомизация паузы (секунды)</label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                value={minDelay}
                onChange={(e) => setMinDelay(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
              <input
                type="number"
                value={maxDelay}
                onChange={(e) => setMaxDelay(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
            <div className="text-[10px] text-slate-500 mt-1 flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Случайная задержка между инвайтами имитирует поведение человека.</span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Приоритетные страны (через запятую)</label>
            <textarea
              rows={2}
              value={countries}
              onChange={(e) => setCountries(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>
        </div>

        <div className="flex space-x-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-semibold rounded-xl"
          >
            Отмена
          </button>
          <button
            onClick={handleStart}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-xs text-white font-bold rounded-xl flex items-center justify-center space-x-1.5 transition"
          >
            <Play className="w-4 h-4" />
            <span>Применить и запустить</span>
          </button>
        </div>
      </div>
    </div>
  );
};
