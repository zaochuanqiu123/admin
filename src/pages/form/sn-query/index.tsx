import { Card, Empty } from 'antd';

const StoreSnQueryPage = () => {
  return (
    <div
      style={{
        minHeight: 'calc(100vh - 112px)',
      }}
    >
      <Card
        title="串码查询"
        style={{ borderRadius: 14 }}
        bodyStyle={{ minHeight: 360 }}
      >
        <Empty description="串码查询页面建设中" />
      </Card>
    </div>
  );
};

export default StoreSnQueryPage;
