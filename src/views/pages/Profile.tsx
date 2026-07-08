import { Button, Card, Descriptions, Typography, Divider, Avatar } from "antd";
import { LogoutOutlined, UserOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleString("en-IN")
    : "—";

  const lastSignIn = user?.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleString("en-IN")
    : "—";

  return (
    <div style={{ padding: 24, maxWidth: 600 }}>
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          <Avatar size={64} icon={<UserOutlined />} />
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {user?.email}
            </Typography.Title>
            <Typography.Text type="secondary">
              {user?.role ?? "authenticated"}
            </Typography.Text>
          </div>
        </div>

        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="Email">{user?.email ?? "—"}</Descriptions.Item>
          <Descriptions.Item label="User ID">
            <Typography.Text copyable style={{ fontSize: 12 }}>
              {user?.id ?? "—"}
            </Typography.Text>
          </Descriptions.Item>
          <Descriptions.Item label="Account Created">{createdAt}</Descriptions.Item>
          <Descriptions.Item label="Last Sign In">{lastSignIn}</Descriptions.Item>
        </Descriptions>

        <Divider />

        <Button
          danger
          icon={<LogoutOutlined />}
          size="large"
          onClick={handleSignOut}
        >
          Sign Out
        </Button>
      </Card>
    </div>
  );
}
