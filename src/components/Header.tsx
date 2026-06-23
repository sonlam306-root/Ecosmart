import React, { useState } from 'react';
import { UserRole, SystemConfig } from '../types';
import { Cpu, Zap, Activity, Shield, Users, RefreshCw, Layers, Sliders, LogOut } from 'lucide-react';

interface HeaderProps {
  currentRole: UserRole;
  onChangeRole: (role: UserRole) => void;
  systemConfig: SystemConfig;
  mqttStatus: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING';
  cbState: boolean;
  onUpdateConfig: (config: Partial<SystemConfig>) => void;
}

export const PREDEFINED_LOGOS = [
  { icon: Cpu, name: 'Core IoT Chip', color: 'text-cyan-400' },
  { icon: Zap, name: 'Sấm sét Ecosmart', color: 'text-amber-400' },
  { icon: Activity, name: 'IOC Pulse Monitor', color: 'text-emerald-400' },
  { icon: Layers, name: 'Integrated Class Systems', color: 'text-purple-400' },
];

export default function Header({
  currentRole,
  onChangeRole,
  systemConfig,
  mqttStatus,
  cbState,
  onUpdateConfig,
}: HeaderProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [customName, setCustomName] = useState(systemConfig.classroomName);
  const [logoIndex, setLogoIndex] = useState(systemConfig.customLogoIndex);
  const [isSim, setIsSim] = useState(systemConfig.isSimulationActive);

  const handleSaveConfig = () => {
    onUpdateConfig({
      classroomName: customName,
      customLogoIndex: logoIndex,
      isSimulationActive: isSim,
    });
    setShowSettings(false);
  };

  const LogoIcon = PREDEFINED_LOGOS[systemConfig.customLogoIndex]?.icon || Zap;
  const LogoColor = PREDEFINED_LOGOS[systemConfig.customLogoIndex]?.color || 'text-cyan-400';

  return (
    <header className="border-b border-[#1E293B] bg-[#0F1116] px-6 py-4 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        
        {/* Left Side: Brand Name & Logo */}
        <div className="flex items-center gap-3">
          <div className="p-2 w-10 h-10 bg-[#111319] border border-[#1E293B] rounded flex items-center justify-center relative overflow-hidden group">
            <span className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 to-transparent"></span>
            <LogoIcon className={`h-5 w-5 ${LogoColor} animate-pulse`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase bg-[#111319] border border-[#1E293B] px-2 py-0.5 rounded">
                SYSTEM IOC v2.4
              </span>
              <span className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[10px] font-medium font-mono ${
                mqttStatus === 'CONNECTED' 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                  : mqttStatus === 'CONNECTING'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${mqttStatus === 'CONNECTED' ? 'bg-emerald-400 animate-ping' : mqttStatus === 'CONNECTING' ? 'bg-amber-400' : 'bg-rose-400'}`} />
                MQTT: {mqttStatus === 'CONNECTED' ? 'CONNECTED' : mqttStatus === 'CONNECTING' ? 'CONNECTING...' : 'DISCONNECTED'}
              </span>
            </div>
            <h1 className="text-base font-bold text-slate-100 tracking-tight flex items-center gap-3 mt-0.5">
              ECOSMART <span className="text-cyan-400 uppercase">CLASSROOM</span>
              <span className="text-xs font-medium text-slate-400 border-l border-[#1E293B] pl-3">
                {systemConfig.classroomName}
              </span>
            </h1>
          </div>
        </div>

        {/* Right Side: Quick controls & Authentication selectors */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* CB state summary badge */}
          <div className="hidden lg:flex items-center gap-2 bg-[#111319] border border-[#1E293B] px-3 py-1.5 rounded-sm">
            <div className={`h-2.5 w-2.5 rounded-full ${cbState ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-red-500'}`} />
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">CB TỔNG:</span>
            <span className={`text-[10px] font-mono font-bold ${cbState ? 'text-emerald-400' : 'text-rose-400'}`}>
              {cbState ? 'CONNECTED_ACTIVE' : 'DISCONNECTED'}
            </span>
          </div>

          {/* Settings Button */}
          <button 
            id="btn_app_settings"
            onClick={() => {
              setCustomName(systemConfig.classroomName);
              setLogoIndex(systemConfig.customLogoIndex);
              setIsSim(systemConfig.isSimulationActive);
              setShowSettings(!showSettings);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300 bg-[#111319] border border-[#1E293B] rounded-sm hover:border-cyan-500/50 hover:text-cyan-400 transition-all cursor-pointer"
          >
            <Sliders className="h-3.5 w-3.5 text-cyan-400" />
            <span>Cài đặt hệ thống</span>
          </button>

          {/* Role Switching Dropdown */}
          <div className="relative flex items-center gap-2 bg-[#111319] border border-[#1E293B] rounded-sm p-1">
            <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-slate-400 pl-1 font-mono">
              <Shield className="h-3.5 w-3.5 text-emerald-400" />
              <span className="hidden sm:inline">ROLE:</span>
            </div>
            <select
              id="select_user_role"
              value={currentRole}
              onChange={(e) => onChangeRole(e.target.value as UserRole)}
              className="bg-[#0A0B10] border-0 text-xs font-semibold text-slate-200 focus:ring-1 focus:ring-cyan-500 rounded-sm p-1 cursor-pointer outline-none font-mono"
            >
              <option value="ADMIN">ADMIN (Lv.3)</option>
              <option value="OPERATOR">OPERATOR (Lv.2)</option>
              <option value="VIEWER">VIEWER (Lv.1)</option>
            </select>
          </div>

        </div>
      </div>
      {/* Settings Modal (Overlay popover) */}
      {showSettings && (
        <div className="fixed inset-0 bg-[#0A0B10]/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111319] border border-[#1E293B] rounded-sm p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 pb-3 border-b border-[#1E293B]">
              <Sliders className="h-4 w-4 text-cyan-400" />
              <h2 className="text-base font-bold text-slate-100 uppercase tracking-tight">Cấu hình hệ thống Ecosmart</h2>
            </div>

            <div className="space-y-4 py-4">
              {/* Classroom Name Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Tên phòng học / Khu vực
                </label>
                <input
                  id="input_classroom_name"
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Ví dụ: Phòng CLC B105"
                  className="w-full bg-[#0A0B10] border border-[#1E293B] hover:border-slate-700 focus:border-cyan-500 rounded-sm px-3.5 py-2 text-sm text-slate-200 outline-none transition-all font-mono"
                />
              </div>

              {/* Predefined Logo Customizer */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Chọn Logo Đại diện
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PREDEFINED_LOGOS.map((logo, index) => {
                    const Ic = logo.icon;
                    return (
                      <button
                        key={index}
                        onClick={() => setLogoIndex(index)}
                        className={`flex items-center gap-2 p-2.5 rounded-sm border text-left transition-all ${
                          logoIndex === index
                            ? 'bg-cyan-500/10 border-cyan-400 text-cyan-300'
                            : 'bg-[#0A0B10] border-[#1E293B] text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <Ic className="h-4 w-4 shrink-0" />
                        <span className="text-xs truncate">{logo.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Simulation On/Off */}
              <div className="p-3 bg-[#0A0B10] rounded-sm border border-[#1E293B] flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wide">Giả lập IoT Gateway</h4>
                  <p className="text-[10px] text-slate-500">Tự động mô phỏng thay đổi chỉ số</p>
                </div>
                <button
                  id="btn_toggle_sim"
                  onClick={() => setIsSim(!isSim)}
                  className={`w-12 h-6 rounded-full p-1 transition-all duration-200 ${
                    isSim ? 'bg-emerald-500 justify-end' : 'bg-slate-705 bg-slate-800 justify-start'
                  } flex items-center`}
                >
                  <span className="w-4 h-4 bg-[#111319] rounded-full shadow" />
                </button>
              </div>

              {/* Warning on access control based on active level (Viewer cannot modify config) */}
              {currentRole === 'VIEWER' && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 rounded-sm">
                  Lưu ý: Vai trò <strong>VIEWER (Cấp 1)</strong> chỉ được xem, thay đổi cấu hình này sẽ không được cập nhật trên cơ sở dữ liệu backend.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E293B]">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors uppercase tracking-wider font-mono"
              >
                Hủy bỏ
              </button>
              <button
                id="btn_save_config"
                onClick={handleSaveConfig}
                disabled={currentRole === 'VIEWER'}
                className="px-4 py-2 text-xs font-bold bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:hover:bg-cyan-600 text-[#0A0B10] bg-gradient-to-r from-cyan-400 to-teal-400 rounded-sm hover:shadow-[0_0_12px_rgba(34,211,238,0.3)] transition-all uppercase tracking-wider"
              >
                Lưu cấu hình
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
