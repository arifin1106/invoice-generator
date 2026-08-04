import { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('auth_token'));
  const [isLoading, setIsLoading] = useState(true);

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

  useEffect(() => {
    if (token) {
      localStorage.setItem('auth_token', token);
      checkUser();
    } else {
      localStorage.removeItem('auth_token');
      setUser(null);
      setIsLoading(false);
    }
  }, [token]);

  const checkUser = async () => {
    try {
      const response = await axios.get(`${apiBase}/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
    } catch (error) {
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await axios.post(`${apiBase}/login`, { email, password });
    setToken(response.data.token);
    setUser(response.data.user);
  };

  const logout = async () => {
    try {
      await axios.post(`${apiBase}/logout`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error(error);
    } finally {
      setToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
