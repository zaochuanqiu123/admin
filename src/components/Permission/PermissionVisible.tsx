import { useAccess } from '@umijs/max';
import React from 'react';

type PermissionVisibleProps = {
  perm: string | string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
};

const PermissionVisible: React.FC<PermissionVisibleProps> = ({
  perm,
  fallback = null,
  children,
}) => {
  const access = useAccess() as {
    hasButtonPerm?: (value: string | string[]) => boolean;
  };

  if (!access?.hasButtonPerm?.(perm)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default PermissionVisible;
