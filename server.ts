import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { DeviceState, Scenario, LogEntry, MqttConfig, EnergyHistory, SystemConfig, Room, CustomDevice, SignalMapping } from './src/types';

const app = express();
const PORT = 3000;
const DB_PATH = path.join(process.cwd(), 'db.json');

app.use(express.json());

// Helper functions for Database
function initDatabase() {
  const defaultLogs: LogEntry[] = [];
  const defaultHistory: EnergyHistory[] = [];

  const defaultMappings: SignalMapping[] = [
    {
      id: "map_voltage",
      topic: "ecosmart/+/telemetry",
      functionName: "VOLTAGE",
      jsonPath: "telemetry.u_V",
      multiplier: 1.0,
      description: "Đo điện áp nguồn cấp thực tế (V) từ bo mạch IoT Gateway",
      isActive: true
    },
    {
      id: "map_current",
      topic: "ecosmart/+/telemetry",
      functionName: "CURRENT",
      jsonPath: "telemetry.i_A",
      multiplier: 1.0,
      description: "Đo cường độ dòng tải tiêu thụ tổng của toàn bộ phòng học (A)",
      isActive: true
    },
    {
      id: "map_power",
      topic: "ecosmart/+/telemetry",
      functionName: "POWER",
      jsonPath: "telemetry.p_kW",
      multiplier: 1.0,
      description: "Công suất tiêu thụ tổng thời gian thực (kW)",
      isActive: true
    },
    {
      id: "map_temp",
      topic: "ecosmart/+/telemetry",
      functionName: "TEMPERATURE",
      jsonPath: "telemetry.temp_c",
      multiplier: 1.0,
      description: "Độ ẩm/Nhiệt độ môi trường phòng (°C) từ cảm biến tích hợp DHT22",
      isActive: true
    },
    {
      id: "map_hum",
      topic: "ecosmart/+/telemetry",
      functionName: "HUMIDITY",
      jsonPath: "telemetry.hum_pct",
      multiplier: 1.0,
      description: "Độ ẩm tương đối môi trường học tập (% RH)",
      isActive: true
    },
    {
      id: "map_cb",
      topic: "ecosmart/+/control",
      functionName: "CB_STATE",
      jsonPath: "cmd.cbState",
      multiplier: 1.0,
      description: "Tín hiệu phản hồi cơ cấu Aptomat thông minh (CB) đóng/cắt",
      isActive: true
    },
    {
      id: "map_door",
      topic: "ecosmart/+/telemetry",
      functionName: "DOOR_OPEN",
      jsonPath: "telemetry.doorOpen",
      multiplier: 1.0,
      description: "Cảm biến báo trạng thái cửa ra vào phòng học đóng/mở",
      isActive: true
    },
    {
      id: "map_smoke",
      topic: "ecosmart/+/telemetry",
      functionName: "SMOKE_DETECTED",
      jsonPath: "telemetry.smokeDetected",
      multiplier: 1.0,
      description: "Tín hiệu cảnh báo nguy cơ hỏa hoạn, rò rỉ khói độc hại nguy cấp",
      isActive: true
    },
    {
      id: "map_lock",
      topic: "ecosmart/+/telemetry",
      functionName: "LOCK_ACTIVE",
      jsonPath: "telemetry.lockActive",
      multiplier: 1.0,
      description: "Phản hồi dòng khóa chốt an ninh tự động của phòng học",
      isActive: true
    }
  ];

  const defaultMqtt: MqttConfig = {
    broker: 'broker.emqx.io',
    port: 1883,
    clientId: 'ecosmart_classroom_gateway_01',
    username: 'admin_classroom',
    password: 'password123',
    subTopic: 'ecosmart/classroom/telemetry',
    pubTopic: 'ecosmart/classroom/control',
    status: 'CONNECTED',
  };

  const defaultDeviceState: DeviceState = {
    cbState: true,
    voltage: 220.4,
    current: 4.82,
    power: 1.06, // approx U*I * PF = 220 * 4.82 * 0.99
    reactivePower: 0.12,
    frequency: 50.02,
    powerFactor: 0.99,
    totalEnergy: 1420.55,
    temperature: 25.6,
    humidity: 62.4,
    doorOpen: false,
    smokeDetected: false,
    lockActive: true,
    lastUpdated: new Date().toISOString(),
  };

  const defaultScenarios: Scenario[] = [
    {
      id: 1,
      level: 1,
      name: 'Tiết kiệm Năng lượng (Energy Saving)',
      icon: 'Leaf',
      description: 'Tự động tắt các thiết bị không dùng, giảm công suất điều hòa, cài đặt ánh sáng mờ khi không có người.',
      cbTargetState: true,
      acTargetState: 'ECO',
      lightsTargetState: 'DIM',
      projectorTargetState: false,
      isActive: false,
    },
    {
      id: 2,
      level: 2,
      name: 'Giờ học Cao điểm (Peak Study)',
      icon: 'BookOpen',
      description: 'Bật toàn bộ hệ thống chiếu sáng tối đa, điều hòa chạy 24 độ mượt mà, máy chiếu sẵn sàng hoạt động.',
      cbTargetState: true,
      acTargetState: 'ON',
      lightsTargetState: 'ON',
      projectorTargetState: true,
      isActive: true,
    },
    {
      id: 3,
      level: 3,
      name: 'Nghỉ giữa giờ (Break Time)',
      icon: 'Coffee',
      description: 'Điều hòa duy trì chế độ gió thông thoáng, tắt bớt 50% bóng đèn và tắt máy chiếu để bảo dưỡng thiết bị.',
      cbTargetState: true,
      acTargetState: 'ECO',
      lightsTargetState: 'DIM',
      projectorTargetState: false,
      isActive: false,
    },
    {
      id: 4,
      level: 4,
      name: 'Tự học Buổi tối (Self-Study)',
      icon: 'MoonStar',
      description: 'Chỉ phân bổ chiếu sáng tại các khu vực bàn học, điều hòa tắt bớt để tiết kiệm năng lượng ban đêm.',
      cbTargetState: true,
      acTargetState: 'ECO',
      lightsTargetState: 'DIM',
      projectorTargetState: false,
      isActive: false,
    },
    {
      id: 5,
      level: 5,
      name: 'Chế độ An ninh / Ban đêm (Night & Security)',
      icon: 'ShieldAlert',
      description: 'Tắt toàn bộ hệ thống điện ngoại trừ đèn khẩn cấp và camera. Nếu cửa mở sẽ kích hoạt cảnh báo.',
      cbTargetState: true,
      acTargetState: 'OFF',
      lightsTargetState: 'OFF',
      projectorTargetState: false,
      isActive: false,
    },
    {
      id: 6,
      level: 6,
      name: 'Sự cố Khẩn cấp (Emergency / Fire)',
      icon: 'Flame',
      description: 'Ngắt hoàn toàn aptomat tổng (CB thông minh), kích hoạt còi hú sự cố khẩn cấp và gửi cảnh báo về điện thoại.',
      cbTargetState: false,
      acTargetState: 'OFF',
      lightsTargetState: 'OFF',
      projectorTargetState: false,
      isActive: false,
    },
    {
      id: 7,
      level: 7,
      name: 'Kiểm tra / Bảo trì (Maintenance)',
      icon: 'Wrench',
      description: 'Kích hoạt cổng đo lường hiệu năng cao, đặt CB thông minh ở trạng thái kiểm thử tải định kỳ.',
      cbTargetState: true,
      acTargetState: 'ON',
      lightsTargetState: 'ON',
      projectorTargetState: false,
      isActive: false,
    },
  ];

  const defaultRooms: Room[] = [
    {
      id: 'room_b101',
      name: 'Phòng học Tiêu chuẩn B101',
      status: 'NORMAL',
      gridX: 1,
      gridY: 1,
      deviceState: {
        cbState: true,
        voltage: 220.1,
        current: 1.1,
        power: 0.22,
        reactivePower: 0.04,
        frequency: 50.0,
        powerFactor: 0.98,
        totalEnergy: 412.3,
        temperature: 26.1,
        humidity: 60.5,
        doorOpen: false,
        smokeDetected: false,
        lockActive: true,
        lastUpdated: new Date().toISOString()
      },
      devices: [
        { id: 'dev_b101_1', name: 'Đèn Tuýp LED 40W', type: 'LIGHT', status: true, powerConsumption: 40, addedAt: new Date().toISOString() },
        { id: 'dev_b101_2', name: 'Quạt trần Điện cơ B101', type: 'FAN', status: true, powerConsumption: 75, addedAt: new Date().toISOString() },
        { id: 'dev_b101_3', name: 'Máy điều hòa Daikin 1.5HP', type: 'AC', status: false, powerConsumption: 1100, addedAt: new Date().toISOString() }
      ],
      mqttConfig: {
        broker: 'broker.emqx.io',
        port: 1883,
        clientId: 'ecosmart_gateway_room_b101',
        username: 'admin_b101',
        password: 'password123',
        subTopic: 'ecosmart/b101/telemetry',
        pubTopic: 'ecosmart/b101/control',
        status: 'CONNECTED',
      }
    },
    {
      id: 'room_b102',
      name: 'Phòng học Thông minh B102',
      status: 'NORMAL',
      gridX: 1,
      gridY: 2,
      deviceState: defaultDeviceState,
      devices: [
        { id: 'dev_b102_1', name: 'Hệ thống Đèn LED Dimmer', type: 'LIGHT', status: true, powerConsumption: 120, addedAt: new Date().toISOString() },
        { id: 'dev_b102_2', name: 'Máy lạnh Panasonic Inverter', type: 'AC', status: true, powerConsumption: 950, addedAt: new Date().toISOString() },
        { id: 'dev_b102_3', name: 'Máy chiếu Epson 3LCD Classroom', type: 'PROJECTOR', status: false, powerConsumption: 300, addedAt: new Date().toISOString() }
      ],
      mqttConfig: {
        broker: 'broker.emqx.io',
        port: 1883,
        clientId: 'ecosmart_gateway_room_b102',
        username: 'admin_b102',
        password: 'password123',
        subTopic: 'ecosmart/b102/telemetry',
        pubTopic: 'ecosmart/b102/control',
        status: 'CONNECTED',
      }
    },
    {
      id: 'room_b103',
      name: 'Phòng Lab Tin học B103',
      status: 'NORMAL',
      gridX: 1,
      gridY: 3,
      deviceState: {
        cbState: true,
        voltage: 220.5,
        current: 6.8,
        power: 1.45,
        reactivePower: 0.22,
        frequency: 50.03,
        powerFactor: 0.97,
        totalEnergy: 2189.4,
        temperature: 23.5,
        humidity: 58.2,
        doorOpen: false,
        smokeDetected: false,
        lockActive: true,
        lastUpdated: new Date().toISOString()
      },
      devices: [
        { id: 'dev_b103_1', name: 'Hệ thống Quạt thông gió', type: 'FAN', status: true, powerConsumption: 150, addedAt: new Date().toISOString() },
        { id: 'dev_b103_2', name: 'Dàn Máy tính HP Core i5 (x20)', type: 'COMPUTER', status: true, powerConsumption: 2400, addedAt: new Date().toISOString() },
        { id: 'dev_b103_3', name: 'Máy điều hòa Trung tâm B103', type: 'AC', status: true, powerConsumption: 1800, addedAt: new Date().toISOString() }
      ],
      mqttConfig: {
        broker: 'broker.emqx.io',
        port: 1883,
        clientId: 'ecosmart_gateway_room_b103',
        username: 'admin_b103',
        password: 'password123',
        subTopic: 'ecosmart/b103/telemetry',
        pubTopic: 'ecosmart/b103/control',
        status: 'CONNECTED',
      }
    },
    {
      id: 'room_b104',
      name: 'Phòng Hội thảo B104',
      status: 'NORMAL',
      gridX: 2,
      gridY: 1,
      deviceState: {
        cbState: true,
        voltage: 219.8,
        current: 1.2,
        power: 0.26,
        reactivePower: 0.02,
        frequency: 49.98,
        powerFactor: 0.99,
        totalEnergy: 85.2,
        temperature: 27.2,
        humidity: 65.1,
        doorOpen: false,
        smokeDetected: false,
        lockActive: true,
        lastUpdated: new Date().toISOString()
      },
      devices: [
        { id: 'dev_b104_1', name: 'Hệ thống loa hội trường', type: 'TV', status: false, powerConsumption: 450, addedAt: new Date().toISOString() },
        { id: 'dev_b104_2', name: 'Tivi Sony Bravia 75" MeetingRoom', type: 'TV', status: false, powerConsumption: 250, addedAt: new Date().toISOString() }
      ],
      mqttConfig: {
        broker: 'broker.emqx.io',
        port: 1883,
        clientId: 'ecosmart_gateway_room_b104',
        username: 'admin_b104',
        password: 'password123',
        subTopic: 'ecosmart/b104/telemetry',
        pubTopic: 'ecosmart/b104/control',
        status: 'CONNECTED',
      }
    }
  ];

  if (fs.existsSync(DB_PATH)) {
    try {
      const existingData = fs.readFileSync(DB_PATH, 'utf-8');
      const parsed = JSON.parse(existingData); // validate
      
      let modified = false;
      if (parsed.deviceState) {
        if (parsed.deviceState.smokeDetected === undefined) {
          parsed.deviceState.smokeDetected = false;
          modified = true;
        }
        if (parsed.deviceState.lockActive === undefined) {
          parsed.deviceState.lockActive = true;
          modified = true;
        }
      }
      if (!parsed.rooms || parsed.rooms.length === 0) {
        parsed.rooms = defaultRooms;
        if (!parsed.config) parsed.config = {};
        if (!parsed.config.activeRoomId) {
          parsed.config.activeRoomId = 'room_b102';
        }
        modified = true;
      } else {
        parsed.rooms.forEach((r: any) => {
          if (!r.mqttConfig) {
            r.mqttConfig = {
              broker: 'broker.emqx.io',
              port: 1883,
              clientId: `ecosmart_gateway_${r.id}`,
              username: `admin_${r.id.toLowerCase()}`,
              password: 'password123',
              subTopic: `ecosmart/${r.id.replace('room_', '')}/telemetry`,
              pubTopic: `ecosmart/${r.id.replace('room_', '')}/control`,
              status: 'CONNECTED',
            };
            modified = true;
          }
        });
      }
      if (!parsed.mappings) {
        parsed.mappings = defaultMappings;
        modified = true;
      }
      if (modified) {
        fs.writeFileSync(DB_PATH, JSON.stringify(parsed, null, 2), 'utf-8');
      }
      return;
    } catch (e) {
      console.error("Malformed database, re-initializing", e);
    }
  }

  // Pre-seed Data
  const now = new Date();
  
  // Seed some logs
  const categories: Array<'MQTT' | 'CB' | 'SCENARIO' | 'SYSTEM' | 'SECURITY'> = ['SYSTEM', 'MQTT', 'CB', 'SCENARIO', 'SECURITY'];
  const users = ['Phạm Minh Admin', 'Nguyễn Văn Operator', 'Hệ Thống Gateway'];
  const actions = [
    'Kết nối Broker MQTT thành công',
    'Chạy ngữ cảnh "Giờ học Cao điểm"',
    'Đóng Aptomat CB thông minh',
    'Cập nhật cấu hình Ecosmart Classroom',
    'Phát hiện xâm nhập: Cửa sổ mở trái giờ'
  ];
  
  for (let i = 24; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 3600000);
    const cat = categories[i % categories.length];
    const user = users[i % users.length];
    
    let action = '';
    let details = '';
    let severity: 'INFO' | 'WARNING' | 'ERROR' = 'INFO';
    
    if (cat === 'MQTT') {
      action = 'Bản tin Telemetry qua MQTT';
      details = `Nhận dữ liệu từ gateway: U=${(218 + Math.random()*4).toFixed(1)}V, I=${(2 + Math.random()*8).toFixed(2)}A, T=${(24 + Math.random()*3).toFixed(1)}°C`;
    } else if (cat === 'CB') {
      action = i % 2 === 0 ? 'Đóng tiếp điểm CB' : 'Mở tiếp điểm CB';
      details = `Thực hiện bởi ${user} thành công qua bảng điều khiển`;
    } else if (cat === 'SCENARIO') {
      action = 'Kích hoạt ngữ cảnh';
      details = `Ngữ cảnh bậc ${1 + (i % 7)} [${defaultScenarios[i % 7].name}] đã được thiết lập thành công`;
    } else if (cat === 'SECURITY') {
      action = 'Phát hiện sự kiện cảm biến';
      details = i % 5 === 0 ? 'Cảnh báo cửa ra vào mở lâu quá 5 phút' : 'Trạng thái khóa cửa bình thường';
      severity = i % 5 === 0 ? 'WARNING' : 'INFO';
    } else {
      action = 'Khởi động hệ thống IOC';
      details = 'Phiên bản IOC Control Center v2.1 hoạt động ổn định';
    }

    defaultLogs.push({
      id: `log_${Date.now() - i * 100000}_${i}`,
      timestamp: d.toISOString(),
      category: cat,
      user,
      action,
      details,
      severity,
    });
  }

  // Pre-seed Energy History
  for (let i = 23; i >= 0; i--) {
    const d = new Date();
    d.setHours(d.getHours() - i);
    // simulated hourly values
    const hourLabel = `${d.getHours().toString().padStart(2, '0')}:00`;
    const randMultiplier = (d.getHours() >= 7 && d.getHours() <= 18) ? 1.5 : 0.3; // more consumption in study hours
    
    defaultHistory.push({
      timestamp: hourLabel,
      energyUsed: Math.round((0.5 + Math.random() * 0.8) * randMultiplier * 100) / 100,
      avgPower: Math.round((0.8 + Math.random() * 1.2) * randMultiplier * 100) / 100,
      temperature: Math.round((22 + Math.sin((d.getHours() - 6) / 24 * Math.PI * 2) * 4 + Math.random()) * 10) / 10,
      humidity: Math.round((50 - Math.sin((d.getHours() - 6) / 24 * Math.PI * 2) * 10 + Math.random() * 5) * 10) / 10,
    });
  }

  const defaultConfig: SystemConfig = {
    classroomName: 'Phòng học Thông minh B102',
    logoUrl: null, // null means use standard default logo index
    customLogoIndex: 0,
    isSimulationActive: true,
    simSpeedMs: 2000,
  };

  const dbData = {
    mqtt: defaultMqtt,
    deviceState: defaultDeviceState,
    scenarios: defaultScenarios,
    logs: defaultLogs,
    history: defaultHistory,
    config: {
      ...defaultConfig,
      activeRoomId: 'room_b102',
    },
    rooms: defaultRooms,
    mappings: defaultMappings,
  };

  fs.writeFileSync(DB_PATH, JSON.stringify(dbData, null, 2), 'utf-8');
}

// Ensure database folders and seed data
initDatabase();

function readData(): {
  mqtt: MqttConfig;
  deviceState: DeviceState;
  scenarios: Scenario[];
  logs: LogEntry[];
  history: EnergyHistory[];
  config: SystemConfig;
  rooms: Room[];
  mappings: SignalMapping[];
} {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error("Database reading error, resolving...", err);
    initDatabase();
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  }
}

function writeData(data: ReturnType<typeof readData>) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// Real-time telemetry generator loop
setInterval(() => {
  const db = readData();
  if (!db.config.isSimulationActive) return;

  if (!db.rooms || db.rooms.length === 0) return;

  db.rooms.forEach((room) => {
    const currentStatus = room.deviceState;
    let voltage = currentStatus.voltage;
    let current = currentStatus.current;
    let temp = currentStatus.temperature;
    let hum = currentStatus.humidity;

    const activeScenario = db.scenarios.find(s => s.isActive);

    if (currentStatus.cbState === true) {
      // Breaker is ON
      voltage = Number((220 + Math.sin(Date.now() / 15000) * 2.5 + (Math.random() - 0.5) * 0.4).toFixed(1));

      // Calculate load base from custom devices
      const activeDevicesPower = (room.devices || [])
        .filter(d => d.status)
        .reduce((sum, d) => sum + d.powerConsumption, 0); // Power in Watts

      const baseCurrent = Math.max(0.4, activeDevicesPower / voltage); // at least 0.4A baseline
      current = Number((baseCurrent + (Math.random() - 0.5) * 0.15).toFixed(2));
      if (current < 0) current = 0.01;

      // Power calculation
      const pf = Number((0.96 + Math.random() * 0.03).toFixed(2));
      const power = Number(((voltage * current * pf) / 1000).toFixed(3)); // in kW
      const qPower = Number((power * Math.tan(Math.acos(pf))).toFixed(3));

      // Accumulate energy
      const incrementalEnergy = Number((power * (db.config.simSpeedMs / 3600000)).toFixed(6));
      const totalEnergy = Number((currentStatus.totalEnergy + incrementalEnergy).toFixed(4));

      // Temperature settling
      let targetTemp = 26.5;
      const acDevice = (room.devices || []).find(d => d.type === 'AC');
      if (acDevice && acDevice.status) {
        targetTemp = 22.0; // Cool room down
      } else if (activeScenario) {
        if (activeScenario.acTargetState === 'ON') targetTemp = 24.0;
        else if (activeScenario.acTargetState === 'ECO') targetTemp = 26.0;
        else if (activeScenario.acTargetState === 'OFF') targetTemp = 29.5;
      }

      temp = Number((temp + (targetTemp - temp) * 0.05 + (Math.random() - 0.5) * 0.1).toFixed(1));
      hum = Number((60 + (26 - temp) * 3 + (Math.random() - 0.5) * 0.5).toFixed(1));

      currentStatus.voltage = voltage;
      currentStatus.current = current;
      currentStatus.power = power;
      currentStatus.reactivePower = qPower;
      currentStatus.powerFactor = pf;
      currentStatus.frequency = Number((50.0 + (Math.random() - 0.5) * 0.08).toFixed(2));
      currentStatus.totalEnergy = totalEnergy;
      currentStatus.temperature = temp;
      currentStatus.humidity = hum;
    } else {
      // CB is OFF
      voltage = Number((219.0 + (Math.random() - 0.5) * 0.8).toFixed(1));
      current = 0.0;
      const power = 0.0;
      const qPower = 0.0;
      const pf = 0.0;
      const freq = Number((50.01 + (Math.random() - 0.5) * 0.04).toFixed(2));

      temp = Number((temp + (29.5 - temp) * 0.02 + (Math.random() - 0.5) * 0.1).toFixed(1));
      hum = Number((hum + (65.0 - hum) * 0.02 + (Math.random() - 0.5) * 0.2).toFixed(1));

      currentStatus.voltage = voltage;
      currentStatus.current = current;
      currentStatus.power = power;
      currentStatus.reactivePower = qPower;
      currentStatus.powerFactor = pf;
      currentStatus.frequency = freq;
      currentStatus.temperature = temp;
      currentStatus.humidity = hum;
    }

    // Periodic random door open events
    if (Math.random() < 0.01) {
      currentStatus.doorOpen = !currentStatus.doorOpen;
      db.logs.unshift({
        id: `log_${Date.now()}_door_${room.id}`,
        timestamp: new Date().toISOString(),
        category: 'SECURITY',
        user: 'Hệ Thống Cảm Biến',
        action: `Cảm biến cửa: ${room.name}`,
        details: currentStatus.doorOpen ? `Phát hiện cửa phòng [${room.name}] MỞ` : `Cửa phòng [${room.name}] đã ĐÓNG an toàn`,
        severity: currentStatus.doorOpen ? 'WARNING' : 'INFO',
      });
    }

    // Fire & Smoke status setting
    if (currentStatus.smokeDetected) {
      room.status = 'EMERGENCY';
    } else if (currentStatus.doorOpen && currentStatus.cbState === false) {
      room.status = 'WARNING';
    } else {
      room.status = 'NORMAL';
    }

    currentStatus.lastUpdated = new Date().toISOString();
    room.deviceState = currentStatus;

    // Sync to activeRoomId legacy state
    if (room.id === db.config.activeRoomId) {
      db.deviceState = currentStatus;
    }
  });

  // Keep charts dynamic
  const activeRoom = db.rooms.find(r => r.id === db.config.activeRoomId);
  const lastHist = db.history[db.history.length - 1];
  if (lastHist && activeRoom) {
    lastHist.energyUsed = Number((lastHist.energyUsed + activeRoom.deviceState.power / 200).toFixed(2));
    if (lastHist.energyUsed > 10) lastHist.energyUsed = 2.5;
  }

  writeData(db);
}, 2000);

// API endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// GET rooms list
app.get('/api/rooms', (req, res) => {
  const db = readData();
  res.json(db.rooms || []);
});

// POST create a room
app.post('/api/rooms', (req, res) => {
  const { name, gridX, gridY, user } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Tên phòng không được trống' });
  }

  const db = readData();
  const newRoomId = `room_${Date.now()}`;
  const newRoom: Room = {
    id: newRoomId,
    name,
    status: 'NORMAL',
    gridX: Number(gridX) || 1,
    gridY: Number(gridY) || 1,
    deviceState: {
      cbState: true,
      voltage: 220.0,
      current: 0.0,
      power: 0.0,
      reactivePower: 0.0,
      frequency: 50.0,
      powerFactor: 0.98,
      totalEnergy: 0.0,
      temperature: 26.0,
      humidity: 60.0,
      doorOpen: false,
      smokeDetected: false,
      lockActive: true,
      lastUpdated: new Date().toISOString()
    },
    devices: [
      { id: `dev_${newRoomId}_1`, name: 'Hệ thống đèn LED', type: 'LIGHT', status: true, powerConsumption: 80, addedAt: new Date().toISOString() },
      { id: `dev_${newRoomId}_2`, name: 'Quạt hút thông gió', type: 'FAN', status: false, powerConsumption: 40, addedAt: new Date().toISOString() }
    ],
    mqttConfig: {
      broker: 'broker.emqx.io',
      port: 1883,
      clientId: `ecosmart_gateway_${newRoomId}`,
      username: 'admin_classroom',
      password: 'password123',
      subTopic: `ecosmart/${newRoomId.replace('room_', '')}/telemetry`,
      pubTopic: `ecosmart/${newRoomId.replace('room_', '')}/control`,
      status: 'CONNECTED'
    }
  };

  db.rooms = db.rooms || [];
  db.rooms.push(newRoom);

  // Log creation
  db.logs.unshift({
    id: `log_${Date.now()}`,
    timestamp: new Date().toISOString(),
    category: 'SYSTEM',
    user: user || 'Admin',
    action: 'Tạo phòng học mới',
    details: `Tạo phòng "${name}" tọa độ Hàng ${gridX}, Cột ${gridY} thành công`,
    severity: 'INFO'
  });

  writeData(db);
  res.json({ status: 'success', room: newRoom, rooms: db.rooms });
});

// DELETE a room
app.delete('/api/rooms/:id', (req, res) => {
  const roomId = req.params.id;
  const { user } = req.body;

  const db = readData();
  const roomToDelete = db.rooms.find(r => r.id === roomId);
  if (!roomToDelete) {
    return res.status(404).json({ error: 'Phòng không tồn tại' });
  }

  db.rooms = db.rooms.filter(r => r.id !== roomId);

  // Fallback active room if the active room is deleted
  if (db.config.activeRoomId === roomId) {
    db.config.activeRoomId = db.rooms[0]?.id || '';
  }

  db.logs.unshift({
    id: `log_${Date.now()}`,
    timestamp: new Date().toISOString(),
    category: 'SYSTEM',
    user: user || 'Admin',
    action: 'Xóa phòng học',
    details: `Xóa phòng "${roomToDelete.name}" thành công khỏi sơ đồ`,
    severity: 'WARNING'
  });

  writeData(db);
  res.json({ status: 'success', rooms: db.rooms });
});

// POST select active room
app.post('/api/rooms/:id/select', (req, res) => {
  const roomId = req.params.id;
  const { user } = req.body;

  const db = readData();
  const room = db.rooms.find(r => r.id === roomId);
  if (!room) {
    return res.status(404).json({ error: 'Không tìm thấy phòng tương ứng' });
  }

  db.config.activeRoomId = roomId;
  db.config.classroomName = room.name; // Keep standard legacy naming synced
  db.deviceState = room.deviceState; // Sync root state for legacy references

  db.logs.unshift({
    id: `log_${Date.now()}`,
    timestamp: new Date().toISOString(),
    category: 'SYSTEM',
    user: user || 'Operator',
    action: 'Chuyển đổi khu vực giám sát',
    details: `Chuyển vùng giám sát chính sang phòng: [${room.name}]`,
    severity: 'INFO'
  });

  writeData(db);
  res.json({ status: 'success', activeRoomId: roomId, room, config: db.config });
});

// PUT update Room details (name, coordinates, MQTT Config)
app.put('/api/rooms/:id', (req, res) => {
  const roomId = req.params.id;
  const { name, gridX, gridY, mqttConfig, user } = req.body;

  const db = readData();
  const room = db.rooms.find(r => r.id === roomId);
  if (!room) {
    return res.status(404).json({ error: 'Không tìm thấy phòng học tương ứng' });
  }

  if (name !== undefined) {
    room.name = name;
  }
  if (gridX !== undefined) {
    room.gridX = Number(gridX) || 1;
  }
  if (gridY !== undefined) {
    room.gridY = Number(gridY) || 1;
  }

  if (mqttConfig !== undefined) {
    room.mqttConfig = {
      broker: mqttConfig.broker || room.mqttConfig?.broker || 'broker.emqx.io',
      port: Number(mqttConfig.port) || room.mqttConfig?.port || 1883,
      clientId: mqttConfig.clientId || room.mqttConfig?.clientId || `ecosmart_gateway_${roomId}`,
      username: mqttConfig.username !== undefined ? mqttConfig.username : room.mqttConfig?.username,
      password: mqttConfig.password !== undefined ? mqttConfig.password : room.mqttConfig?.password,
      subTopic: mqttConfig.subTopic || room.mqttConfig?.subTopic || `ecosmart/${roomId.replace('room_', '')}/telemetry`,
      pubTopic: mqttConfig.pubTopic || room.mqttConfig?.pubTopic || `ecosmart/${roomId.replace('room_', '')}/control`,
      status: room.mqttConfig?.status || 'CONNECTED',
    };
  }

  db.logs.unshift({
    id: `log_${Date.now()}`,
    timestamp: new Date().toISOString(),
    category: 'SYSTEM',
    user: user || 'Admin',
    action: `Cập nhật cấu hình phòng ${room.name}`,
    details: `Cập nhật thông tin và cấu hình các Topic thành công cho phòng "${room.name}"`,
    severity: 'INFO',
  });

  // If this room is the currently active room, sync legacy values
  if (db.config.activeRoomId === roomId) {
    db.config.classroomName = room.name;
    if (room.mqttConfig) {
      db.mqtt = { ...room.mqttConfig };
    }
  }

  writeData(db);
  res.json({ status: 'success', room, rooms: db.rooms });
});

// PUT update MQTT Config for a specific room topic
app.put('/api/rooms/:id/mqtt', (req, res) => {
  const roomId = req.params.id;
  const { config, user } = req.body;
  if (!config) return res.status(400).json({ error: 'Cấu hình trống' });

  const db = readData();
  const room = db.rooms.find(r => r.id === roomId);
  if (!room) {
    return res.status(404).json({ error: 'Không tìm thấy phòng học phát triển tương ứng' });
  }

  room.mqttConfig = {
    broker: config.broker || room.mqttConfig?.broker || 'broker.emqx.io',
    port: Number(config.port) || room.mqttConfig?.port || 1883,
    clientId: config.clientId || room.mqttConfig?.clientId || `ecosmart_gateway_${roomId}`,
    username: config.username,
    password: config.password,
    subTopic: config.subTopic || room.mqttConfig?.subTopic || `ecosmart/${roomId}/telemetry`,
    pubTopic: config.pubTopic || room.mqttConfig?.pubTopic || `ecosmart/${roomId}/control`,
    status: 'CONNECTED',
  };

  db.logs.unshift({
    id: `log_${Date.now()}`,
    timestamp: new Date().toISOString(),
    category: 'MQTT',
    user: user || 'Admin',
    action: `Cấu hình Gateway MQTT cho ${room.name}`,
    details: `Tái lập Broker: [${room.mqttConfig.broker}:${room.mqttConfig.port}] | Client ID: ${room.mqttConfig.clientId}`,
    severity: 'INFO',
  });

  // If this room is the currently active room, also sync the legacy root db.mqtt config for compatible operations
  if (db.config.activeRoomId === roomId) {
    db.mqtt = { ...room.mqttConfig };
  }

  writeData(db);
  res.json({ status: 'success', room, rooms: db.rooms });
});

// POST add device to room
app.post('/api/rooms/:roomId/devices', (req, res) => {
  const { roomId } = req.params;
  const { name, type, powerConsumption, status, user } = req.body;

  if (!name || !type) {
    return res.status(400).json({ error: 'Tên và loại thiết bị không được để trống' });
  }

  const db = readData();
  const room = db.rooms.find(r => r.id === roomId);
  if (!room) {
    return res.status(404).json({ error: 'Phòng không tồn tại' });
  }

  const newDevice: CustomDevice = {
    id: `dev_${Date.now()}`,
    name,
    type,
    status: status === undefined ? false : !!status,
    powerConsumption: Number(powerConsumption) || 0,
    addedAt: new Date().toISOString()
  };

  room.devices = room.devices || [];
  room.devices.push(newDevice);

  db.logs.unshift({
    id: `log_${Date.now()}`,
    timestamp: new Date().toISOString(),
    category: 'SYSTEM',
    user: user || 'Operator',
    action: 'Thêm thiết bị phụ tải',
    details: `Đã lắp đặt thiết bị [${name}] loại [${type}] (${powerConsumption}W) vào [${room.name}]`,
    severity: 'INFO'
  });

  writeData(db);
  res.json({ status: 'success', success: true, device: newDevice, room, rooms: db.rooms });
});

// POST toggle device status in room
app.post('/api/rooms/:roomId/devices/:deviceId/toggle', (req, res) => {
  const { roomId, deviceId } = req.params;
  const { status, user } = req.body;

  const db = readData();
  const room = db.rooms.find(r => r.id === roomId);
  if (!room) {
    return res.status(404).json({ error: 'Phòng không tồn tại' });
  }

  const device = room.devices?.find(d => d.id === deviceId);
  if (!device) {
    return res.status(404).json({ error: 'Thiết bị không tồn tại trong phòng' });
  }

  device.status = status !== undefined ? !!status : !device.status;

  db.logs.unshift({
    id: `log_${Date.now()}`,
    timestamp: new Date().toISOString(),
    category: 'SYSTEM',
    user: user || 'Người dùng',
    action: `Điều khiển thiết bị`,
    details: `${device.status ? 'Bật' : 'Tắt'} thiết bị [${device.name}] tại phòng [${room.name}]`,
    severity: 'INFO'
  });

  writeData(db);
  res.json({ status: 'success', success: true, device, room, rooms: db.rooms });
});

// DELETE device from room
app.delete('/api/rooms/:roomId/devices/:deviceId', (req, res) => {
  const { roomId, deviceId } = req.params;
  const { user } = req.body;

  const db = readData();
  const room = db.rooms.find(r => r.id === roomId);
  if (!room) {
    return res.status(404).json({ error: 'Phòng không tồn tại' });
  }

  const deviceToDelete = room.devices?.find(d => d.id === deviceId);
  if (!deviceToDelete) {
    return res.status(404).json({ error: 'Thiết bị không tồn tại' });
  }

  room.devices = room.devices.filter(d => d.id !== deviceId);

  db.logs.unshift({
    id: `log_${Date.now()}`,
    timestamp: new Date().toISOString(),
    category: 'SYSTEM',
    user: user || 'Admin',
    action: 'Dỡ bỏ thiết bị',
    details: `Tháo dỡ thiết bị [${deviceToDelete.name}] khỏi phòng [${room.name}]`,
    severity: 'WARNING'
  });

  writeData(db);
  res.json({ status: 'success', success: true, room, rooms: db.rooms });
});

// GET device state (Support optional roomId query string)
app.get('/api/device-state', (req, res) => {
  const db = readData();
  const roomId = req.query.roomId;
  if (roomId) {
    const room = db.rooms.find(r => r.id === roomId);
    if (room) return res.json(room.deviceState);
  }
  res.json(db.rooms.find(r => r.id === db.config.activeRoomId)?.deviceState || db.deviceState);
});

// POST toggle circuit breaker (Aptomat/CB)
app.post('/api/device/cb', (req, res) => {
  const { state, user, roomId } = req.body;
  if (typeof state !== 'boolean') {
    return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
  }

  const db = readData();
  const targetId = roomId || db.config.activeRoomId || 'room_b102';
  const room = db.rooms.find(r => r.id === targetId);
  if (!room) {
    return res.status(404).json({ error: 'Không tìm thấy phòng tương ứng' });
  }

  room.deviceState.cbState = state;
  room.deviceState.lastUpdated = new Date().toISOString();

  if (room.id === db.config.activeRoomId) {
    db.deviceState = room.deviceState;
  }
  
  // Log event
  const log: LogEntry = {
    id: `log_${Date.now()}`,
    timestamp: new Date().toISOString(),
    category: 'CB',
    user: user || 'Người dùng',
    action: state ? 'Đóng tiếp điểm CB' : 'Mở tiếp điểm CB (Ngắt nguồn)',
    details: state ? `Cấp nguồn thành công cho phòng [${room.name}]` : `Ngắt toàn diện aptomat CB tổng phòng [${room.name}]`,
    severity: state ? 'INFO' : 'WARNING',
  };
  
  db.logs.unshift(log);
  writeData(db);

  res.json({ status: 'success', deviceState: room.deviceState });
});

// POST toggle electromagnetic lock
app.post('/api/device/lock', (req, res) => {
  const { state, user, roomId } = req.body;
  if (typeof state !== 'boolean') {
    return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
  }

  const db = readData();
  const targetId = roomId || db.config.activeRoomId || 'room_b102';
  const room = db.rooms.find(r => r.id === targetId);
  if (!room) {
    return res.status(404).json({ error: 'Không tìm thấy phòng tương ứng' });
  }

  room.deviceState.lockActive = state;
  room.deviceState.lastUpdated = new Date().toISOString();

  if (room.id === db.config.activeRoomId) {
    db.deviceState = room.deviceState;
  }

  // Log event
  const log: LogEntry = {
    id: `log_${Date.now()}`,
    timestamp: new Date().toISOString(),
    category: 'SECURITY',
    user: user || 'Người dùng',
    action: state ? 'Kích hoạt Khóa từ' : 'Tắt chủ động Khóa từ',
    details: state ? `Bật nam châm điện khóa chặt cửa phòng [${room.name}]` : `Tắt dòng điện nam châm điện mở khóa thả tự do phòng [${room.name}]`,
    severity: state ? 'INFO' : 'WARNING',
  };

  db.logs.unshift(log);
  writeData(db);

  res.json({ status: 'success', deviceState: room.deviceState });
});

// POST toggle smoke alarm state
app.post('/api/device/smoke', (req, res) => {
  const { state, user, roomId } = req.body;
  if (typeof state !== 'boolean') {
    return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
  }

  const db = readData();
  const targetId = roomId || db.config.activeRoomId || 'room_b102';
  const room = db.rooms.find(r => r.id === targetId);
  if (!room) {
    return res.status(404).json({ error: 'Không tìm thấy phòng tương ứng' });
  }

  room.deviceState.smokeDetected = state;
  room.deviceState.lastUpdated = new Date().toISOString();

  if (state === true) {
    room.deviceState.cbState = false; // Smoke automagically trips breaker
    room.deviceState.lockActive = false; // Smoke unlocks electromagnet door
  }

  if (room.id === db.config.activeRoomId) {
    db.deviceState = room.deviceState;
  }

  // Log event
  const log: LogEntry = {
    id: `log_${Date.now()}`,
    timestamp: new Date().toISOString(),
    category: 'SECURITY',
    user: user || 'Hệ thống cảm biến',
    action: state ? 'Phát hiện cảnh báo KHÓI' : 'Khôi phục cảm biến KHÓI',
    details: state ? `Phát hiện nồng độ khói vượt mức phòng [${room.name}]. Đã kích hoạt kịch bản ngắt CB & mở khóa từ khẩn cấp!` : `Cảm biến khói phòng [${room.name}] trả về trạng thái ổn định bình thường`,
    severity: state ? 'ERROR' : 'INFO',
  };

  db.logs.unshift(log);
  writeData(db);

  res.json({ status: 'success', deviceState: room.deviceState });
});

// POST toggle door open state
app.post('/api/device/door', (req, res) => {
  const { state, user, roomId } = req.body;
  if (typeof state !== 'boolean') {
    return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
  }

  const db = readData();
  const targetId = roomId || db.config.activeRoomId || 'room_b102';
  const room = db.rooms.find(r => r.id === targetId);
  if (!room) {
    return res.status(404).json({ error: 'Không tìm thấy phòng tương ứng' });
  }

  room.deviceState.doorOpen = state;
  room.deviceState.lastUpdated = new Date().toISOString();

  if (room.id === db.config.activeRoomId) {
    db.deviceState = room.deviceState;
  }

  // Log event
  const log: LogEntry = {
    id: `log_${Date.now()}`,
    timestamp: new Date().toISOString(),
    category: 'SECURITY',
    user: user || 'Hệ thống cảm biến',
    action: state ? 'Cảm biến cửa: OPEN' : 'Cảm biến cửa: CLOSED',
    details: state ? `Cửa ra vào phòng [${room.name}] đang mở` : `Cửa phòng [${room.name}] đã đóng sát`,
    severity: state ? 'WARNING' : 'INFO',
  };

  db.logs.unshift(log);
  writeData(db);

  res.json({ status: 'success', deviceState: room.deviceState });
});

// GET scenarios
app.get('/api/scenarios', (req, res) => {
  const db = readData();
  res.json(db.scenarios);
});

// POST Run scenario
app.post('/api/scenarios/run/:id', (req, res) => {
  const scenarioId = parseInt(req.params.id, 10);
  const { user, roomId } = req.body;

  const db = readData();
  const scenario = db.scenarios.find(s => s.id === scenarioId);
  if (!scenario) {
    return res.status(404).json({ error: 'Ngữ cảnh không tồn tại' });
  }

  // Deactivate all, activate this
  db.scenarios = db.scenarios.map(s => ({
    ...s,
    isActive: s.id === scenarioId,
  }));

  const activeId = roomId || db.config.activeRoomId || 'room_b102';
  const room = db.rooms.find(r => r.id === activeId);

  if (room) {
    // Perform scenario targets on CB state
    room.deviceState.cbState = scenario.cbTargetState;
    room.deviceState.lastUpdated = new Date().toISOString();

    // Map scenario values on Custom Devices in this specific room!
    if (room.devices) {
      room.devices.forEach(device => {
        if (device.type === 'LIGHT') {
          device.status = scenario.lightsTargetState !== 'OFF';
        } else if (device.type === 'AC') {
          device.status = scenario.acTargetState !== 'OFF';
        } else if (device.type === 'PROJECTOR') {
          device.status = scenario.projectorTargetState;
        }
      });
    }

    if (room.id === db.config.activeRoomId) {
      db.deviceState = room.deviceState;
    }
  }

  // Log execution
  const log: LogEntry = {
    id: `log_${Date.now()}`,
    timestamp: new Date().toISOString(),
    category: 'SCENARIO',
    user: user || 'Operator',
    action: `Kích hoạt Ngữ cảnh Bậc ${scenario.level}`,
    details: `Tên: ${scenario.name} tại phòng [${room ? room.name : 'Chung'}]. CB=${scenario.cbTargetState ? 'Bật' : 'Tắt'}, Máy điều hòa=${scenario.acTargetState}, Hệ thống chiếu sáng=${scenario.lightsTargetState}`,
    severity: scenario.level === 6 ? 'ERROR' : 'INFO',
  };

  db.logs.unshift(log);
  writeData(db);

  res.json({ status: 'success', scenarios: db.scenarios, deviceState: room ? room.deviceState : db.deviceState });
});

// PUT update scenario
app.put('/api/scenarios/:id', (req, res) => {
  const scenarioId = parseInt(req.params.id, 10);
  const updatedScenario: Scenario = req.body.scenario;
  const user = req.body.user;

  if (!updatedScenario) {
    return res.status(400).json({ error: 'Dữ liệu không đầy đủ' });
  }

  const db = readData();
  const index = db.scenarios.findIndex(s => s.id === scenarioId);
  if (index === -1) {
    return res.status(404).json({ error: 'Không tìm thấy ngữ cảnh' });
  }

  db.scenarios[index] = {
    ...db.scenarios[index],
    name: updatedScenario.name,
    description: updatedScenario.description,
    cbTargetState: updatedScenario.cbTargetState,
    acTargetState: updatedScenario.acTargetState,
    lightsTargetState: updatedScenario.lightsTargetState,
    projectorTargetState: updatedScenario.projectorTargetState,
  };

  // Add Log
  db.logs.unshift({
    id: `log_${Date.now()}`,
    timestamp: new Date().toISOString(),
    category: 'SYSTEM',
    user: user || 'Admin',
    action: `Cập nhật cấu hình kịch bản Bậc ${updatedScenario.level}`,
    details: `Sửa đổi cấu hình luật điều khiển của kịch bản [${updatedScenario.name}]`,
    severity: 'INFO',
  });

  writeData(db);
  res.json({ status: 'success', scenarios: db.scenarios });
});

// GET logs
app.get('/api/logs', (req, res) => {
  const db = readData();
  res.json(db.logs);
});

// POST Clear logs
app.post('/api/logs/all/clear', (req, res) => {
  const { user } = req.body;
  const db = readData();
  db.logs = [{
    id: `log_${Date.now()}`,
    timestamp: new Date().toISOString(),
    category: 'SYSTEM',
    user: user || 'Admin',
    action: 'Xóa toàn bộ Logs vận hành',
    details: 'Kho dữ liệu logs cũ đã được làm sạch thành công bởi Admin',
    severity: 'WARNING',
  }];
  writeData(db);
  res.json({ status: 'success', logs: db.logs });
});

// POST add manual trace log (for custom manual tasks etc.)
app.post('/api/logs/add', (req, res) => {
  const { category, user, action, details, severity } = req.body;
  const db = readData();
  const newLog: LogEntry = {
    id: `log_${Date.now()}`,
    timestamp: new Date().toISOString(),
    category: category || 'SYSTEM',
    user: user || 'Anonymous',
    action: action || 'Thao tác thủ công',
    details: details || 'Không có mô tả chi tiết',
    severity: severity || 'INFO',
  };
  db.logs.unshift(newLog);
  writeData(db);
  res.json({ status: 'success', log: newLog });
});

// GET report data (Energy history)
app.get('/api/reports/history', (req, res) => {
  const db = readData();
  res.json(db.history);
});

// PUT updates energy history points
app.post('/api/reports/simulate-point', (req, res) => {
  const { energyUsed, avgPower, temperature, humidity } = req.body;
  const db = readData();
  const newPoint: EnergyHistory = {
    timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    energyUsed: Number(energyUsed) || 1.2,
    avgPower: Number(avgPower) || 1.1,
    temperature: Number(temperature) || 25,
    humidity: Number(humidity) || 60,
  };
  db.history.push(newPoint);
  if (db.history.length > 30) db.history.shift(); // keep sliding
  writeData(db);
  res.json(db.history);
});

// GET MQTT Configuration
app.get('/api/mqtt/config', (req, res) => {
  const db = readData();
  res.json(db.mqtt);
});

// PUT update MQTT Details
app.put('/api/mqtt/config', (req, res) => {
  const { config, user } = req.body;
  if (!config) return res.status(400).json({ error: 'Cấu hình trống' });

  const db = readData();
  db.mqtt = {
    ...db.mqtt,
    broker: config.broker || db.mqtt.broker,
    port: Number(config.port) || db.mqtt.port,
    clientId: config.clientId || db.mqtt.clientId,
    username: config.username,
    password: config.password,
    subTopic: config.subTopic || db.mqtt.subTopic,
    pubTopic: config.pubTopic || db.mqtt.pubTopic,
    status: 'CONNECTING',
  };

  db.logs.unshift({
    id: `log_${Date.now()}`,
    timestamp: new Date().toISOString(),
    category: 'MQTT',
    user: user || 'Admin',
    action: 'Yêu cầu kết nối lại MQTT Broker',
    details: `Đang liên kết với địa chỉ ${db.mqtt.broker}:${db.mqtt.port}...`,
    severity: 'INFO',
  });
  writeData(db);

  // Set timeout to complete connection simulation after 1.5s
  setTimeout(() => {
    const updatedDb = readData();
    updatedDb.mqtt.status = 'CONNECTED';
    updatedDb.logs.unshift({
      id: `log_${Date.now()}_conn`,
      timestamp: new Date().toISOString(),
      category: 'MQTT',
      user: 'Hệ thống',
      action: 'Kết nối dòng dữ liệu MQTT của Gateway',
      details: `Liên kết thành công với ${updatedDb.mqtt.broker}:${updatedDb.mqtt.port}. Đang subscribe topic: ${updatedDb.mqtt.subTopic}`,
      severity: 'INFO',
    });
    writeData(updatedDb);
  }, 1500);

  res.json({ status: 'success', mqtt: db.mqtt });
});

function getValueByPath(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((acc, part) => {
    if (acc === null || acc === undefined) return undefined;
    return acc[part];
  }, obj);
}

// POST Publish control command
app.post('/api/mqtt/publish', (req, res) => {
  const { topic, payload, user } = req.body;
  const db = readData();

  let payloadObj: any = null;
  try {
    payloadObj = typeof payload === 'string' ? JSON.parse(payload) : payload;
  } catch (err) {
    payloadObj = payload;
  }
  
  db.logs.unshift({
    id: `log_${Date.now()}`,
    timestamp: new Date().toISOString(),
    category: 'MQTT',
    user: user || 'Operator',
    action: 'Xuất bản bản tin MQTT (Publish)',
    details: `Topic: ${topic || db.mqtt.pubTopic} | Payload: ${JSON.stringify(payloadObj)}`,
    severity: 'INFO',
  });

  // Try to find matching room based on topic (e.g. ecosmart/b102/telemetry)
  const topicStr = topic || '';
  const parts = topicStr.split('/');
  let targetRoom = null;
  if (parts.length >= 2) {
    const roomCode = parts[1]; // e.g. b102 or room_b102
    targetRoom = db.rooms.find(r => r.id.toLowerCase() === `room_${roomCode}`.toLowerCase() || r.id.toLowerCase() === roomCode.toLowerCase());
  }

  // If no room matched by topic splitting, fallback to activeRoomId
  if (!targetRoom && db.config.activeRoomId) {
    targetRoom = db.rooms.find(r => r.id === db.config.activeRoomId);
  }

  if (targetRoom && payloadObj) {
    // Process mappings to update targetRoom.deviceState
    let updatedCount = 0;
    db.mappings.forEach((map) => {
      if (!map.isActive) return;
      
      const rawVal = getValueByPath(payloadObj, map.jsonPath);
      if (rawVal !== undefined) {
        let converted: number | boolean = Number(rawVal) * map.multiplier;
        if (typeof rawVal === 'boolean') {
          converted = rawVal;
        } else if (map.functionName === 'CB_STATE' || map.functionName === 'DOOR_OPEN' || map.functionName === 'SMOKE_DETECTED' || map.functionName === 'LOCK_ACTIVE') {
          converted = rawVal === 'ON' || rawVal === 'true' || rawVal === true || rawVal === 1 || rawVal === '1';
        }
        
        switch (map.functionName) {
          case 'VOLTAGE':
            targetRoom.deviceState.voltage = Number(converted);
            break;
          case 'CURRENT':
            targetRoom.deviceState.current = Number(converted);
            break;
          case 'POWER':
            targetRoom.deviceState.power = Number(converted);
            break;
          case 'TEMPERATURE':
            targetRoom.deviceState.temperature = Number(converted);
            break;
          case 'HUMIDITY':
            targetRoom.deviceState.humidity = Number(converted);
            break;
          case 'CB_STATE':
            targetRoom.deviceState.cbState = !!converted;
            break;
          case 'DOOR_OPEN':
            targetRoom.deviceState.doorOpen = !!converted;
            break;
          case 'SMOKE_DETECTED':
            targetRoom.deviceState.smokeDetected = !!converted;
            break;
          case 'LOCK_ACTIVE':
            targetRoom.deviceState.lockActive = !!converted;
            break;
        }
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      targetRoom.deviceState.lastUpdated = new Date().toISOString();
      if (targetRoom.id === db.config.activeRoomId) {
        db.deviceState = targetRoom.deviceState;
      }
      
      db.logs.unshift({
        id: `log_${Date.now()}_parse`,
        timestamp: new Date().toISOString(),
        category: 'MQTT',
        user: 'Hệ thống Mappings',
        action: 'Giải mã dữ liệu Gateway thành công (Decoded)',
        details: `Đã cập nhật ${updatedCount} tham số cho phòng [${targetRoom.name}] qua bộ quét JSON Path.`,
        severity: 'INFO',
      });
    }
  }

  writeData(db);
  res.json({ status: 'success', message: 'Publish successful', rooms: db.rooms });
});

// GET MQTT mappings
app.get('/api/mqtt/mappings', (req, res) => {
  const db = readData();
  res.json(db.mappings || []);
});

// POST Add mapping
app.post('/api/mqtt/mappings', (req, res) => {
  const { mapping, user } = req.body;
  if (!mapping || !mapping.topic || !mapping.functionName) {
    return res.status(400).json({ error: 'Thiếu thông tin cấu hình' });
  }

  const db = readData();
  db.mappings = db.mappings || [];

  const newMapping: SignalMapping = {
    id: `map_${Date.now()}`,
    topic: mapping.topic,
    functionName: mapping.functionName,
    jsonPath: mapping.jsonPath || 'value',
    multiplier: Number(mapping.multiplier) || 1.0,
    description: mapping.description || `Định tuyến tự động cho ${mapping.functionName}`,
    isActive: mapping.isActive !== undefined ? mapping.isActive : true
  };

  db.mappings.push(newMapping);

  db.logs.unshift({
    id: `log_${Date.now()}`,
    timestamp: new Date().toISOString(),
    category: 'MQTT',
    user: user || 'Admin',
    action: 'Thêm định tuyến tín hiệu MQTT',
    details: `Tạo cổng ánh xạ luồng [${newMapping.functionName}] -> topic [${newMapping.topic}] (Path: ${newMapping.jsonPath})`,
    severity: 'INFO',
  });

  writeData(db);
  res.json({ status: 'success', mappings: db.mappings });
});

// PUT update MQTT mapping
app.put('/api/mqtt/mappings/:id', (req, res) => {
  const mappingId = req.params.id;
  const { mapping, user } = req.body;
  if (!mapping) return res.status(400).json({ error: 'Dữ liệu trống' });

  const db = readData();
  db.mappings = db.mappings || [];

  const index = db.mappings.findIndex(m => m.id === mappingId);
  if (index === -1) {
    return res.status(404).json({ error: 'Không tìm thấy cấu hình định tuyến' });
  }

  db.mappings[index] = {
    ...db.mappings[index],
    topic: mapping.topic !== undefined ? mapping.topic : db.mappings[index].topic,
    functionName: mapping.functionName !== undefined ? mapping.functionName : db.mappings[index].functionName,
    jsonPath: mapping.jsonPath !== undefined ? mapping.jsonPath : db.mappings[index].jsonPath,
    multiplier: mapping.multiplier !== undefined ? Number(mapping.multiplier) : db.mappings[index].multiplier,
    description: mapping.description !== undefined ? mapping.description : db.mappings[index].description,
    isActive: mapping.isActive !== undefined ? mapping.isActive : db.mappings[index].isActive,
  };

  db.logs.unshift({
    id: `log_${Date.now()}`,
    timestamp: new Date().toISOString(),
    category: 'MQTT',
    user: user || 'Admin',
    action: 'Cấu hình định tuyến tín hiệu MQTT',
    details: `Cập nhật luồng ánh xạ [${db.mappings[index].functionName}] -> topic [${db.mappings[index].topic}] (Path: ${db.mappings[index].jsonPath})`,
    severity: 'INFO',
  });

  writeData(db);
  res.json({ status: 'success', mappings: db.mappings });
});

// DELETE MQTT mapping
app.delete('/api/mqtt/mappings/:id', (req, res) => {
  const mappingId = req.params.id;
  const { user } = req.body;

  const db = readData();
  db.mappings = db.mappings || [];

  const found = db.mappings.find(m => m.id === mappingId);
  if (!found) {
    return res.status(404).json({ error: 'Không tìm thấy cấu hình định tuyến' });
  }

  db.mappings = db.mappings.filter(m => m.id !== mappingId);

  db.logs.unshift({
    id: `log_${Date.now()}`,
    timestamp: new Date().toISOString(),
    category: 'MQTT',
    user: user || 'Admin',
    action: 'Xóa định tuyến tín hiệu MQTT',
    details: `Hủy định tuyến chức năng [${found.functionName}] khỏi topic [${found.topic}]`,
    severity: 'WARNING',
  });

  writeData(db);
  res.json({ status: 'success', mappings: db.mappings });
});

// POST Reset MQTT mappings to default
app.post('/api/mqtt/mappings/reset', (req, res) => {
  const { user } = req.body;
  const db = readData();

  const defaultMappings: SignalMapping[] = [
    {
      id: "map_voltage",
      topic: "ecosmart/+/telemetry",
      functionName: "VOLTAGE",
      jsonPath: "telemetry.u_V",
      multiplier: 1.0,
      description: "Đo điện áp nguồn cấp thực tế (V) từ bo mạch IoT Gateway",
      isActive: true
    },
    {
      id: "map_current",
      topic: "ecosmart/+/telemetry",
      functionName: "CURRENT",
      jsonPath: "telemetry.i_A",
      multiplier: 1.0,
      description: "Đo cường độ dòng tải tiêu thụ tổng của toàn bộ phòng học (A)",
      isActive: true
    },
    {
      id: "map_power",
      topic: "ecosmart/+/telemetry",
      functionName: "POWER",
      jsonPath: "telemetry.p_kW",
      multiplier: 1.0,
      description: "Công suất tiêu thụ tổng thời gian thực (kW)",
      isActive: true
    },
    {
      id: "map_temp",
      topic: "ecosmart/+/telemetry",
      functionName: "TEMPERATURE",
      jsonPath: "telemetry.temp_c",
      multiplier: 1.0,
      description: "Độ ẩm/Nhiệt độ môi trường phòng (°C) từ cảm biến tích hợp DHT22",
      isActive: true
    },
    {
      id: "map_hum",
      topic: "ecosmart/+/telemetry",
      functionName: "HUMIDITY",
      jsonPath: "telemetry.hum_pct",
      multiplier: 1.0,
      description: "Độ ẩm tương đối môi trường học tập (% RH)",
      isActive: true
    },
    {
      id: "map_cb",
      topic: "ecosmart/+/control",
      functionName: "CB_STATE",
      jsonPath: "cmd.cbState",
      multiplier: 1.0,
      description: "Tín hiệu phản hồi cơ cấu Aptomat thông minh (CB) đóng/cắt",
      isActive: true
    },
    {
      id: "map_door",
      topic: "ecosmart/+/telemetry",
      functionName: "DOOR_OPEN",
      jsonPath: "telemetry.doorOpen",
      multiplier: 1.0,
      description: "Cảm biến báo trạng thái cửa ra vào phòng học đóng/mở",
      isActive: true
    },
    {
      id: "map_smoke",
      topic: "ecosmart/+/telemetry",
      functionName: "SMOKE_DETECTED",
      jsonPath: "telemetry.smokeDetected",
      multiplier: 1.0,
      description: "Tín hiệu cảnh báo nguy cơ hỏa hoạn, rò rỉ khói độc hại nguy cấp",
      isActive: true
    },
    {
      id: "map_lock",
      topic: "ecosmart/+/telemetry",
      functionName: "LOCK_ACTIVE",
      jsonPath: "telemetry.lockActive",
      multiplier: 1.0,
      description: "Phản hồi dòng khóa chốt an ninh tự động của phòng học",
      isActive: true
    }
  ];

  db.mappings = defaultMappings;

  db.logs.unshift({
    id: `log_${Date.now()}`,
    timestamp: new Date().toISOString(),
    category: 'MQTT',
    user: user || 'Admin',
    action: 'Khôi phục thiết lập định tuyến MQTT',
    details: 'Đã hoàn trả toàn bộ cấu hình định tuyến luồng tín hiệu về mặc định của nhà sản xuất',
    severity: 'WARNING',
  });

  writeData(db);
  res.json({ status: 'success', mappings: db.mappings });
});

// GET System Config
app.get('/api/system/config', (req, res) => {
  const db = readData();
  res.json(db.config);
});

// PUT System Config
app.put('/api/system/config', (req, res) => {
  const { config, user } = req.body;
  if (!config) return res.status(400).json({ error: 'Cấu hình trống' });

  const db = readData();
  db.config = {
    ...db.config,
    classroomName: config.classroomName || db.config.classroomName,
    logoUrl: config.logoUrl !== undefined ? config.logoUrl : db.config.logoUrl,
    customLogoIndex: config.customLogoIndex !== undefined ? config.customLogoIndex : db.config.customLogoIndex,
    isSimulationActive: config.isSimulationActive !== undefined ? config.isSimulationActive : db.config.isSimulationActive,
  };

  db.logs.unshift({
    id: `log_${Date.now()}`,
    timestamp: new Date().toISOString(),
    category: 'SYSTEM',
    user: user || 'Admin',
    action: 'Thay đổi tùy chỉnh hệ thống',
    details: `Ecosmart Classroom: đổi tên thành [${db.config.classroomName}], logoIndex=${db.config.customLogoIndex}`,
    severity: 'INFO',
  });

  writeData(db);
  res.json({ status: 'success', config: db.config });
});


// Serve Vite or static files
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Ecosmart Classroom IOC running on http://localhost:${PORT}`);
  });
}

startServer();
