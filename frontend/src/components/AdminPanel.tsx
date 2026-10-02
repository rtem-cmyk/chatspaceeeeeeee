import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lady, Operator } from '../types';
import { 
  Users, Heart, Radio, Send, Mail, Plus, Trash2, 
  UserCheck, Shield, RefreshCw, KeyRound, Globe2
} from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const { token } = useAuth();
  const [tab, setTab] = useState<'overview' | 'ladies' | 'operators' | 'assignments' | 'finance' | 'shift'>('overview');
  
  // Данные
  const [ladies, setLadies] = useState<Lady[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [stats, setStats] = useState<any>({
    totalLadies: 0,
    totalOperators: 0,
    activeChats: 0,
    invitesToday: 0,
    admirerToday: 0,
    liveChats: []
  });
  const [financeStats, setFinanceStats] = useState<any>(null);
  const [shiftStats, setShiftStats] = useState<any[]>([]);
  const [financeLogs, setFinanceLogs] = useState<any[]>([]);
  // Модалки
  const [showAddLady, setShowAddLady] = useState(false);
  const [newLady, setNewLady] = useState({ lady_id: '', name: '', password: '', proxy_url: '', avatar_url: '' });

  const [showAddOperator, setShowAddOperator] = useState(false);
  const [newOperator, setNewOperator] = useState({ username: '', password: '', full_name: '', commission_percentage: 40, permissions: { chat: true, sender: true, gallery: true } });

  const [showEditOperator, setShowEditOperator] = useState(false);
  const [editOperatorData, setEditOperatorData] = useState({ id: 0, full_name: '', commission_percentage: 40, permissions: { chat: true, sender: true, gallery: true } });

  const [assignData, setAssignData] = useState<{operator_id: string, lady_ids: string[], shift_start: string, shift_end: string}>({ operator_id: '', lady_ids: [], shift_start: '08:00', shift_end: '20:00' });

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [lRes, oRes, sRes, fRes, shiftRes, fLogsRes] = await Promise.all([
        fetch('/api/admin/ladies', { headers }),
        fetch('/api/admin/operators', { headers }),
        fetch('/api/admin/stats', { headers }),
        fetch('/api/admin/finance-stats', { headers }),
        fetch('/api/admin/shift-status', { headers }),
        fetch('/api/admin/balance/logs', { headers })
      ]);
      const lData = await lRes.json();
      const oData = await oRes.json();
      const sData = await sRes.json();
      const fData = await fRes.json();
      
      let shiftData = [];
      try { shiftData = await shiftRes.json(); } catch(e){}
      let fLogsData: any = {};
      try { fLogsData = await fLogsRes.json(); } catch(e){}

      if (lData.ladies) setLadies(lData.ladies);
      if (oData.operators) setOperators(oData.operators);
      if (sData) setStats(sData);
      if (fData) setFinanceStats(fData);
      if (Array.isArray(shiftData)) setShiftStats(shiftData);
      else if (shiftData && shiftData.shift) setShiftStats(shiftData.shift);
      
      if (Array.isArray(fLogsData)) setFinanceLogs(fLogsData);
      else if (fLogsData && fLogsData.logs) setFinanceLogs(fLogsData.logs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleAddLady = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/ladies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newLady)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMsg({ type: 'ok', text: data.message });
      setShowAddLady(false);
      setNewLady({ lady_id: '', name: '', password: '', proxy_url: '', avatar_url: '' });
      fetchData();
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message });
    }
  };

  const handleAddOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...newOperator,
        permissions: JSON.stringify(newOperator.permissions)
      };
      const res = await fetch('/api/admin/operators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMsg({ type: 'ok', text: data.message });
      setShowAddOperator(false);
      setNewOperator({ username: '', password: '', full_name: '', commission_percentage: 40, permissions: { chat: true, sender: true, gallery: true } });
      fetchData();
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message });
    }
  };

  const handleEditOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        full_name: editOperatorData.full_name,
        commission_percentage: editOperatorData.commission_percentage,
        permissions: JSON.stringify(editOperatorData.permissions)
      };
      const res = await fetch(`/api/admin/operators/${editOperatorData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMsg({ type: 'ok', text: data.message || 'Оператор обновлен' });
      setShowEditOperator(false);
      fetchData();
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message });
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (assignData.lady_ids.length === 0) {
      setMsg({ type: 'err', text: 'Выберите хотя бы одну анкету' });
      return;
    }
    try {
      const res = await fetch('/api/admin/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(assignData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMsg({ type: 'ok', text: data.message });
      fetchData();
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message });
    }
  };

  const handleDeleteLady = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить эту анкету?')) return;
    await fetch(`/api/admin/ladies/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchData();
  };

  const handleDeleteOperator = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить сотрудника? Доступ к анкетам будет сразу закрыт.')) return;
    await fetch(`/api/admin/operators/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchData();
  };

  const handleDeleteAssignment = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить это распределение смены?')) return;
    try {
      const res = await fetch(`/api/admin/assignments/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMsg({ type: 'ok', text: 'Распределение смены удалено' });
      fetchData();
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message });
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
      {/* Верхний бар навигации админки */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <Shield className="w-6 h-6 text-emerald-400" />
            <h1 className="text-xl font-bold tracking-tight text-white">Панель Владельца</h1>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">Qpid CharmDate Админ</span>
          </div>

          <div className="flex bg-slate-800 p-1 rounded-lg space-x-1">
            <button
              onClick={() => setTab('overview')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${tab === 'overview' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Сводка
            </button>
            <button
              onClick={() => setTab('ladies')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${tab === 'ladies' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Анкеты девушек ({ladies.length})
            </button>
            <button
              onClick={() => setTab('operators')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${tab === 'operators' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Операторы ({operators.length})
            </button>
            <button
              onClick={() => setTab('assignments')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${tab === 'assignments' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Распределение смен
            </button>
            <button
              onClick={() => setTab('shift')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition flex items-center space-x-1 ${tab === 'shift' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Контроль смены
            </button>
            <button
              onClick={() => setTab('finance')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition flex items-center space-x-1 ${tab === 'finance' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Финансы / Баланс
            </button>
          </div>
        </div>

        <button 
          onClick={fetchData} 
          className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Обновить</span>
        </button>
      </div>

      {/* Уведомление об успехе/ошибке */}
      {msg && (
        <div className={`mx-6 mt-4 p-3 rounded-lg text-sm flex justify-between items-center ${msg.type === 'ok' ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-200' : 'bg-rose-950/80 border border-rose-500/50 text-rose-200'}`}>
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Основной контент */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* ВКЛАДКА 1: СВОДКА */}
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold uppercase">Анкеты в системе</span>
                  <Heart className="w-5 h-5 text-rose-400" />
                </div>
                <div className="text-3xl font-extrabold text-white">{stats.totalLadies}</div>
                <div className="text-xs text-emerald-400 mt-1">Все зашифрованы AES-256</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold uppercase">Операторы</span>
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <div className="text-3xl font-extrabold text-white">{stats.totalOperators}</div>
                <div className="text-xs text-slate-400 mt-1">Сотрудники агентства</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold uppercase">Активные чаты (Онлайн)</span>
                  <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
                </div>
                <div className="text-3xl font-extrabold text-emerald-400">{stats.activeChats}</div>
                <div className="text-xs text-slate-400 mt-1">Идут прямо сейчас</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold uppercase">Инвайты / Поклонники сегодня</span>
                  <Send className="w-5 h-5 text-amber-400" />
                </div>
                <div className="text-3xl font-extrabold text-white">
                  {stats.invitesToday} <span className="text-sm font-normal text-slate-400">/ {stats.admirerToday}</span>
                </div>
                <div className="text-xs text-slate-400 mt-1">Отправлено за сутки</div>
              </div>
            </div>

            {/* Живые чаты агентства в реальном времени */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                <span>Живой эфир чатов агентства</span>
              </h2>

              {stats.liveChats.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  Сейчас нет активных чатов. Как только мужчина ответит на инвайт или напишет сообщение, диалог появится здесь в реальном времени.
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {stats.liveChats.map((c: any) => (
                    <div key={c.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <span className="font-semibold text-white">{c.lady_name}</span>
                        <span className="text-xs text-slate-400">({c.lady_id})</span>
                        <span className="text-slate-600">↔</span>
                        <span className="text-slate-200">{c.man_name}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">{c.man_country}</span>
                      </div>
                      <div className="text-xs text-slate-400 font-mono">
                        Активность: {new Date(c.last_activity).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ВКЛАДКА 2: АНКЕТЫ ДЕВУШЕК */}
        {tab === 'ladies' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-slate-400">
                Все пароли хранятся в зашифрованном виде (AES-256). Операторы получают доступ только к чату и не знают исходных паролей.
              </p>
              <button
                onClick={() => setShowAddLady(true)}
                className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
              >
                <Plus className="w-4 h-4" />
                <span>Добавить девушку</span>
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800/60 text-xs uppercase text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Анкета</th>
                    <th className="px-4 py-3">ID в CharmDate</th>
                    <th className="px-4 py-3">Статус на сайте</th>
                    <th className="px-4 py-3">Назначенный оператор</th>
                    <th className="px-4 py-3">Смена</th>
                    <th className="px-4 py-3">Индивидуальный Прокси</th>
                    <th className="px-4 py-3 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {ladies.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-800/30 transition">
                      <td className="px-4 py-3 flex items-center space-x-3">
                        <img 
                          src={l.avatar_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100'} 
                          alt="" 
                          className="w-8 h-8 rounded-full object-cover border border-slate-700" 
                        />
                        <span className="font-semibold text-white">{l.name}</span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-400">{l.lady_id}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${l.online_status === 'online' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                          <span className={`w-1.5 h-1.5 mr-1.5 rounded-full ${l.online_status === 'online' ? 'bg-emerald-400' : 'bg-slate-500'}`}></span>
                          {l.online_status === 'online' ? 'В онлайне' : 'Офлайн'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {l.assigned_operator_name ? (
                          <span className="text-white flex items-center space-x-1.5">
                            <UserCheck className="w-4 h-4 text-emerald-400" />
                            <span>{l.assigned_operator_name}</span>
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">Не назначена</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {l.shift_start ? `${l.shift_start} - ${l.shift_end}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                        {l.proxy_url ? l.proxy_url : <span className="text-slate-600">Прямое подключение</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeleteLady(l.id)}
                          className="text-slate-500 hover:text-rose-400 transition p-1"
                          title="Удалить анкету"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ВКЛАДКА 3: ОПЕРАТОРЫ */}
        {tab === 'operators' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-slate-400">
                Аккаунты ваших сотрудников. Операторы логинятся в систему и видят только выданных им девушек.
              </p>
              <button
                onClick={() => setShowAddOperator(true)}
                className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
              >
                <Plus className="w-4 h-4" />
                <span>Создать оператора</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {operators.map((op) => (
                <div key={op.id} className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-white text-base">{op.full_name}</div>
                      <div className="text-xs text-slate-400 font-mono">Логин: {op.username}</div>
                      <div className="text-xs text-slate-400 font-mono">Пароль: {op.password_plain || 'Скрыт'}</div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          let perms = { chat: true, sender: true, gallery: true };
                          if (op.permissions) {
                            try { perms = JSON.parse(op.permissions); } catch(e){}
                          }
                          setEditOperatorData({ 
                            id: op.id, 
                            full_name: op.full_name, 
                            commission_percentage: op.commission_percentage || 40,
                            permissions: perms
                          });
                          setShowEditOperator(true);
                        }}
                        className="text-slate-500 hover:text-emerald-400 transition"
                        title="Редактировать оператора"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteOperator(op.id)}
                        className="text-slate-500 hover:text-rose-400 transition"
                        title="Удалить оператора"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="border-t border-slate-800/80 pt-3 flex justify-between text-xs text-slate-400">
                    <span>Роль: Оператор чата</span>
                    <span>Доля: {op.commission_percentage || 40}%</span>
                  </div>
                  <div className="text-xs text-slate-500 text-right">
                    Создан: {new Date(op.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ВКЛАДКА 4: РАСПРЕДЕЛЕНИЕ СМЕН */}
        {tab === 'assignments' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <UserCheck className="w-5 h-5 text-emerald-400" />
              <span>Быстрое назначение анкеты на оператора</span>
            </h2>

            <form onSubmit={handleAssign} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Выберите анкеты (можно несколько)</label>
                <div className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white max-h-32 overflow-y-auto space-y-1">
                  {ladies.map((l) => (
                    <label key={l.lady_id} className="flex items-center space-x-2 cursor-pointer hover:bg-slate-700 p-1 rounded">
                      <input 
                        type="checkbox" 
                        checked={assignData.lady_ids.includes(l.lady_id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAssignData({ ...assignData, lady_ids: [...assignData.lady_ids, l.lady_id] });
                          } else {
                            setAssignData({ ...assignData, lady_ids: assignData.lady_ids.filter(id => id !== l.lady_id) });
                          }
                        }}
                        className="rounded border-slate-600 text-emerald-500 focus:ring-emerald-500 bg-slate-900"
                      />
                      <span>{l.name} ({l.lady_id})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Кому назначить</label>
                <select
                  value={assignData.operator_id}
                  onChange={(e) => setAssignData({ ...assignData, operator_id: e.target.value })}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Выбрать оператора --</option>
                  {operators.map((op) => (
                    <option key={op.id} value={op.id}>
                      {op.full_name} ({op.username})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">С</label>
                  <input
                    type="time"
                    value={assignData.shift_start}
                    onChange={(e) => setAssignData({ ...assignData, shift_start: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">По</label>
                  <input
                    type="time"
                    value={assignData.shift_end}
                    onChange={(e) => setAssignData({ ...assignData, shift_end: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 px-4 rounded-lg text-sm transition"
              >
                Привязать анкету
              </button>
            </form>

            <div className="mt-8">
              <h3 className="text-md font-bold text-white mb-4">Текущие смены</h3>
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-800/60 text-xs uppercase text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Анкета</th>
                      <th className="px-4 py-3">Оператор</th>
                      <th className="px-4 py-3">Смена</th>
                      <th className="px-4 py-3 text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {ladies.filter((l) => l.assigned_operator_name).map((l) => (
                      <tr key={l.lady_id} className="hover:bg-slate-800/30 transition">
                        <td className="px-4 py-3 font-semibold text-white">{l.name} ({l.lady_id})</td>
                        <td className="px-4 py-3 text-emerald-400">{l.assigned_operator_name}</td>
                        <td className="px-4 py-3 text-slate-400">{l.shift_start} - {l.shift_end}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => l.assignment_id && handleDeleteAssignment(l.assignment_id)}
                            className="text-slate-500 hover:text-rose-400 transition flex items-center justify-end space-x-1 ml-auto"
                            title="Удалить"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Удалить</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {ladies.filter((l) => l.assigned_operator_name).length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                          Нет назначенных смен
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ВКЛАДКА: КОНТРОЛЬ СМЕНЫ */}
        {tab === 'shift' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h2 className="text-lg font-bold text-white mb-4">Термометр Смены</h2>
              {shiftStats.length === 0 ? (
                <div className="text-slate-400 text-sm">Нет активных операторов на смене.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {shiftStats.map((s, idx) => (
                    <div key={idx} className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-white">{s.operator_name || 'Неизвестный'}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${s.active_chats > 5 ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                          Чатов: {s.active_chats || 0}
                        </span>
                      </div>
                      <div className="text-sm text-slate-400">
                        Макс. ожидание: <span className={s.max_wait_time > 120 ? 'text-rose-400 font-bold' : 'text-slate-300'}>{s.max_wait_time || 0} сек.</span>
                      </div>
                      <div className="w-full bg-slate-700 h-2 rounded mt-3 overflow-hidden">
                        <div 
                          className={`h-full ${s.max_wait_time > 120 ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                          style={{ width: `${Math.min((s.max_wait_time / 180) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ВКЛАДКА 5: ФИНАНСЫ / БАЛАНС */}
        {tab === 'finance' && financeStats && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h2 className="text-lg font-bold text-white mb-4">Общий баланс агентства</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-emerald-950/30 border border-emerald-900 p-5 rounded-lg">
                  <div className="text-sm text-emerald-400 mb-1">Заработано кредитов (Всего)</div>
                  <div className="text-3xl font-extrabold text-white">{financeStats.totalCredits}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h2 className="text-md font-bold text-white mb-4">Доход по анкетам</h2>
                <div className="space-y-3">
                  {financeStats.byLady.map((l: any) => (
                    <div key={l.lady_id} className="flex justify-between items-center border-b border-slate-800 pb-2">
                      <div>
                        <div className="text-sm font-semibold text-white">{l.name}</div>
                        <div className="text-xs text-slate-400">{l.lady_id}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-emerald-400">{l.credits} кр.</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h2 className="text-md font-bold text-white mb-4">Доход по операторам (Выплаты)</h2>
                <div className="space-y-3">
                  {financeStats.byOperator.map((o: any) => (
                    <div key={o.operator_id} className="flex justify-between items-center border-b border-slate-800 pb-2">
                      <div>
                        <div className="text-sm font-semibold text-white">{o.full_name}</div>
                        <div className="text-xs text-slate-400">Комиссия: {o.commission_percentage}%</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-white">{o.credits} кр.</div>
                        <div className="text-xs text-emerald-400">Выплата: ${o.payout.toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h2 className="text-md font-bold text-white mb-4">История кредитов (Журнал)</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-800/60 text-xs uppercase text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Дата/Время</th>
                      <th className="px-4 py-3">Анкета</th>
                      <th className="px-4 py-3">Событие</th>
                      <th className="px-4 py-3 text-right">Сумма (кр.)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {financeLogs.length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-4 text-center text-slate-500">Нет данных</td></tr>
                    ) : financeLogs.map((log: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-800/30 transition">
                        <td className="px-4 py-2 whitespace-nowrap">{new Date(log.created_at || log.date).toLocaleString()}</td>
                        <td className="px-4 py-2 font-mono text-xs">{log.lady_id}</td>
                        <td className="px-4 py-2">{log.event_type || log.description}</td>
                        <td className={`px-4 py-2 text-right font-bold ${log.amount > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {log.amount > 0 ? '+' : ''}{log.amount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* МОДАЛКА: ДОБАВЛЕНИЕ ДЕВУШКИ */}
      {showAddLady && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <KeyRound className="w-5 h-5 text-emerald-400" />
              <span>Добавить анкету CharmDate</span>
            </h3>

            <form onSubmit={handleAddLady} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-1">ID девушки в CharmDate (например, C332505)</label>
                <input
                  type="text"
                  placeholder="C123456"
                  required
                  value={newLady.lady_id}
                  onChange={(e) => setNewLady({ ...newLady, lady_id: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-1">Имя девушки / Псевдоним</label>
                <input
                  type="text"
                  placeholder="Анна (Kyiv)"
                  required
                  value={newLady.name}
                  onChange={(e) => setNewLady({ ...newLady, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-1">Пароль от страницы charmingdate.com/lady</label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  required
                  value={newLady.password}
                  onChange={(e) => setNewLady({ ...newLady, password: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
                <span className="text-xs text-emerald-400/80 mt-1 block">Пароль шифруется AES-256 и скрыт от сотрудников</span>
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-1">HTTP / SOCKS5 Прокси (опционально)</label>
                <input
                  type="text"
                  placeholder="http://user:pass@192.168.1.1:8080"
                  value={newLady.proxy_url}
                  onChange={(e) => setNewLady({ ...newLady, proxy_url: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-1">Ссылка на фото (аватар)</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={newLady.avatar_url}
                  onChange={(e) => setNewLady({ ...newLady, avatar_url: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddLady(false)}
                  className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* МОДАЛКА: СОЗДАНИЕ ОПЕРАТОРА */}
      {showAddOperator && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <Users className="w-5 h-5 text-emerald-400" />
              <span>Создать сотрудника (Оператора)</span>
            </h3>

            <form onSubmit={handleAddOperator} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-1">ФИО сотрудника</label>
                <input
                  type="text"
                  placeholder="Светлана Иванова"
                  required
                  value={newOperator.full_name}
                  onChange={(e) => setNewOperator({ ...newOperator, full_name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-1">Логин для входа</label>
                <input
                  type="text"
                  placeholder="operator2"
                  required
                  value={newOperator.username}
                  onChange={(e) => setNewOperator({ ...newOperator, username: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-1">Пароль сотрудника</label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  required
                  value={newOperator.password}
                  onChange={(e) => setNewOperator({ ...newOperator, password: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-1">Процент оператора (комиссия %)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={newOperator.commission_percentage}
                  onChange={(e) => setNewOperator({ ...newOperator, commission_percentage: Number(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-2">Права доступа</label>
                <div className="flex flex-col space-y-2">
                  <label className="flex items-center space-x-2 text-sm text-white">
                    <input 
                      type="checkbox" 
                      checked={newOperator.permissions.chat} 
                      onChange={(e) => setNewOperator({...newOperator, permissions: {...newOperator.permissions, chat: e.target.checked}})} 
                      className="rounded border-slate-600 text-emerald-500 focus:ring-emerald-500 bg-slate-900"
                    />
                    <span>Чат</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm text-white">
                    <input 
                      type="checkbox" 
                      checked={newOperator.permissions.sender} 
                      onChange={(e) => setNewOperator({...newOperator, permissions: {...newOperator.permissions, sender: e.target.checked}})} 
                      className="rounded border-slate-600 text-emerald-500 focus:ring-emerald-500 bg-slate-900"
                    />
                    <span>Рассылка</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm text-white">
                    <input 
                      type="checkbox" 
                      checked={newOperator.permissions.gallery} 
                      onChange={(e) => setNewOperator({...newOperator, permissions: {...newOperator.permissions, gallery: e.target.checked}})} 
                      className="rounded border-slate-600 text-emerald-500 focus:ring-emerald-500 bg-slate-900"
                    />
                    <span>Галерея</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddOperator(false)}
                  className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition"
                >
                  Создать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* МОДАЛКА: РЕДАКТИРОВАНИЕ ОПЕРАТОРА */}
      {showEditOperator && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <RefreshCw className="w-5 h-5 text-emerald-400" />
              <span>Редактировать сотрудника</span>
            </h3>

            <form onSubmit={handleEditOperator} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-1">ФИО сотрудника</label>
                <input
                  type="text"
                  required
                  value={editOperatorData.full_name}
                  onChange={(e) => setEditOperatorData({ ...editOperatorData, full_name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-1">Процент оператора (комиссия %)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={editOperatorData.commission_percentage}
                  onChange={(e) => setEditOperatorData({ ...editOperatorData, commission_percentage: Number(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-2">Права доступа</label>
                <div className="flex flex-col space-y-2">
                  <label className="flex items-center space-x-2 text-sm text-white">
                    <input 
                      type="checkbox" 
                      checked={editOperatorData.permissions.chat} 
                      onChange={(e) => setEditOperatorData({...editOperatorData, permissions: {...editOperatorData.permissions, chat: e.target.checked}})} 
                      className="rounded border-slate-600 text-emerald-500 focus:ring-emerald-500 bg-slate-900"
                    />
                    <span>Чат</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm text-white">
                    <input 
                      type="checkbox" 
                      checked={editOperatorData.permissions.sender} 
                      onChange={(e) => setEditOperatorData({...editOperatorData, permissions: {...editOperatorData.permissions, sender: e.target.checked}})} 
                      className="rounded border-slate-600 text-emerald-500 focus:ring-emerald-500 bg-slate-900"
                    />
                    <span>Рассылка</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm text-white">
                    <input 
                      type="checkbox" 
                      checked={editOperatorData.permissions.gallery} 
                      onChange={(e) => setEditOperatorData({...editOperatorData, permissions: {...editOperatorData.permissions, gallery: e.target.checked}})} 
                      className="rounded border-slate-600 text-emerald-500 focus:ring-emerald-500 bg-slate-900"
                    />
                    <span>Галерея</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditOperator(false)}
                  className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
