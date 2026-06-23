import React, { useState, useEffect, useRef } from 'react';
import { MqttConfig, UserRole, DeviceState, Room, SignalMapping } from '../types';
import { Network, Send, RefreshCw, Radio, Lock, HelpCircle, FileJson, Play, Settings, Sliders, Plus, Trash2, Edit, Save, PlusCircle, RotateCcw, AlertTriangle, Check, BookOpen, Activity, Cpu, ArrowRight, X, Info } from 'lucide-react';

interface MqttGatewayProps {
  mqttConfig: MqttConfig;
  currentRole: UserRole;
  deviceState: DeviceState;
  onUpdateConfig: (config: Partial<MqttConfig>) => void;
  onPublish: (topic: string, payload: any) => void;
  rooms: Room[];
  activeRoomId: string;
  onUpdateRoomMqtt: (roomId: string, config: Partial<MqttConfig>) => void;
}

interface MqttMessage {
  id: string;
  time: string;
  topic: string;
  payload: string;
  direction: 'INCOMING' | 'OUTGOING';
}

export default function MqttGateway({
  mqttConfig,
  currentRole,
  deviceState,
  onUpdateConfig,
  onPublish,
  rooms = [],
  activeRoomId,
  onUpdateRoomMqtt,
}: MqttGatewayProps) {
  // Support selecting which classroom / topic to configure a gateway for
  const [selectedRoomId, setSelectedRoomId] = useState<string>(activeRoomId || (rooms[0]?.id || ''));

  const currentRoom = rooms.find(r => r.id === selectedRoomId);
  const activeMqtt = currentRoom?.mqttConfig || mqttConfig;

  const [broker, setBroker] = useState(activeMqtt.broker);
  const [port, setPort] = useState(activeMqtt.port);
  const [clientId, setClientId] = useState(activeMqtt.clientId);
  const [subTopic, setSubTopic] = useState(activeMqtt.subTopic);
  const [pubTopic, setPubTopic] = useState(activeMqtt.pubTopic);
  const [username, setUsername] = useState(activeMqtt.username || '');
  const [password, setPassword] = useState(activeMqtt.password || '');
  
  const [customPublishTopic, setCustomPublishTopic] = useState(activeMqtt.pubTopic);
  const [customPayloadString, setCustomPayloadString] = useState('{\n  "cmd": "TOGGLE_CB",\n  "status": true,\n  "sender": "Ecosmart_Web_App"\n}');

  // Local state for active raw messages terminal log
  const [messages, setMessages] = useState<MqttMessage[]>([]);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const canEdit = currentRole === 'ADMIN';
  const canPublish = currentRole === 'ADMIN' || currentRole === 'OPERATOR';

  const [viewMode, setViewMode] = useState<'broker' | 'signals'>('broker');
  
  // Custom signal mapping state configuration
  const [mappings, setMappings] = useState<SignalMapping[]>([]);
  const [isMappingLoading, setIsMappingLoading] = useState(false);

  // Form states for creating/editing mapping
  const [editingMappingId, setEditingMappingId] = useState<string | null>(null);
  const [formTopic, setFormTopic] = useState('ecosmart/+/telemetry');
  const [formFunction, setFormFunction] = useState<'VOLTAGE' | 'CURRENT' | 'POWER' | 'TEMPERATURE' | 'HUMIDITY' | 'CB_STATE' | 'DOOR_OPEN' | 'SMOKE_DETECTED' | 'LOCK_ACTIVE'>('VOLTAGE');
  const [formJsonPath, setFormJsonPath] = useState('telemetry.u_V');
  const [formMultiplier, setFormMultiplier] = useState(1.0);
  const [formDescription, setFormDescription] = useState('Đo điện áp nguồn cấp thực tế (V) từ bo mạch IoT Gateway');
  const [formIsActive, setFormIsActive] = useState(true);

  // Sandbox testing/playground states
  const [sandboxPayload, setSandboxPayload] = useState(JSON.stringify({
    ts: Date.now(),
    gateway_id: "ecosmart_gateway_b102",
    telemetry: {
      u_V: 220.8,
      i_A: 4.12,
      p_kW: 0.91,
      temp_c: 24.5,
      hum_pct: 58.2,
      doorOpen: 0,
      smokeDetected: 0,
      lockActive: 1
    },
    cmd: {
      cbState: 1
    }
  }, null, 2));
  const [parsedSandboxResults, setParsedSandboxResults] = useState<{ [key: string]: any }>({});

  // Modern modal state for alerts or confirms (replaces native alert/confirm)
  const [modalAlert, setModalAlert] = useState<{
    type: 'ALERT' | 'CONFIRM';
    title: string;
    message: string;
    onConfirm?: () => void;
  } | null>(null);

  const triggerAlert = (title: string, message: string) => {
    setModalAlert({
      type: 'ALERT',
      title,
      message
    });
  };

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    setModalAlert({
      type: 'CONFIRM',
      title,
      message,
      onConfirm
    });
  };

  const getValueByPath = (obj: any, path: string): any => {
    try {
      return path.split('.').reduce((acc, part) => acc && acc[part], obj);
    } catch {
      return undefined;
    }
  };

  const fetchMappings = async () => {
    setIsMappingLoading(true);
    try {
      const res = await fetch('/api/mqtt/mappings');
      if (res.ok) {
        const data = await res.json();
        setMappings(data);
      }
    } catch (err) {
      console.error('Lỗi tải danh mục tín hiệu:', err);
    } finally {
      setIsMappingLoading(false);
    }
  };

  useEffect(() => {
    fetchMappings();
  }, []);

  const handleSaveMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      triggerAlert('Quyền hạn hạn chế', 'Yêu cầu tài khoản quản trị ADMIN để thiết lập luồng tín hiệu!');
      return;
    }

    const payload = {
      topic: formTopic,
      functionName: formFunction,
      jsonPath: formJsonPath,
      multiplier: Number(formMultiplier),
      description: formDescription,
      isActive: formIsActive
    };

    try {
      if (editingMappingId) {
        // Update
        const res = await fetch(`/api/mqtt/mappings/${editingMappingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mapping: payload, user: 'Admin' })
        });
        if (res.ok) {
          const data = await res.json();
          setMappings(data.mappings);
          setEditingMappingId(null);
          resetForm();
        }
      } else {
        // Add
        const res = await fetch('/api/mqtt/mappings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mapping: payload, user: 'Admin' })
        });
        if (res.ok) {
          const data = await res.json();
          setMappings(data.mappings);
          resetForm();
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMapping = async (id: string) => {
    if (!canEdit) {
      triggerAlert('Quyền hạn hạn chế', 'Yêu cầu tài khoản quản trị ADMIN để xóa cổng tín hiệu!');
      return;
    }
    triggerConfirm(
      'Xác nhận xóa định tuyến',
      'Bạn có chắc chắn muốn xóa kênh định tuyến tín hiệu này không?',
      async () => {
        try {
          const res = await fetch(`/api/mqtt/mappings/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: 'Admin' })
          });
          if (res.ok) {
            const data = await res.json();
            setMappings(data.mappings);
          }
        } catch (err) {
          console.error(err);
        }
      }
    );
  };

  const handleResetMappings = async () => {
    if (!canEdit) {
      triggerAlert('Quyền hạn hạn chế', 'Yêu cầu tài khoản quản trị ADMIN để khôi phục định tuyến!');
      return;
    }
    triggerConfirm(
      'Khôi phục cấu hình mặc định',
      'Bạn có đồng ý khôi phục toàn bộ cổng định tuyến về cấu hình mặc định?',
      async () => {
        try {
          const res = await fetch('/api/mqtt/mappings/reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: 'Admin' })
          });
          if (res.ok) {
            const data = await res.json();
            setMappings(data.mappings);
          }
        } catch (err) {
          console.error(err);
        }
      }
    );
  };

  const startEditMapping = (item: SignalMapping) => {
    setEditingMappingId(item.id);
    setFormTopic(item.topic);
    setFormFunction(item.functionName);
    setFormJsonPath(item.jsonPath);
    setFormMultiplier(item.multiplier);
    setFormDescription(item.description);
    setFormIsActive(item.isActive);
  };

  const resetForm = () => {
    setEditingMappingId(null);
    setFormTopic('ecosmart/+/telemetry');
    setFormFunction('VOLTAGE');
    setFormJsonPath('telemetry.u_V');
    setFormMultiplier(1.0);
    setFormDescription('Đo điện áp nguồn cấp thực tế (V) từ bo mạch IoT Gateway');
    setFormIsActive(true);
  };

  const handleTestSandbox = () => {
    try {
      const payloadObj = JSON.parse(sandboxPayload);
      const results: { [key: string]: any } = {};

      mappings.forEach((map) => {
        if (!map.isActive) return;
        const rawVal = getValueByPath(payloadObj, map.jsonPath);
        if (rawVal !== undefined) {
          let converted: number | boolean = Number(rawVal) * map.multiplier;
          if (typeof rawVal === 'boolean') {
            converted = rawVal;
          } else if (map.functionName === 'CB_STATE' || map.functionName === 'DOOR_OPEN' || map.functionName === 'SMOKE_DETECTED' || map.functionName === 'LOCK_ACTIVE') {
            converted = rawVal === 'ON' || rawVal === 'true' || rawVal === true || rawVal === 1 || rawVal === '1';
          }
          results[map.functionName] = {
            raw: rawVal,
            converted: converted,
            path: map.jsonPath,
            topic: map.topic
          };
        }
      });
      setParsedSandboxResults(results);
    } catch {
      triggerAlert('Lỗi định dạng', 'Lỗi: Định dạng JSON trong Sandbox không chính xác!');
    }
  };

  const handlePushSandboxToSystem = () => {
    try {
      const payloadObj = JSON.parse(sandboxPayload);
      
      // Perform local parse simulation first so user can check
      handleTestSandbox();
      
      // Publish the payload over current active subscription topic (which represents the IoT Gateway reporting telemetry)
      onPublish(activeMqtt.subTopic, payloadObj);
      
      triggerAlert(
        'Đã Đẩy Giả Lập', 
        `Đã xuất bản (Publish) bản tin JSON giả lập lên topic: "${activeMqtt.subTopic}". Hệ thống đã kích hoạt bộ giải mã Mapping, biên dịch thành công các thông số cảm biến và cập nhật trạng thái phòng thực tế!`
      );
    } catch (err) {
      triggerAlert('Lỗi giải mã', 'Lỗi chỉnh sửa JSON Sandbox: cấu trúc không hợp lệ.');
    }
  };

  // Automatically scroll messages list to bottom inside the terminal container without scrolling the browser page window
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Seed initial payload streams and simulate incoming telemetry messages periodically
  useEffect(() => {
    // Initial logs seed
    const initialMsgs: MqttMessage[] = [
      {
        id: '1',
        time: new Date(Date.now() - 30000).toLocaleTimeString(),
        topic: activeMqtt.subTopic,
        payload: JSON.stringify({ device: 'gateway_01', status: 'ready', ip: '192.168.1.15' }, null, 2),
        direction: 'INCOMING',
      },
      {
        id: '2',
        time: new Date(Date.now() - 15000).toLocaleTimeString(),
        topic: activeMqtt.pubTopic,
        payload: JSON.stringify({ cmd: 'GET_STATE', timestamp: Date.now() }, null, 2),
        direction: 'OUTGOING',
      },
    ];
    setMessages(initialMsgs);
  }, [selectedRoomId]);

  // Update config state when selectedRoomId or activeMqtt config changes
  useEffect(() => {
    setBroker(activeMqtt.broker);
    setPort(activeMqtt.port);
    setClientId(activeMqtt.clientId);
    setSubTopic(activeMqtt.subTopic);
    setPubTopic(activeMqtt.pubTopic);
    setUsername(activeMqtt.username || '');
    setPassword(activeMqtt.password || '');
    setCustomPublishTopic(activeMqtt.pubTopic);
  }, [selectedRoomId, activeMqtt]);

  const deviceStateRef = useRef(deviceState);
  const activeMqttRef = useRef(activeMqtt);

  useEffect(() => {
    deviceStateRef.current = deviceState;
  }, [deviceState]);

  useEffect(() => {
    activeMqttRef.current = activeMqtt;
  }, [activeMqtt]);

  // Periodically generate simulated raw gateway payloads matching the active electrical state
  useEffect(() => {
    const interval = setInterval(() => {
      const currentMqtt = activeMqttRef.current;
      const currentDeviceState = deviceStateRef.current;

      if (currentMqtt.status !== 'CONNECTED') return;

      const telemetryPayload = {
        ts: Date.now(),
        gateway_id: currentMqtt.clientId,
        telemetry: {
          u_V: currentDeviceState.voltage,
          i_A: currentDeviceState.current,
          p_kW: currentDeviceState.power,
          r_kvar: currentDeviceState.reactivePower,
          f_Hz: currentDeviceState.frequency,
          cos_phi: currentDeviceState.powerFactor,
          e_kWh: Number(currentDeviceState.totalEnergy.toFixed(2)),
        },
        sensors: {
          temp_C: currentDeviceState.temperature,
          hum_percent: currentDeviceState.humidity,
          door_opened: currentDeviceState.doorOpen,
        },
        cb_closed: currentDeviceState.cbState,
        active_rules_applied: 7,
      };

      const newMsg: MqttMessage = {
        id: `msg_${Date.now()}`,
        time: new Date().toLocaleTimeString(),
        topic: currentMqtt.subTopic,
        payload: JSON.stringify(telemetryPayload, null, 2),
        direction: 'INCOMING',
      };

      setMessages(prev => {
        const next = [...prev, newMsg];
        if (next.length > 30) next.shift(); // keep last 30
        return next;
      });
    }, 3000); // add to MQTT monitor log every 3s

    return () => clearInterval(interval);
  }, [selectedRoomId]);

  // Handle configuration update
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      triggerAlert('Quyền hạn hạn chế', 'Chỉ tài khoản cấp 3: ADMIN mới được sửa đổi thông số kết nối MQTT!');
      return;
    }
    const updatedConfig = {
      broker,
      port: Number(port),
      clientId,
      subTopic,
      pubTopic,
      username,
      password,
    };
    
    if (selectedRoomId) {
      onUpdateRoomMqtt(selectedRoomId, updatedConfig);
    } else {
      onUpdateConfig(updatedConfig);
    }
  };

  // Handle custom manual message publish
  const handleManualPublish = () => {
    if (!canPublish) {
      triggerAlert('Quyền hạn hạn chế', 'Tài khoản VIEWER không có quyền phát lệnh điều khiển qua MQTT!');
      return;
    }
    try {
      const parsed = JSON.parse(customPayloadString);
      onPublish(customPublishTopic, parsed);

      // Add to local terminal
      const outgoingMsg: MqttMessage = {
        id: Math.random().toString(36).substring(2, 9),
        time: new Date().toLocaleTimeString(),
        topic: customPublishTopic,
        payload: JSON.stringify(parsed, null, 2),
        direction: 'OUTGOING',
      };
      setMessages(prev => [...prev, outgoingMsg]);
    } catch (err) {
      triggerAlert('Lỗi định dạng', 'Định dạng Payload JSON không hợp lệ! Hãy kiểm tra lại dấu đóng mở ngoặc kép.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-900 border border-slate-800 rounded-xl">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('broker')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
              viewMode === 'broker'
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/10'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Network className="h-4 w-4" />
            Kết Nối & Giám Sát MQTT
          </button>
          
          <button
            onClick={() => setViewMode('signals')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
              viewMode === 'signals'
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/10'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Sliders className="h-4 w-4" />
            Cấu Hình Định Tuyến & Đầu Đọc Tín Hiệu (Backend)
          </button>
        </div>
        <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2 bg-slate-950/60 px-3 py-1.5 rounded-md border border-slate-800">
          <Cpu className="h-3.5 w-3.5 text-cyan-400" />
          <span>Gateway: <strong>{activeMqtt.clientId}</strong></span>
        </div>
      </div>

      {viewMode === 'broker' ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Col 1: MQTT Connection parameters (Form Settings) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-lg">
            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-200 uppercase font-mono tracking-wider flex items-center gap-2">
                  <Network className="h-4 w-4 text-cyan-400" />
                  Cấu hình MQTT Broker
                </h3>
                
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wider ${
                  activeMqtt.status === 'CONNECTED'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : activeMqtt.status === 'CONNECTING'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${activeMqtt.status === 'CONNECTED' ? 'bg-emerald-400 animate-pulse' : activeMqtt.status === 'CONNECTING' ? 'bg-amber-400' : 'bg-rose-400'}`} />
                  {activeMqtt.status}
                </span>
              </div>

              {/* Room Topic Selector */}
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 space-y-1.5">
                <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Settings className="h-3 w-3" />
                  Cổng Gateway Theo Phòng Học
                </label>
                <select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-500 rounded px-2.5 py-1.5 text-xs text-slate-200 outline-none font-sans"
                >
                  <option value="">-- Mặc định Hệ thống Tổng --</option>
                  {rooms.map((rm) => (
                    <option key={rm.id} value={rm.id}>
                      🚪 {rm.name} - ({rm.id})
                    </option>
                  ))}
                </select>
                <div className="text-[10px] text-slate-400 italic">
                  * Quản lý & Tách biệt luồng Telemetry/Control riêng cho từng phòng học.
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">MQTT Broker IP/Host</label>
                  <input
                    type="text"
                    value={broker}
                    onChange={e => setBroker(e.target.value)}
                    disabled={!canEdit}
                    className="w-full bg-slate-950 border border-slate-800 disabled:opacity-60 focus:border-cyan-500 rounded px-2.5 py-1.5 text-xs text-slate-100 outline-none font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Port</label>
                  <input
                    type="number"
                    value={port}
                    onChange={e => setPort(Number(e.target.value))}
                    disabled={!canEdit}
                    className="w-full bg-slate-950 border border-slate-800 disabled:opacity-60 focus:border-cyan-500 rounded px-2 py-1.5 text-xs text-slate-100 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Client ID của Gateway</label>
                <input
                  type="text"
                  value={clientId}
                  onChange={e => setClientId(e.target.value)}
                  disabled={!canEdit}
                  className="w-full bg-slate-950 border border-slate-800 disabled:opacity-60 focus:border-cyan-500 rounded px-2.5 py-1.5 text-xs text-slate-100 outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    disabled={!canEdit}
                    className="w-full bg-slate-950 border border-slate-800 disabled:opacity-60 focus:border-cyan-500 rounded px-2.5 py-1.5 text-xs text-slate-100 outline-none font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    disabled={!canEdit}
                    className="w-full bg-slate-950 border border-slate-800 disabled:opacity-60 focus:border-cyan-500 rounded px-2.5 py-1.5 text-xs text-slate-100 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5 p-3 bg-slate-950 border border-slate-800 rounded-lg">
                <span className="text-[10px] font-semibold text-cyan-400 uppercase tracking-widest font-mono block">Cơ chế Topics truyền tin</span>
                
                <div className="space-y-2 mt-2">
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-slate-500 font-mono">1. Telemetry Sub Topic (Gateway gửi lên):</span>
                    <input
                      type="text"
                      value={subTopic}
                      onChange={e => setSubTopic(e.target.value)}
                      disabled={!canEdit}
                      className="w-full bg-slate-900 border border-slate-800 disabled:opacity-75 focus:border-cyan-500 rounded px-2 py-1 text-[11px] text-slate-300 outline-none font-mono"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[9px] text-slate-500 font-mono">2. Control Pub Topic (App gửi lệnh xuống):</span>
                    <input
                      type="text"
                      value={pubTopic}
                      onChange={e => setPubTopic(e.target.value)}
                      disabled={!canEdit}
                      className="w-full bg-slate-900 border border-slate-800 disabled:opacity-75 focus:border-cyan-500 rounded px-2 py-1 text-[11px] text-slate-300 outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {!canEdit && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-400 rounded flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 shrink-0" />
                  <span>Chức năng khóa. Bạn cần vai trò Admin để thay đổi cấu hình.</span>
                </div>
              )}

              {canEdit && (
                <button
                  id="btn_mqtt_reconnect"
                  type="submit"
                  disabled={activeMqtt.status === 'CONNECTING'}
                  className="w-full py-2 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-slate-950 font-bold rounded-lg text-xs tracking-wider uppercase transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${activeMqtt.status === 'CONNECTING' ? 'animate-spin' : ''}`} />
                  {activeMqtt.status === 'CONNECTING' ? 'Đang liên kết...' : 'Cập nhật & Kết nối'}
                </button>
              )}
            </form>
          </div>

          {/* Col 2: Live Payload Monitor (Interactive Real-time Log terminal) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-lg h-[460px]">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 uppercase font-mono tracking-wider flex items-center gap-2">
                <Radio className="h-4 w-4 text-emerald-400" />
                Giám sát Luồng Bản tin MQTT Live
              </h3>
              <span className="text-[10px] font-mono text-slate-500">Live Telemetry (5s)</span>
            </div>

            {/* Console view */}
            <div 
              ref={messagesContainerRef}
              className="my-3 flex-1 bg-slate-950 border border-slate-805 rounded-lg p-3 overflow-y-auto font-mono text-[11px] space-y-3.5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent animate-in fade-in duration-200"
            >
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-600">
                  <FileJson className="h-8 w-8 mb-2 opacity-40 animate-pulse" />
                  <span>Đang kết nối luồng cảm biến MQTT...</span>
                </div>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className="border-b border-slate-900 pb-2.5 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="text-slate-500">{m.time}</span>
                      <span className={`px-1 py-0.5 rounded font-bold ${
                        m.direction === 'INCOMING' 
                           ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900' 
                           : 'bg-cyan-950/40 text-cyan-400 border border-cyan-900'
                      }`}>
                        {m.direction === 'INCOMING' ? '← IN (SUB)' : '→ OUT (PUB)'}
                      </span>
                    </div>
                    <div className="text-slate-400">
                      <span className="text-slate-500">Topic:</span> <span className="text-indigo-400 text-xs">{m.topic}</span>
                    </div>
                    <pre className="mt-1 p-2 bg-slate-900/60 rounded text-slate-300 overflow-x-auto text-[10px] border border-slate-900">
                      {m.payload}
                    </pre>
                  </div>
                ))
              )}
            </div>

            <div className="text-[10px] font-mono text-slate-500 text-center">
              Mô phỏng dữ liệu Gateway IoT gửi trực tiếp qua giao thức MQTT v3.1.1
            </div>
          </div>

          {/* Col 3: Test MQTT Publish tool (Developer playground) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-lg">
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-200 uppercase font-mono tracking-wider flex items-center gap-2">
                  <Send className="h-4 w-4 text-purple-400" />
                  Gửi lệnh MQTT thủ công (Publish)
                </h3>
              </div>

              <div className="space-y-2 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Publish Topic</label>
                  <input
                    type="text"
                    value={customPublishTopic}
                    onChange={e => setCustomPublishTopic(e.target.value)}
                    disabled={!canPublish}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 font-mono outline-none focus:border-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Payload (Dữ liệu JSON)</label>
                  <textarea
                    rows={7}
                    value={customPayloadString}
                    onChange={e => setCustomPayloadString(e.target.value)}
                    disabled={!canPublish}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-2 text-xs text-slate-100 font-mono outline-none focus:border-purple-500 resize-none h-[180px] leading-relaxed"
                  />
                </div>
              </div>

              {!canPublish && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-400 rounded flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 shrink-0" />
                  <span>Chức năng khóa. Bạn cần vai trò Operator hoặc Admin để bắn bản tin điều khiển.</span>
                </div>
              )}

              {canPublish && (
                <button
                  id="btn_mqtt_publish"
                  onClick={handleManualPublish}
                  className="w-full py-2 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-slate-100 font-bold rounded-lg text-xs tracking-wider uppercase transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Play className="h-3.5 w-3.5 text-slate-100" />
                  Gửi Bản tin (Publish MQTT)
                </button>
              )}
            </div>

            <div className="p-3 bg-slate-950 border border-slate-850 rounded-lg text-[11px] text-slate-400 space-y-1 leading-normal mt-3">
              <span className="font-bold text-cyan-400 font-mono flex items-center gap-1">
                <HelpCircle className="h-3 w-3" /> Hướng dẫn cú pháp:
              </span>
              <p className="font-sans">Hệ thống chấp nhận các lệnh điều khiển dạng JSON. Ví dụ:</p>
              <code className="block bg-slate-900 p-1.5 rounded text-[10px] font-mono text-slate-300 overflow-x-auto">
                {`{"cmd": "TOGGLE_AC", "state": "ON"}`}
              </code>
            </div>
          </div>

        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Panel Trái: Form Cấu hình */}
          <div className="space-y-6 lg:col-span-1">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-200 uppercase font-mono tracking-wider flex items-center gap-2">
                  <Settings className="h-4 w-4 text-cyan-400" />
                  {editingMappingId ? 'Hiệu Chỉnh Định Tuyến' : 'Thêm Định Tuyến Tín Hiệu'}
                </h3>
                {editingMappingId && (
                  <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded text-[10px] font-mono">
                    Đang sửa
                  </span>
                )}
              </div>

              <form onSubmit={handleSaveMapping} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Chức năng Frontend</label>
                  <select
                    value={formFunction}
                    onChange={(e: any) => setFormFunction(e.target.value)}
                    disabled={!canEdit}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded px-2.5 py-1.5 text-xs text-slate-200 outline-none font-semibold"
                  >
                    <option value="VOLTAGE">VOLTAGE (Điện áp - V)</option>
                    <option value="CURRENT">CURRENT (Dòng điện - A)</option>
                    <option value="POWER">POWER (Công suất thực - kW)</option>
                    <option value="TEMPERATURE">TEMPERATURE (Nhiệt độ phòng - °C)</option>
                    <option value="HUMIDITY">HUMIDITY (Độ ẩm không khí - %)</option>
                    <option value="CB_STATE">CB_STATE (Trạng thái Rơle Aptomat)</option>
                    <option value="DOOR_OPEN">DOOR_OPEN (Cảm biến cửa đóng/mở)</option>
                    <option value="SMOKE_DETECTED">SMOKE_DETECTED (Cảnh báo khói hỏa hoạn)</option>
                    <option value="LOCK_ACTIVE">LOCK_ACTIVE (Khóa chốt thông minh)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">MQTT Topic</label>
                  <input
                    type="text"
                    required
                    value={formTopic}
                    onChange={(e) => setFormTopic(e.target.value)}
                    placeholder="Chấp nhận ký tự wildcard (+, #)"
                    disabled={!canEdit}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded px-2.5 py-1.5 text-xs text-slate-100 outline-none font-mono"
                  />
                  <div className="text-[10px] text-slate-500">Ví dụ: <code className="text-slate-400">ecosmart/+/telemetry</code> hoặc <code className="text-slate-400">ecosmart/b102/telemetry</code></div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">JSON Path</label>
                    <input
                      type="text"
                      required
                      value={formJsonPath}
                      onChange={(e) => setFormJsonPath(e.target.value)}
                      placeholder="e.g. telemetry.u_V"
                      disabled={!canEdit}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded px-2.5 py-1.5 text-xs text-slate-100 outline-none font-mono"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Hệ Số Nhân (Multiplier)</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formMultiplier}
                      onChange={(e) => setFormMultiplier(Number(e.target.value))}
                      disabled={!canEdit}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded px-2.5 py-1.5 text-xs text-slate-100 outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mục Tiêu & Mô Tả Chức Năng</label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    disabled={!canEdit}
                    placeholder="Nhập ghi chú ý nghĩa của tín hiệu này..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded px-2.5 py-2 text-xs text-slate-100 outline-none resize-none"
                  />
                </div>

                <div className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    id="formIsActive"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    disabled={!canEdit}
                    className="rounded text-cyan-500 focus:ring-0 bg-slate-950 border-slate-800 h-4 w-4"
                  />
                  <label htmlFor="formIsActive" className="text-xs font-semibold text-slate-300 cursor-pointer select-none">
                    Kích hoạt kênh định tuyến này
                  </label>
                </div>

                {!canEdit && (
                  <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-400 rounded flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 shrink-0" />
                    <span>Xem ở chế độ Read-only. Bạn cần tài khoản Admin để sửa thông số!</span>
                  </div>
                )}

                {canEdit && (
                  <div className="flex gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-slate-950 font-bold rounded-lg text-xs cursor-pointer"
                    >
                      {editingMappingId ? 'Cập Nhật Thiết Lập' : 'Thêm Vào Luồng'}
                    </button>
                    {editingMappingId && (
                      <button
                        type="button"
                        onClick={resetForm}
                        className="px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-xs cursor-pointer"
                      >
                        Hủy
                      </button>
                    )}
                  </div>
                )}
              </form>
            </div>

            {/* Quick reset templates */}
            {canEdit && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Khôi Phục Mặc Định</span>
                <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                  Nếu xảy ra lỗi cấu hình sai lệch hoặc hỏng luồng định tuyến, bạn có thể hoàn trả các kênh trích xuất biến điều khiển về mặc định nhanh chóng.
                </p>
                <button
                  type="button"
                  onClick={handleResetMappings}
                  className="w-full py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset Toàn Bộ Routing Định Tuyến
                </button>
              </div>
            )}
          </div>

          {/* Panel Phải: Danh sách Mappings & Sandbox test parser */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-200 uppercase font-mono tracking-wider flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-400" />
                  Bảng Ánh Xạ Biến & Định Tuyến (Signal Mappings)
                </h3>
                <span className="text-xs font-mono text-slate-500">
                  {mappings.length} Cảm Biến/Điều Khiển
                </span>
              </div>

              {isMappingLoading ? (
                <div className="py-20 text-center text-slate-500 font-mono text-xs">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-cyan-400" />
                  Đang truy hồi luồng ánh xạ...
                </div>
              ) : mappings.length === 0 ? (
                <div className="py-14 text-center border border-dashed border-slate-800 rounded-lg text-slate-500">
                  <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2 opacity-50" />
                  <span>Chưa có cấu hình định tuyến tín hiệu nào hoạt động.</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-3 px-2">Biến (Function)</th>
                        <th className="py-3 px-2">Topic Ánh Xạ</th>
                        <th className="py-3 px-2">Key JSON Path</th>
                        <th className="py-3 px-2 text-center">Hệ số</th>
                        <th className="py-3 px-2 text-center font-sans">Trạng thái</th>
                        <th className="py-3 px-2 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {mappings.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-950/40 text-slate-300 transition-colors">
                          <td className="py-3 px-2">
                            <div className="font-bold text-cyan-400 font-mono text-[11px]">{item.functionName}</div>
                            <div className="text-[10px] text-slate-500 max-w-[180px] truncate leading-tight mt-0.5" title={item.description}>
                              {item.description}
                            </div>
                          </td>
                          <td className="py-3 px-2 font-mono text-[11px] text-indigo-400 whitespace-nowrap">
                            {item.topic}
                          </td>
                          <td className="py-3 px-2 font-mono text-[11px] text-amber-500">
                            {item.jsonPath}
                          </td>
                          <td className="py-3 px-2 text-center font-mono text-slate-400">
                            {item.multiplier}x
                          </td>
                          <td className="py-3 px-2 text-center">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold tracking-widest ${
                              item.isActive 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                : 'bg-slate-850 text-slate-500 border border-slate-800'
                            }`}>
                              {item.isActive ? 'ACTIVE' : 'DISABLED'}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right whitespace-nowrap">
                            <div className="inline-flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => startEditMapping(item)}
                                className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-slate-850 rounded transition-all cursor-pointer"
                                title="Sửa cấu hình"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteMapping(item.id)}
                                className="p-1 text-slate-400 hover:text-rose-500 hover:bg-slate-850 rounded transition-all cursor-pointer"
                                title="Xóa"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Live Testing Sandbox */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-200 uppercase font-mono tracking-wider flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-purple-400" />
                  Mô phỏng trích xuất Payload Sandbox (Gateway Diagnostic Tool)
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Left Payload Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Raw Telemetry JSON</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleTestSandbox}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded text-[10px] tracking-wide uppercase transition-all flex items-center gap-1 cursor-pointer"
                        title="Phân tích thử kết quả ở cột bên phải"
                      >
                        <Play className="h-3 w-3" /> Trích Xuất
                      </button>
                      <button
                        type="button"
                        onClick={handlePushSandboxToSystem}
                        className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-slate-100 font-bold rounded text-[10px] tracking-wide uppercase transition-all flex items-center gap-1 cursor-pointer hover:shadow-[0_0_15px_rgba(147,51,234,0.4)]"
                        title="Đẩy dữ liệu JSON này lên server mô phỏng thông số phòng thực tế"
                      >
                        <Send className="h-3 w-3 animate-pulse" /> Đẩy Lên Hệ Thống
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={8}
                    value={sandboxPayload}
                    onChange={(e) => setSandboxPayload(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 p-2 text-[10px] font-mono text-slate-300 outline-none focus:border-purple-500 rounded resize-none h-[220px]"
                  />
                </div>

                {/* Right Parsing Results */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Kết Quả Thu Được Tại Frontend</span>
                  <div className="bg-slate-950 border border-slate-800 p-3.5 rounded h-[220px] overflow-y-auto space-y-2.5 scrollbar-thin scrollbar-thumb-slate-800 select-none">
                    {Object.keys(parsedSandboxResults).length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-500 font-sans text-xs text-center p-4">
                        <FileJson className="h-7 w-7 mb-1.5 opacity-40 mx-auto" />
                        <span>Hãy ấn nút <strong>Chạy Trích Xuất</strong> ở bên trái để kiểm tra cấu hình định tuyến.</span>
                      </div>
                    ) : (
                      <div className="space-y-2 text-[11px] font-mono">
                        {Object.entries(parsedSandboxResults).map(([key, item]: [string, any]) => (
                          <div key={key} className="flex flex-col p-1.5 bg-slate-905/80 rounded border border-slate-800 bg-slate-900">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-cyan-400 font-bold">{key}</span>
                              <span className="text-slate-500 bg-slate-950 px-1 py-0.5 rounded text-[8px]">{item.path}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-slate-500">Raw: {String(item.raw)}</span>
                              <ArrowRight className="h-3 w-3 text-slate-600 animate-pulse" />
                              <span className="text-emerald-400 font-semibold font-sans">
                                Kết quả: {typeof item.converted === 'boolean' ? (item.converted ? 'TRUE/ON 🟩' : 'FALSE/OFF 🟥') : String(item.converted)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>
      )}

      {/* Custom alert and confirm modals to prevent cross-origin Script error in iframe */}
      {modalAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className={`bg-[#0D0F14] border ${modalAlert.type === 'CONFIRM' ? 'border-red-500/30 shadow-[0_0_25px_rgba(239,68,68,0.15)]' : 'border-amber-500/30 shadow-[0_0_25px_rgba(245,158,11,0.15)]'} rounded-sm w-full max-w-md p-6 relative`}>
            <button 
              onClick={() => setModalAlert(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 border-b border-[#1E293B] pb-3 mb-4">
              {modalAlert.type === 'CONFIRM' ? (
                <AlertTriangle className="h-5 w-5 text-red-500 animate-pulse" />
              ) : (
                <Info className="h-5 w-5 text-amber-500 animate-pulse" />
              )}
              <div>
                <h3 className="text-sm font-bold text-slate-200 uppercase font-mono">{modalAlert.title}</h3>
                <p className="text-[10px] text-slate-500 font-mono">
                  {modalAlert.type === 'CONFIRM' ? 'YÊU CẦU XÁC NHẬN SỰ KIỆN' : 'THÔNG BÁO HỆ THỐNG'}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-300 font-sans mb-5 leading-relaxed">
              {modalAlert.message}
            </p>
            <div className="flex gap-3">
              {modalAlert.type === 'CONFIRM' ? (
                <>
                  <button
                    onClick={() => setModalAlert(null)}
                    className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold font-mono uppercase tracking-wider rounded-sm border border-[#1E293B] transition-colors cursor-pointer text-center"
                  >
                    HủY Bỏ
                  </button>
                  <button
                    onClick={() => {
                      if (modalAlert.onConfirm) {
                        modalAlert.onConfirm();
                      }
                      setModalAlert(null);
                    }}
                    className="flex-1 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold font-mono uppercase tracking-wider rounded-sm transition-colors cursor-pointer text-center"
                  >
                    XÁC NHẬN
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setModalAlert(null)}
                  className="w-full py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold font-mono uppercase tracking-wider rounded-sm transition-colors cursor-pointer text-center"
                >
                  ĐÃ HIỂU
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
