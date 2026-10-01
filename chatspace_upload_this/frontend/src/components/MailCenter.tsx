import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lady, Template } from '../types';
import { Mail, Send, AlertTriangle, CheckCircle2, Clock, Image, Gift, X } from 'lucide-react';

interface MailCenterProps {
  initialLadyId?: string;
  onClose: () => void;
}

export const MailCenter: React.FC<MailCenterProps> = ({ initialLadyId, onClose }) => {
  const { token, ws } = useAuth();
  const [ladies, setLadies] = useState<Lady[]>([]);
  const [selectedLadyId, setSelectedLadyId] = useState<string>(initialLadyId || '');
  const [tab, setTab] = useState<'admirer' | 'first_emf'>('admirer');

  // Данные Admirer Mail
  const [admirerStatus, setAdmirerStatus] = useState<any>({
    sentToday: 0,
    limit: 50,
    remaining: 50,
    isLimitReached: false
  });
  const [admirerCategory, setAdmirerCategory] = useState<'A' | 'B'>('A');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [templates, setTemplates] = useState<Template[]>([]);

  // First EMF
  const [firstEmfCandidates, setFirstEmfCandidates] = useState<any[]>([]);

  const fetchLadies = async () => {
    try {
      const res = await fetch('/api/operator/my-ladies', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.ladies && data.ladies.length > 0) {
        setLadies(data.ladies);
        if (!selectedLadyId) setSelectedLadyId(data.ladies[0].lady_id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAdmirerStatus = async (ladyId: string) => {
    if (!ladyId) return;
    try {
      const res = await fetch(`/api/mail/admirer/status/${ladyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setAdmirerStatus(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchFirstEmfCandidates = async (ladyId: string) => {
    if (!ladyId) return;
    try {
      const res = await fetch(`/api/mail/first-emf/candidates/${ladyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.candidates) setFirstEmfCandidates(data.candidates);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/operator/templates', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.templates) setTemplates(data.templates);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchLadies();
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (selectedLadyId) {
      fetchAdmirerStatus(selectedLadyId);
      fetchFirstEmfCandidates(selectedLadyId);
    }
  }, [selectedLadyId]);

  // Запуск разовой рассылки Admirer Mail
  const handleSendAdmirer = async () => {
    if (admirerStatus.isLimitReached) {
      alert('Суточный лимит CharmDate (50 писем) для этой анкеты уже исчерпан!');
      return;
    }

    try {
      const res = await fetch('/api/mail/admirer/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ladyId: selectedLadyId,
          manId: 'AUTO_BROADCAST',
          category: admirerCategory,
          templateTitle: admirerCategory === 'A' ? 'Письмо Поклоннику' : 'Виртуальная Открытка Поклонника',
          content: selectedTemplate
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      fetchAdmirerStatus(selectedLadyId);
      alert(`Письмо успешно добавлено в очередь отправки! Осталось на сегодня: ${data.remaining}`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSendFirstEmf = async (manId: string) => {
    try {
      const res = await fetch('/api/mail/first-emf/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ladyId: selectedLadyId, manId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      fetchFirstEmfCandidates(selectedLadyId);
      alert('Первое Письмо (EMF) успешно отправлено мужчине!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const currentLady = ladies.find(l => l.lady_id === selectedLadyId);

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-6 z-50">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl flex flex-col max-h-[85vh] overflow-hidden shadow-2xl">
        
        {/* Шапка модалки */}
        <div className="bg-slate-800/80 border-b border-slate-700/60 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Mail className="w-6 h-6 text-emerald-400" />
            <div>
              <h2 className="text-lg font-bold text-white">Центр автоматизации писем CharmDate</h2>
              <span className="text-xs text-slate-400 font-mono">Почта Поклонников (50/сут) и Первые Письма</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Выбор анкеты и вкладки */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center space-x-3">
            <label className="text-xs font-semibold text-slate-400 uppercase">Анкета:</label>
            <select
              value={selectedLadyId}
              onChange={(e) => setSelectedLadyId(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-medium"
            >
              {ladies.map(l => (
                <option key={l.lady_id} value={l.lady_id}>
                  {l.name} ({l.lady_id})
                </option>
              ))}
            </select>
          </div>

          <div className="flex bg-slate-800 p-1 rounded-lg space-x-1">
            <button
              onClick={() => setTab('admirer')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${tab === 'admirer' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Почта Поклонников (лимит 50)
            </button>
            <button
              onClick={() => setTab('first_emf')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${tab === 'first_emf' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Первые Письма после чата
            </button>
          </div>
        </div>

        {/* Контент модалки */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* ВКЛАДКА 1: ADMIRER MAIL */}
          {tab === 'admirer' && (
            <div className="space-y-6">
              
              {/* Прогресс-бар суточного лимита 50 писем */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-slate-300">Суточный лимит отправки Почты Поклонников:</span>
                  <span className={`font-mono ${admirerStatus.isLimitReached ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {admirerStatus.sentToday} / {admirerStatus.limit} шт. (осталось {admirerStatus.remaining})
                  </span>
                </div>
                
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${admirerStatus.isLimitReached ? 'bg-rose-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, (admirerStatus.sentToday / (admirerStatus.limit || 50)) * 100)}%` }}
                  ></div>
                </div>

                <div className="text-[11px] text-slate-500 flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Лимит CharmDate сбрасывается каждые 24 часа. Система автоматически защищает от превышения.</span>
                </div>
              </div>

              {/* Выбор категории A (письмо) или B (открытка) */}
              <div className="space-y-3">
                <label className="text-xs font-semibold uppercase text-slate-400">Формат шаблона CharmDate:</label>
                <div className="grid grid-cols-2 gap-4">
                  <div
                    onClick={() => setAdmirerCategory('A')}
                    className={`p-4 rounded-xl border cursor-pointer transition ${admirerCategory === 'A' ? 'bg-emerald-950/40 border-emerald-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'}`}
                  >
                    <div className="flex items-center space-x-2 font-bold text-sm mb-1">
                      <Mail className="w-4 h-4 text-emerald-400" />
                      <span>Категория A (Стандартное письмо)</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Текстовое письмо с приветствием и рассказом о себе. До 6000 символов.
                    </p>
                  </div>

                  <div
                    onClick={() => setAdmirerCategory('B')}
                    className={`p-4 rounded-xl border cursor-pointer transition ${admirerCategory === 'B' ? 'bg-emerald-950/40 border-emerald-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'}`}
                  >
                    <div className="flex items-center space-x-2 font-bold text-sm mb-1">
                      <Gift className="w-4 h-4 text-amber-400" />
                      <span>Категория B (Виртуальная открытка)</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Яркая виртуальная открытка (кофе, цветы, десерт) с кратким текстом от 50 до 150 символов.
                    </p>
                  </div>
                </div>
              </div>

              {/* Выбор текста шаблона */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-slate-400">Текст шаблона:</label>
                <textarea
                  rows={4}
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  placeholder="Введите текст презентационного письма или выберите из заготовок..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none"
                />

                <div className="flex space-x-2 overflow-x-auto py-1">
                  {templates.filter(t => t.type.startsWith('admirer')).map(t => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTemplate(t.text)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 shrink-0"
                    >
                      {t.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Кнопка запуска */}
              <button
                disabled={admirerStatus.isLimitReached || !selectedTemplate.trim()}
                onClick={handleSendAdmirer}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold rounded-xl text-sm transition flex items-center justify-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>Запустить отправку Почты Поклонников (1 шт.)</span>
              </button>
            </div>
          )}

          {/* ВКЛАДКА 2: FIRST EMF ПОСЛЕ ЧАТА */}
          {tab === 'first_emf' && (
            <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-xs text-slate-300 space-y-1">
                <div className="font-bold text-white text-sm flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Правило Первых Писем (EMF) на CharmDate</span>
                </div>
                <p>
                  После первого чата с мужчиной можно отправить до 5 платных Первых Писем (EMF). Если мужчина не читает письмо, следующее можно отправлять <strong>минимум через 6 часов</strong>.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase text-slate-400">
                  Мужчины, готовые к получению Первых Писем (EMF) ({firstEmfCandidates.length})
                </h3>

                {firstEmfCandidates.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-500 bg-slate-950 rounded-xl border border-slate-800">
                    На данный момент нет мужчин, подходящих под критерии Первых Писем (EMF) (нужен завершенный чат и интервал от 6 часов).
                  </div>
                ) : (
                  firstEmfCandidates.map((c) => {
                    const isEligibleNow = !c.last_first_emf_time || c.hours_since_last_emf >= 6;
                    return (
                      <div key={c.man_id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                        <div>
                          <div className="font-bold text-white text-sm">{c.man_name} <span className="font-mono text-xs text-emerald-400">#{c.man_id}</span></div>
                          <div className="text-xs text-slate-400 mt-1">
                            Отправлено Первых Писем (EMF): <strong className="text-white">{c.first_emf_sent_count} / 5</strong>
                          </div>
                          {c.last_first_emf_time && (
                            <div className="text-[11px] text-slate-500">
                              Прошло времени: {c.hours_since_last_emf} ч. (требуется от 6 ч.)
                            </div>
                          )}
                        </div>

                        <button
                          disabled={!isEligibleNow}
                          onClick={() => handleSendFirstEmf(c.man_id)}
                          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${isEligibleNow ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{isEligibleNow ? 'Отправить Первое Письмо (EMF)' : `Кулдаун (<6ч)`}</span>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
