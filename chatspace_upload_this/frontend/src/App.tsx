import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { AdminPanel } from './components/AdminPanel';
import { OperatorMultiChat } from './components/OperatorMultiChat';
import { MailCenter } from './components/MailCenter';
import { CaptchaModal } from './components/CaptchaModal';
import { InviterModal } from './components/InviterModal';
import { 
  Shield, MessageSquare, LogOut, Heart, 
  Sparkles, Radio, KeyRound, UserCheck 
} from 'lucide-react';

export const App: React.FC = () => {
  const { user, token, login, logout, ws } = useAuth();

  // Состояние входа
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(false);

  // Режим экрана для Овнера (может переключаться между админкой и мультичатом)
  const [viewMode, setViewMode] = useState<'admin' | 'operator'>('admin');

  // Модальные окна
  const [mailLadyId, setMailLadyId] = useState<string | null>(null);
  const [inviterLadyId, setInviterLadyId] = useState<string | null>(null);
  const [captchaData, setCaptchaData] = useState<{
    ladyId: string;
    captchaImageBase64: string;
    actionType: string;
  } | null>(null);

  // Баланс оператора
  const [balance, setBalance] = useState<any>(null);
  const [sessionStartPayout, setSessionStartPayout] = useState<number | null>(null);
  
  // Логи баланса
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [balanceLogs, setBalanceLogs] = useState<any[]>([]);

  // Слушаем событие капчи от WebSocket
  useEffect(() => {
    if (!ws) return;
    const handleWs = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (data.event === 'SHOW_CAPTCHA_MODAL') {
          setCaptchaData(data.payload);
        }
      } catch (err) {
        console.error(err);
      }
    };
    ws.addEventListener('message', handleWs);
    return () => ws.removeEventListener('message', handleWs);
  }, [ws]);

  // Устанавливаем режим по умолчанию
  useEffect(() => {
    if (user?.role === 'OPERATOR') {
      setViewMode('operator');
    } else if (user?.role === 'OWNER') {
      setViewMode('admin');
    }
  }, [user]);

  const fetchBalance = async () => {
    if (!token || user?.role !== 'OPERATOR') return;
    try {
      const res = await fetch('/api/operator/balance', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data) setBalance(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBalanceLogs = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/operator/balance/logs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.logs) setBalanceLogs(data.logs);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (token && user?.role === 'OPERATOR') {
      fetchBalance();
      const interval = setInterval(fetchBalance, 10000);
      return () => clearInterval(interval);
    }
  }, [token, user]);

  useEffect(() => {
    if (isLogsOpen) {
      fetchBalanceLogs();
    }
  }, [isLogsOpen]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      login(data.token, data.user);
    } catch (err: any) {
      setAuthError(err.message || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  // 1. Экран логина (если не авторизован)
  if (!token || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white relative overflow-hidden">
        {/* Фоновые градиенты */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-2">
              <Heart className="w-8 h-8 fill-emerald-500/20" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center space-x-2">
              <span>IMPERIA</span>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-600 text-white font-mono font-normal">CharmDate</span>
            </h1>
            <p className="text-xs text-slate-400">
              Агентская платформа Живых Чатов и автоматизации писем Qpid Network
            </p>
          </div>

          {authError && (
            <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl text-xs text-rose-200 text-center">
              {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Имя пользователя / Логин</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Пароль</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-emerald-900/40"
            >
              {loading ? 'Вход в систему...' : 'Войти в рабочий кабинет'}
            </button>
          </form>

        </div>
      </div>
    );
  }

  // 2. Основное приложение после авторизации
  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 font-sans">
      
      {/* Главная навигационная панель (Header) */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between shrink-0 relative">
        
        {/* Левая часть: Логотип и статус */}
        <div className="flex items-center space-x-4 w-1/3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-black text-white text-base shadow-md shadow-emerald-900/30">
              IMP
            </div>
            <div>
              <span className="font-extrabold text-white text-base tracking-tight">IMPERIA</span>
              <span className="text-[10px] ml-1.5 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">CharmDate</span>
            </div>
          </div>

          <div className="h-5 w-px bg-slate-800"></div>

          {/* Индикатор связи с WebSocket */}
          <div className="flex items-center space-x-1.5 text-xs text-slate-400">
            <span className={`w-2 h-2 rounded-full ${ws && ws.readyState === WebSocket.OPEN ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'}`}></span>
            <span>{ws && ws.readyState === WebSocket.OPEN ? 'Шлюз активен' : 'Подключение к шлюзу...'}</span>
          </div>
        </div>

        {/* Центральная часть: Баланс оператора */}
        <div className="flex items-center justify-center w-1/3">
          {user.role === 'OPERATOR' && balance && (
            <div className="relative flex bg-slate-800/80 p-2 rounded-2xl border border-slate-700 items-center space-x-4 shadow-lg shadow-emerald-900/10">
              <div className="flex items-center">
                <span className="text-slate-400 mr-1 text-xs font-bold uppercase tracking-wider">Сегодня:</span>
                <span className="font-extrabold text-emerald-400 text-base tracking-tight">
                  ${balance.today?.payout || '0.00'}
                </span>
              </div>
              
              <div className="w-px h-5 bg-slate-700"></div>
              
              <div className="flex items-center">
                <span className="text-slate-400 mr-1 text-xs font-bold uppercase tracking-wider">Сессия:</span>
                {sessionStartPayout !== null ? (
                  <div className="flex items-center space-x-1">
                    <span className="font-extrabold text-amber-400 text-base tracking-tight mr-1">
                      ${(Number(balance.today?.payout || 0) - sessionStartPayout).toFixed(2)}
                    </span>
                    <button title="Остановить сессию" onClick={() => setSessionStartPayout(null)} className="px-1.5 py-0.5 bg-rose-500/20 text-rose-400 rounded-md hover:bg-rose-500/40 text-xs">
                      ■
                    </button>
                  </div>
                ) : (
                  <button title="Начать сессию" onClick={() => setSessionStartPayout(Number(balance.today?.payout || 0))} className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-md hover:bg-emerald-500/40 text-xs flex items-center space-x-1">
                    <span>▶</span> <span className="text-[10px]">Старт</span>
                  </button>
                )}
              </div>
              
              <div className="w-px h-5 bg-slate-700"></div>

              <button onClick={() => setIsLogsOpen(!isLogsOpen)} className="text-xs px-2 py-1 bg-slate-700 rounded-md text-slate-300 hover:text-white transition">
                История
              </button>

              {isLogsOpen && (
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 p-2 max-h-64 overflow-y-auto">
                  <div className="text-xs font-bold text-slate-400 mb-2 border-b border-slate-700 pb-1">История начислений</div>
                  {balanceLogs.length === 0 ? (
                    <div className="text-xs text-slate-500 p-2 text-center">Нет записей</div>
                  ) : (
                    balanceLogs.map((log: any, idx) => (
                      <div key={idx} className="text-[10px] border-b border-slate-700/50 py-1.5 flex justify-between items-center">
                        <div>
                          <div className="text-slate-300">От кого: <span className="font-mono">{log.man_id || 'Неизвестно'}</span></div>
                          <div className="text-slate-500">Анкета: <span className="font-mono">{log.lady_id || 'Неизвестно'}</span></div>
                        </div>
                        <div className="text-emerald-400 font-bold text-xs bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          +${log.payout || log.amount || '0.00'}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Правая часть: переключатель режимов и профиль */}
        <div className="flex items-center justify-end space-x-4 w-1/3">
          {user.role === 'OWNER' && (
            <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700/60">
              <button
                onClick={() => setViewMode('admin')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${viewMode === 'admin' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Панель Овнера</span>
              </button>
              <button
                onClick={() => setViewMode('operator')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${viewMode === 'operator' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Мультичат Оператора</span>
              </button>
            </div>
          )}

          {/* Профиль пользователя и кнопка выхода */}
          <div className="flex items-center space-x-3 border-l border-slate-800 pl-4">
            <div className="text-right">
              <div className="text-xs font-bold text-white">{user.fullName || user.username}</div>
              <div className="text-[10px] text-slate-400 font-mono uppercase">
                {user.role === 'OWNER' ? '👑 Владелец' : '💬 Оператор'}
              </div>
            </div>

            <button
              onClick={logout}
              title="Выйти из аккаунта"
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-700/60 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

      </header>

      {/* Основная рабочая зона */}
      <main className="flex-1 flex overflow-hidden">
        {viewMode === 'admin' && user.role === 'OWNER' ? (
          <AdminPanel />
        ) : (
          <OperatorMultiChat
            onOpenMail={(ladyId) => setMailLadyId(ladyId)}
            onOpenInviter={(ladyId) => setInviterLadyId(ladyId)}
          />
        )}
      </main>

      {/* Модальное окно управления почтой Admirer и First EMF */}
      {mailLadyId && (
        <MailCenter
          initialLadyId={mailLadyId}
          onClose={() => setMailLadyId(null)}
        />
      )}

      {/* Модальное окно решения капчи */}
      {captchaData && (
        <CaptchaModal
          ladyId={captchaData.ladyId}
          captchaImageBase64={captchaData.captchaImageBase64}
          actionType={captchaData.actionType}
          onClose={() => setCaptchaData(null)}
        />
      )}

      {/* Модальное окно настройки авторассыльщика */}
      {inviterLadyId && (
        <InviterModal
          ladyId={inviterLadyId}
          onClose={() => setInviterLadyId(null)}
          onStart={(settings) => {
            console.log('Запущен авторассыльщик с настройками:', settings);
            alert(`Авторассыльщик инвайтов для анкеты ${settings.ladyId} запущен! Паузы: ${settings.minDelay}-${settings.maxDelay} сек.`);
          }}
        />
      )}

    </div>
  );
};
