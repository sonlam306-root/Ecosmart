import React, { useState, useEffect } from 'react';
import { UserRole, DeviceState, Scenario, LogEntry, EnergyHistory, SystemConfig, MqttConfig, Room, CustomDevice } from './types';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import MqttGateway from './components/MqttGateway';
import Scenarios from './components/Scenarios';
import Reports from './components/Reports';
import DbLogs from './components/DbLogs';

import { 
  LayoutDashboard, 
  Workflow, 
  Network, 
  ClipboardList, 
  Database,
  RefreshCw,
  CheckCircle,
  AlertOctagon,
  TrendingUp,
  Cpu
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'scenarios' | 'mqtt' | 'reports' | 'logs'>('dashboard');
  const [currentRole, setCurrentRole] = useState<UserRole>('ADMIN'); // Start with ADMIN for full capability
  
  // Storage States
  const [rooms, setRooms] = useState<Room[]>([]);
  const [deviceState, setDeviceState] = useState<DeviceState>({
    cbState: true,
    voltage: 220.0,
    current: 4.5,
    power: 0.99,
    reactivePower: 0.05,
    frequency: 50.0,
    powerFactor: 0.99,
    totalEnergy: 1420.0,
    temperature: 25.0,
    humidity: 60.0,
    doorOpen: false,
    smokeDetected: false,
    lockActive: true,
    lastUpdated: new Date().toISOString()
  });

  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [history, setHistory] = useState<EnergyHistory[]>([]);
  const [systemConfig, setSystemConfig] = useState<SystemConfig>({
    classroomName: 'Phòng học Thông minh B102',
    logoUrl: null,
    customLogoIndex: 0,
    isSimulationActive: true,
    simSpeedMs: 2000,
    activeRoomId: 'room_b102'
  });

  const [mqttConfig, setMqttConfig] = useState<MqttConfig>({
    broker: 'broker.emqx.io',
    port: 1883,
    clientId: 'ecosmart_classroom_gateway_01',
    subTopic: 'ecosmart/classroom/telemetry',
    pubTopic: 'ecosmart/classroom/control',
    status: 'DISCONNECTED'
  });

  const [isLoading, setIsLoading] = useState(false);

  // Fetch all initial data
  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [resDevice, resScenarios, resLogs, resHistory, resMqtt, resSys, resRooms] = await Promise.all([
        fetch('/api/device-state').then(r => r.json()),
        fetch('/api/scenarios').then(r => r.json()),
        fetch('/api/logs').then(r => r.json()),
        fetch('/api/reports/history').then(r => r.json()),
        fetch('/api/mqtt/config').then(r => r.json()),
        fetch('/api/system/config').then(r => r.json()),
        fetch('/api/rooms').then(r => r.json())
      ]);

      setDeviceState(resDevice);
      setScenarios(resScenarios);
      setLogs(resLogs);
      setHistory(resHistory);
      setMqttConfig(resMqtt);
      setSystemConfig(resSys);
      setRooms(resRooms);
    } catch (err) {
      console.error("Lỗi đồng bộ dữ liệu với server:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Periodic polling for live telemetry updating the dashboard
  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const resDevice = await fetch(`/api/device-state?roomId=${systemConfig.activeRoomId}`);
        if (resDevice.ok) {
          const rawDevice = await resDevice.json();
          setDeviceState(rawDevice);
        }

        // Poll rooms list and custom devices in background
        const resRooms = await fetch('/api/rooms');
        if (resRooms.ok) {
          const rawRooms = await resRooms.json();
          setRooms(rawRooms);
        }

        // Poll logs slightly less to keep bandwidth optimized
        const resLogs = await fetch('/api/logs');
        if (resLogs.ok) {
          const rawLogs = await resLogs.json();
          setLogs(rawLogs);
        }

        // Update history periodically to synchronize lists
        const resHistory = await fetch('/api/reports/history');
        if (resHistory.ok) {
          const rawHist = await resHistory.json();
          setHistory(rawHist);
        }

        // Fetch mqtt status to keep sync
        const resMqtt = await fetch('/api/mqtt/config');
        if (resMqtt.ok) {
          const rawMqtt = await resMqtt.json();
          setMqttConfig(rawMqtt);
        }

        // Fetch system config to keep sync
        const resSys = await fetch('/api/system/config');
        if (resSys.ok) {
          const rawSys = await resSys.json();
          setSystemConfig(rawSys);
        }
      } catch (err) {
        console.warn("Lỗi cập nhật số liệu thời gian thực:", err);
      }
    };

    // Run once immediately on room change
    fetchLatest();

    const livePoll = setInterval(fetchLatest, 2500);

    return () => clearInterval(livePoll);
  }, [systemConfig.activeRoomId]);

  // Active user name representation based on roles
  const getCurrentUserName = () => {
    switch (currentRole) {
      case 'ADMIN': return 'Phạm Minh Admin (BQL)';
      case 'OPERATOR': return 'Nguyễn Văn Operator (BGH)';
      default: return 'Khách tham quan (Viewer)';
    }
  };

  // 1. Toggle Circuit Breaker (CB)
  const handleToggleCB = async (state: boolean) => {
    try {
      const resp = await fetch('/api/device/cb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, user: getCurrentUserName(), roomId: systemConfig.activeRoomId })
      });
      if (resp.ok) {
        const data = await resp.json();
        setDeviceState(data.deviceState);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle Electromagnetic Lock
  const handleToggleLock = async (state: boolean) => {
    try {
      const resp = await fetch('/api/device/lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, user: getCurrentUserName(), roomId: systemConfig.activeRoomId })
      });
      if (resp.ok) {
        const data = await resp.json();
        setDeviceState(data.deviceState);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle Smoke Sensor simulation
  const handleToggleSmoke = async (state: boolean, roomId?: string) => {
    try {
      const resp = await fetch('/api/device/smoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, user: getCurrentUserName(), roomId })
      });
      if (resp.ok) {
        const data = await resp.json();
        if (!roomId || roomId === systemConfig.activeRoomId) {
          setDeviceState(data.deviceState);
        } else {
          const devResp = await fetch('/api/device-state');
          if (devResp.ok) {
            setDeviceState(await devResp.json());
          }
        }
        const roomsResp = await fetch('/api/rooms');
        if (roomsResp.ok) {
          setRooms(await roomsResp.json());
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle Door Status manually
  const handleToggleDoor = async (state: boolean) => {
    try {
      const resp = await fetch('/api/device/door', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, user: getCurrentUserName(), roomId: systemConfig.activeRoomId })
      });
      if (resp.ok) {
        const data = await resp.json();
        setDeviceState(data.deviceState);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 2. Trigger Scenario
  const handleRunScenario = async (id: number) => {
    try {
      const resp = await fetch(`/api/scenarios/run/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: getCurrentUserName() })
      });
      if (resp.ok) {
        const data = await resp.json();
        setScenarios(data.scenarios);
        setDeviceState(data.deviceState);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 3. Edit / Save Scenario
  const handleUpdateScenario = async (id: number, updated: Scenario) => {
    try {
      const resp = await fetch(`/api/scenarios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: updated, user: getCurrentUserName() })
      });
      if (resp.ok) {
        const data = await resp.json();
        setScenarios(data.scenarios);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 4. Update MQTT broker details
  const handleUpdateMqtt = async (config: Partial<MqttConfig>) => {
    try {
      const resp = await fetch('/api/mqtt/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, user: getCurrentUserName() })
      });
      if (resp.ok) {
        const data = await resp.json();
        setMqttConfig(data.mqtt);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Update MQTT broker details for a specific room topic
  const handleUpdateRoomMqtt = async (roomId: string, config: Partial<MqttConfig>) => {
    try {
      const resp = await fetch(`/api/rooms/${roomId}/mqtt`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, user: getCurrentUserName() })
      });
      if (resp.ok) {
        const data = await resp.json();
        setRooms(data.rooms);
        if (roomId === (systemConfig.activeRoomId || 'room_b102')) {
          const updatedRoom = data.rooms.find((r: any) => r.id === roomId);
          if (updatedRoom && updatedRoom.mqttConfig) {
            setMqttConfig(updatedRoom.mqttConfig);
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 5. Publish Manual MQTT Message
  const handlePublishMqtt = async (topic: string, payload: any) => {
    try {
      const resp = await fetch('/api/mqtt/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, payload, user: getCurrentUserName() })
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.status === 'success' && data.rooms) {
          setRooms(data.rooms);
          const activeRoom = data.rooms.find((r: Room) => r.id === systemConfig.activeRoomId);
          if (activeRoom) {
            setDeviceState(activeRoom.deviceState);
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 6. Clear Logs Database
  const handleClearLogs = async () => {
    try {
      const resp = await fetch('/api/logs/all/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: getCurrentUserName() })
      });
      if (resp.ok) {
        const data = await resp.json();
        setLogs(data.logs);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 7. Update System Configurations (Logo / Classroom name)
  const handleUpdateSystemConfig = async (config: Partial<SystemConfig>) => {
    try {
      const resp = await fetch('/api/system/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, user: getCurrentUserName() })
      });
      if (resp.ok) {
        const data = await resp.json();
        setSystemConfig(data.config);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 8. Room Management Callbacks
  const handleSelectRoom = async (id: string) => {
    try {
      const resp = await fetch(`/api/rooms/${id}/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: getCurrentUserName() })
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.status === 'success' || data.success) {
          setDeviceState(data.deviceState || data.room?.deviceState);
          setSystemConfig(data.config);
          const roomsResp = await fetch('/api/rooms');
          if (roomsResp.ok) {
            setRooms(await roomsResp.json());
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateRoom = async (name: string, gridX: number, gridY: number) => {
    try {
      const resp = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, gridX, gridY, user: getCurrentUserName() })
      });
      if (resp.ok) {
        const data = await resp.json();
        setRooms(data.rooms);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRoom = async (id: string) => {
    try {
      const resp = await fetch(`/api/rooms/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: getCurrentUserName() })
      });
      if (resp.ok) {
        const data = await resp.json();
        setRooms(data.rooms);
        if (systemConfig.activeRoomId === id && data.rooms && data.rooms.length > 0) {
          handleSelectRoom(data.rooms[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateRoom = async (
    id: string,
    name: string,
    gridX: number,
    gridY: number,
    mqttConfig: Partial<MqttConfig>
  ) => {
    try {
      const resp = await fetch(`/api/rooms/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, gridX, gridY, mqttConfig, user: getCurrentUserName() })
      });
      if (resp.ok) {
        const data = await resp.json();
        setRooms(data.rooms);
        if (id === systemConfig.activeRoomId) {
          const updatedRoom = data.rooms.find((r: any) => r.id === id);
          if (updatedRoom) {
            setSystemConfig((prev) => ({
              ...prev,
              classroomName: updatedRoom.name
            }));
            if (updatedRoom.mqttConfig) {
              setMqttConfig(updatedRoom.mqttConfig);
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddDevice = async (roomId: string, name: string, type: 'LIGHT' | 'AC' | 'PROJECTOR' | 'DOORLOCK' | 'SMOKE' | 'FAN' | 'TV' | 'COMPUTER' | 'CUSTOM', powerConsumption: number) => {
    try {
      const resp = await fetch(`/api/rooms/${roomId}/devices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, powerConsumption, user: getCurrentUserName() })
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.success) {
          setRooms(data.rooms);
          if (roomId === systemConfig.activeRoomId) {
            const devResp = await fetch('/api/device-state');
            if (devResp.ok) setDeviceState(await devResp.json());
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleDevice = async (roomId: string, deviceId: string) => {
    try {
      const resp = await fetch(`/api/rooms/${roomId}/devices/${deviceId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: getCurrentUserName() })
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.success) {
          setRooms(data.rooms);
          if (roomId === systemConfig.activeRoomId) {
            const devResp = await fetch('/api/device-state');
            if (devResp.ok) setDeviceState(await devResp.json());
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteDevice = async (roomId: string, deviceId: string) => {
    try {
      const resp = await fetch(`/api/rooms/${roomId}/devices/${deviceId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: getCurrentUserName() })
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.success) {
          setRooms(data.rooms);
          if (roomId === systemConfig.activeRoomId) {
            const devResp = await fetch('/api/device-state');
            if (devResp.ok) setDeviceState(await devResp.json());
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0B10] text-[#E2E8F0] flex flex-col font-sans antialiased selection:bg-cyan-500/30 selection:text-cyan-300">
      
      {/* Main layout body */}
      <div className="relative z-10 flex flex-col min-h-screen">
        
        {/* Header Block */}
        <Header 
          currentRole={currentRole}
          onChangeRole={setCurrentRole}
          systemConfig={systemConfig}
          mqttStatus={mqttConfig.status}
          cbState={deviceState.cbState}
          onUpdateConfig={handleUpdateSystemConfig}
        />

        {/* Dynamic Navigation Sidebar & Tabs Container */}
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* Col 1: Tab Selectors (Left Rail navigation) - 3/12 width */}
          <nav className="md:col-span-3 bg-[#111319] border border-[#1E293B] rounded-lg p-3.5 flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-x-visible scrollbar-none scrollbar-track-transparent">
            
            <span className="hidden md:block text-[10px] font-mono font-bold tracking-widest text-slate-500 uppercase px-3 pb-3 border-b border-[#1E293B]/60 mb-2">
              Control Center
            </span>

            {/* Tap Button 1: Dashboard */}
            <button
              id="tab_dashboard"
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-sm text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer shrink-0 border-l-2 ${
                activeTab === 'dashboard'
                  ? 'bg-cyan-500/10 border-cyan-400 text-cyan-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/80 border-transparent'
              }`}
            >
              <LayoutDashboard className="h-4.5 w-4.5 text-cyan-400" />
              <span>DASHBOARD OVERVIEW</span>
            </button>

            {/* Tap Button 2: Scenarios */}
            <button
              id="tab_scenarios"
              onClick={() => setActiveTab('scenarios')}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-sm text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer shrink-0 border-l-2 ${
                activeTab === 'scenarios'
                  ? 'bg-cyan-500/10 border-cyan-400 text-cyan-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/80 border-transparent'
              }`}
            >
              <Workflow className="h-4.5 w-4.5 text-cyan-400" />
              <span>Kịch bản 7 bậc</span>
            </button>

            {/* Tap Button 3: MQTT Settings */}
            <button
              id="tab_mqtt"
              onClick={() => setActiveTab('mqtt')}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-sm text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer shrink-0 border-l-2 ${
                activeTab === 'mqtt'
                  ? 'bg-cyan-500/10 border-cyan-400 text-cyan-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/80 border-transparent'
              }`}
            >
              <Network className="h-4.5 w-4.5 text-cyan-400" />
              <span>MQTT GATEWAY</span>
            </button>

            <span className="hidden md:block text-[10px] font-mono font-bold tracking-widest text-slate-500 uppercase px-3 pt-4 pb-2 border-b border-[#1E293B]/30 mb-2">
              Analytics & Data
            </span>

            {/* Tap Button 4: Analytical reports */}
            <button
              id="tab_reports"
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-sm text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer shrink-0 border-l-2 ${
                activeTab === 'reports'
                  ? 'bg-cyan-500/10 border-cyan-400 text-cyan-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/80 border-transparent'
              }`}
            >
              <ClipboardList className="h-4.5 w-4.5 text-cyan-400" />
              <span>BÁO CÁO ĐIỆN NĂNG</span>
            </button>

            {/* Tap Button 5: Operation database logs */}
            <button
              id="tab_logs"
              onClick={() => setActiveTab('logs')}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-sm text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer shrink-0 border-l-2 ${
                activeTab === 'logs'
                  ? 'bg-cyan-500/10 border-cyan-400 text-cyan-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/80 border-transparent'
              }`}
            >
              <Database className="h-4.5 w-4.5 text-cyan-400" />
              <span>LOGS VẬN HÀNH DB</span>
            </button>

            <div className="hidden md:block border-t border-[#1E293B]/60 pt-3 mt-3 px-3">
              <span className="text-[10px] font-mono text-slate-500 block leading-normal">
                System Status: <span className="text-emerald-500 font-mono">CONNECTED_MQTT_01</span>
              </span>
            </div>

          </nav>

          {/* Col 2: Selected View Wrapper - 9/12 width */}
          <main className="md:col-span-9">
            
            {activeTab === 'dashboard' && (
              <Dashboard 
                deviceState={deviceState}
                currentRole={currentRole}
                onToggleCB={handleToggleCB}
                onToggleLock={handleToggleLock}
                onToggleSmoke={handleToggleSmoke}
                onToggleDoor={handleToggleDoor}
                isLoading={isLoading}
                onRefresh={loadInitialData}
                rooms={rooms}
                activeRoomId={systemConfig.activeRoomId || 'room_b102'}
                onSelectRoom={handleSelectRoom}
                onCreateRoom={handleCreateRoom}
                onDeleteRoom={handleDeleteRoom}
                onUpdateRoom={handleUpdateRoom}
                onAddDevice={handleAddDevice}
                onToggleDevice={handleToggleDevice}
                onDeleteDevice={handleDeleteDevice}
              />
            )}

            {activeTab === 'scenarios' && (
              <Scenarios 
                scenarios={scenarios}
                currentRole={currentRole}
                onRunScenario={handleRunScenario}
                onUpdateScenario={handleUpdateScenario}
                isLoading={isLoading}
              />
            )}

            {activeTab === 'mqtt' && (
              <MqttGateway 
                mqttConfig={mqttConfig}
                currentRole={currentRole}
                deviceState={deviceState}
                onUpdateConfig={handleUpdateMqtt}
                onPublish={handlePublishMqtt}
                rooms={rooms}
                activeRoomId={systemConfig.activeRoomId || 'room_b102'}
                onUpdateRoomMqtt={handleUpdateRoomMqtt}
              />
            )}

            {activeTab === 'reports' && (
              <Reports 
                historyData={history}
                systemConfig={systemConfig}
                logs={logs}
              />
            )}

            {activeTab === 'logs' && (
              <DbLogs 
                logs={logs}
                currentRole={currentRole}
                onClearLogs={handleClearLogs}
              />
            )}

          </main>

        </div>

        {/* Footer */}
        <footer className="h-12 bg-[#0F1116] border-t border-[#1E293B] px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-400 font-mono mt-auto shrink-0">
          <div className="flex gap-4 items-center">
            <span>NODE: ASIA-SOUTH-01</span>
            <span className="hidden xs:inline text-slate-700">|</span>
            <span>GATEWAY: V4.12.0</span>
            <span className="hidden xs:inline text-slate-700">|</span>
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> MQTT: Connected</span>
          </div>
          <div className="flex gap-4 items-center">
            <span>v2.4.1-STABLE</span>
            <span className="text-slate-500 font-bold uppercase">© Ecosmart Classroom {new Date().getFullYear()}</span>
          </div>
        </footer>

      </div>
    </div>
  );
}
