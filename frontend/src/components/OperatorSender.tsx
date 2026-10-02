import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lady } from '../types';
import { Send, Play, Pause, Square, Plus, RefreshCw, CheckSquare, Square as SquareIcon } from 'lucide-react';

interface OperatorSenderProps {
  ladies: Lady[];
}

export const OperatorSender: React.FC<OperatorSenderProps> = ({ ladies }) => {
  const { token } = useAuth();
  
  // State for new mass campaign
  const [selectedLadyIds, setSelectedLadyIds] = useState<string[]>([]);
  const [targetAudience, setTargetAudience] = useState<'online' | 'offline' | 'all'>('online');
  const [templateText, setTemplateText] = useState('');
  const [speedSeconds, setSpeedSeconds] = useState<number>(30); // Default 30s
  
  // State for tasks
  const [tasks, setTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoadingTasks(true);
      const res = await fetch('/api/sender/tasks', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.tasks) {
        setTasks(data.tasks);
      } else if (Array.isArray(data)) {
        setTasks(data);
      }
    } catch (e) {
      console.error('Ошибка при загрузке задач:', e);
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedLadyIds.length === ladies.length) {
      setSelectedLadyIds([]);
    } else {
      setSelectedLadyIds(ladies.map(l => l.lady_id));
    }
  };

  const handleToggleLady = (id: string) => {
    setSelectedLadyIds(prev => 
      prev.includes(id) ? prev.filter(lid => lid !== id) : [...prev, id]
    );
  };

  const handleStartMassCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedLadyIds.length === 0 || !templateText.trim() || speedSeconds <= 0) return;

    try {
      const res = await fetch('/api/sender/mass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          lady_ids: selectedLadyIds,
          target_audience: targetAudience,
          template_text: templateText,
          speed_ms: speedSeconds * 1000
        })
      });
      if (res.ok) {
        alert('Массовая рассылка успешно запущена!');
        setTemplateText('');
        fetchTasks();
      } else {
        const data = await res.json();
        alert(data.error || 'Ошибка при запуске рассылки');
      }
    } catch (e) {
      console.error(e);
      alert('Ошибка при запуске рассылки');
    }
  };

  const updateTaskStatus = async (id: string, newStatus: 'running' | 'paused' | 'stopped') => {
    try {
      const res = await fetch(`/api/sender/tasks/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchTasks();
      } else {
        alert('Ошибка при изменении статуса');
      }
    } catch (e) {
      console.error(e);
      alert('Ошибка при изменении статуса');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-emerald-400 bg-emerald-400/10';
      case 'paused': return 'text-amber-400 bg-amber-400/10';
      case 'stopped': return 'text-red-400 bg-red-400/10';
      default: return 'text-slate-400 bg-slate-400/10';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'running': return 'РАБОТАЕТ';
      case 'paused': return 'ПАУЗА';
      case 'stopped': return 'ОСТАНОВЛЕНА';
      default: return status?.toUpperCase() || 'НЕИЗВЕСТНО';
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-950 text-slate-200">
      {/* Левая панель: Создание массовой рассылки */}
      <div className="w-[400px] border-r border-slate-800 flex flex-col bg-slate-900 p-6 overflow-y-auto">
        <h2 className="text-xl font-bold text-white flex items-center space-x-2 mb-6">
          <Send className="w-6 h-6 text-emerald-400" />
          <span>Массовая рассылка</span>
        </h2>

        <form onSubmit={handleStartMassCampaign} className="space-y-6 flex-1 flex flex-col">
          
          {/* Выбор анкет */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase text-slate-400">Выберите анкеты ({selectedLadyIds.length}):</label>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
              >
                {selectedLadyIds.length === ladies.length ? (
                  <><CheckSquare className="w-3 h-3" /> <span>Снять все</span></>
                ) : (
                  <><CheckSquare className="w-3 h-3" /> <span>Выбрать все</span></>
                )}
              </button>
            </div>
            
            <div className="bg-slate-950 border border-slate-800 rounded-lg max-h-48 overflow-y-auto p-2 space-y-1">
              {ladies.length === 0 ? (
                <div className="text-sm text-slate-500 p-2 text-center">Нет доступных анкет</div>
              ) : (
                ladies.map(l => (
                  <label key={l.lady_id} className="flex items-center space-x-3 p-2 hover:bg-slate-800 rounded cursor-pointer transition">
                    <input
                      type="checkbox"
                      checked={selectedLadyIds.includes(l.lady_id)}
                      onChange={() => handleToggleLady(l.lady_id)}
                      className="form-checkbox h-4 w-4 text-emerald-500 rounded border-slate-700 bg-slate-900 focus:ring-0 focus:ring-offset-0"
                    />
                    <span className="text-sm text-slate-300 truncate">
                      {l.name} <span className="text-slate-500 text-xs">({l.lady_id})</span>
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Аудитория */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-slate-400">Аудитория:</label>
            <select
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
            >
              <option value="online">Онлайн (Рекомендуется)</option>
              <option value="offline">Оффлайн</option>
              <option value="all">Все пользователи</option>
            </select>
          </div>

          {/* Скорость */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-slate-400">Скорость отправки (сек):</label>
            <input
              type="number"
              min="1"
              value={speedSeconds}
              onChange={(e) => setSpeedSeconds(parseInt(e.target.value) || 0)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
              placeholder="Пример: 30"
            />
          </div>

          {/* Текст */}
          <div className="space-y-2 flex-1 flex flex-col">
            <label className="text-xs font-semibold uppercase text-slate-400">Текст рассылки:</label>
            <textarea
              value={templateText}
              onChange={(e) => setTemplateText(e.target.value)}
              placeholder="Здравствуйте, {name}! Как ваши дела?..."
              className="w-full flex-1 min-h-[120px] bg-slate-950 border border-slate-800 rounded-lg px-3 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none transition"
            />
            <p className="text-xs text-slate-500">Можно использовать переменные, например {'{name}'} для имени мужчины.</p>
          </div>

          <button
            type="submit"
            disabled={selectedLadyIds.length === 0 || !templateText.trim() || speedSeconds <= 0}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white font-bold rounded-lg text-sm transition shadow-lg shadow-emerald-900/20 flex items-center justify-center space-x-2 mt-4"
          >
            <Play className="w-4 h-4" />
            <span>Запустить массовую рассылку</span>
          </button>
        </form>
      </div>

      {/* Правая панель: Активные задачи */}
      <div className="flex-1 flex flex-col bg-slate-950 p-8 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-white">Задачи рассылки</h3>
            <p className="text-sm text-slate-400 mt-1">Управление активными и прошлыми рассылками</p>
          </div>
          <button 
            onClick={fetchTasks}
            className="flex items-center space-x-2 text-sm text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 px-4 py-2 rounded-lg transition border border-slate-800"
          >
            <RefreshCw className={`w-4 h-4 ${loadingTasks ? 'animate-spin' : ''}`} />
            <span>Обновить список</span>
          </button>
        </div>

        {tasks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 bg-slate-900/50 rounded-2xl border border-slate-800/50 border-dashed">
            <Send className="w-12 h-12 text-slate-700 mb-4" />
            <p className="text-lg">Нет активных задач рассылки</p>
            <p className="text-sm mt-2">Запустите новую массовую рассылку слева</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task, idx) => (
              <div key={task.id || idx} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition">
                <div className="flex justify-between items-start">
                  
                  <div className="space-y-3 flex-1 mr-6">
                    <div className="flex items-center space-x-3">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider ${getStatusColor(task.status)}`}>
                        {getStatusLabel(task.status)}
                      </span>
                      <span className="text-sm font-medium text-slate-300">
                        Аудитория: {task.target_audience === 'online' ? 'Онлайн' : task.target_audience === 'offline' ? 'Оффлайн' : 'Все'}
                      </span>
                      {task.speed_ms && (
                        <span className="text-sm text-slate-500">
                          Скорость: {task.speed_ms / 1000} сек
                        </span>
                      )}
                    </div>
                    
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Анкеты ({task.lady_ids?.length || 0}):</p>
                      <p className="text-sm text-slate-300 line-clamp-1">
                        {task.lady_ids?.join(', ') || 'Неизвестно'}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Текст рассылки:</p>
                      <div className="bg-slate-950 p-3 rounded-lg text-sm text-slate-300 border border-slate-800 whitespace-pre-wrap max-h-32 overflow-y-auto">
                        {task.template_text}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2">
                    {task.status !== 'stopped' && (
                      <>
                        {task.status === 'paused' ? (
                          <button
                            onClick={() => updateTaskStatus(task.id, 'running')}
                            className="p-3 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-lg transition"
                            title="Возобновить"
                          >
                            <Play className="w-5 h-5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => updateTaskStatus(task.id, 'paused')}
                            className="p-3 bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-white rounded-lg transition"
                            title="Пауза"
                          >
                            <Pause className="w-5 h-5" />
                          </button>
                        )}
                        <button
                          onClick={() => updateTaskStatus(task.id, 'stopped')}
                          className="p-3 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition"
                          title="Остановить"
                        >
                          <Square className="w-5 h-5" fill="currentColor" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
