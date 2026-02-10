import React, { useEffect } from 'react';

/**
 * 监听页面滚动，为 header 添加滚动样式
 */
const HeaderScrollWatcher: React.FC = () => {
  useEffect(() => {
    const handler = () => {
      const y =
        window.scrollY ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0;

      if (y > 16) {
        document.body.classList.add('header-scrolled');
      } else {
        document.body.classList.remove('header-scrolled');
      }
    };

    handler();
    window.addEventListener('scroll', handler, { passive: true } as any);
    return () => window.removeEventListener('scroll', handler as any);
  }, []);

  return null;
};

export default HeaderScrollWatcher;
