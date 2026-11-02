import { ProLayout } from "@ant-design/pro-components";
import { Outlet, useNavigate, useLocation } from "react-router";
import { Avatar, Tooltip } from "antd";
import {
  LogoutOutlined,
  UserOutlined,
  DashboardOutlined,
  StockOutlined,
  LineChartOutlined,
  ShoppingCartOutlined,
  RiseOutlined,
  BarChartOutlined,
  BankOutlined,
  EnvironmentOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/context/AuthContext";
import { canAccess } from "@/lib/access";

const menuItems = [
  { path: "/", name: "Dashboard", icon: <DashboardOutlined /> },
  { path: "/inventory", name: "Inventory", icon: <StockOutlined /> },
  { path: "/sales", name: "Sales", icon: <LineChartOutlined /> },
  { path: "/area-sales", name: "Area Sales", icon: <EnvironmentOutlined /> },
  { path: "/purchases", name: "Purchases", icon: <ShoppingCartOutlined /> },
  { path: "/forecast", name: "Forecast", icon: <RiseOutlined /> },
  { path: "/ledger", name: "Ledger & P&L", icon: <BankOutlined /> },
  { path: "/users", name: "Users", icon: <TeamOutlined /> },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role, signOut } = useAuth();
  const visibleItems = menuItems.filter((item) => canAccess(role, item.path));

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <ProLayout
      title="Tally Analytics"
      logo={<BarChartOutlined />}
      layout="side"
      route={{ routes: visibleItems }}
      location={location}
      menuItemRender={(item, dom) => (
        <span onClick={() => item.path && navigate(item.path)}>{dom}</span>
      )}
      menuFooterRender={() => (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            borderTop: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <Avatar
            size={32}
            icon={<UserOutlined />}
            style={{ cursor: "pointer", flexShrink: 0 }}
            onClick={() => navigate("/profile")}
          />
          <span
            onClick={() => navigate("/profile")}
            style={{
              flex: 1,
              fontSize: 13,
              cursor: "pointer",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {user?.email?.split("@")[0]}
          </span>
          <Tooltip title="Sign Out">
            <LogoutOutlined
              onClick={handleSignOut}
              style={{ fontSize: 16, cursor: "pointer", color: "#ff4d4f" }}
            />
          </Tooltip>
        </div>
      )}
    >
      <Outlet />
    </ProLayout>
  );
}
