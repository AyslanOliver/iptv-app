import { IconType } from 'react-icons';
import React from 'react';

interface IconProps {
  icon: IconType;
}

const Icon: React.FC<IconProps> = ({ icon: IconComponent }) => {
  const Component = IconComponent as React.ComponentType<{ size?: number; 'aria-hidden'?: string }>;
  return <Component size={24} aria-hidden="true" />;
};

export default Icon;