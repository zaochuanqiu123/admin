import { Spin } from 'antd';

const NAV_THEME_STORAGE_KEY = 'pc_admin_nav_theme';

function readDarkMode() {
  if (
    typeof document !== 'undefined' &&
    document.body.classList.contains('theme-black-mode')
  ) {
    return true;
  }
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(NAV_THEME_STORAGE_KEY) === 'realDark';
  } catch {
    return false;
  }
}

const Loading: React.FC = () => {
  const isDarkMode = readDarkMode();
  const pathname =
    typeof window !== 'undefined' ? window.location.pathname : '';
  const isLoginPage = pathname === '/user/login';
  const isNoDarkPage = isLoginPage || pathname === '/user/character';
  const shouldUseDarkLoading = isDarkMode && !isNoDarkPage;
  const loadingBg = shouldUseDarkLoading ? '#141414' : '#E7EDFB';
  const loadingTextColor = shouldUseDarkLoading
    ? 'rgba(255, 255, 255, 0.65)'
    : '#667289';
  if (isLoginPage) {
    return (
      <div
        className={`route-loading route-loading-login${shouldUseDarkLoading ? ' route-loading-dark' : ''}`}
        style={{
          width: '100%',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: loadingBg,
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            color: loadingTextColor,
          }}
        >
          <Spin size="small" />
          <span>正在进入登录页...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`route-loading${shouldUseDarkLoading ? ' route-loading-dark' : ''}`}
      style={{
        width: '100%',
        minHeight: 'calc(100vh - 60px)',
        background: loadingBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          color: loadingTextColor,
        }}
      >
        <Spin size="small" />
        <span>页面加载中...</span>
      </div>
    </div>
  );
};

export default Loading;
