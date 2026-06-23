import React, { useState } from 'react';
import { Scenario, UserRole } from '../types';
import { Leaf, BookOpen, Coffee, MoonStar, ShieldAlert, Flame, Wrench, PlayCircle, Settings, Check, Lock, Save, AlertOctagon } from 'lucide-react';

interface ScenariosProps {
  scenarios: Scenario[];
  currentRole: UserRole;
  onRunScenario: (id: number) => void;
  onUpdateScenario: (id: number, updated: Scenario) => void;
  isLoading: boolean;
}

// Icon mapping based on scenario name/icon properties
const getScenarioIcon = (iconName: string) => {
  switch (iconName) {
    case 'Leaf': return Leaf;
    case 'BookOpen': return BookOpen;
    case 'Coffee': return Coffee;
    case 'MoonStar': return MoonStar;
    case 'ShieldAlert': return ShieldAlert;
    case 'Flame': return Flame;
    case 'Wrench': return Wrench;
    default: return Settings;
  }
};

export default function Scenarios({
  scenarios,
  currentRole,
  onRunScenario,
  onUpdateScenario,
  isLoading,
}: ScenariosProps) {
  const [selectedScenarioId, setSelectedScenarioId] = useState<number>(2); // Default to peak study
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Edit fields
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCb, setEditCb] = useState(true);
  const [editAc, setEditAc] = useState<'ON' | 'OFF' | 'ECO'>('ON');
  const [editLights, setEditLights] = useState<'ON' | 'OFF' | 'DIM'>('ON');
  const [editProj, setEditProj] = useState(true);

  const canControl = currentRole === 'ADMIN' || currentRole === 'OPERATOR';
  const selectedScenario = scenarios.find(s => s.id === selectedScenarioId) || scenarios[0];

  const handleSelectScenario = (id: number) => {
    setSelectedScenarioId(id);
    setIsEditing(false);
  };

  const startEdit = () => {
    if (currentRole === 'VIEWER') return;
    setEditName(selectedScenario.name);
    setEditDesc(selectedScenario.description);
    setEditCb(selectedScenario.cbTargetState);
    setEditAc(selectedScenario.acTargetState);
    setEditLights(selectedScenario.lightsTargetState);
    setEditProj(selectedScenario.projectorTargetState);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (!canControl) return;

    const updated: Scenario = {
      ...selectedScenario,
      name: editName,
      description: editDesc,
      cbTargetState: editCb,
      acTargetState: editAc,
      lightsTargetState: editLights,
      projectorTargetState: editProj,
    };

    onUpdateScenario(selectedScenario.id, updated);
    setIsEditing(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* Col 1: Vertical 7-Levels Scenario Menu (4/12 width) */}
      <div className="lg:col-span-4 bg-[#111319] border border-[#1E293B] rounded-sm p-4 shadow-lg space-y-2">
        <div className="border-b border-[#1E293B] pb-3 mb-4 px-1">
          <h3 className="text-xs font-bold text-slate-100 uppercase font-mono tracking-wider">
            Phân cấp Quản lý Ngữ cảnh (7 Bậc)
          </h3>
          <p className="text-[10px] text-slate-500 uppercase mt-0.5">Lựa chọn mức độ tối ưu điện học</p>
        </div>

        <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
          {scenarios.map((s) => {
            const IconComponent = getScenarioIcon(s.icon);
            const isSelected = s.id === selectedScenarioId;
            const isActive = s.isActive;
            
            return (
              <button
                key={s.id}
                onClick={() => handleSelectScenario(s.id)}
                className={`w-full text-left p-3 rounded-sm border transition-all flex items-center justify-between group cursor-pointer ${
                  isActive
                    ? 'bg-cyan-500/10 border-cyan-500 shadow-[inset_0_1px_8px_rgba(34,211,238,0.1)]'
                    : isSelected
                    ? 'bg-[#0A0B10] border-cyan-500/40 text-slate-200'
                    : 'bg-[#0A0B10] border-[#1E293B] text-slate-400 hover:bg-[#111319]/50 hover:border-[#1E293B]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2 rounded-sm shrink-0 ${
                    isActive 
                      ? 'bg-cyan-500 text-[#0A0B10]'
                      : isSelected
                      ? 'bg-slate-800 text-cyan-400'
                      : 'bg-[#111319] text-slate-500 group-hover:text-slate-300'
                  }`}>
                    <IconComponent className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9px] font-mono font-bold block text-slate-500 uppercase tracking-widest leading-none">
                      BẬC {s.level} / LEVEL {s.level}
                    </span>
                    <span className={`text-xs font-bold block truncate mt-1 ${isSelected || isActive ? 'text-slate-200' : 'text-slate-400'}`}>
                      {s.name.replace(/(\s*\(.*\)\s*)/, '')}
                    </span>
                  </div>
                </div>

                {isActive && (
                  <span className="shrink-0 ml-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold font-mono px-1.5 py-0.5 rounded-sm uppercase tracking-wider animate-pulse">
                    ACTIVE
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="p-3 bg-[#0A0B10] border border-[#1E293B]/60 rounded-sm text-[10px] font-mono text-slate-500">
          * Ngữ cảnh mức điện khẩn cấp <strong>(Level 6)</strong> sẽ chủ động ngắt CB tổng thông minh lập tức bảo vệ lớp học.
        </div>
      </div>

      {/* Col 2: Active Scenario Details & Modification Form (8/12 width) */}
      <div className="lg:col-span-8 bg-[#111319] border border-[#1E293B] rounded-sm p-6 shadow-lg flex flex-col justify-between">
        
        {/* Main interactive panel */}
        <div className="space-y-6">
          
          {/* Headline info */}
          <div className="border-b border-[#1E293B] pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider bg-cyan-950/40 border border-cyan-800/30 px-2 py-0.5 rounded-sm">
                  NGỮ CẢNH BẬC {selectedScenario.level}
                </span>
                {selectedScenario.isActive && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-sm animate-pulse">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                    APPLIED_ACTIVE IP_MQTT
                  </span>
                )}
              </div>

              {isEditing ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-2 text-sm font-mono font-bold bg-[#0A0B10] border border-[#1E293B] rounded-sm px-2.5 py-1 text-slate-200 outline-none focus:border-cyan-500 w-full md:w-[350px]"
                />
              ) : (
                <h2 className="text-base font-bold text-slate-100 mt-2 uppercase tracking-wide">{selectedScenario.name}</h2>
              )}
            </div>

            {/* Quick edit toggles */}
            {!isEditing && (
              <button
                id="btn_scenario_edit"
                onClick={startEdit}
                disabled={currentRole === 'VIEWER'}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300 bg-[#0A0B10] border border-[#1E293B] rounded-sm hover:border-cyan-500 hover:text-cyan-400 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <Settings className="h-3.5 w-3.5 text-cyan-400" />
                <span>Cấu hình luật thiết bị</span>
              </button>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-slate-500 block">
              Mô tả Hành động & Ngữ cảnh vận hành
            </span>
            {isEditing ? (
              <textarea
                rows={3}
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="w-full bg-[#0A0B10] border border-[#1E293B] rounded-sm p-2.5 text-xs text-slate-300 outline-none focus:border-cyan-500 resize-none font-mono"
              />
            ) : (
              <p className="text-xs text-slate-400 leading-relaxed font-mono">{selectedScenario.description}</p>
            )}
          </div>

          {/* Device Target Rules grid (Realistic Industrial settings form or readout) */}
          <div className="space-y-3">
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-slate-500 block">
              Luật Phân bổ Trạng thái Thiết bị đầu cuối
            </span>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              
              {/* CB rule */}
              <div className="bg-[#0A0B10] p-4 rounded-sm border border-[#1E293B] flex flex-col justify-between">
                <span className="text-[10px] font-mono font-bold text-slate-500">CB APTOMAT</span>
                
                {isEditing ? (
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditCb(true)}
                      className={`px-3 py-1 text-xs font-bold rounded-sm ${editCb ? 'bg-emerald-500 text-[#0A0B10]' : 'bg-[#111319] text-slate-400 border border-[#1E293B]'}`}
                    >
                      BẬT
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditCb(false)}
                      className={`px-3 py-1 text-xs font-bold rounded-sm ${!editCb ? 'bg-rose-500 text-slate-100' : 'bg-[#111319] text-slate-400 border border-[#1E293B]'}`}
                    >
                      TẮT
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 flex items-center gap-1.5 font-mono">
                    <div className={`h-2.5 w-2.5 rounded-full ${selectedScenario.cbTargetState ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-rose-500'}`} />
                    <span className="text-xs font-bold text-slate-200">
                      {selectedScenario.cbTargetState ? 'CLOSED' : 'OPENED'}
                    </span>
                  </div>
                )}
              </div>

              {/* Air Conditioner Rule */}
              <div className="bg-[#0A0B10] p-4 rounded-sm border border-[#1E293B] flex flex-col justify-between">
                <span className="text-[10px] font-mono font-bold text-slate-500">ĐIỀU HÒA MÁY LẠNH</span>
                
                {isEditing ? (
                  <select
                    value={editAc}
                    onChange={(e) => setEditAc(e.target.value as 'ON' | 'OFF' | 'ECO')}
                    className="mt-3 bg-[#111319] border border-[#1E293B] text-xs font-bold text-slate-200 outline-none rounded-sm p-1 w-full font-mono font-bold"
                  >
                    <option value="ON">ON (Auto 24°C)</option>
                    <option value="OFF">Cắt nguồn (OFF)</option>
                    <option value="ECO">Tiết kiệm (ECO)</option>
                  </select>
                ) : (
                  <span className={`text-xs font-bold mt-3 block font-mono ${
                    selectedScenario.acTargetState === 'ON' ? 'text-cyan-400' : selectedScenario.acTargetState === 'ECO' ? 'text-amber-400' : 'text-slate-500'
                  }`}>
                    {selectedScenario.acTargetState === 'ON' ? 'ACTIVE' : selectedScenario.acTargetState === 'ECO' ? 'ECO_STANDBY' : 'SHUTDOWN'}
                  </span>
                )}
              </div>

              {/* Lighting rule */}
              <div className="bg-[#0A0B10] p-4 rounded-sm border border-[#1E293B] flex flex-col justify-between">
                <span className="text-[10px] font-mono font-bold text-slate-500">HỆ THỐNG CHIẾU SÁNG</span>
                
                {isEditing ? (
                  <select
                    value={editLights}
                    onChange={(e) => setEditLights(e.target.value as 'ON' | 'OFF' | 'DIM')}
                    className="mt-3 bg-[#111319] border border-[#1E293B] text-xs font-bold text-slate-200 outline-none rounded-sm p-1 w-full font-mono font-bold"
                  >
                    <option value="ON">Sáng tối đa (100%)</option>
                    <option value="OFF">Tối hoàn toàn (OFF)</option>
                    <option value="DIM">Sáng mờ (30%)</option>
                  </select>
                ) : (
                  <span className={`text-xs font-bold mt-3 block font-mono ${
                    selectedScenario.lightsTargetState === 'ON' ? 'text-emerald-400' : selectedScenario.lightsTargetState === 'DIM' ? 'text-yellow-500/80' : 'text-slate-500'
                  }`}>
                    {selectedScenario.lightsTargetState === 'ON' ? 'MAX_LUM_100' : selectedScenario.lightsTargetState === 'DIM' ? 'DIMMED_30' : 'SHUTDOWN'}
                  </span>
                )}
              </div>

              {/* Projector Rule */}
              <div className="bg-[#0A0B10] p-4 rounded-sm border border-[#1E293B] flex flex-col justify-between">
                <span className="text-[10px] font-mono font-bold text-slate-500">MÁY CHIẾU LỚP HỌC</span>
                
                {isEditing ? (
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditProj(true)}
                      className={`px-3 py-1 text-xs font-bold rounded-sm ${editProj ? 'bg-cyan-500 text-[#0A0B10]' : 'bg-[#111319] text-slate-400 border border-[#1E293B]'}`}
                    >
                      BẬT
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditProj(false)}
                      className={`px-3 py-1 text-xs font-bold rounded-sm ${!editProj ? 'bg-rose-500 text-slate-100' : 'bg-[#111319] text-slate-400 border border-[#1E293B]'}`}
                    >
                      TẮT
                    </button>
                  </div>
                ) : (
                  <span className={`text-xs font-bold mt-3 block font-mono ${selectedScenario.projectorTargetState ? 'text-cyan-400' : 'text-slate-500'}`}>
                    {selectedScenario.projectorTargetState ? 'ACTIVE_ON' : 'SHUTDOWN'}
                  </span>
                )}
              </div>

            </div>
          </div>

        </div>

        {/* Action triggers */}
        <div className="mt-8 pt-4 border-t border-[#1E293B] flex items-center justify-between gap-4">
          
          {/* Status Warning */}
          <div className="text-[10px] text-slate-500 font-mono hidden sm:flex items-center gap-1.5 uppercase font-bold">
            {selectedScenario.level === 6 ? (
              <>
                <AlertOctagon className="h-4 w-4 text-rose-500 animate-bounce" />
                <span className="text-rose-400 font-bold">KỊCH BẢN THIÊN TAI SỰ CỐ KHẨN CẤP</span>
              </>
            ) : (
              <span>Gateway sẽ phát bản tin MQTT khi kích hoạt kịch bản này</span>
            )}
          </div>

          {/* Trigger button/Save button */}
          <div className="flex gap-3 ml-auto">
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors uppercase tracking-wider font-mono cursor-pointer"
                >
                  Hủy Sửa
                </button>
                <button
                  id="btn_scenario_save"
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-sm text-xs tracking-wider uppercase shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="h-4 w-4 text-slate-950" />
                  Lưu Kịch Bản
                </button>
              </>
            ) : (
              <button
                id="btn_scenario_run"
                onClick={() => onRunScenario(selectedScenario.id)}
                disabled={isLoading || !canControl}
                className="px-6 py-3 bg-gradient-to-r from-cyan-400 via-cyan-500 to-teal-500 hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] text-slate-950 font-bold rounded-sm text-xs tracking-widest uppercase transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40"
              >
                <PlayCircle className="h-4.5 w-4.5 text-slate-950 animate-pulse" />
                {selectedScenario.isActive ? 'APPLIED_ACTIVE' : 'RUN_SCENARIO'}
              </button>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
