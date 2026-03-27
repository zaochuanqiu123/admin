import { Button } from 'antd';
import type { ButtonProps } from 'antd';
import React from 'react';
import PermissionVisible from './PermissionVisible';

type PermissionButtonProps = ButtonProps & {
  perm: string | string[];
  fallback?: React.ReactNode;
};

const PermissionButton: React.FC<PermissionButtonProps> = ({
  perm,
  fallback = null,
  ...buttonProps
}) => {
  return (
    <PermissionVisible perm={perm} fallback={fallback}>
      <Button {...buttonProps} />
    </PermissionVisible>
  );
};

export default PermissionButton;
