/**
 * ACS Web 管理界面 - 使用 React + Ant Design
 */

const { useState, useEffect } = React;
const {
  Layout,
  Menu,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Space,
  Card,
  Typography,
  Descriptions,
  Tag,
  Tooltip,
  message,
  Spin,
  Empty,
  ConfigProvider,
  theme,
  Switch,
  App: AntApp,
} = antd;
const { EyeOutlined, EyeInvisibleOutlined } = icons;

const Icon = {
  Delete: () => (
    <span role="img" aria-label="删除" style={{ fontSize: 16, lineHeight: 1 }}>
      🗑️
    </span>
  ),
  Plus: () => (
    <span
      role="img"
      aria-label="新增"
      style={{ fontSize: 16, lineHeight: 1, marginRight: 4 }}
    >
      ➕
    </span>
  ),
};

const { Header, Content } = Layout;
const { Title } = Typography;
const { Search } = Input;

// API 工具函数
const api = {
  async get(url) {
    const response = await fetch(url);
    return await response.json();
  },
  
  async post(url, data) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await response.json();
  },
  
  async put(url, data) {
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await response.json();
  },
  
  async delete(url) {
    const response = await fetch(url, {
      method: 'DELETE',
    });
    return await response.json();
  },
};

// 项目管理组件
function ProjectsTab() {
  const { modal } = AntApp.useApp();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const result = await api.get('/api/projects');
      if (result.success) {
        setProjects(result.data);
      } else {
        message.error('加载项目失败: ' + result.error);
      }
    } catch (error) {
      message.error('加载项目失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (values) => {
    try {
      const result = await api.post('/api/projects', values);
      if (result.success) {
        message.success('项目添加成功');
        setModalVisible(false);
        setEditingProject(null);
        form.resetFields();
        loadProjects();
      } else {
        message.error('添加失败: ' + result.error);
      }
    } catch (error) {
      message.error('添加失败: ' + error.message);
    }
  };

  const handleEdit = async (values) => {
    if (!editingProject) {
      return;
    }
    try {
      const result = await api.put(
        `/api/projects/${encodeURIComponent(editingProject.name)}`,
        values
      );
      if (result.success) {
        message.success('项目更新成功');
        setModalVisible(false);
        setEditingProject(null);
        form.resetFields();
        loadProjects();
      } else {
        message.error('更新失败: ' + result.error);
      }
    } catch (error) {
      message.error('更新失败: ' + error.message);
    }
  };

  const handleDelete = async (name) => {
    modal.confirm({
      title: '确认删除',
      content: `确定要删除项目 "${name}" 吗？`,
      okText: '确定',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          const result = await api.delete(`/api/projects/${encodeURIComponent(name)}`);
          if (result.success) {
            message.success('项目删除成功');
            loadProjects();
          } else {
            message.error('删除失败: ' + result.error);
          }
        } catch (error) {
          message.error('删除失败: ' + error.message);
        }
      },
    });
  };

  const openAddModal = () => {
    setEditingProject(null);
    form.resetFields();
    setModalVisible(true);
  };

  const showEditModal = (project) => {
    setEditingProject(project);
    form.setFieldsValue({
      name: project.name,
      path: project.path,
    });
    setModalVisible(true);
  };

  const handleSubmit = async (values) => {
    if (editingProject) {
      await handleEdit(values);
    } else {
      await handleAdd(values);
    }
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchText.toLowerCase()) ||
      p.path.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns = [
    {
      title: '项目名称',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: '项目路径',
      dataIndex: 'path',
      key: 'path',
      render: (text) => <Typography.Text code>{text}</Typography.Text>,
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => showEditModal(record)}>
            编辑
          </Button>
          <Button
            danger
            size="small"
            onClick={() => handleDelete(record.name)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Search
          placeholder="搜索项目名称或路径..."
          allowClear
          style={{ width: 300 }}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <Button type="primary" onClick={openAddModal}>
          添加项目
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={filteredProjects}
          rowKey="name"
          loading={loading}
          locale={{
            emptyText: (
              <Empty description="暂无项目">
                <Button type="primary" onClick={openAddModal}>
                  添加第一个项目
                </Button>
              </Empty>
            ),
          }}
        />
      </Card>

      <Modal
        title={editingProject ? '编辑项目' : '添加项目'}
        open={modalVisible}
        width={720}
        onCancel={() => {
          setModalVisible(false);
          setEditingProject(null);
          form.resetFields();
        }}
        footer={null}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item
            label="项目名称"
            name="name"
            rules={[{ required: true, message: '请输入项目名称' }]}
          >
            <Input placeholder="输入项目名称" />
          </Form.Item>
          <Form.Item
            label="项目路径"
            name="path"
            rules={[{ required: true, message: '请输入项目路径' }]}
          >
            <Input placeholder="输入项目绝对路径" />
          </Form.Item>
          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setModalVisible(false);
                setEditingProject(null);
                form.resetFields();
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                {editingProject ? '更新' : '添加'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// CLI 工具管理组件
function CliTab() {
  const { modal } = AntApp.useApp();
  const [loading, setLoading] = useState(false);
  const [cliTools, setCliTools] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTool, setEditingTool] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadCliTools();
  }, []);

  const loadCliTools = async () => {
    setLoading(true);
    try {
      const result = await api.get('/api/cli');
      if (result.success) {
        setCliTools(result.data);
      } else {
        message.error('加载 CLI 工具失败: ' + result.error);
      }
    } catch (error) {
      message.error('加载 CLI 工具失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (values) => {
    try {
      const result = await api.post('/api/cli', values);
      if (result.success) {
        message.success('CLI 工具添加成功');
        setModalVisible(false);
        form.resetFields();
        loadCliTools();
      } else {
        message.error('添加失败: ' + result.error);
      }
    } catch (error) {
      message.error('添加失败: ' + error.message);
    }
  };

  const handleEdit = async (values) => {
    try {
      const result = await api.put(
        `/api/cli/${encodeURIComponent(editingTool.name)}`,
        values
      );
      if (result.success) {
        message.success('CLI 工具编辑成功');
        setModalVisible(false);
        setEditingTool(null);
        form.resetFields();
        loadCliTools();
      } else {
        message.error('编辑失败: ' + result.error);
      }
    } catch (error) {
      message.error('编辑失败: ' + error.message);
    }
  };

  const handleDelete = async (name) => {
    modal.confirm({
      title: '确认删除',
      content: `确定要删除 CLI 工具 "${name}" 吗？`,
      okText: '确定',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          const result = await api.delete(`/api/cli/${encodeURIComponent(name)}`);
          if (result.success) {
            message.success('CLI 工具删除成功');
            loadCliTools();
          } else {
            message.error('删除失败: ' + result.error);
          }
        } catch (error) {
          message.error('删除失败: ' + error.message);
        }
      },
    });
  };

  const showEditModal = (tool) => {
    setEditingTool(tool);
    form.setFieldsValue(tool);
    setModalVisible(true);
  };

  const filteredTools = cliTools.filter(
    (t) =>
      t.name.toLowerCase().includes(searchText.toLowerCase()) ||
      t.command.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns = [
    {
      title: '工具名称',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: '命令',
      dataIndex: 'command',
      key: 'command',
      render: (text) => <Typography.Text code>{text}</Typography.Text>,
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => showEditModal(record)}>
            编辑
          </Button>
          <Button
            danger
            size="small"
            onClick={() => handleDelete(record.name)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Search
          placeholder="搜索工具名称或命令..."
          allowClear
          style={{ width: 300 }}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <Button type="primary" onClick={() => setModalVisible(true)}>
          添加工具
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={filteredTools}
          rowKey="name"
          loading={loading}
          locale={{
            emptyText: (
              <Empty description="暂无 CLI 工具">
                <Button type="primary" onClick={() => setModalVisible(true)}>
                  添加第一个工具
                </Button>
              </Empty>
            ),
          }}
        />
      </Card>

      <Modal
        title={editingTool ? '编辑 CLI 工具' : '添加 CLI 工具'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingTool(null);
          form.resetFields();
        }}
        footer={null}
      >
        <Form
          form={form}
          onFinish={editingTool ? handleEdit : handleAdd}
          layout="vertical"
        >
          <Form.Item
            label="工具名称"
            name="name"
            rules={[{ required: true, message: '请输入工具名称' }]}
          >
            <Input placeholder="例如: CodeX" />
          </Form.Item>
          <Form.Item
            label="命令"
            name="command"
            rules={[{ required: true, message: '请输入命令' }]}
          >
            <Input placeholder="例如: codex" />
          </Form.Item>
          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setModalVisible(false);
                setEditingTool(null);
                form.resetFields();
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                {editingTool ? '保存' : '添加'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// Claude 配置管理组件
function ConfigTab() {
  const { modal } = AntApp.useApp();
  const [loading, setLoading] = useState(false);
  const [configs, setConfigs] = useState([]);
  const [currentConfig, setCurrentConfig] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [tokenVisible, setTokenVisible] = useState(false);
  const [form] = Form.useForm();
  const RESERVED_ENV_KEYS = ['ANTHROPIC_BASE_URL', 'ANTHROPIC_AUTH_TOKEN'];

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    setLoading(true);
    try {
      // 加载当前配置
      const currentResult = await api.get('/api/config/claude/current');
      if (currentResult.success) {
        setCurrentConfig(currentResult.data);
      }

      // 加载所有配置
      const listResult = await api.get('/api/config/claude/list');
      if (listResult.success) {
        setConfigs(listResult.data);
      } else {
        message.error('加载配置失败: ' + listResult.error);
      }
    } catch (error) {
      message.error('加载配置失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const buildProfileFromValues = (values) => {
    const extraEnv = {};
    (values.extraEnv || []).forEach((item) => {
      if (!item) {
        return;
      }
      const key = item.key?.trim();
      const value = item.value?.trim();
      if (key && value && !RESERVED_ENV_KEYS.includes(key)) {
        extraEnv[key] = value;
      }
    });

    return {
      env: {
        ...extraEnv,
        ANTHROPIC_BASE_URL: values.baseUrl,
        ANTHROPIC_AUTH_TOKEN: values.token,
      },
      model: values.model,
    };
  };

  const handleAdd = async (values) => {
    try {
      const data = {
        name: values.name,
        profile: buildProfileFromValues(values),
      };
      
      const result = await api.post('/api/config/claude/add', data);
      if (result.success) {
        message.success('Claude 配置添加成功');
        setModalVisible(false);
        form.resetFields();
        loadConfigs();
      } else {
        message.error('添加失败: ' + result.error);
      }
    } catch (error) {
      message.error('添加失败: ' + error.message);
    }
  };

  const handleUpdate = async (values) => {
    if (!editingConfig) {
      return;
    }
    try {
      const profile = buildProfileFromValues(values);
      const result = await api.put(
        `/api/config/claude/${encodeURIComponent(editingConfig)}`,
        { profile }
      );
      if (result.success) {
        message.success('Claude 配置更新成功');
        setModalVisible(false);
        setEditingConfig(null);
        form.resetFields();
        loadConfigs();
      } else {
        message.error('更新失败: ' + result.error);
      }
    } catch (error) {
      message.error('更新失败: ' + error.message);
    }
  };

  const handleUse = async (name) => {
    try {
      const result = await api.post('/api/config/claude/use', { profile: name });
      if (result.success) {
        message.success('配置切换成功');
        loadConfigs();
      } else {
        message.error('切换失败: ' + result.error);
      }
    } catch (error) {
      message.error('切换失败: ' + error.message);
    }
  };

  const handleDelete = async (name) => {
    modal.confirm({
      title: '确认删除',
      content: `确定要删除 Claude 配置 "${name}" 吗？`,
      okText: '确定',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          const result = await api.delete(`/api/config/claude/${encodeURIComponent(name)}`);
          if (result.success) {
            message.success('Claude 配置删除成功');
            loadConfigs();
          } else {
            message.error('删除失败: ' + result.error);
          }
        } catch (error) {
          message.error('删除失败: ' + error.message);
        }
      },
    });
  };

  const filteredConfigs = configs.filter((c) =>
    c.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const getExtraEnvEntries = (env = {}) =>
    Object.entries(env).filter(
      ([key]) => !RESERVED_ENV_KEYS.includes(key)
    );

  // 对敏感值进行部分打码
  const maskToken = (token = '') => {
    if (!token) {
      return '';
    }
    if (token.length <= 4) {
      return '*'.repeat(token.length);
    }
    return `${token.slice(0, 2)}****${token.slice(-2)}`;
  };

  const SensitiveText = ({
    value,
    visible: controlledVisible,
    onToggle,
    showToggle = true,
  }) => {
    const [innerVisible, setInnerVisible] = useState(false);
    const isControlled = typeof controlledVisible === 'boolean';
    const visible = isControlled ? controlledVisible : innerVisible;
    const handleToggle = () => {
      if (isControlled) {
        onToggle?.(!controlledVisible);
      } else {
        setInnerVisible((prev) => !prev);
      }
    };
    if (!value) {
      return <Typography.Text code>未配置</Typography.Text>;
    }
    return (
      <Space size="small">
        <Typography.Text code>
          {visible ? value : maskToken(value)}
        </Typography.Text>
        {showToggle && (
          <Tooltip title={visible ? '隐藏授权令牌' : '显示授权令牌'}>
            <Button
              type="text"
              size="small"
              onClick={handleToggle}
              aria-label={visible ? '隐藏授权令牌' : '显示授权令牌'}
              icon={visible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
              style={{
                padding: 0,
                minWidth: 'auto',
                color: 'inherit',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            />
          </Tooltip>
        )}
      </Space>
    );
  };

  const openAddModal = () => {
    setEditingConfig(null);
    form.resetFields();
    setModalVisible(true);
  };

  const openEditModal = (record) => {
    setEditingConfig(record.name);
    form.setFieldsValue({
      name: record.name,
      baseUrl: record.env?.ANTHROPIC_BASE_URL,
      token: record.env?.ANTHROPIC_AUTH_TOKEN,
      model: record.model,
      extraEnv: getExtraEnvEntries(record.env || {}).map(([key, value]) => ({
        key,
        value,
      })),
    });
    setModalVisible(true);
  };

  const handleSubmit = (values) => {
    if (editingConfig) {
      return handleUpdate(values);
    }
    return handleAdd(values);
  };

  const columns = [
    {
      title: '配置名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <strong>{text}</strong>
          {record.isCurrent && <Tag color="gold">⭐ 当前</Tag>}
        </Space>
      ),
    },
    {
      title: 'Base URL',
      key: 'baseUrl',
      render: (_, record) => (
        <Typography.Text code>{record.env.ANTHROPIC_BASE_URL}</Typography.Text>
      ),
    },
    {
      title: (
        <Space size="small">
          <span>Auth Token</span>
          <Tooltip title={tokenVisible ? '隐藏所有授权令牌' : '显示所有授权令牌'}>
            <Button
              type="text"
              size="small"
              onClick={() => setTokenVisible((prev) => !prev)}
              aria-label={tokenVisible ? '隐藏所有授权令牌' : '显示所有授权令牌'}
              icon={tokenVisible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
              style={{
                padding: 0,
                minWidth: 'auto',
                color: 'inherit',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            />
          </Tooltip>
        </Space>
      ),
      key: 'token',
      render: (_, record) => (
        <SensitiveText
          value={record.env.ANTHROPIC_AUTH_TOKEN}
          visible={tokenVisible}
          showToggle={false}
        />
      ),
    },
    {
      title: 'Model',
      dataIndex: 'model',
      key: 'model',
      render: (text) => <Typography.Text code>{text}</Typography.Text>,
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space>
          {!record.isCurrent && (
            <Button
              type="primary"
              size="small"
              onClick={() => handleUse(record.name)}
            >
              使用
            </Button>
          )}
          <Button
            size="small"
            onClick={() => openEditModal(record)}
          >
            编辑
          </Button>
          <Button
            danger
            size="small"
            onClick={() => handleDelete(record.name)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {currentConfig && (
        <div className="current-config-card">
          <Title level={4} style={{ color: '#fff', marginTop: 0 }}>
            当前配置
          </Title>
          <Descriptions column={1}>
            <Descriptions.Item label="配置名称">
              <span className="current-badge">
                <span>⭐</span>
                <strong>{currentConfig.name}</strong>
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="Base URL">
              {currentConfig.env.ANTHROPIC_BASE_URL}
            </Descriptions.Item>
            <Descriptions.Item label="Auth Token">
              <SensitiveText value={currentConfig.env?.ANTHROPIC_AUTH_TOKEN} />
            </Descriptions.Item>
            <Descriptions.Item label="Model">
              {currentConfig.model}
            </Descriptions.Item>
            {getExtraEnvEntries(currentConfig.env || {}).map(([key, value]) => (
              <Descriptions.Item key={key} label={key}>
                {value}
              </Descriptions.Item>
            ))}
          </Descriptions>
        </div>
      )}

      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Search
          placeholder="搜索配置名称..."
          allowClear
          style={{ width: 300 }}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <Button type="primary" onClick={openAddModal}>
          添加配置
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={filteredConfigs}
          rowKey="name"
          loading={loading}
          locale={{
            emptyText: (
              <Empty description="暂无 Claude 配置">
                <Button type="primary" onClick={openAddModal}>
                  添加第一个配置
                </Button>
              </Empty>
            ),
          }}
        />
      </Card>

      <Modal
        title={editingConfig ? '编辑 Claude 配置' : '添加 Claude 配置'}
        open={modalVisible}
        width={720}
        onCancel={() => {
          setModalVisible(false);
          setEditingConfig(null);
          form.resetFields();
        }}
        footer={null}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item
            label="配置名称"
            name="name"
            rules={[{ required: true, message: '请输入配置名称' }]}
          >
            <Input placeholder="例如: production" disabled={Boolean(editingConfig)} />
          </Form.Item>
          <Form.Item
            label="ANTHROPIC_BASE_URL"
            name="baseUrl"
            rules={[{ required: true, message: '请输入 Base URL' }]}
          >
            <Input placeholder="https://api.anthropic.com" />
          </Form.Item>
          <Form.Item
            label="ANTHROPIC_AUTH_TOKEN"
            name="token"
            rules={[{ required: true, message: '请输入 Auth Token' }]}
          >
            <Input placeholder="sk-ant-..." />
          </Form.Item>
          <Form.Item
            label="Model"
            name="model"
            rules={[{ required: true, message: '请输入模型名称' }]}
          >
            <Input placeholder="claude-3-5-sonnet-20241022" />
          </Form.Item>
          <Form.Item
            label={
              <Space size={8}>
                <span>自定义环境变量</span>
                <Typography.Link
                  href="https://docs.claude.com/zh-CN/docs/claude-code/settings#%E7%8E%AF%E5%A2%83%E5%8F%98%E9%87%8F"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  环境变量说明
                </Typography.Link>
              </Space>
            }
          >
            <Form.List name="extraEnv">
              {(fields, { add, remove }) => (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {fields.map(({ key, name, ...restField }) => (
                    <div
                      key={key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        width: '100%',
                        flexWrap: 'nowrap',
                      }}
                    >
                      <Form.Item
                        {...restField}
                        name={[name, 'key']}
                        rules={[{ required: true, message: '请输入变量名' }]}
                        style={{ marginBottom: 0, width: 500, flex: '0 0 auto' }}
                      >
                        <Input placeholder="变量名，如 API_TIMEOUT_MS" />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'value']}
                        rules={[{ required: true, message: '请输入变量值' }]}
                        style={{ marginBottom: 0, width: 120, flex: '0 0 auto' }}
                      >
                        <Input placeholder="变量值，如 300000" />
                      </Form.Item>
                      <Button
                        type="text"
                        danger
                        icon={<Icon.Delete />}
                        aria-label="删除变量"
                        onClick={() => remove(name)}
                      />
                    </div>
                  ))}
                  <Button
                    type="dashed"
                    icon={<Icon.Plus />}
                    onClick={() => add()}
                  >
                    新增环境变量
                  </Button>
                </Space>
              )}
            </Form.List>
          </Form.Item>
          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setModalVisible(false);
                setEditingConfig(null);
                form.resetFields();
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                {editingConfig ? '保存' : '添加'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// 主应用组件
function App() {
  const [currentTab, setCurrentTab] = useState('projects');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // 从 localStorage 读取主题偏好
    const saved = localStorage.getItem('theme');
    return saved === 'dark';
  });

  // 保存主题偏好到 localStorage
  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const menuItems = [
    { key: 'projects', label: '📁 项目管理' },
    { key: 'cli', label: '⚙️ CLI 工具' },
    { 
      key: 'config', 
      label: '🔧 配置管理',
      children: [
        { key: 'config/claude', label: 'Claude配置' }
      ]
    },
  ];

  // 递归查找菜单项label的辅助函数
  const findMenuItemLabel = (items, key) => {
    for (const item of items) {
      if (item.key === key) {
        return item.label;
      }
      if (item.children) {
        const found = findMenuItemLabel(item.children, key);
        if (found) {
          return found;
        }
      }
    }
    return null;
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
      }}
    >
      <AntApp>
        <Layout style={{ minHeight: '100vh' }}>
          <Header
            style={{
              padding: '0 24px',
              background: isDarkMode ? '#001529' : '#fff',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '40px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect width="32" height="32" rx="8" fill="#1890ff" />
                <path
                  d="M8 20L12 12L16 20L20 8L24 16"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span 
                className="logo-text" 
                style={{ color: isDarkMode ? '#fff' : '#1890ff' }}
              >
                ACS 管理平台
              </span>
            </div>
            <Menu
              mode="horizontal"
              selectedKeys={[currentTab]}
              items={menuItems}
              onClick={({ key }) => setCurrentTab(key)}
              style={{ 
                flex: 1, 
                border: 'none', 
                lineHeight: '64px',
                background: 'transparent'
              }}
            />
            <div style={{ flexShrink: 0 }}>
              <Switch
                checked={isDarkMode}
                onChange={setIsDarkMode}
                checkedChildren="🌙"
                unCheckedChildren="🌞"
              />
            </div>
          </Header>
          <Content style={{ padding: '24px', maxWidth: 1400, margin: '0 auto', width: '100%' }}>
            <Title level={2} style={{ marginBottom: 24 }}>
              {findMenuItemLabel(menuItems, currentTab) || 'ACS 管理平台'}
            </Title>
            {currentTab === 'projects' && <ProjectsTab />}
            {currentTab === 'cli' && <CliTab />}
            {currentTab === 'config/claude' && <ConfigTab />}
          </Content>
        </Layout>
      </AntApp>
    </ConfigProvider>
  );
}

// 渲染应用
const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);
root.render(<App />);
