import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lady } from '../types';
import { Mail, Send, ArrowLeft, RefreshCw } from 'lucide-react';

interface OperatorInboxProps {
  ladies: Lady[];
}

export const OperatorInbox: React.FC<OperatorInboxProps> = ({ ladies }) => {
  const { token } = useAuth();
  const [selectedLadyId, setSelectedLadyId] = useState<string>('');
  const [inbox, setInbox] = useState<any[]>([]);
  const [selectedMail, setSelectedMail] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ladies.length > 0 && !selectedLadyId) {
      setSelectedLadyId(ladies[0].lady_id);
    }
  }, [ladies]);

  useEffect(() => {
    if (selectedLadyId) {
      fetchInbox();
    }
  }, [selectedLadyId]);

  const fetchInbox = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/mail/inbox/${selectedLadyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.mails) {
        setInbox(data.mails);
      } else if (Array.isArray(data)) {
        setInbox(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const viewMail = async (id: string) => {
    try {
      const res = await fetch(`/api/mail/inbox/mail/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.mail) {
        setSelectedMail(data.mail);
      } else {
        setSelectedMail(data);
      }
      setReplyText('');
    } catch (e) {
      console.error(e);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selectedMail) return;
    try {
      const res = await fetch('/api/mail/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ladyId: selectedLadyId,
          manId: selectedMail.manId || selectedMail.man_id,
          mailId: selectedMail.id,
          text: replyText
        })
      });
      if (res.ok) {
        alert('Ответ успешно отправлен!');
        setSelectedMail(null);
        fetchInbox();
      } else {
        const data = await res.json();
        alert(data.error || 'Ошибка при отправке ответа');
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-950 text-slate-200">
      <div className="w-1/3 border-r border-slate-800 flex flex-col bg-slate-900">
        <div className="p-4 border-b border-slate-800 space-y-3">
          <h2 className="text-sm font-bold text-white flex items-center space-x-2">
            <Mail className="w-4 h-4 text-emerald-400" />
            <span>Входящие письма</span>
          </h2>
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
          <button 
            onClick={fetchInbox}
            className="flex items-center space-x-2 text-xs text-emerald-400 hover:text-emerald-300"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            <span>Обновить</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {inbox.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500">
              Нет входящих писем
            </div>
          ) : (
            inbox.map((m: any) => (
              <div
                key={m.id}
                onClick={() => viewMail(m.id)}
                className={`p-3 rounded-xl cursor-pointer transition border ${selectedMail?.id === m.id ? 'bg-emerald-950/40 border-emerald-500/50' : 'bg-slate-800/40 hover:bg-slate-800/80 border-transparent'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-bold text-sm text-white">{m.manName || m.man_name || 'Неизвестный'}</span>
                </div>
                <div className="text-xs text-slate-400 truncate">
                  {m.subject || 'Без темы'}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-slate-950">
        {selectedMail ? (
          <>
            <div className="p-4 border-b border-slate-800 bg-slate-900 flex items-center space-x-4">
              <button 
                onClick={() => setSelectedMail(null)}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 transition"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h3 className="font-bold text-white text-lg">{selectedMail.subject || 'Без темы'}</h3>
                <div className="text-sm text-slate-400">От: {selectedMail.manName || selectedMail.man_name}</div>
              </div>
            </div>
            
            <div className="flex-1 p-6 overflow-y-auto text-sm text-slate-300 whitespace-pre-wrap">
              {selectedMail.text || selectedMail.content || selectedMail.body || 'Пустое письмо'}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900 space-y-3">
              <label className="text-xs font-semibold uppercase text-slate-400">Ответить:</label>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={5}
                placeholder="Напишите ответ..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none"
              />
              <button
                onClick={handleReply}
                disabled={!replyText.trim()}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold rounded-xl text-sm transition flex items-center justify-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>Отправить ответ</span>
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            Выберите письмо для просмотра
          </div>
        )}
      </div>
    </div>
  );
};
