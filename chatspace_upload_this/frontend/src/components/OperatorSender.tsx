import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lady } from '../types';
import { Send, Play, Pause, Plus, RefreshCw } from 'lucide-react';

interface OperatorSenderProps {
  ladies: Lady[];
}

export const OperatorSender: React.FC<OperatorSenderProps> = ({ ladies }) => {
  const { token } = useAuth();
  const [selectedLadyId, setSelectedLadyId] = useState<string>('');
  const [campaigns, setCampaigns] = useState<any[]>([]);
  
  // Создание новой кампании
  const [targetAudience, setTargetAudience] = useState<'online' | 'offline' | 'all'>('online');
  const [templateText, setTemplateText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ladies.length > 0 && !selectedLadyId) {
      setSelectedLadyId(ladies[0].lady_id);
    }
  }, [ladies]);

  useEffect(() => {
    if (selectedLadyId) {
      fetchCampaigns();
    }
  }, [selectedLadyId]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/sender/${selectedLadyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.campaigns) {
        setCampaigns(data.campaigns);
      } else if (Array.isArray(data)) {
        setCampaigns(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateText.trim() || !selectedLadyId) return;

    try {
      const res = await fetch('/api/sender', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ladyId: selectedLadyId,
          targetAudience,
          templateText
        })
      });
      if (res.ok) {
        alert('Кампания успешно создана!');
        setTemplateText('');
        fetchCampaigns();
      } else {
        const data = await res.json();
        alert(data.error || 'Ошибка при создании кампании');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleCampaignStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'running' ? 'stopped' : 'running';
    try {
      const res = await fetch(`/api/sender/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchCampaigns();
      } else {
        alert('Ошибка при изменении статуса');
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-950 text-slate-200">
      {/* Левая панель: Создание кампании */}
      <div className="w-1/3 border-r border-slate-800 flex flex-col bg-slate-900 p-6 space-y-6 overflow-y-auto">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2 mb-4">
            <Send className="w-5 h-5 text-emerald-400" />
            <span>Авто-Сендер</span>
          </h2>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-slate-400">Выберите анкету:</label>
            <select
              value={selectedLadyId}
              onChange={(e) => setSelectedLadyId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="" disabled>Выберите анкету</option>
              {ladies.map(l => (
                <option key={l.lady_id} value={l.lady_id}>{l.name} ({l.lady_id})</option>
              ))}
            </select>
          </div>
        </div>

        <form onSubmit={handleCreateCampaign} className="space-y-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2 mb-2">
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Создать кампанию</span>
          </h3>
          
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-slate-400">Аудитория:</label>
            <select
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value as any)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="online">Онлайн</option>
              <option value="offline">Оффлайн</option>
              <option value="all">Все</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-slate-400">Текст рассылки:</label>
            <textarea
              value={templateText}
              onChange={(e) => setTemplateText(e.target.value)}
              rows={4}
              placeholder="Введите текст рассылки..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={!templateText.trim() || !selectedLadyId}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold rounded-lg text-sm transition"
          >
            Создать кампанию
          </button>
        </form>
      </div>

      {/* Правая панель: Список кампаний */}
      <div className="flex-1 flex flex-col bg-slate-950 p-6 overflow-y-auto space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Активные кампании</h3>
          <button 
            onClick={fetchCampaigns}
            className="flex items-center space-x-2 text-xs text-emerald-400 hover:text-emerald-300"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Обновить</span>
          </button>
        </div>

        {campaigns.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            Нет созданных кампаний
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map(c => (
              <div key={c.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-sm font-bold text-white">Аудитория: {c.targetAudience || c.target_audience}</div>
                  <div className="text-xs text-slate-400 max-w-lg truncate">{c.templateText || c.template_text}</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-1">
                    Статус: <span className={c.status === 'running' ? 'text-emerald-400' : 'text-amber-400'}>
                      {c.status === 'running' ? 'РАБОТАЕТ' : 'ОСТАНОВЛЕНА'}
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={() => toggleCampaignStatus(c.id, c.status)}
                  className={`p-3 rounded-lg text-white transition ${
                    c.status === 'running' 
                      ? 'bg-amber-600 hover:bg-amber-500' 
                      : 'bg-emerald-600 hover:bg-emerald-500'
                  }`}
                  title={c.status === 'running' ? 'Остановить' : 'Запустить'}
                >
                  {c.status === 'running' ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
