import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useTranslation } from 'react-i18next';

const UserMenu: React.FC = () => {
  const { user, isGuest, signOut, signIn } = useAuth();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isGuest && !user) {
    return (
      <button 
        onClick={signIn} 
        className="px-4 py-1.5 bg-[#FF5A09] hover:bg-[#ff6a20] text-white text-xs font-medium rounded transition-colors shadow-sm"
      >
        {t('auth.login_btn', 'Iniciar sesión')}
      </button>
    );
  }

  if (!user) return null;

  return (
    <div className="relative flex items-center" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="flex items-center focus:outline-none"
      >
        <img
          src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}`}
          alt="User Avatar"
          className="w-7 h-7 rounded-full border border-border-subtle object-cover shadow-sm hover:ring-2 hover:ring-[#FF5A09] transition-all"
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-bg-surface rounded-md shadow-lg py-1 z-50 border border-border-subtle">
          <div className="px-4 py-3 border-b border-border-subtle">
            <p className="text-sm font-medium text-text-primary truncate">
              {user.displayName || 'Usuario'}
            </p>
            <p className="text-xs text-text-secondary truncate">{user.email}</p>
          </div>
          <button
            onClick={() => { setIsOpen(false); signOut(); }}
            className="w-full text-left block px-4 py-2 text-sm text-red-500 hover:bg-bg-hover transition-colors"
          >
            {t('auth.logout_btn', 'Cerrar sesión')}
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
