import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

interface PopoutWindowProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function PopoutWindow({ title, onClose, children }: PopoutWindowProps) {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const newWindow = useRef<Window | null>(null);

  useEffect(() => {
    // Open the new window
    const win = window.open('', '', 'width=900,height=600,left=200,top=200');
    if (!win) {
      alert("Por favor habilite las ventanas emergentes (pop-ups) en su navegador para usar múltiples monitores.");
      onClose();
      return;
    }
    
    newWindow.current = win;
    win.document.title = title;

    // Synchronize stylesheets from parent
    const copyStyles = () => {
      const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
      styles.forEach((styleNode) => {
        win.document.head.appendChild(styleNode.cloneNode(true));
      });
    };
    copyStyles();

    // Setup body classes (dark mode, background, etc)
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) win.document.documentElement.classList.add('dark');
    win.document.body.className = "bg-bg-primary text-text-primary m-0 overflow-hidden";

    // Create the container for React portal
    const el = win.document.createElement('div');
    el.style.width = '100vw';
    el.style.height = '100vh';
    el.style.display = 'flex';
    el.style.flexDirection = 'column';
    win.document.body.appendChild(el);
    setContainer(el);

    // Handle closing from the new window's "X" button
    const handleBeforeUnload = () => {
      onClose();
    };
    win.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      win.removeEventListener('beforeunload', handleBeforeUnload);
      win.close();
    };
  }, []); // Run once on mount

  if (!container) return null;

  return createPortal(children, container);
}
