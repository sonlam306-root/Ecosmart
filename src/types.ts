export type UserRole = 'ADMIN' | 'OPERATOR' | 'VIEWER';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface MqttConfig {
  broker: string;
  port: number;
  clientId: string;
  username?: string;
  password?: string;
  subTopic: string;
  pubTopic: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING';
}

export interface DeviceState {
  cbState: boolean; // Smart Breaker: True = ON, False = OFF
  voltage: number; // V
  current: number; // A
  power: number; // kW
  reactivePower: number; // kVAR
  frequency: number; // Hz
  powerFactor: number; // cos phi
  totalEnergy: number; // kWh
  temperature: number; // °C
  humidity: number; // % RH
  doorOpen: boolean; // True = OPEN, False = CLOSED
  smokeDetected: boolean; // True = SMOKE, False = CLEAR
  lockActive: boolean; // True = LOCKED (powered), False = UNLOCKED (turned off)
  lastUpdated: string;
}

export interface Scenario {
  id: number;
  level: number; // 1-7
  name: string;
  icon: string; // Lucide icon name
  description: string;
  cbTargetState: boolean;
  acTargetState: 'ON' | 'OFF' | 'ECO';
  lightsTargetState: 'ON' | 'OFF' | 'DIM';
  projectorTargetState: boolean;
  isActive: boolean;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  category: 'MQTT' | 'CB' | 'SCENARIO' | 'SYSTEM' | 'SECURITY';
  user: string;
  action: string;
  details: string;
  severity: 'INFO' | 'WARNING' | 'ERROR';
}

export interface EnergyHistory {
  timestamp: string; // HH:mm or DD/MM
  energyUsed: number; // kWh
  avgPower: number; // kW
  temperature: number; // °C
  humidity: number; // %
}

export interface CustomDevice {
  id: string;
  name: string;
  type: 'LIGHT' | 'AC' | 'PROJECTOR' | 'DOORLOCK' | 'SMOKE' | 'FAN' | 'TV' | 'COMPUTER' | 'CUSTOM';
  status: boolean;
  powerConsumption: number; // active power draw in W
  addedAt: string;
}

export interface Room {
  id: string;
  name: string;
  status: 'NORMAL' | 'WARNING' | 'EMERGENCY';
  gridX: number;
  gridY: number;
  deviceState: DeviceState;
  devices: CustomDevice[];
  mqttConfig?: MqttConfig;
}

export interface SystemConfig {
  classroomName: string;
  logoUrl: string | null;
  customLogoIndex: number; // predefined options
  isSimulationActive: boolean;
  simSpeedMs: number;
  activeRoomId?: string; // Currently active room ID for the app
}

export interface SignalMapping {
  id: string;
  topic: string;
  functionName: 'VOLTAGE' | 'CURRENT' | 'POWER' | 'TEMPERATURE' | 'HUMIDITY' | 'CB_STATE' | 'DOOR_OPEN' | 'SMOKE_DETECTED' | 'LOCK_ACTIVE';
  jsonPath: string;
  multiplier: number;
  description: string;
  isActive: boolean;
}

