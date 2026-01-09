import { Skeleton } from 'antd';

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
    <Skeleton active />
  </div>
);

export default Loading;
