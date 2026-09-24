import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('auth_user');
    if (savedUser) {
      try { return JSON.parse(savedUser); } catch (e) {}
    }
    return {
      role: 'guest',
      targetType: 'all',
      groupNum: null,
      displayName: 'Khách (Chế độ xem)',
      isGuest: true
    };
  });

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Khởi động: xác thực lại token với server
  useEffect(() => {
    const checkToken = async () => {
      const token = localStorage.getItem('auth_token');
      if (token && token !== 'guest_token') {
        try {
          const res = await api.getMe();
          if (res.success && res.user) {
            setUser(res.user);
            localStorage.setItem('auth_user', JSON.stringify(res.user));
          }
        } catch (e) {
          console.warn('Lỗi kiểm tra phiên đăng nhập:', e);
        }
      }
    };
    checkToken();
  }, []);

  const login = async (loginData) => {
    const res = await api.login(loginData);
    if (res.success) {
      localStorage.setItem('auth_token', res.token);
      localStorage.setItem('auth_user', JSON.stringify(res.user));
      setUser(res.user);
      setIsLoginModalOpen(false);
    }
    return res;
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    const guestUser = {
      role: 'guest',
      targetType: 'all',
      groupNum: null,
      displayName: 'Khách (Chế độ xem)',
      isGuest: true
    };
    localStorage.setItem('auth_user', JSON.stringify(guestUser));
    setUser(guestUser);
  };

  // Helper kiểm tra quyền can thiệp vào nhóm cụ thể
  const canEditGroup = (targetType, groupNum) => {
    if (!user || user.role === 'guest' || user.isGuest) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'leader') {
      return user.targetType === targetType && Number(user.groupNum) === Number(groupNum);
    }
    return false;
  };

  // Helper kiểm tra quyền Admin
  const isAdmin = Boolean(user && user.role === 'admin');

  // Helper kiểm tra có quyền chỉnh sửa bất kỳ nhóm nào không
  const canEditAny = Boolean(user && (user.role === 'admin' || user.role === 'leader'));

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        isGuest: Boolean(!user || user.role === 'guest' || user.isGuest),
        isLeader: Boolean(user && user.role === 'leader'),
        login,
        logout,
        canEditGroup,
        canEditAny,
        isLoginModalOpen,
        openLoginModal: () => setIsLoginModalOpen(true),
        closeLoginModal: () => setIsLoginModalOpen(false),
        isPasswordModalOpen,
        openPasswordModal: () => setIsPasswordModalOpen(true),
        closePasswordModal: () => setIsPasswordModalOpen(false),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

