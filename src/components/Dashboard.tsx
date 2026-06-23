import React, { useState } from 'react';
import { DeviceState, UserRole, Room, CustomDevice } from '../types';
import { 
  Zap, 
  Thermometer, 
  Droplets, 
  DoorOpen, 
  Lock, 
  Unlock, 
  AlertTriangle, 
  RefreshCcw, 
  Activity, 
  ArrowUpRight, 
  ShieldAlert, 
  Flame, 
  BellRing, 
  Volume2,
  Plus,
  Trash2,
  Grid,
  PlusCircle,
  Lightbulb,
  Cpu,
  Monitor,
  Video,
  Tv,
  Wind,
  Compass,
  Layout,
  Layers,
  ChevronRight,
  Info,
  X,
  Settings
} from 'lucide-react';

interface DashboardProps {
  deviceState: DeviceState;
  currentRole: UserRole;
  onToggleCB: (state: boolean) => void;
  onToggleLock: (state: boolean) => void;
  onToggleSmoke: (state: boolean, roomId?: string) => void;
  onToggleDoor: (state: boolean) => void;
  isLoading: boolean;
  onRefresh: () => void;
  
  // Multi-room additions
  rooms: Room[];
  activeRoomId: string;
  onSelectRoom: (id: string) => void;
  onCreateRoom: (name: string, gridX: number, gridY: number) => void;
  onDeleteRoom: (id: string) => void;
  onUpdateRoom: (id: string, name: string, gridX: number, gridY: number, mqttConfig: any) => void;
  onAddDevice: (roomId: string, name: string, type: 'LIGHT' | 'AC' | 'PROJECTOR' | 'DOORLOCK' | 'SMOKE' | 'FAN' | 'TV' | 'COMPUTER' | 'CUSTOM', power: number) => void;
  onToggleDevice: (roomId: string, deviceId: string) => void;
  onDeleteDevice: (roomId: string, deviceId: string) => void;
}

export default function Dashboard({
  deviceState,
  currentRole,
  onToggleCB,
  onToggleLock,
  onToggleSmoke,
  onToggleDoor,
  isLoading,
  onRefresh,
  
  rooms = [],
  activeRoomId,
  onSelectRoom,
  onCreateRoom,
  onDeleteRoom,
  onUpdateRoom,
  onAddDevice,
  onToggleDevice,
  onDeleteDevice,
}: DashboardProps) {
  const [showRoleWarning, setShowRoleWarning] = useState(false);
  const [showAddRoomForm, setShowAddRoomForm] = useState(false);
  const [showAddDeviceForm, setShowAddDeviceForm] = useState(false);

  // Form states for creating room
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomX, setNewRoomX] = useState<number>(1);
  const [newRoomY, setNewRoomY] = useState<number>(1);

  // Form states for adding device
  const [newDevName, setNewDevName] = useState('');
  const [newDevType, setNewDevType] = useState<'LIGHT' | 'AC' | 'PROJECTOR' | 'DOORLOCK' | 'SMOKE' | 'FAN' | 'TV' | 'COMPUTER' | 'CUSTOM'>('LIGHT');
  const [newDevPower, setNewDevPower] = useState<number>(60);

  // Custom confirmation modal state for Delete actions
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'ROOM' | 'DEVICE';
    roomId: string;
    deviceId?: string;
    message: string;
  } | null>(null);

  // Form states for editing a room and its topics
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editRoomName, setEditRoomName] = useState('');
  const [editRoomX, setEditRoomX] = useState<number>(1);
  const [editRoomY, setEditRoomY] = useState<number>(1);
  const [editSubTopic, setEditSubTopic] = useState('');
  const [editPubTopic, setEditPubTopic] = useState('');
  const [editBroker, setEditBroker] = useState('');
  const [editPort, setEditPort] = useState<number>(1883);
  const [editClientId, setEditClientId] = useState('');

  const handleStartEditRoom = (room: Room) => {
    setEditingRoomId(room.id);
    setEditRoomName(room.name);
    setEditRoomX(room.gridX);
    setEditRoomY(room.gridY);
    setEditSubTopic(room.mqttConfig?.subTopic || '');
    setEditPubTopic(room.mqttConfig?.pubTopic || '');
    setEditBroker(room.mqttConfig?.broker || 'broker.emqx.io');
    setEditPort(room.mqttConfig?.port || 1883);
    setEditClientId(room.mqttConfig?.clientId || '');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoomId) return;
    onUpdateRoom(editingRoomId, editRoomName, editRoomX, editRoomY, {
      subTopic: editSubTopic,
      pubTopic: editPubTopic,
      broker: editBroker,
      port: editPort,
      clientId: editClientId,
    });
    setEditingRoomId(null);
  };

  const canControl = currentRole === 'ADMIN' || currentRole === 'OPERATOR';

  // Find currently active room
  const activeRoom = rooms.find(r => r.id === activeRoomId) || rooms[0];

  const handleCBClick = () => {
    if (!canControl) {
      triggerRoleWarning();
      return;
    }
    onToggleCB(!deviceState.cbState);
  };

  const handleLockClick = () => {
    if (!canControl) {
      triggerRoleWarning();
      return;
    }
    onToggleLock(!deviceState.lockActive);
  };

  const handleSmokeClick = () => {
    if (!canControl) {
      triggerRoleWarning();
      return;
    }
    onToggleSmoke(!deviceState.smokeDetected);
  };

  const handleDoorClick = () => {
    if (!canControl) {
      triggerRoleWarning();
      return;
    }
    onToggleDoor(!deviceState.doorOpen);
  };

  const triggerRoleWarning = () => {
    setShowRoleWarning(true);
    setTimeout(() => setShowRoleWarning(false), 4000);
  };

  const handleCreateRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    if (!canControl) {
      triggerRoleWarning();
      return;
    }
    
    // Generate simple ID if needed
    onCreateRoom(newRoomName, newRoomX, newRoomY);
    setNewRoomName('');
    setShowAddRoomForm(false);
  };

  const handleAddDeviceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDevName.trim()) return;
    if (!canControl) {
      triggerRoleWarning();
      return;
    }

    onAddDevice(activeRoomId, newDevName, newDevType, newDevPower);
    setNewDevName('');
    setNewDevPower(60);
    setNewDevType('LIGHT');
    setShowAddDeviceForm(false);
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'LIGHT': return <Lightbulb className="h-4 w-4 text-amber-400" />;
      case 'AC': return <Wind className="h-4 w-4 text-cyan-400" />;
      case 'PROJECTOR': return <Video className="h-4 w-4 text-purple-400" />;
      case 'FAN': return <RefreshCcw className="h-4 w-4 text-emerald-400" />;
      case 'TV': return <Tv className="h-4 w-4 text-pink-400" />;
      case 'COMPUTER': return <Monitor className="h-4 w-4 text-indigo-400" />;
      default: return <Cpu className="h-4 w-4 text-slate-400" />;
    }
  };

  const getDeviceLabel = (type: string) => {
    switch (type) {
      case 'LIGHT': return 'Đèn LED';
      case 'AC': return 'Điều hòa';
      case 'PROJECTOR': return 'Máy chiếu';
      case 'FAN': return 'Quạt thông gió';
      case 'TV': return 'Tivi/Màn hình';
      case 'COMPUTER': return 'Máy tính';
      default: return 'Thiết bị phụ tải';
    }
  };

  // Check if any room has smoke alarm to display header alert
  const hasSmokeAlarmGlobal = rooms.some(r => r.deviceState?.smokeDetected);

  return (
    <div className="space-y-6">

      {/* Global Smoke Warning Banner */}
      {hasSmokeAlarmGlobal && (
        <div className="bg-red-950/40 border-2 border-red-500 rounded-sm p-4 text-red-200 flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.3)]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500 text-white rounded-full animate-bounce shrink-0">
              <Flame className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold uppercase font-mono tracking-wider text-red-400">🚨 HỆ THỐNG CẢNH BÁO BÁO CHÁY: PHÁT HIỆN SỰ CỐ KHÓI!</h4>
              <p className="text-xs text-red-300 font-mono mt-1">Cảm biến khói đang kích hoạt nhấp nháy liên tục tại phòng trung tâm. Toàn bộ còi báo động đã kích hoạt!</p>
            </div>
          </div>
          {activeRoom?.deviceState?.smokeDetected && (
            <button 
              onClick={handleSmokeClick}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold uppercase tracking-widest rounded-sm shrink-0 shadow-lg border border-red-400 cursor-pointer"
            >
              TẮT CÒI PHÒNG NÀY
            </button>
          )}
        </div>
      )}

      {/* SECTION 1: Sơ đồ phòng học Thông Minh (Rooms Map Schema Layout) */}
      <div className="bg-[#111319] border border-[#1E293B] rounded-sm p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#1E293B]/60 pb-4 mb-4 gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider font-mono">BẢN ĐỒ KHÔNG GIAN GIÁM SÁT</span>
            <h3 className="text-base font-bold text-slate-200 flex items-center gap-2 mt-0.5">
              <Grid className="h-4.5 w-4.5 text-cyan-400" />
              Quản lý Sơ đồ các Phòng học
            </h3>
          </div>
          {canControl && (
            <button
              onClick={() => setShowAddRoomForm(!showAddRoomForm)}
              className="px-3.5 py-1.5 bg-cyan-950/40 border border-cyan-500/40 hover:bg-cyan-900/30 text-cyan-300 text-xs font-bold font-mono uppercase tracking-wider rounded-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Thêm phòng học mới
            </button>
          )}
        </div>

        {/* Create Room Inline Form */}
        {showAddRoomForm && (
          <form onSubmit={handleCreateRoomSubmit} className="bg-[#0A0B10] border border-cyan-900/40 rounded-sm p-4 mb-4 animate-in fade-in duration-200">
            <h4 className="text-xs font-bold uppercase text-cyan-400 font-mono mb-3 flex items-center gap-1.5">
              <PlusCircle className="h-4 w-4" /> KHAI BÁO THỨC TẠO PHÒNG MỚI
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">Tên phòng học</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Phòng Thí nghiệm B105"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="w-full bg-[#111319] border border-[#1E293B] text-slate-100 text-xs px-3 py-2 rounded-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">Toạ độ X (Hàng dọc)</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={newRoomX}
                  onChange={(e) => setNewRoomX(parseInt(e.target.value) || 1)}
                  className="w-full bg-[#111319] border border-[#1E293B] text-slate-100 text-xs px-3 py-2 rounded-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">Toạ độ Y (Hàng ngang)</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={newRoomY}
                  onChange={(e) => setNewRoomY(parseInt(e.target.value) || 1)}
                  className="w-full bg-[#111319] border border-[#1E293B] text-slate-100 text-xs px-3 py-2 rounded-sm focus:outline-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold font-mono uppercase tracking-wider rounded-sm transition-colors cursor-pointer"
                >
                  XÁC NHẬN TẠO
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddRoomForm(false)}
                  className="px-3 py-2 bg-slate-850 hover:bg-slate-800 border border-[#1E293B] text-slate-300 text-xs rounded-sm cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Visual Map Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {rooms.map((room) => {
            const isActive = room.id === activeRoomId;
            const isSmoke = room.deviceState?.smokeDetected;
            const isDoor = room.deviceState?.doorOpen;
            const loadPower = room.deviceState?.power || 0;
            const temp = room.deviceState?.temperature || 25;
            const hum = room.deviceState?.humidity || 60;
            const deviceCount = room.devices?.length || 0;
            const activeDevicesCount = room.devices?.filter(d => d.status).length || 0;
            const isCBOn = room.deviceState?.cbState !== false;

            let borderClass = 'border-[#1E293B] hover:border-slate-700';
            let bgClass = 'bg-[#0A0B10]';
            if (isActive) {
              borderClass = 'border-cyan-400 ring-2 ring-cyan-400/20';
              bgClass = 'bg-[#11131a]';
            }
            if (isSmoke) {
              borderClass = 'border-red-500 ring-2 ring-red-500/20 animate-pulse';
              bgClass = 'bg-red-950/10';
            }

            return (
              <div
                key={room.id}
                onClick={() => onSelectRoom(room.id)}
                className={`relative rounded-sm p-4 border transition-all cursor-pointer flex flex-col justify-between ${bgClass} ${borderClass} group`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[9px] font-mono font-bold text-slate-500 block uppercase mb-0.5">
                        TỌA ĐỘ: G({room.gridX},{room.gridY})
                      </span>
                      <h4 className="text-xs font-bold text-slate-100 group-hover:text-cyan-400 transition-colors line-clamp-1">
                        {room.name}
                      </h4>
                    </div>
                    
                    {/* Tiny state dot badge representing Smart CB State */}
                    <span className="relative flex h-2.5 w-2.5 mt-1 shrink-0">
                      {isCBOn ? (
                        <>
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" title="CB Tổng: BẬT"></span>
                        </>
                      ) : (
                        <>
                          <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" title="CB Tổng: TẮT"></span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Room status telemetry previews */}
                  <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] font-mono border-t border-[#1E293B]/40 pt-3">
                    <div className="flex items-center gap-1 text-slate-400">
                      <Thermometer className="h-3 w-3 text-red-400 shrink-0" />
                      <span>{temp.toFixed(1)}°C</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-400">
                      <Droplets className="h-3 w-3 text-sky-400 shrink-0" />
                      <span>{hum.toFixed(0)}%</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-400 mt-1">
                      <Zap className="h-3 w-3 text-amber-500 shrink-0" />
                      <span className="font-bold text-amber-400">{loadPower.toFixed(2)} kW</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-400 mt-1">
                      <Layers className="h-3 w-3 text-slate-400" />
                      <span>{activeDevicesCount}/{deviceCount} ON</span>
                    </div>
                  </div>

                  {/* Room-specific Smoke Alert Telemetry Parameter */}
                  <div className={`mt-3 py-1 px-2 rounded-sm flex items-center justify-between text-[9px] font-mono border ${
                    isSmoke 
                      ? 'bg-red-950/40 border-red-500/40 text-red-400 animate-pulse' 
                      : 'bg-[#14161f] border-[#1E293B]/40 text-slate-400'
                  }`}>
                    <span className="flex items-center gap-1 font-bold">
                      <Flame className={`h-3 w-3 ${isSmoke ? 'animate-bounce text-red-500' : 'text-slate-550'}`} />
                      BÁO KHÓI:
                    </span>
                    <span className={`font-extrabold uppercase ${isSmoke ? 'text-red-450' : 'text-slate-500'}`}>
                      {isSmoke ? '⚠️ CÓ KHÓI / CHÁY' : 'AN TOÀN'}
                    </span>
                  </div>

                  {/* Visual Warning Siren if smoke detected */}
                  {isSmoke && (
                    <div className="mt-2 text-center p-1.5 rounded-sm bg-red-900/30 border border-red-500/30 text-[9px] font-bold text-red-400 flex items-center justify-center gap-1 animate-bounce uppercase font-mono">
                      <BellRing className="h-3 w-3 animate-pulse shrink-0" />
                      BÁO ĐỘNG HỎA HOẠN!
                    </div>
                  )}
                </div>

                {/* Bottom line and admin remove button / interactive smoke control */}
                <div className="mt-3.5 border-t border-[#1E293B]/30 pt-2 flex items-center justify-between text-[10px] font-mono gap-1.5">
                  <span className={`font-bold uppercase tracking-wider shrink-0 ${
                    isActive ? 'text-cyan-400' : 'text-slate-500'
                  }`}>
                    {isActive ? '● ĐANG CHỌN' : 'XEM CHI TIẾT'}
                  </span>

                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {canControl && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleSmoke(!isSmoke, room.id);
                        }}
                        className={`px-1.5 py-0.5 rounded border text-[8px] font-extrabold font-mono uppercase tracking-wider transition-all duration-200 cursor-pointer shrink-0 ${
                          isSmoke 
                            ? 'bg-red-600 hover:bg-red-500 text-white border-red-400 animate-pulse' 
                            : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                        title={isSmoke ? "Tắt báo khói của phòng này" : "Giả lập khói cho phòng này"}
                      >
                        {isSmoke ? "DẬP LỬA" : "🔥 THỬ KHÓI"}
                      </button>
                    )}
                    
                    {canControl && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEditRoom(room);
                        }}
                        className="text-slate-500 hover:text-cyan-400 p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Tùy chỉnh Thông tin phòng học & Topic MQTT"
                      >
                        <Settings className="h-3.5 w-3.5" />
                      </button>
                    )}

                    {canControl && rooms.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm({
                            type: 'ROOM',
                            roomId: room.id,
                            message: `Bạn thật sự muốn xóa phòng học "${room.name}" và toàn bộ thiết bị bên trong không?`
                          });
                        }}
                        className="text-slate-600 hover:text-red-400 p-1 rounded hover:bg-slate-800 transition-colors"
                        title="Xóa phòng học"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Cấu hình Room & MQTT Topics */}
      {editingRoomId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-[#0D0F14] border border-cyan-500/30 rounded-sm w-full max-w-lg p-6 shadow-[0_0_25px_rgba(6,182,212,0.15)] relative">
            <button
              onClick={() => setEditingRoomId(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="flex items-center gap-2 border-b border-[#1E293B] pb-3 mb-4">
              <Settings className="h-5 w-5 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
              <div>
                <h3 className="text-sm font-bold text-slate-200 uppercase font-mono">TÙY CHỈNH THÔNG TIN & TOPIC PHÒNG HỌC</h3>
                <p className="text-[10px] text-slate-500 font-mono">CẬP NHẬT CHI TIẾT SƠ ĐỒ VÀ CHỦ ĐỀ SÓNG MQTT</p>
              </div>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              {/* Row 1: Name */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">Tên phòng học</label>
                <input
                  type="text"
                  required
                  value={editRoomName}
                  onChange={(e) => setEditRoomName(e.target.value)}
                  className="w-full bg-[#111319] border border-[#1E293B] text-slate-100 text-xs px-3 py-2 rounded-sm focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Row 2: Coordinates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">Tọa độ X (Hàng dọc)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={editRoomX}
                    onChange={(e) => setEditRoomX(parseInt(e.target.value) || 1)}
                    className="w-full bg-[#111319] border border-[#1E293B] text-slate-100 text-xs px-3 py-2 rounded-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">Tọa độ Y (Hàng ngang)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={editRoomY}
                    onChange={(e) => setEditRoomY(parseInt(e.target.value) || 1)}
                    className="w-full bg-[#111319] border border-[#1E293B] text-slate-100 text-xs px-3 py-2 rounded-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Row 3: MQTT Telemetry & Control Topics */}
              <div className="space-y-3 bg-[#07080c] p-3 rounded border border-[#1E293B]/40">
                <span className="text-[9px] font-bold text-cyan-400 uppercase font-mono block">QUẢN LÝ CHỦ ĐỀ SÓNG TRUYỀN (MQTT CHUYÊN BIỆT)</span>
                
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">Topic nhận dữ liệu giám sát (Telemetry Subscription)</label>
                  <input
                    type="text"
                    required
                    value={editSubTopic}
                    onChange={(e) => setEditSubTopic(e.target.value)}
                    className="w-full bg-[#111319] border border-[#1E293B] text-slate-100 text-xs px-3 py-1.5 rounded-sm focus:outline-none focus:border-cyan-500 font-mono"
                  />
                  <span className="text-[9px] text-slate-500 mt-0.5 block font-mono">Cú pháp chuẩn: ecosmart/{"{room_id}"}/telemetry</span>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">Topic gửi lệnh điều khiển (Control Publishing)</label>
                  <input
                    type="text"
                    required
                    value={editPubTopic}
                    onChange={(e) => setEditPubTopic(e.target.value)}
                    className="w-full bg-[#111319] border border-[#1E293B] text-slate-100 text-xs px-3 py-1.5 rounded-sm focus:outline-none focus:border-cyan-500 font-mono"
                  />
                  <span className="text-[9px] text-slate-500 mt-0.5 block font-mono">Cú pháp chuẩn: ecosmart/{"{room_id}"}/control</span>
                </div>
              </div>

              {/* Row 4: MQTT Broker Settings */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">Broker Address</label>
                  <input
                    type="text"
                    required
                    value={editBroker}
                    onChange={(e) => setEditBroker(e.target.value)}
                    className="w-full bg-[#111319] border border-[#1E293B] text-slate-100 text-xs px-3 py-1.5 rounded-sm focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">Broker Port</label>
                  <input
                    type="number"
                    required
                    value={editPort}
                    onChange={(e) => setEditPort(parseInt(e.target.value) || 1883)}
                    className="w-full bg-[#111319] border border-[#1E293B] text-slate-100 text-xs px-3 py-1.5 rounded-sm focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">Client ID</label>
                <input
                  type="text"
                  required
                  value={editClientId}
                  onChange={(e) => setEditClientId(e.target.value)}
                  className="w-full bg-[#111319] border border-[#1E293B] text-slate-100 text-xs px-3 py-1.5 rounded-sm focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRoomId(null)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold font-mono uppercase tracking-wider rounded-sm border border-[#1E293B] transition-colors cursor-pointer text-center"
                >
                  HỦY BỎ
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold font-mono uppercase tracking-wider rounded-sm transition-colors cursor-pointer text-center"
                >
                  LƯU CẤU HÌNH
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal for Deletion instead of native confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-[#0D0F14] border border-red-500/30 rounded-sm w-full max-w-md p-6 shadow-[0_0_25px_rgba(239,68,68,0.15)] relative">
            <button 
              onClick={() => setDeleteConfirm(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 border-b border-[#1E293B] pb-3 mb-4">
              <AlertTriangle className="h-5 w-5 text-red-500 animate-pulse" />
              <div>
                <h3 className="text-sm font-bold text-slate-200 uppercase font-mono">Xác nhận yêu cầu xóa</h3>
                <p className="text-[10px] text-slate-500 font-mono">HÀNH ĐỘNG NÀY KHÔNG THỂ HOÀN TÁC</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 font-sans mb-5 leading-relaxed">
              {deleteConfirm.message}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 bg-[#1E293B] hover:bg-slate-800 text-slate-300 text-xs font-bold font-mono uppercase tracking-wider rounded-sm border border-slate-700/50 transition-colors cursor-pointer text-center"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteConfirm.type === 'ROOM') {
                    onDeleteRoom(deleteConfirm.roomId);
                  } else if (deleteConfirm.type === 'DEVICE' && deleteConfirm.deviceId) {
                    onDeleteDevice(deleteConfirm.roomId, deleteConfirm.deviceId);
                  }
                  setDeleteConfirm(null);
                }}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold font-mono uppercase tracking-wider rounded-sm transition-colors cursor-pointer text-center"
              >
                Đồng ý xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: Trọng tâm giám sát của Phòng đang hoạt động (Active Room Header Display) */}
      <div className="bg-[#111319] border border-[#1E293B] rounded-sm p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-950/20 text-cyan-400 border border-cyan-900/40 rounded-sm">
            <Layout className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono text-cyan-400 font-bold block">ĐANG GIÁM SÁT THỜI GIAN THỰC</span>
            <h2 className="text-lg font-extrabold text-slate-100 tracking-tight mt-0.5">
              {activeRoom?.name || 'Vui lòng chọn phòng học'}
            </h2>
          </div>
        </div>
        <div className="bg-[#0A0B10] border border-[#1E293B] rounded-sm px-4 py-2 font-mono text-xs flex items-center gap-2">
          <span className="text-slate-500">Mã thiết bị CB:</span>
          <span className="text-slate-300 font-bold">gateway_{activeRoom?.id}</span>
        </div>
      </div>

      {/* SECTION 3: Overview Controls and CB Toggle */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CB Controller Card */}
        <div className="bg-[#111319] border border-[#1E293B] rounded-sm p-5 flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider font-mono">APTOMAT CÔNG NGHIỆP</span>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-1.5 mt-0.5">
                CB Tổng Thông Minh
              </h3>
            </div>
            <span className={`px-2 py-0.5 text-[10px] font-mono rounded border ${
              deviceState.cbState
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}>
              STT: {deviceState.cbState ? 'CLOSED' : 'OPENED'}
            </span>
          </div>

          <div className="my-6 flex items-center gap-4">
            {/* The Switch UI */}
            <div 
              onClick={handleCBClick}
              className={`w-32 h-16 rounded-sm relative border p-1 cursor-pointer transition-all duration-300 flex items-center ${
                deviceState.cbState
                  ? 'bg-emerald-950/20 border-emerald-500/50'
                  : 'bg-[#0A0B10] border-[#1E293B]'
              }`}
            >
              <div className={`w-14 h-14 rounded-sm font-bold font-mono text-xs uppercase flex items-center justify-center transition-all duration-300 ${
                deviceState.cbState
                  ? 'translate-x-[60px] bg-emerald-500 text-[#0A0B10]'
                  : 'translate-x-0 bg-slate-800 text-slate-400'
              }`}>
                {deviceState.cbState ? 'ON' : 'OFF'}
              </div>
            </div>

            <div className="flex-1">
              <span className="text-[10px] text-slate-500 block font-mono font-bold uppercase">Điều khiển tải:</span>
              <span className={`text-sm font-bold block ${deviceState.cbState ? 'text-emerald-400' : 'text-slate-500'}`}>
                {deviceState.cbState ? 'CẤP ĐIỆN PHÒNG' : 'ĐÃ CẮT NGUỒN'}
              </span>
              <span className="text-[11px] text-slate-500 font-mono block mt-0.5">ID: gateway_cb_{activeRoomId}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-[#1E293B] flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1">
              {!canControl ? (
                <>
                  <Lock className="h-3 w-3 text-rose-400 shrink-0" />
                  <span className="text-rose-400 font-mono text-[11px]">Đã khóa (Viewer)</span>
                </>
              ) : (
                <>
                  <Activity className="h-3 w-3 text-emerald-400 shrink-0" />
                  <span className="text-emerald-400 font-mono text-[11px]">Quyền hạn hợp lệ ({currentRole})</span>
                </>
              )}
            </span>
            <button 
              onClick={onRefresh}
              className={`hover:text-cyan-400 transition-colors ${isLoading ? 'animate-spin' : ''}`}
              title="Refresh"
            >
              <RefreshCcw className="h-4 w-4" />
            </button>
          </div>

          {showRoleWarning && (
            <div className="absolute inset-0 bg-[#0A0B10]/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center z-10 animate-in fade-in duration-150 animate-out duration-150">
              <Lock className="h-8 w-8 text-rose-500 mb-2 animate-bounce" />
              <h4 className="text-sm font-bold text-slate-100">Hành động bị Từ chối!</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
                Vai trò <strong>{currentRole}</strong> không có quyền can thiệp bật/tắt thiết bị điện. Hãy đổi phân quyền lên Operator hoặc Admin.
              </p>
            </div>
          )}
        </div>

        {/* Primary Electrical Widget: Power Indicator */}
        <div className="bg-[#111319] border border-[#1E293B] rounded-sm p-5 shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between pb-2 border-b border-[#1E293B]">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider font-mono">CÔNG SUẤT TIÊU THỤ PHÒNG</span>
              <h4 className="text-sm font-bold text-slate-200 mt-0.5">Active Power (P)</h4>
            </div>
            <span className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-mono font-medium ${
              deviceState.power > 3.0 
                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold animate-pulse' 
                : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
            }`}>
              <Activity className="h-3 w-3 animate-pulse" />
              {deviceState.power > 3.0 ? 'TẢI CAO' : 'NORMAL'}
            </span>
          </div>

          <div className="py-4 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold font-mono text-amber-500 tracking-tight glow-amber">
              {deviceState.power?.toFixed(3) || '0.000'}
            </span>
            <span className="text-slate-400 font-mono text-lg">kW</span>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 border-t border-[#1E293B]/60 pt-2.5 font-mono">
            <span>Tổng điện năng tích lũy (E):</span>
            <span className="text-slate-200 font-bold">{(deviceState.totalEnergy || 0).toFixed(2)} kWh</span>
          </div>
        </div>

        {/* Environmental Ambient Sensors Box */}
        <div className="bg-[#111319] border border-[#1E293B] rounded-sm p-5 flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between pb-2 border-b border-[#1E293B]">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider font-mono">CẢM BIẾN MÔI TRƯỜNG PHÒNG</span>
              <h4 className="text-sm font-bold text-slate-200 mt-0.5">Ambient Sensors</h4>
            </div>
            
            {deviceState.temperature > 28 ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-sm animate-pulse">
                <AlertTriangle className="h-3 w-3" />
                  WARM
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-sm">
                STABLE
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 py-3">
            {/* Temp Sensor */}
            <div className="bg-[#0A0B10]/80 p-3 rounded-sm border border-[#1E293B]/60 flex items-center gap-3">
              <div className={`p-2 rounded-sm ${deviceState.temperature > 28 ? 'bg-orange-500/10 text-orange-400' : 'bg-cyan-500/10 text-cyan-400'}`}>
                <Thermometer className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block font-mono font-bold uppercase">Nhiệt độ</span>
                <span className={`text-lg font-bold font-mono block ${deviceState.temperature > 28 ? 'text-orange-400' : 'text-slate-100'}`}>
                  {deviceState.temperature?.toFixed(1) || '25.0'}°C
                </span>
              </div>
            </div>

            {/* Humidity Sensor */}
            <div className="bg-[#0A0B10]/80 p-3 rounded-sm border border-[#1E293B]/60 flex items-center gap-3">
              <div className="p-2 rounded-sm bg-emerald-500/10 text-emerald-400">
                <Droplets className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block font-mono font-bold uppercase">Độ ẩm</span>
                <span className="text-lg font-bold font-mono text-slate-100 block">
                  {deviceState.humidity?.toFixed(1) || '60.0'}%
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 border-t border-[#1E293B]/60 pt-2.5">
            <span className="flex items-center gap-1 font-mono">
              <DoorOpen className={`h-4 w-4 ${deviceState.doorOpen ? 'text-rose-400 animate-bounce' : 'text-emerald-400'}`} />
              Cửa ra vào:
            </span>
            <span className={`font-bold uppercase font-mono ${deviceState.doorOpen ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}`}>
              {deviceState.doorOpen ? 'MỞ (OPEN)' : 'ĐÓNG (CLOSED)'}
            </span>
          </div>
        </div>

      </div>

      {/* SECTION 4: Quản lý Vào Ra & Cảnh báo an ninh */}
      <div className="bg-[#111319] border border-[#1E293B] rounded-sm p-6 shadow-lg">
        <div className="border-b border-[#1E293B] pb-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            <h3 className="text-xs font-bold text-slate-100 tracking-tight uppercase font-mono">
              Quản lý Vào Ra & An toàn Lớp học
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">
            TRẠNG THÁI: {deviceState.smokeDetected ? '🚨 EMERGENCY_ALARM' : 'MONITORING_ACTIVE'}
          </span>
        </div>

        {/* Access Control & Sensor Panels Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* 1. Door Sensor Card */}
          <div className="bg-[#0A0B10] border border-[#1E293B] rounded-sm p-5 flex flex-col justify-between hover:border-cyan-500/30 transition-all">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-wider text-slate-500 font-mono uppercase">Cảm Biến Cửa</span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm text-[9px] font-bold font-mono tracking-wider ${
                  deviceState.doorOpen 
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold' 
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${deviceState.doorOpen ? 'bg-amber-400 animate-pulse' : 'bg-emerald-450'}`} />
                  {deviceState.doorOpen ? 'DOOR OPEN' : 'DOOR CLOSED'}
                </span>
              </div>

              <div className="flex flex-col items-center justify-center py-6 bg-[#111319]/40 border border-[#1E293B]/60 rounded-sm">
                <DoorOpen className={`h-12 w-12 transition-transform duration-300 ${
                  deviceState.doorOpen ? 'text-amber-400 scale-110 rotate-12' : 'text-slate-500'
                }`} />
                <span className="text-xs font-mono font-bold mt-3 text-slate-300">
                  {deviceState.doorOpen ? 'Cửa lớp đang MỞ' : 'Cửa lớp đã ĐÓNG'}
                </span>
                <span className="text-[10px] text-slate-500 font-mono mt-0.5 uppercase">Magnetic sensor: MC-38</span>
              </div>
            </div>

            <div className="mt-5 border-t border-[#1E293B]/60 pt-4">
              <button
                onClick={handleDoorClick}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-[#111319] hover:bg-[#151821] border border-[#1E293B] text-slate-300 hover:text-slate-100 text-xs font-bold font-mono uppercase tracking-wider rounded-sm transition-colors cursor-pointer"
              >
                Mô phỏng Đóng/Mở cửa
              </button>
            </div>
          </div>

          {/* 2. Smoke Sensor Card with flashing alarm */}
          <div className={`border rounded-sm p-5 flex flex-col justify-between transition-all ${
            deviceState.smokeDetected 
              ? 'bg-red-950/20 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.30)]' 
              : 'bg-[#0A0B10] border-[#1E293B]'
          }`}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-wider text-slate-500 font-mono uppercase">Cảm Biến Khói</span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm text-[9px] font-bold font-mono tracking-wider ${
                  deviceState.smokeDetected 
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-bounce font-bold' 
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${deviceState.smokeDetected ? 'bg-red-400 animate-ping' : 'bg-emerald-450'}`} />
                  {deviceState.smokeDetected ? '🚨 CO/SMOKE WARNING' : 'SYSTEM NORMAL'}
                </span>
              </div>

              <div className={`flex flex-col items-center justify-center py-6 border rounded-sm transition-all ${
                deviceState.smokeDetected 
                  ? 'bg-red-950/40 border-red-500/40 text-red-400 animate-pulse' 
                  : 'bg-[#111319]/40 border-[#1E293B]/60 text-slate-500'
              }`}>
                {deviceState.smokeDetected ? (
                  <div className="relative">
                    <Flame className="h-12 w-12 text-red-500 animate-bounce" />
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                  </div>
                ) : (
                  <Flame className="h-12 w-12 text-slate-700" />
                )}
                <span className={`text-xs font-mono font-bold mt-3 ${deviceState.smokeDetected ? 'text-red-400' : 'text-slate-300'}`}>
                  {deviceState.smokeDetected ? '🚨 PHÁT HIỆN SỰ CỐ KHÓI / CHÁY!' : 'Không phát hiện khói'}
                </span>
                <span className="text-[10px] text-slate-500 font-mono mt-0.5 uppercase">MQ-2 Photoelectric</span>
              </div>
            </div>

            <div className="mt-5 border-t border-[#1E293B]/60 pt-4">
              <button
                onClick={handleSmokeClick}
                className={`w-full flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold font-mono uppercase tracking-wider rounded-sm transition-all cursor-pointer ${
                  deviceState.smokeDetected 
                    ? 'bg-red-600 hover:bg-red-500 text-white border border-red-400' 
                    : 'bg-[#111319] hover:bg-[#151821] border border-[#1E293B] text-slate-300 hover:text-slate-100'
                }`}
              >
                {deviceState.smokeDetected ? 'Khôi phục Cảm biến Khói' : 'Mô Phỏng Phát Hiện Khói'}
              </button>
            </div>
          </div>

          {/* 3. Electromagnetic Lock Control (Tắt chủ động khóa từ để mở cửa) */}
          <div className="bg-[#0A0B10] border border-[#1E293B] rounded-sm p-5 flex flex-col justify-between hover:border-cyan-500/30 transition-all">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-wider text-slate-500 font-mono uppercase">Khóa Từ Cửa (Vào Ra)</span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm text-[9px] font-bold font-mono tracking-wider ${
                  deviceState.lockActive 
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' 
                    : 'bg-rose-500/10 text-rose-450 border border-rose-500/30 font-bold'
                }`}>
                  {deviceState.lockActive ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3 text-rose-450" />}
                  {deviceState.lockActive ? 'LOCK ENGAGED' : 'LOCK RELEASED (OPEN)'}
                </span>
              </div>

              <div className="flex flex-col items-center justify-center py-6 bg-[#111319]/40 border border-[#1E293B]/60 rounded-sm">
                {deviceState.lockActive ? (
                  <Lock className="h-12 w-12 text-cyan-400" />
                ) : (
                  <Unlock className="h-12 w-12 text-rose-450 animate-pulse" />
                )}
                <span className="text-xs font-mono font-bold mt-3 text-slate-300">
                  {deviceState.lockActive ? 'Khóa từ đang GIỮ CHẶT (Khóa)' : 'Khóa từ đã MỞ CHỦ ĐỘNG'}
                </span>
                <span className="text-[10px] text-slate-500 font-mono mt-0.5 uppercase">EM-Lock: DC 12V Pulse Control</span>
              </div>
            </div>

            <div className="mt-5 border-t border-[#1E293B]/60 pt-4">
              <button
                onClick={handleLockClick}
                className={`w-full flex items-center justify-center gap-1.5 px-4 py-2 border text-xs font-bold font-mono uppercase tracking-wider rounded-sm transition-all cursor-pointer ${
                  deviceState.lockActive 
                    ? 'bg-rose-950/20 text-rose-400 border-rose-900/50 hover:bg-rose-900 hover:text-white' 
                    : 'bg-emerald-950/20 text-emerald-400 border-emerald-950 hover:bg-emerald-900 hover:text-white'
                }`}
              >
                {deviceState.lockActive ? 'Tắt khóa từ (Dừng cấp điện/Mở cửa)' : 'Bật khóa từ (Khóa cửa lại)'}
              </button>
            </div>
          </div>

        </div>

        {/* Security Info Footer */}
        <div className="mt-6 p-4 bg-[#0A0B10] border border-[#1E293B]/60 rounded-sm grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
          <div className="flex items-center gap-3">
            <div className="h-4 w-6 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center text-[9px] font-bold">
              MAG
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] font-bold">NAM CHÂM ĐIỆN:</span>
              <span className={`font-semibold ${deviceState.lockActive ? 'text-cyan-400' : 'text-rose-450'}`}>
                {deviceState.lockActive ? 'LOCKED_ENGAGED' : 'UNPOWERED_OPENED'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-4 w-6 rounded bg-red-950 text-red-400 border border-red-800 flex items-center justify-center text-[9px] font-bold">
              SMK
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] font-bold">KIỂM SOÁT BÁO CHÁY:</span>
              <span className={`font-semibold ${deviceState.smokeDetected ? 'text-red-400 animate-pulse' : 'text-slate-350'}`}>
                {deviceState.smokeDetected ? 'EMERGENCY_ALARM' : 'MONITOR_SAFE'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-4 w-6 rounded bg-amber-950 text-amber-400 border border-amber-800 flex items-center justify-center text-[9px] font-bold">
              DRS
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] font-bold">CẢM BIẾN TÌNH TRẠNG CỬA:</span>
              <span className={`font-semibold ${deviceState.doorOpen ? 'text-amber-450' : 'text-slate-350'}`}>
                {deviceState.doorOpen ? 'DOOR_OPENED_WARNING' : 'DOOR_CLOSED_SECURE'}
              </span>
            </div>
          </div>
          <div className="flex items-center bg-[#111319] border border-[#1E293B] rounded-sm px-3 py-1 text-[10px] justify-between self-center">
            <span className="text-slate-400 uppercase font-bold text-[9px] font-mono font-medium">GIAO THỨC VÀO RA:</span>
            <span className={`font-bold ${deviceState.smokeDetected ? 'text-rose-400' : 'text-emerald-450'}`}>
              {deviceState.smokeDetected ? 'FIRE_EVACUATE!' : 'MUTUAL_SECURE'}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 5: Quản lý chi tiết thiết bị phụ tải từng phòng (Custom Room Devices) */}
      <div className="bg-[#111319] border border-[#1E293B] rounded-sm p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#1E293B]/60 pb-4 mb-4 gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider font-mono">DANH SÁCH THIẾT BỊ PHỤ TẢI TRONG PHÒNG</span>
            <h3 className="text-base font-bold text-slate-200 flex items-center gap-2 mt-0.5 animate-pulse">
              <Cpu className="h-4.5 w-4.5 text-cyan-400" />
              Thiết bị Phân bổ của {activeRoom?.name || 'Phòng học'}
            </h3>
          </div>
          {canControl && (
            <button
              onClick={() => setShowAddDeviceForm(!showAddDeviceForm)}
              className="px-3.5 py-1.5 bg-cyan-950/40 border border-cyan-500/40 hover:bg-cyan-900/30 text-cyan-300 text-xs font-bold font-mono uppercase tracking-wider rounded-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="h-4 w-4" />
              Thêm thiết bị mới
            </button>
          )}
        </div>

        {/* Add Device Inline Form */}
        {showAddDeviceForm && (
          <form onSubmit={handleAddDeviceSubmit} className="bg-[#0A0B10] border border-cyan-900/40 rounded-sm p-4 mb-4 animate-in fade-in duration-200">
            <h4 className="text-xs font-bold uppercase text-cyan-400 font-mono mb-3 flex items-center gap-1.5">
              <Plus className="h-4 w-4" /> KHAI BÁO THIẾT BỊ HOẠT ĐỘNG
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">Tên thiết bị</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Máy điều hòa Daikin 15HP"
                  value={newDevName}
                  onChange={(e) => setNewDevName(e.target.value)}
                  className="w-full bg-[#111319] border border-[#1E293B] text-slate-100 text-xs px-3 py-2 rounded-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">Loại thiết bị</label>
                <select
                  value={newDevType}
                  onChange={(e) => setNewDevType(e.target.value as any)}
                  className="w-full bg-[#111319] border border-[#1E293B] text-slate-100 text-xs px-3 py-2 rounded-sm focus:outline-none"
                >
                  <option value="LIGHT">LIGHT (Hệ thống Đèn)</option>
                  <option value="AC">AC (Máy điều hòa)</option>
                  <option value="FAN">FAN (Quạt thông gió)</option>
                  <option value="PROJECTOR">PROJECTOR (Máy chiếu)</option>
                  <option value="TV">TV (Tivi/Màn hình)</option>
                  <option value="COMPUTER">COMPUTER (Máy tính)</option>
                  <option value="CUSTOM">CUSTOM (Thiết bị khác)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">Công suất tải định mức (Watts)</label>
                <input
                  type="number"
                  min="0"
                  max="10000"
                  value={newDevPower}
                  onChange={(e) => setNewDevPower(parseInt(e.target.value) || 0)}
                  className="w-full bg-[#111319] border border-[#1E293B] text-slate-100 text-xs px-3 py-2 rounded-sm focus:outline-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold font-mono uppercase tracking-wider rounded-sm transition-colors cursor-pointer"
                >
                  BẦU CHỌN & THÊM
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddDeviceForm(false)}
                  className="px-3 py-2 bg-slate-850 hover:bg-slate-800 border border-[#1E293B] text-slate-300 text-xs rounded-sm cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Devices List Table */}
        {!activeRoom?.devices || activeRoom.devices.length === 0 ? (
          <div className="bg-[#0A0B10] border border-dashed border-[#1E293B] rounded p-6 text-center text-xs text-slate-500 font-mono">
            Chưa có thiết bị nào được phân bổ trong phòng học này. Hãy nhấn nút thêm thiết bị mới phía trên.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-slate-300 text-xs font-mono text-left">
              <thead>
                <tr className="border-b border-[#1E293B] text-slate-500 text-[10px] font-bold uppercase tracking-wider bg-[#0A0B10]">
                  <th className="py-3 px-4">Thiết bị</th>
                  <th className="py-3 px-4">Phân Loại</th>
                  <th className="py-3 px-4 text-right">Định mức Công suất</th>
                  <th className="py-3 px-4 text-center">Trạng thái Hoạt động</th>
                  <th className="py-3 px-4 text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]/40">
                {activeRoom.devices.map((dev) => (
                  <tr key={dev.id} className="hover:bg-[#0E1015]/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-100 flex items-center gap-2">
                      <div className="p-1.5 rounded-sm bg-[#0A0B10] border border-[#1E293B]">
                        {getDeviceIcon(dev.type)}
                      </div>
                      <span>{dev.name}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {getDeviceLabel(dev.type)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="font-bold text-amber-500">{dev.powerConsumption} W</span>
                      <span className="text-[10px] text-slate-500 block">{(dev.powerConsumption / 1000).toFixed(2)} kW</span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => {
                          if (!canControl) {
                            triggerRoleWarning();
                            return;
                          }
                          onToggleDevice(activeRoomId, dev.id);
                        }}
                        className={`mx-auto px-2.5 py-1 text-[10px] font-mono rounded font-bold uppercase border cursor-pointer transition-all ${
                          dev.status 
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.15)]' 
                            : 'bg-slate-850 border-slate-700 text-slate-550'
                        }`}
                      >
                        {dev.status ? 'ĐANG BẬT' : 'ĐANG TẮT'}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {canControl ? (
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteConfirm({
                              type: 'DEVICE',
                              roomId: activeRoomId,
                              deviceId: dev.id,
                              message: `Bạn thật sự chắc chắn muốn gỡ thiết bị "${dev.name}" khỏi phòng học này không?`
                            });
                          }}
                          className="text-slate-550 hover:text-red-400 p-1 rounded-sm hover:bg-red-500/10 transition-colors cursor-pointer"
                          title="Gỡ bỏ thiết bị"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-600 uppercase">VIEWER ONLY</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
