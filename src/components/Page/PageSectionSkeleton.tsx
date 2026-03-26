import { Skeleton, Space } from 'antd';
import React from 'react';

type PageSectionSkeletonProps = {
  rows?: number;
  showToolbar?: boolean;
};

const PageSectionSkeleton: React.FC<PageSectionSkeletonProps> = ({
  rows = 6,
  showToolbar = true,
}) => {
  return (
    <div>
      {showToolbar ? (
        <Space style={{ marginBottom: 20 }}>
          <Skeleton.Button active size="default" style={{ width: 120 }} />
          <Skeleton.Button active size="default" style={{ width: 96 }} />
        </Space>
      ) : null}
      <Skeleton active paragraph={{ rows }} title={{ width: '28%' }} />
    </div>
  );
};

export default PageSectionSkeleton;
