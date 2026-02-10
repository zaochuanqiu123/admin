import { PageContainer } from '@ant-design/pro-components';
import { Card } from 'antd';
import React from 'react';

const Page: React.FC = () => {
  return (
    <PageContainer title="子菜单二">
      <Card>
        <div>子菜单二</div>
      </Card>
    </PageContainer>
  );
};

export default Page;
