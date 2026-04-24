import { BellOutlined, CloseOutlined } from '@ant-design/icons';
import type { TabsProps } from 'antd';
import { Button, Drawer, Empty, List, Tabs, Tag, Tooltip, theme } from 'antd';
import React, { useMemo, useState } from 'react';

type NoticeItem = {
  id: string;
  title: string;
  datetime: string;
  type?: string;
};

const EMPTY_NOTICE_DATA_SOURCE: Record<string, NoticeItem[]> = {
  notice: [],
  todo: [],
  system: [],
  marketing: [],
};

const NoticeBell: React.FC = () => {
  const { token } = theme.useToken();

  const [open, setOpen] = useState(false);
  const [activeKey, setActiveKey] = useState('notice');

  const drawerBg = token.colorBgLayout;
  const cardBg = token.colorBgContainer;
  const primaryText = token.colorText;
  const secondaryText = token.colorTextSecondary;

  const tabs: TabsProps['items'] = useMemo(
    () => [
      { key: 'notice', label: <span style={{ fontSize: 18 }}>平台公告</span> },
      { key: 'todo', label: <span style={{ fontSize: 18 }}>代办任务</span> },
      { key: 'system', label: <span style={{ fontSize: 18 }}>系统通知</span> },
      {
        key: 'marketing',
        label: <span style={{ fontSize: 18 }}>营销信息</span>,
      },
    ],
    [],
  );

  const listData = EMPTY_NOTICE_DATA_SOURCE[activeKey] || [];

  return (
    <>
      <Tooltip title="消息通知">
        <Button
          type="text"
          shape="circle"
          className="pc-admin-header-circle-action pc-admin-header-circle-action--notice"
          icon={<BellOutlined />}
          onClick={() => setOpen(true)}
        />
      </Tooltip>
      <Drawer
        open={open}
        placement="right"
        width={660}
        className="notice-bell-drawer"
        onClose={() => setOpen(false)}
        closable={false}
        styles={{
          body: {
            padding: 0,
            background: drawerBg,
          },
        }}
        title={
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <Tabs
                activeKey={activeKey}
                items={tabs}
                onChange={setActiveKey}
                className="notice-bell-tabs"
                tabBarStyle={{ margin: 0, borderBottom: 'none' }}
              />
            </div>
            <Button
              type="text"
              aria-label="close"
              icon={<CloseOutlined />}
              onClick={() => setOpen(false)}
            />
          </div>
        }
      >
        <div style={{ padding: 16, background: drawerBg }}>
          {listData.length === 0 ? (
            <div
              style={{
                height: 'calc(100vh - 160px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Empty />
            </div>
          ) : (
            <List
              dataSource={listData}
              split={false}
              style={{ maxHeight: 'calc(100vh - 160px)', overflow: 'auto' }}
              renderItem={(item) => (
                <List.Item
                  style={{
                    padding: '12px 16px',
                    marginBottom: 12,
                    background: cardBg,
                    borderRadius: 12,
                    border: '0px solid rgba(0,0,0,0.06)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      gap: 12,
                      width: '100%',
                      alignItems: 'baseline',
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                        display: 'flex',
                        gap: 8,
                        alignItems: 'baseline',
                      }}
                    >
                      {item.type ? (
                        <Tag color="blue" style={{ marginInlineEnd: 0 }}>
                          {item.type}
                        </Tag>
                      ) : null}
                      <div
                        title={item.title}
                        style={{
                          fontWeight: 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: primaryText,
                        }}
                      >
                        {item.title}
                      </div>
                    </div>
                    <div style={{ color: secondaryText, fontSize: 12 }}>
                      {item.datetime}
                    </div>
                  </div>
                </List.Item>
              )}
            />
          )}
        </div>
      </Drawer>
    </>
  );
};

export default NoticeBell;
