import React, { useState, useEffect } from "react";
import "./poform.scss";
import { MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons";
import { Layout, Menu, Button, theme } from "antd";
import PoTableTest from "./PoTableTest";
import keystone from "../../assets/keystone.png";
import meyer from "../../assets/meyer.png";
import omix from "../../assets/omix.png";
import quadratec from "../../assets/quadratec.png";
const { Header, Sider, Content } = Layout;

export const PoForm = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [currentNav, setCurrentNav] = useState("nav1");

  const {
    token: { colorBgContainer },
  } = theme.useToken();

  const handleNavClick = (e) => {
    setCurrentNav(e.key);
  };

  return (
    <div className="poForm">
      <Layout>
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          style={{ backgroundColor: "#2938c3" }}
          width={200}
        >
          <div className="logo" />
          <Menu
            mode="inline"
            //change hover color to pink
            theme="dark"
            defaultSelectedKeys={["1"]}
            style={{
              backgroundColor: "#2938c3",
              // color: "#D4F1F4",
              color:"white",
              height: "15px",
              marginTop: "80px",
              fontWeight:"700",
              fontSize:"22px",
            }}
            items={[
              {
                key: "nav1",
                label:"Keystone",
              },
              {
                key: "nav2",
                label:"Meyer",
              },
              {
                key: "nav3",
                label:"Omix",
              },
              {
                key: "nav4",
                label:"Quadratec",
              },
            ]}
            onSelect={handleNavClick}
          />
        </Sider>
        <Layout>
          <Header style={{ padding: 0, background: colorBgContainer }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{
                fontSize: "20px",
                width: 72,
                height: 72,
              }}
            />{" "}
            <b style={
              {
                fontSize:"large",
              }
            } 
            >PURCHASE ORDERS DETAILS</b>
          </Header>
          <Content
            style={{
              margin: "24px 16px",
              padding: 24,
              minHeight: 650,
              background: colorBgContainer,
            }}
          >
            {currentNav === "nav1" ? (
              <div>
                <PoTableTest vendorId="1" for Keystone />
              </div>
            ) : currentNav === "nav2" ? (
              <div>
                <PoTableTest vendorId="2" for Meyer />
              </div>
            ) : currentNav === "nav3" ? (
              <div>
                <PoTableTest vendorId="3" for Omix />
              </div>
            ) : null}
          </Content>
          <span id="footer">© 2023, JustJeeps.com, Inc. All Rights Reserved</span>
        </Layout>
      </Layout>
    </div>
  );
};
