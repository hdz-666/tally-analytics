import { ProLayout } from "@ant-design/pro-components";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Avatar, Dropdown } from "antd";
import { LogoutOutlined, UserOutlined } from "@ant-design/icons";
import {
  DashboardOutlined,
  StockOutlined,
  LineChartOutlined,
  ShoppingCartOutlined,
  RiseOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/context/AuthContext";

const menuItems = [
  { path: "/", name: "Dashboard", icon: <DashboardOutlined /> },
  { path: "/inventory", name: "Inventory", icon: <StockOutlined /> },
  { path: "/sales", name: "Sales", icon: <LineChartOutlined /> },
  { path: "/purchases", name: "Purchases", icon: <ShoppingCartOutlined /> },
  { path: "/forecast", name: "Forecast", icon: <RiseOutlined /> },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const avatarMenu = {
    items: [
      {
        key: "email",
        label: user?.email ?? "",
        disabled: true,
      },
      { type: "divider" as const },
      {
        key: "logout",
        icon: <LogoutOutlined />,
        label: "Sign Out",
        onClick: handleSignOut,
      },
    ],
  };

  return (
    <ProLayout
      title="Tally Analytics"
      logo={null}
      layout="side"
      route={{ routes: menuItems }}
      location={location}
      menuItemRender={(item, dom) => (
        <span onClick={() => item.path && navigate(item.path)}>{dom}</span>
      )}
      avatarProps={{
        src: null,
        icon: <UserOutlined />,
        size: "small",
        render: (_props, _dom) => (
          <Dropdown menu={avatarMenu} trigger={["click"]}>
            <span style={{ cursor: "pointer" }}>
              <Avatar size="small" icon={<UserOutlined />} />
            </span>
          </Dropdown>
        ),
      }}
    >
      <Outlet />
    </ProLayout>
  );
}
