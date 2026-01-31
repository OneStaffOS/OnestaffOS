/**
 * Ticket System Enums
 * Based on training data from train.csv
 */

export enum TicketType {
  SOFTWARE = 'software',
  HARDWARE = 'hardware',
  NETWORK = 'network',
}

export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  PENDING = 'pending',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum AgentType {
  AGENT_1 = 'Agent 1', // Software issues
  AGENT_2 = 'Agent 2', // Hardware issues
  AGENT_3 = 'Agent 3', // Network issues
}

// Sub-categories for each ticket type
export enum SoftwareSubCategory {
  APPLICATION_ERROR = 'application_error',
  INSTALLATION = 'installation',
  LICENSE = 'license',
  PERFORMANCE = 'performance',
  OTHER = 'other',
}

export enum HardwareSubCategory {
  COMPUTER = 'computer',
  PRINTER = 'printer',
  PHONE = 'phone',
  MONITOR = 'monitor',
  KEYBOARD_MOUSE = 'keyboard_mouse',
  OTHER = 'other',
}

export enum NetworkSubCategory {
  CONNECTIVITY = 'connectivity',
  WIFI = 'wifi',
  VPN = 'vpn',
  EMAIL = 'email',
  SLOW_SPEED = 'slow_speed',
  OTHER = 'other',
}
