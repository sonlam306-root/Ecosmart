import React, { useState } from 'react';
import { LogEntry, UserRole } from '../types';
import { Search, Trash2, Filter, ShieldCheck, Download, AlertTriangle, ShieldAlert, BadgeCheck, Terminal } from 'lucide-react';

interface DbLogsProps {
  logs: LogEntry[];
  currentRole: UserRole;
  onClearLogs: () => void;
}

export default function DbLogs({ logs, currentRole, onClearLogs }: DbLogsProps) {
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  const canClear = currentRole === 'ADMIN';

  // Apply filters
  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      log.action.toLowerCase().includes(search.toLowerCase()) || 
      log.details.toLowerCase().includes(search.toLowerCase()) ||
      log.user.toLowerCase().includes(search.toLowerCase());

    const matchesSeverity = filterSeverity === 'ALL' || log.severity === filterSeverity;
    const matchesCategory = filterCategory === 'ALL' || log.category === filterCategory;

    return matchesSearch && matchesSeverity && matchesCategory;
  });

  const handleExportCSV = () => {
    // Simulated CSV download
    const heading = 'ID,Thời gian,Phân loại,Người dùng,Hành động,Chi tiết,Mức độ\n';
    const body = filteredLogs
      .map(
        (l) =>
          `"${l.id}","${l.timestamp}","${l.category}","${l.user}","${l.action}","${l.details}","${l.severity}"`
      )
      .join('\n');
    const blob = new Blob([heading + body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ecosmart_classroom_logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Search, Filter & Action Bar */}
      <div className="bg-[#111319] border border-[#1E293B] rounded-sm p-4 shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
        
        {/* Left side: Search & Filter selections */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          
          {/* Search box */}
          <div className="relative flex-1 md:w-[220px]">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Tìm kiếm hành động..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0A0B10] border border-[#1E293B] focus:border-cyan-500 rounded-sm pl-9 pr-4 py-2 text-xs text-slate-200 outline-none transition-all font-mono"
            />
          </div>

          {/* Severity filter */}
          <div className="relative">
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="bg-[#0A0B10] border border-[#1E293B] text-xs font-mono font-bold text-slate-300 rounded-sm px-2.5 py-2 cursor-pointer outline-none focus:border-cyan-500"
            >
              <option value="ALL">TẤT CẢ MỨC ĐỘ</option>
              <option value="INFO">INFO (Bình thường)</option>
              <option value="WARNING">WARNING (Cảnh báo)</option>
              <option value="ERROR">ERROR (Sự cố)</option>
            </select>
          </div>

          {/* Category filter */}
          <div className="relative">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-[#0A0B10] border border-[#1E293B] text-xs font-mono font-bold text-slate-300 rounded-sm px-2.5 py-2 cursor-pointer outline-none focus:border-cyan-500"
            >
              <option value="ALL">TẤT CẢ PHÂN LOẠI</option>
              <option value="MQTT">MQTT (Gateway)</option>
              <option value="CB">CB Aptomat</option>
              <option value="SCENARIO">SCENARIO (Kịch bản)</option>
              <option value="SYSTEM">SYSTEM (Hệ thống)</option>
              <option value="SECURITY">SECURITY (An ninh)</option>
            </select>
          </div>

        </div>

        {/* Right side: Database maintenance buttons */}
        <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0 md:justify-end">
          
          <button
            id="btn_export_csv"
            onClick={handleExportCSV}
            className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-[#0A0B10] border border-[#1E293B] text-slate-300 hover:text-slate-100 hover:border-cyan-500 text-xs font-bold font-mono uppercase tracking-wider rounded-sm cursor-pointer transition-colors"
          >
            <Download className="h-4 w-4 text-cyan-400" />
            <span>EXPORT_CSV</span>
          </button>

          {canClear && (
            <button
              id="btn_clear_logs"
              onClick={onClearLogs}
              className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-rose-950/20 border border-rose-900 text-rose-400 hover:bg-rose-900 hover:text-rose-100 text-xs font-bold font-mono uppercase tracking-wider rounded-sm cursor-pointer transition-all"
            >
              <Trash2 className="h-4 w-4" />
              <span>CLEAR_DB</span>
            </button>
          )}

        </div>
      </div>

      {/* Logs Table Area */}
      <div className="bg-[#111319] border border-[#1E293B] rounded-sm shadow-lg overflow-hidden">
        
        {/* Table header */}
        <div className="px-5 py-4 bg-[#0A0B10] border-b border-[#1E293B] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-cyan-400 animate-pulse" />
            <h3 className="text-xs font-bold text-slate-200 uppercase font-mono tracking-wider">
              Khung Cơ Sở Dữ Liệu Logs Vận Hành IOC
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-500 font-bold uppercase">
            BẢN GHI: {filteredLogs.length} LINES
          </span>
        </div>

        {/* Table body */}
        <div className="overflow-x-auto">
          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-600 flex flex-col items-center justify-center font-mono">
              <ShieldCheck className="h-9 w-9 text-slate-700 animate-pulse mb-3" />
              <span className="text-xs uppercase font-bold text-slate-500">NO_RECORDS_FOUND_MATCHING_FILTER</span>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#1E293B] bg-[#0A0B10] text-[#64748b] font-mono text-[9px] uppercase tracking-widest font-bold">
                  <th className="py-3 px-5">Thời gian</th>
                  <th className="py-3 px-4">Mức độ</th>
                  <th className="py-3 px-4">Phân loại</th>
                  <th className="py-3 px-4">Người tác động</th>
                  <th className="py-3 px-4">Hành động thực hiện</th>
                  <th className="py-3 px-5">Mô tả chi tiết kỹ thuật / Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]/60">
                {filteredLogs.map((log) => {
                  
                  // Severity styling
                  let sevColor = 'bg-slate-950 text-slate-400 border-slate-900';
                  if (log.severity === 'WARNING') {
                    sevColor = 'bg-amber-950/30 text-amber-400 border-amber-900/40';
                  } else if (log.severity === 'ERROR') {
                    sevColor = 'bg-rose-950/30 text-rose-400 border-rose-900/40';
                  }

                  // Category styling
                  let catColor = 'text-slate-400';
                  if (log.category === 'MQTT') catColor = 'text-indigo-400 font-semibold';
                  else if (log.category === 'CB') catColor = 'text-cyan-400 font-semibold';
                  else if (log.category === 'SCENARIO') catColor = 'text-purple-400 font-semibold';
                  else if (log.category === 'SECURITY') catColor = 'text-red-400 font-semibold';

                  const formattedTime = new Date(log.timestamp).toLocaleString('vi-VN');

                  return (
                    <tr key={log.id} className="hover:bg-[#0A0B10]/60 transition-colors">
                      {/* Timestamp */}
                      <td className="py-3 px-5 font-mono text-slate-400 whitespace-nowrap">
                        {formattedTime}
                      </td>

                      {/* Severity badge */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[9px] font-bold font-mono tracking-wide ${sevColor}`}>
                          {log.severity}
                        </span>
                      </td>

                      {/* Category */}
                      <td className={`py-3 px-4 font-mono text-[10px] ${catColor}`}>
                        {log.category}
                      </td>

                      {/* Operator / User */}
                      <td className="py-3 px-4 font-mono font-medium text-slate-300">
                        {log.user}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-200">
                        {log.action}
                      </td>

                      {/* Technical details / logs */}
                      <td className="py-3 px-5 font-mono text-[10px] text-slate-500 max-w-[340px] truncate" title={log.details}>
                        {log.details}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>

    </div>
  );
}
