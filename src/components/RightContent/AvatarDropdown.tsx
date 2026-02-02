import { useModel } from '@umijs/max';

export const AvatarName = () => {
  const { initialState } = useModel('@@initialState');
  const { currentUser } = initialState || {};
  if (!currentUser?.name) return null;
  return <span>{currentUser.name}</span>;
};
