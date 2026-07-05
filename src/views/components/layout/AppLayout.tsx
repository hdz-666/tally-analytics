import { ProLayout } from "@ant-design/pro-components";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  DashboardOutlined,
  StockOutlined,
  LineChartOutlined,
  ShoppingCartOutlined,
  RiseOutlined,
} from "@ant-design/icons";

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
    >
      <Outlet />
    </ProLayout>
  );
}
