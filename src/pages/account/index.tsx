import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Button, Col, Row, Space, Statistic, Typography } from 'antd';
import React from 'react';

const Account: React.FC = () => {
  return (
    <PageContainer
      header={{
        title: '个人页',
        subTitle: '一级菜单无子节点时用于展示的页面（同时触发左侧自动隐藏）',
      }}
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <ProCard bordered>
            <Typography.Title level={4} style={{ margin: 0 }}>
              概览
            </Typography.Title>
            <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 16 }}>
              这里可以放你的个人信息、快捷入口、常用操作等内容。
            </Typography.Paragraph>

            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={8}>
                <ProCard bordered>
                  <Statistic title="待处理" value={7} />
                </ProCard>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <ProCard bordered>
                  <Statistic title="消息" value={12} />
                </ProCard>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <ProCard bordered>
                  <Statistic title="积分" value={1280} />
                </ProCard>
              </Col>
            </Row>

            <Space style={{ marginTop: 16 }}>
              <Button type="primary">编辑资料</Button>
              <Button>安全设置</Button>
              <Button>退出登录</Button>
            </Space>
          </ProCard>
        </Col>

        <Col xs={24} lg={8}>
          <ProCard bordered title="快捷入口">
            <Row gutter={[12, 12]}>
              <Col span={12}>
                <Button block>我的订单</Button>
              </Col>
              <Col span={12}>
                <Button block>我的收藏</Button>
              </Col>
              <Col span={12}>
                <Button block>下载中心</Button>
              </Col>
              <Col span={12}>
                <Button block>帮助与反馈</Button>
              </Col>
            </Row>
          </ProCard>

          <ProCard bordered style={{ marginTop: 16 }} title="提示">
            <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
              如果该一级菜单下只有 1 个可达叶子页面，左侧菜单会自动隐藏，页面内容区域将铺满。
            </Typography.Paragraph>
          </ProCard>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default Account;
