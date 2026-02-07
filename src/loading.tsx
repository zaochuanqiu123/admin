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
const Loading: React.FC = () => (
  <div
    style={{
      width: '100%',
      minHeight: 'calc(100vh - 60px)', // 减去 header 高度，占满全屏
      background: '#E7EDFB', // 使用主题背景色，与全局背景一致
      padding: '24px 40px',
      boxSizing: 'border-box',
    }}
  >
    {/*
      【已关闭】骨架屏加载动画
      后期改造为原生 React 页面后，取消下面的注释即可启用：
    */}
    {/* <Skeleton active paragraph={{ rows: 8 }} /> */}
  </div>
);

export default Loading;
