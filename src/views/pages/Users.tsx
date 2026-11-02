import { useState } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  TreeSelect,
  Typography,
} from "antd";
import type { TableProps } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useAuth } from "@/context/AuthContext";
import { useStockGroups } from "@/viewmodels/useStock";
import {
  useCreateUser,
  useDeleteUser,
  useUpdateAccess,
  useUsers,
} from "@/viewmodels/useUsers";
import { ROLE_LABELS } from "@/models/user";
import type { AppUser, Role, UserCreate } from "@/models/user";

const { Text } = Typography;

const ROLE_COLORS: Record<Role, string> = {
  admin: "red",
  executive: "blue",
  company_exec: "green",
};

const ROLE_HELP: Record<Role, string> = {
  admin: "Sees and controls everything, including this page.",
  executive: "Dashboard, Inventory, Sales and Area Sales.",
  company_exec:
    "Sales and Area Sales for the chosen categories only (and every group under them). No rates or stock value.",
};

const roleOptions = (Object.keys(ROLE_LABELS) as Role[]).map((r) => ({
  value: r,
  label: ROLE_LABELS[r],
}));

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-IN") : "—";

type FormValues = Partial<UserCreate>;

/** Role + category fields, shared by the create and edit dialogs. */
function AccessFields() {
  const { data: groups = [] } = useStockGroups();
  const treeData = groups.map((g) => ({
    id: g.name,
    pId: g.parent ?? null,
    title: g.name,
    value: g.name,
  }));

  return (
    <>
      <Form.Item name="role" label="Role" rules={[{ required: true }]}>
        <Select options={roleOptions} placeholder="Select a role" />
      </Form.Item>
      <Form.Item noStyle dependencies={["role"]}>
        {({ getFieldValue }) => {
          const role = getFieldValue("role") as Role | undefined;
          return (
            <>
              {role && (
                <Text type="secondary" style={{ display: "block", marginTop: -16, marginBottom: 16 }}>
                  {ROLE_HELP[role]}
                </Text>
              )}
              {role === "company_exec" && (
                <Form.Item
                  name="categories"
                  label="Categories"
                  rules={[{ required: true, message: "Pick at least one category" }]}
                >
                  <TreeSelect
                    treeDataSimpleMode
                    treeData={treeData}
                    multiple
                    showSearch
                    treeNodeFilterProp="title"
                    placeholder="e.g. Gloirio, Trend"
                  />
                </Form.Item>
              )}
            </>
          );
        }}
      </Form.Item>
    </>
  );
}

export default function Users() {
  const { user: currentUser } = useAuth();
  const { data: users = [], isLoading } = useUsers();
  const createUser = useCreateUser();
  const updateAccess = useUpdateAccess();
  const deleteUser = useDeleteUser();

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [createForm] = Form.useForm<FormValues>();
  const [editForm] = Form.useForm<FormValues>();

  const submitCreate = async () => {
    const values = await createForm.validateFields();
    await createUser.mutateAsync({
      email: values.email!,
      password: values.password!,
      role: values.role!,
      categories: values.categories ?? [],
    });
    setCreating(false);
    createForm.resetFields();
  };

  const submitEdit = async () => {
    if (!editing) return;
    const values = await editForm.validateFields();
    await updateAccess.mutateAsync({
      id: editing.id,
      body: { role: values.role!, categories: values.categories ?? [] },
    });
    setEditing(null);
  };

  const columns: TableProps<AppUser>["columns"] = [
    {
      title: "Email",
      dataIndex: "email",
      sorter: (a, b) => (a.email ?? "").localeCompare(b.email ?? ""),
      render: (email: string | null, u) => (
        <Space>
          {email ?? "—"}
          {u.id === currentUser?.id && <Tag>You</Tag>}
        </Space>
      ),
    },
    {
      title: "Role",
      dataIndex: "role",
      filters: [
        ...roleOptions.map((o) => ({ text: o.label, value: o.value })),
        { text: "No access", value: "" },
      ],
      onFilter: (value, u) => (u.role ?? "") === value,
      render: (role: Role | null) =>
        role ? (
          <Tag color={ROLE_COLORS[role]}>{ROLE_LABELS[role]}</Tag>
        ) : (
          <Tooltip title="Can sign in but sees nothing until a role is assigned">
            <Tag>No access</Tag>
          </Tooltip>
        ),
    },
    {
      title: "Categories",
      dataIndex: "categories",
      render: (cats: string[], u) =>
        u.role === "company_exec" ? cats.map((c) => <Tag key={c}>{c}</Tag>) : <Text type="secondary">All</Text>,
    },
    {
      title: "Last Sign In",
      dataIndex: "last_sign_in_at",
      render: formatDate,
    },
    {
      title: "",
      key: "actions",
      width: 96,
      render: (_, u) => {
        const isSelf = u.id === currentUser?.id;
        return (
          <Space>
            <Tooltip title="Edit access">
              <Button size="small" icon={<EditOutlined />} onClick={() => setEditing(u)} />
            </Tooltip>
            <Popconfirm
              title={`Delete ${u.email}?`}
              description="Their login is removed permanently."
              okText="Delete"
              okButtonProps={{ danger: true }}
              onConfirm={() => deleteUser.mutate(u.id)}
              disabled={isSelf}
            >
              <Tooltip title={isSelf ? "You can't delete yourself" : "Delete user"}>
                <Button size="small" danger icon={<DeleteOutlined />} disabled={isSelf} />
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const editingSelf = editing?.id === currentUser?.id;

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="Users"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreating(true)}>
            Add User
          </Button>
        }
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={users}
          loading={isLoading}
          pagination={{ pageSize: 20, hideOnSinglePage: true }}
        />
      </Card>

      <Modal
        title="Add User"
        open={creating}
        okText="Create"
        confirmLoading={createUser.isPending}
        onOk={submitCreate}
        onCancel={() => setCreating(false)}
        destroyOnHidden
      >
        <Form form={createForm} layout="vertical" preserve={false}>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: "email" }]}>
            <Input autoComplete="off" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Temporary password"
            extra="Share this with them; they can sign in straight away."
            rules={[{ required: true, min: 8, message: "At least 8 characters" }]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <AccessFields />
        </Form>
      </Modal>

      <Modal
        title={`Edit access — ${editing?.email ?? ""}`}
        open={!!editing}
        okText="Save"
        confirmLoading={updateAccess.isPending}
        onOk={submitEdit}
        onCancel={() => setEditing(null)}
        destroyOnHidden
      >
        <Form
          key={editing?.id}
          form={editForm}
          layout="vertical"
          preserve={false}
          initialValues={{ role: editing?.role ?? undefined, categories: editing?.categories }}
        >
          {editingSelf && (
            <Text type="warning" style={{ display: "block", marginBottom: 16 }}>
              You can't remove your own admin role.
            </Text>
          )}
          <AccessFields />
        </Form>
      </Modal>
    </div>
  );
}
