import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  ws: WebSocket | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
  ws: null
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('cs_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('cs_token');
  });
  const [ws, setWs] = useState<WebSocket | null>(null);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('cs_token', newToken);
    localStorage.setItem('cs_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    if (ws) ws.close();
    setWs(null);
    localStorage.removeItem('cs_token');
    localStorage.removeItem('cs_user');
  };

  useEffect(() => {
    if (!token || !user) return;

    // Подключение к WebSocket шлюзу
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws?token=${token}&type=${user.role === 'OWNER' ? 'OWNER_UI' : 'OPERATOR_UI'}`;
    
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log('✅ Подключен к WebSocket шлюзу реального времени');
    };

    socket.onclose = () => {
      console.log('❌ WebSocket отключен');
    };

    setWs(socket);

    return () => {
      socket.close();
    };
  }, [token, user]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, ws }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
