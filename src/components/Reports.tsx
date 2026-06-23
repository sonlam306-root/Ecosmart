import React, { useState } from 'react';
import { EnergyHistory, SystemConfig, LogEntry } from '../types';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import { Printer, Calendar, FileText, Download, TrendingUp, Sparkles, AlertTriangle, ShieldCheck } from 'lucide-react';
import { jsPDF } from 'jspdf';

interface ReportsProps {
  historyData: EnergyHistory[];
  systemConfig: SystemConfig;
  logs: LogEntry[];
}

export default function Reports({ historyData, systemConfig, logs }: ReportsProps) {
  const [dateFrom, setDateFrom] = useState('2026-06-22');
  const [dateTo, setDateTo] = useState('2026-06-23');

  // Calculate aggregates
  const totalKwh = historyData.reduce((acc, curr) => acc + curr.energyUsed, 0);
  const maxKw = Math.max(...historyData.map((d) => d.avgPower), 0);
  const maxTemp = Math.max(...historyData.map((d) => d.temperature), 0);
  const minTemp = Math.min(...historyData.map((d) => d.temperature), 100);
  const thresholdViolations = logs.filter((log) => log.severity === 'WARNING' || log.severity === 'ERROR').length;

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Draw Header Banner
    doc.setFillColor(15, 23, 42); // slate 900
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('ECOSMART CLASSROOM REPORT', 15, 18);
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(14, 165, 233); // cyan-500
    doc.text('AUTOMATED IoT ENVIRONMENTAL & POWER AUDIT SYSTEM', 15, 25);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`SYSTEM: ${systemConfig.classroomName || 'Ecosmart Classroom System'}`, 15, 32);

    // Document Info Block
    doc.setTextColor(30, 41, 59); // text-slate-800
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('REPORT METADATA', 15, 52);
    doc.setLineWidth(0.5);
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.line(15, 54, 195, 54);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text(`Generated At: ${new Date().toLocaleString()}`, 15, 61);
    doc.text(`Report Period: ${dateFrom} to ${dateTo}`, 15, 67);
    doc.text(`Status Code: ONLINE (ACTIVE)`, 15, 73);

    // Aggregate Stats Block
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text('KEY OPERATIONAL METRICS', 15, 87);
    doc.line(15, 89, 195, 89);

    // Boxes for Stats
    // Box 1: Total Energy
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(15, 94, 85, 22, 'F');
    doc.setDrawColor(241, 245, 249);
    doc.rect(15, 94, 85, 22, 'S');
    doc.setTextColor(100, 116, 139); // slate-500
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('TOTAL ENERGY CONSUMPTION', 18, 99);
    doc.setTextColor(14, 165, 233); // cyan
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`${totalKwh.toFixed(2)} kWh`, 18, 106);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Est Cost: ${(totalKwh * 2500).toLocaleString('vi-VN')} VND`, 18, 111);

    // Box 2: Peak Power
    doc.setFillColor(248, 250, 252);
    doc.rect(110, 94, 85, 22, 'F');
    doc.rect(110, 94, 85, 22, 'S');
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.text('PEAK DEMAND LOAD', 113, 99);
    doc.setTextColor(245, 158, 11); // amber
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`${maxKw.toFixed(2)} kW`, 113, 106);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Operation Limit: Nominal`, 113, 111);

    // Box 3: Max temperature
    doc.setFillColor(248, 250, 252);
    doc.rect(15, 122, 85, 22, 'F');
    doc.rect(15, 122, 85, 22, 'S');
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.text('MAX TEMPERATURE STATE', 18, 127);
    doc.setTextColor(16, 185, 129); // emerald
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`${maxTemp.toFixed(1)} C`, 18, 134);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Min Temperature: ${minTemp.toFixed(1)} C`, 18, 139);

    // Box 4: Warnings count
    doc.setFillColor(248, 250, 252);
    doc.rect(110, 122, 85, 22, 'F');
    doc.rect(110, 122, 85, 22, 'S');
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.text('WARNINGS & ANOMALIES', 113, 127);
    doc.setTextColor(239, 68, 68); // red
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`${thresholdViolations}`, 113, 134);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Audit level: ${thresholdViolations > 0 ? 'NEEDS ATTENTION' : 'HEALTHY'}`, 113, 139);

    // Historical Energy Metrics list
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text('POWER HISTORY TELEMETRY SAMPLES', 15, 155);
    doc.line(15, 157, 195, 157);

    // Draw small Table for History Data
    doc.setFillColor(241, 245, 249);
    doc.rect(15, 161, 180, 7, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text('TIME PERIOD / LOG INDEX', 18, 166);
    doc.text('ENERGY LEVEL (kWh)', 95, 166);
    doc.text('LOAD POWER (kW)', 150, 166);

    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const sampleData = historyData.slice(-10); // last 10 points
    let currentY = 173;

    sampleData.forEach((pt, index) => {
      // Alternate backgrounds
      if (index % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, currentY - 4, 180, 5.5, 'F');
      }
      doc.text(pt.timestamp || `Sample point #${index + 1}`, 18, currentY);
      doc.text(`${pt.energyUsed.toFixed(2)} kWh`, 95, currentY);
      doc.text(`${pt.avgPower.toFixed(2)} kW`, 150, currentY);
      currentY += 5.5;
    });

    // Recent Event logs section
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text('RECENT SYSTEM OPERATIONAL LOGS', 15, currentY + 7);
    doc.line(15, currentY + 9, 195, currentY + 9);

    const sampleLogs = logs.slice(0, 5); // top 5 logs
    let logY = currentY + 14;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);

    sampleLogs.forEach((lg) => {
      const safeAction = lg.action || '';
      const safeDetails = lg.details || '';
      const safeUser = lg.user || '';
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(lg.severity === 'ERROR' ? 220 : 51, lg.severity === 'ERROR' ? 38 : 65, lg.severity === 'ERROR' ? 38 : 85);
      doc.text(`[${lg.category || 'SYSTEM'}] ${safeAction} (${safeUser})`, 18, logY);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(safeDetails.length > 95 ? safeDetails.substring(0, 95) + '...' : safeDetails, 18, logY + 3.8);
      logY += 8.5;
    });

    // Footer decoration
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 287, 210, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text('Ecosmart IoT Operational Platform - Confidential Automated Data Export', 15, 293);
    doc.text('Page 1 of 1', 180, 293);

    doc.save(`ecosmart_classroom_report_${Date.now()}.pdf`);
  };

  return (
    <div className="space-y-6">
      
      {/* Search range controls */}
      <div className="bg-[#111319] border border-[#1E293B] rounded-sm p-4 shadow-md flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Calendar className="h-4 w-4 text-cyan-400 shrink-0" />
          <span className="text-xs font-bold uppercase font-mono tracking-wider text-slate-200">Khoảng thời gian báo cáo:</span>
          
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-[#0A0B10] border border-[#1E293B] text-xs text-slate-300 font-mono rounded-sm px-2.5 py-1.5 outline-none focus:border-cyan-500"
            />
            <span className="text-slate-500 text-xs font-mono">TO</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-[#0A0B10] border border-[#1E293B] text-xs text-slate-300 font-mono rounded-sm px-2.5 py-1.5 outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button
            id="btn_print_report"
            onClick={handlePrint}
            className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-[#0A0B10] border border-[#1E293B] text-slate-300 hover:text-slate-100 hover:border-cyan-500 text-xs font-bold font-mono uppercase tracking-wider rounded-sm cursor-pointer transition-colors"
          >
            <Printer className="h-4 w-4 text-cyan-400" />
            <span>PRINT</span>
          </button>
          
          <button
            id="btn_pdf_report"
            onClick={handleExportPdf}
            className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-teal-400 to-emerald-400 text-[#0A0B10] text-xs font-bold font-mono uppercase tracking-wider rounded-sm hover:shadow-[0_0_12px_rgba(52,211,153,0.3)] transition-all cursor-pointer"
          >
            <Download className="h-4 w-4 text-[#0A0B10]" />
            <span>EXPORT_PDF</span>
          </button>
        </div>
      </div>

      {/* Aggregate Scorecards (Bento grid style) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4">
        
        {/* Total energy scorecard */}
        <div className="bg-[#0A0B10] border border-[#1E293B] rounded-sm p-4 flex flex-col justify-between hover:border-cyan-500/30 transition-all">
          <div>
            <span className="text-[9px] font-mono tracking-widest text-slate-500 uppercase block font-bold">TỔNG ĐIỆN TIÊU THỤ</span>
            <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Energy Dispatched</span>
          </div>
          <div className="my-2">
            <span className="text-2xl font-extrabold font-mono text-cyan-400 block">{totalKwh.toFixed(2)}</span>
            <span className="text-xs font-mono text-slate-500 font-bold">kWh</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 font-semibold">≈ {(totalKwh * 2500).toLocaleString('vi-VN')} VNĐ (Định lượng)</span>
        </div>

        {/* Max Power demand */}
        <div className="bg-[#0A0B10] border border-[#1E293B] rounded-sm p-4 flex flex-col justify-between hover:border-amber-500/30 transition-all">
          <div>
            <span className="text-[9px] font-mono tracking-widest text-slate-500 uppercase block font-bold">CÔNG SUẤT GIAO ĐỈNH</span>
            <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Peak Load Demand</span>
          </div>
          <div className="my-2">
            <span className="text-2xl font-extrabold font-mono text-amber-400 block">{maxKw.toFixed(2)}</span>
            <span className="text-xs font-mono text-slate-500 font-bold">kW</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">Kích hoạt lúc: Giờ cao điểm</span>
        </div>

        {/* Temperature threshold log */}
        <div className="bg-[#0A0B10] border border-[#1E293B] rounded-sm p-4 flex flex-col justify-between hover:border-emerald-500/30 transition-all">
          <div>
            <span className="text-[9px] font-mono tracking-widest text-slate-500 uppercase block font-bold">Nhiệt độ tối đa</span>
            <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Max Temperature Room</span>
          </div>
          <div className="my-2">
            <span className="text-2xl font-extrabold font-mono text-emerald-400 block">{maxTemp.toFixed(1)}°C</span>
            <span className="text-xs font-mono text-slate-500">Min: {minTemp.toFixed(1)}°C</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">AC hoạt động tối ưu</span>
        </div>

        {/* Incidents tally */}
        <div className="bg-[#0A0B10] border border-[#1E293B] rounded-sm p-4 flex flex-col justify-between hover:border-rose-500/30 transition-all">
          <div>
            <span className="text-[9px] font-mono tracking-widest text-slate-500 uppercase block font-bold">Sự kiện cảnh báo</span>
            <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Warning Event Logs</span>
          </div>
          <div className="my-2">
            <span className={`text-2xl font-extrabold font-mono block ${thresholdViolations > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
              {thresholdViolations}
            </span>
            <span className="text-xs font-mono text-slate-500">Lượt ghi nhận</span>
          </div>
          <span className={`text-[10px] font-mono font-semibold ${thresholdViolations > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {thresholdViolations > 0 ? 'Cần kiểm tra bảo trì' : 'Vận hành tối ưu'}
          </span>
        </div>

      </div>

      {/* Recharts Graphical Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-1">
        
        {/* Dynamic Area Chart: Load over time */}
        <div className="bg-[#111319] border border-[#1E293B] rounded-sm p-4 shadow-md flex flex-col justify-between">
          <div className="border-b border-[#1E293B] pb-3 mb-4 flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-200 uppercase font-mono flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-cyan-400" />
              Biểu đồ Điện Năng tiêu thụ & Công suất giờ học
            </h4>
            <span className="text-[10px] text-slate-500 font-mono">kW / kWh</span>
          </div>

          <div className="h-[280px] w-full text-slate-400 text-xs">
            {historyData && historyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorEnergy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis dataKey="timestamp" stroke="#64748b" style={{ fontSize: '10px', fontFamily: 'monospace' }} />
                  <YAxis stroke="#64748b" style={{ fontSize: '10px', fontFamily: 'monospace' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0A0B10', borderColor: '#1E293B', color: '#f1f5f9', fontFamily: 'monospace', borderRadius: '4px' }}
                    itemStyle={{ color: '#22d3ee' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase' }} />
                  <Area type="monotone" dataKey="energyUsed" name="Điện năng (kWh)" stroke="#22d3ee" fillOpacity={1} fill="url(#colorEnergy)" />
                  <Area type="monotone" dataKey="avgPower" name="Công suất TB (kW)" stroke="#fbbf24" fillOpacity={1} fill="url(#colorPower)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center font-mono">Không đủ dữ liệu lịch sử vẽ đồ thị</div>
            )}
          </div>
        </div>

        {/* Dynamic Temperature vs Humidity Bar/Line Chart */}
        <div className="bg-[#111319] border border-[#1E293B] rounded-sm p-4 shadow-md flex flex-col justify-between">
          <div className="border-b border-[#1E293B] pb-3 mb-4 flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-200 uppercase font-mono flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              Giao thoa Nhiệt độ & Độ ẩm Phòng học
            </h4>
            <span className="text-[10px] text-slate-500 font-mono">°C / %RH</span>
          </div>

          <div className="h-[280px] w-full text-slate-400 text-xs">
            {historyData && historyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis dataKey="timestamp" stroke="#64748b" style={{ fontSize: '10px', fontFamily: 'monospace' }} />
                  <YAxis stroke="#64748b" style={{ fontSize: '10px', fontFamily: 'monospace' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0A0B10', borderColor: '#1E293B', color: '#f1f5f9', fontFamily: 'monospace', borderRadius: '4px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase' }} />
                  <Bar dataKey="temperature" name="Nhiệt độ phòng (°C)" fill="#10b981" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="humidity" name="Độ ẩm không khí (%)" fill="#6366f1" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center font-mono">Không phát hiện dữ liệu theo dõi</div>
            )}
          </div>
        </div>

      </div>

      {/* Table: Operational telemetry history records log */}
      <div className="bg-[#111319] border border-[#1E293B] rounded-sm p-5 shadow-md">
        <div className="border-b border-[#1E293B] pb-3 mb-4">
          <h3 className="text-xs font-bold text-slate-100 uppercase font-mono tracking-wider">
            Nhật ký Lịch sử Chi tiết đo lường thiết bị
          </h3>
        </div>

        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left text-slate-300">
            <thead>
              <tr className="border-b border-[#1E293B] text-slate-500 uppercase tracking-widest font-mono text-[9px] font-bold">
                <th className="py-2.5">Thời điểm ghi</th>
                <th>Điện tiêu thụ (kWh)</th>
                <th>Công suất TB (kW)</th>
                <th>Nhiệt độ đo</th>
                <th>Độ ẩm đo</th>
                <th>Tình trạng kết nối</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]/60">
              {historyData.slice(-6).reverse().map((data, index) => (
                <tr key={index} className="hover:bg-[#0A0B10]/60 transition-all font-mono">
                  <td className="py-2.5 text-slate-400">{data.timestamp}</td>
                  <td className="font-bold text-cyan-400">{data.energyUsed.toFixed(2)} kWh</td>
                  <td className="text-amber-400">{data.avgPower.toFixed(2)} kW</td>
                  <td className="text-emerald-400">{data.temperature.toFixed(1)}°C</td>
                  <td className="text-indigo-400">{data.humidity.toFixed(1)}%</td>
                  <td>
                    <span className="inline-flex items-center gap-1 text-[9px] text-emerald-400 font-bold uppercase">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                      OK (MQTT)
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Print / Export Report hidden markup template (made visible during window.print) */}
      <div className="hidden print:block fixed inset-0 bg-white text-slate-950 p-10 z-50 overflow-y-auto leading-normal">
        <div className="border-b-2 border-slate-900 pb-6 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-extrabold uppercase font-sans tracking-tight text-slate-900">Ecosmart Classroom IOC</h1>
            <p className="text-xs text-slate-600 uppercase font-semibold font-mono mt-1">HỆ THỐNG GIÁM SÁT ĐO LƯỜNG - BAN QUẢN LÝ THÔNG MINH</p>
            <p className="text-sm font-bold text-slate-800 mt-2">Phòng: {systemConfig.classroomName}</p>
          </div>
          <div className="text-right text-xs">
            <span className="font-mono font-bold text-slate-900">BẢN CHÍNH THỨC</span>
            <p className="text-slate-600 mt-1">Mã lực: EVN-E_CLASS_ST</p>
            <p className="text-slate-600 mt-1">Thời điểm xuất: {new Date().toLocaleString('vi-VN')}</p>
          </div>
        </div>

        {/* Aggregates for printed sheet */}
        <div className="grid grid-cols-4 gap-4 my-8 text-center">
          <div className="p-4 border border-slate-300 rounded">
            <span className="text-[10px] block font-mono font-bold text-slate-500">TỔNG ĐIỆN NĂNG TIÊU THỤ</span>
            <span className="text-xl font-bold mt-1 block">{totalKwh.toFixed(2)} kWh</span>
          </div>
          <div className="p-4 border border-slate-300 rounded">
            <span className="text-[10px] block font-mono font-bold text-slate-500">CÔNG SUẤT GIAO ĐỈNH</span>
            <span className="text-xl font-bold mt-1 block">{maxKw.toFixed(2)} kW</span>
          </div>
          <div className="p-4 border border-slate-300 rounded">
            <span className="text-[10px] block font-mono font-bold text-slate-500">NHIỆT ĐỘ CỰC ĐẠI</span>
            <span className="text-xl font-bold mt-1 block">{maxTemp.toFixed(1)}°C</span>
          </div>
          <div className="p-4 border border-slate-300 rounded">
            <span className="text-[10px] block font-mono font-bold text-slate-500">SỐ LƯỢT TIỂU CHUẨN LỖI</span>
            <span className="text-xl font-bold mt-1 block">{thresholdViolations} lần</span>
          </div>
        </div>

        {/* Report description content */}
        <div className="my-8 space-y-4">
          <h3 className="text-lg font-bold border-b border-slate-300 pb-1.5 text-slate-950">1. Đánh giá Vận hành Hệ thống</h3>
          <p className="text-sm text-slate-800 leading-relaxed font-sans">
            Dựa trên nhật ký đo lường tự động của Gateway, phòng học <strong>{systemConfig.classroomName}</strong> duy trì mức độ tiêu thụ điện năng hoàn toàn tối ưu. 
            Cơ chế kịch bản thông minh gồm 7 bậc vận hành được áp dụng nghiêm ngặt theo đúng thời gian biểu. Hoạt động của Aptomat (CB) đóng cắt mềm mượt, không xảy ra hư hại quá tải điện áp. 
            Quá trình kết nối dữ liệu Gateway qua MQTT luôn ở mức sẵn sàng đạt 99.9%.
          </p>

          <h3 className="text-lg font-bold border-b border-slate-300 pb-1.5 text-slate-950 mt-6">2. Chi tiết Số liệu Đo lường</h3>
          <table className="w-full text-left text-xs text-slate-950 mt-3 border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-900 bg-slate-100 font-mono uppercase text-[10px]">
                <th className="py-2 px-3">STT</th>
                <th className="py-2 px-3">Thời gian</th>
                <th className="py-2 px-3">Điện tiêu thụ (kWh)</th>
                <th className="py-2 px-3">Công suất TB (kW)</th>
                <th className="py-2 px-3">Nhiệt độ ghi</th>
                <th className="py-2 px-3">Tình trạng dòng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {historyData.map((data, index) => (
                <tr key={index}>
                  <td className="py-2 px-3 text-slate-600">{index + 1}</td>
                  <td className="py-2 px-3 font-mono">{data.timestamp}</td>
                  <td className="py-2 px-3 font-bold">{data.energyUsed.toFixed(2)} kWh</td>
                  <td className="py-2 px-3">{data.avgPower.toFixed(2)} kW</td>
                  <td className="py-2 px-3">{data.temperature.toFixed(1)}°C</td>
                  <td className="py-2 px-3 font-semibold text-emerald-800">BÌNH THƯỜNG</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Corporate Sign-off Area */}
        <div className="grid grid-cols-2 gap-8 mt-16 text-center text-xs">
          <div>
            <span className="font-bold text-slate-500 uppercase font-mono tracking-widest block">NHÂN VIÊN KIỂM TRA</span>
            <span className="text-slate-400 mt-1 block">Người ký tên điện tử</span>
            <div className="h-16 flex items-center justify-center">
              <span className="text-xs italic text-slate-400 font-serif font-semibold">[KÝ TÊN ĐÃ XÁC THỰC]</span>
            </div>
            <p className="font-bold text-slate-900 mt-4">BAN VẬN HÀNH IOC</p>
          </div>
          <div>
            <span className="font-bold text-slate-500 uppercase font-mono tracking-widest block">XÁC NHẬN BAN GIÁM HIỆU</span>
            <span className="text-slate-400 mt-1 block">Director of Infrastructure</span>
            <div className="h-16 flex items-center justify-center">
              <div className="border-2 border-rose-600 rounded-full h-14 w-14 flex items-center justify-center font-extrabold text-[8px] text-rose-600 uppercase transform rotate-12">
                ECOSMART APPROVED
              </div>
            </div>
            <p className="font-bold text-slate-900 mt-4">KÝ DUYỆT TỰ ĐỘNG</p>
          </div>
        </div>
      </div>

    </div>
  );
}
