import { PageContainer } from '@ant-design/pro-components'; // 1. 引入页面容器
import { Card } from 'antd'; // 2. 引入卡片组件
import React from 'react';

const Page: React.FC = () => {
  return (
    // 3. 使用 PageContainer 包裹，它会自动处理面包屑、标题和灰色背景区域
    <PageContainer title="子菜单二">
      {/* 4. 使用 Card 包裹内容，这会提供白色的背景和阴影 */}
      <Card>
        <div>子菜单二的内容在这里</div>
      </Card>
    </PageContainer>
  );
};

export default Page;
