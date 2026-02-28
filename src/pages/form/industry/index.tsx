import { Card, Empty } from 'antd';

const StoreIndustryPage = () => {
  return (
    <div
      style={{
        minHeight: 'calc(100vh - 112px)',
      }}
    >
      <Card
        title="所属行业"
        style={{ borderRadius: 14 }}
        bodyStyle={{ minHeight: 360 }}
      >
        <Empty description="所属行业页面建设中" />
      </Card>
    </div>
  );
};

export default StoreIndustryPage;
