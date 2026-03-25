/**
 * 全局路由切换加载组件
 *
 * 【当前状态】：已关闭骨架屏
 * 原因：当前使用 iframe 嵌入旧系统页面，iframe 内部已有 Spin 加载动画，
 *      两个加载动画同时出现会导致观感不好。
 *
 * 【后期启用】：当 iframe 页面改造为原生 React 页面后，建议启用骨架屏
 *
 * 启用方法：
 * 1. 取消注释下面的 <Skeleton active /> 代码
 * 2. 删除或注释掉空的 div 内容
 * 3. 可选：根据实际页面结构调整骨架屏样式
 *
 * 使用场景：
 * - 适合：原生 React 页面的路由切换加载
 * - 不适合：iframe 页面加载（iframe 有自己的加载动画）
 *
 * 示例（启用后的代码）：
 * <Skeleton active paragraph={{ rows: 8 }} />
 */
import { Skeleton, Spin } from 'antd';

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
  } catch (error) {
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
  const skeletonColorVars = shouldUseDarkLoading
    ? ({
        '--ant-color-fill-content': 'rgba(255, 255, 255, 0.08)',
        '--ant-color-fill': 'rgba(255, 255, 255, 0.14)',
        '--suifida-admin-colorFillContent': 'rgba(255, 255, 255, 0.08)',
        '--suifida-admin-colorFill': 'rgba(255, 255, 255, 0.14)',
      } as any)
    : undefined;
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
        minHeight: 'calc(100vh - 60px)', // 减去 header 高度，占满全屏
        background: loadingBg,
        padding: '24px 40px',
        boxSizing: 'border-box',
        ...skeletonColorVars,
      }}
    >
      {/*
        【已关闭】骨架屏加载动画
        后期改造为原生 React 页面后，取消下面的注释即可启用：
      */}
      <Skeleton active paragraph={{ rows: 8 }} />
    </div>
  );
};

export default Loading;
