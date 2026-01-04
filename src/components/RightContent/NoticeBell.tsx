import { BellOutlined, CloseOutlined } from '@ant-design/icons';
import { useModel } from '@umijs/max';
import type { TabsProps } from 'antd';
import { Button, Drawer, Empty, List, Tabs, Tag } from 'antd';
import React, { useMemo, useState } from 'react';

type NoticeItem = {
  id: string;
  title: string;
  datetime: string;
  type?: string;
};

const NoticeBell: React.FC = () => {
  const { initialState } = useModel('@@initialState');
  const isDark = (initialState?.settings as any)?.navTheme === 'realDark';

  const [open, setOpen] = useState(false);
  const [activeKey, setActiveKey] = useState('notice');

  const drawerBg = isDark ? '#141414' : '#FAFCFF';
  const cardBg = isDark ? '#1f1f1f' : '#fff';
  const primaryText = isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.88)';
  const secondaryText = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';

  const dataSource = useMemo<Record<string, NoticeItem[]>>(
    () => ({
      notice: [
        {
          id: 'n1',
          type: '产品动态',
          title: '服务竞争力指数SCI下线',
          datetime: '2025-12-18 15:30:00',
        },
        {
          id: 'n2',
          title: '关于商家虚假发货行为的规则要求公告',
          datetime: '2025-12-19 09:09:23',
        },
        {
          id: 'n3',
          type: '政策公告',
          title: '繁星计划小程序自运营用户增长流量激励政策到期通知',
          datetime: '2025-12-15 18:00:00',
        },
        {
          id: 'n3',
          type: '政策公告',
          title: '繁星计划小程序自运营用户增长流量激励政策到期通知',
          datetime: '2025-12-15 18:00:00',
        },
        {
          id: 'n3',
          type: '政策公告',
          title: '繁星计划小程序自运营用户增长流量激励政策到期通知',
          datetime: '2025-12-15 18:00:00',
        },
        {
          id: 'n3',
          type: '政策公告',
          title: '繁星计划小程序自运营用户增长流量激励政策到期通知',
          datetime: '2025-12-15 18:00:00',
        },
        {
          id: 'n3',
          type: '政策公告',
          title: '繁星计划小程序自运营用户增长流量激励政策到期通知',
          datetime: '2025-12-15 18:00:00',
        },
        {
          id: 'n3',
          type: '政策公告',
          title: '繁星计划小程序自运营用户增长流量激励政策到期通知',
          datetime: '2025-12-15 18:00:00',
        },
        {
          id: 'n3',
          type: '政策公告',
          title: '繁星计划小程序自运营用户增长流量激励政策到期通知',
          datetime: '2025-12-15 18:00:00',
        },
        {
          id: 'n3',
          type: '政策公告',
          title: '繁星计划小程序自运营用户增长流量激励政策到期通知',
          datetime: '2025-12-15 18:00:00',
        },
        {
          id: 'n3',
          type: '政策公告',
          title: '繁星计划小程序自运营用户增长流量激励政策到期通知',
          datetime: '2025-12-15 18:00:00',
        },
        {
          id: 'n3',
          type: '政策公告',
          title: '繁星计划小程序自运营用户增长流量激励政策到期通知',
          datetime: '2025-12-15 18:00:00',
        },
        {
          id: 'n3',
          type: '政策公告',
          title: '繁星计划小程序自运营用户增长流量激励政策到期通知',
          datetime: '2025-12-15 18:00:00',
        },
        {
          id: 'n3',
          type: '政策公告',
          title: '繁星计划小程序自运营用户增长流量激励政策到期通知',
          datetime: '2025-12-15 18:00:00',
        },
        {
          id: 'n3',
          type: '政策公告',
          title: '繁星计划小程序自运营用户增长流量激励政策到期通知',
          datetime: '2025-12-15 18:00:00',
        },
        {
          id: 'n3',
          type: '政策公告',
          title: '繁星计划小程序自运营用户增长流量激励政策到期通知',
          datetime: '2025-12-15 18:00:00',
        },
        {
          id: 'n3',
          type: '政策公告',
          title: '繁星计划小程序自运营用户增长流量激励政策到期通知',
          datetime: '2025-12-15 18:00:00',
        },
        {
          id: 'n3',
          type: '政策公告',
          title: '繁星计划小程序自运营用户增长流量激励政策到期通知',
          datetime: '2025-12-15 18:00:00',
        },
        {
          id: 'n3',
          type: '政策公告',
          title: '繁星计划小程序自运营用户增长流量激励政策到期通知',
          datetime: '2025-12-15 18:00:00',
        },
      ],
      todo: [
        {
          id: 't1',
          title: '待处理：合同审批',
          datetime: '2025-12-12 10:00:00',
        },
        {
          id: 't2',
          title: '待处理：对账单确认',
          datetime: '2025-12-11 16:45:56',
        },
      ],
      system: [
        {
          id: 's1',
          title: '关于平台规则变更提醒',
          datetime: '2025-11-20 20:00:00',
        },
        {
          id: 's2',
          title: '系统维护通知',
          datetime: '2025-11-15 08:00:00',
        },
      ],
      marketing: [
        // {
        //   id: 'm1',
        //   title: '双十一大促服务费优惠延迟提醒',
        //   datetime: '2025-10-13 18:30:00',
        // },
      ],
    }),
    [],
  );

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

  const listData = dataSource[activeKey] || [];

  return (
    <>
      <Button
        type="text"
        shape="circle"
        icon={<BellOutlined />}
        onClick={() => setOpen(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(0,0,0,0.08)',
          width: '32px',
          height: '32px',
        }}
      />
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
