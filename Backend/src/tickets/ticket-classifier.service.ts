import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

interface ClassificationResult {
  priority: string;
  type: string;
  predicted_agent: string;
  predicted_agent_id: string;
  confidence: number;
  probabilities: {
    'Agent 1': number;
    'Agent 2': number;
    'Agent 3': number;
  };
  specialization: string;
}

@Injectable()
export class TicketClassifierService implements OnModuleInit {
  private readonly logger = new Logger(TicketClassifierService.name);
  private pythonPath: string;
  private classifierPath: string;
  private modelLoaded = false;

  // Agent ID mappings
  private readonly agentIds = {
    'Agent 1': '692479b918668dee67209282',
    'Agent 2': '692a056cfad7d194cd3f0992',
    'Agent 3': '69438f79c1af7ec03ff7fed0',
  };

  // Agent specializations
  private readonly agentSpecializations = {
    'Agent 1': 'software',
    'Agent 2': 'hardware',
    'Agent 3': 'network',
  };

  constructor() {
    // Find Python path - check multiple locations
    const possiblePythonPaths = [
      path.join(process.cwd(), '..', '.venv', 'bin', 'python'),
      path.join(process.cwd(), '.venv', 'bin', 'python'),
      '/usr/bin/python3',
      '/usr/local/bin/python3',
      'python3',
      'python',
    ];
    
    for (const pyPath of possiblePythonPaths) {
      if (fs.existsSync(pyPath) || !pyPath.includes('/')) {
        this.pythonPath = pyPath;
        break;
      }
    }
    
    // Path to classifier scripts - use src directory since Python files are there
    // __dirname at runtime points to dist/tickets, we need src/tickets/classifier
    const srcPath = path.join(process.cwd(), 'src', 'tickets', 'classifier');
    const distPath = path.join(__dirname, 'classifier');
    
    // Prefer src path (where Python files actually are)
    this.classifierPath = fs.existsSync(srcPath) ? srcPath : distPath;
  }

  async onModuleInit() {
    this.logger.log('Initializing Ticket Classifier Service...');
    this.logger.log(`Python path: ${this.pythonPath}`);
    this.logger.log(`Classifier path: ${this.classifierPath}`);
    
    // Verify model exists
    const modelPath = path.join(this.classifierPath, 'ticket_classifier_model.joblib');
    if (fs.existsSync(modelPath)) {
      this.modelLoaded = true;
      this.logger.log('✅ Neural Network model found and ready');
    } else {
      this.logger.warn('⚠️ Model not found. Please run train_model.py first.');
      this.logger.warn(`Expected model path: ${modelPath}`);
    }
  }

  /**
   * Run classification Python script
   */
  private runClassification(priority: string, ticketType: string): Promise<ClassificationResult> {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(this.classifierPath, 'classify.py');
      const process = spawn(this.pythonPath, [scriptPath, priority, ticketType], {
        cwd: this.classifierPath,
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout.trim());
            if (result.error) {
              reject(new Error(result.error));
            } else {
              resolve(result);
            }
          } catch (e) {
            reject(new Error(`Failed to parse classifier output: ${stdout}`));
          }
        } else {
          reject(new Error(`Classification failed: ${stderr || stdout}`));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Classify a ticket using the neural network
   */
  async classifyTicket(
    priority: string,
    ticketType: string,
  ): Promise<ClassificationResult> {
    try {
      return await this.runClassification(priority.toLowerCase(), ticketType.toLowerCase());
    } catch (error) {
      this.logger.error(`Classification failed: ${error.message}`);
      
      // Fallback to rule-based assignment
      return this.fallbackClassification(priority, ticketType);
    }
  }

  /**
   * Get agent assignment based on ticket priority and type
   * Uses neural network prediction + routing algorithm
   */
  async getAgentAssignment(
    priority: string,
    ticketType: string,
  ): Promise<{ agentId: string; agentName: string; confidence: number }> {
    try {
      const result = await this.classifyTicket(priority, ticketType);
      return {
        agentId: result.predicted_agent_id,
        agentName: result.predicted_agent,
        confidence: result.confidence,
      };
    } catch (error) {
      this.logger.error(`Agent assignment failed: ${error.message}`);
      
      // Fallback based on type
      const fallback = this.fallbackClassification(priority, ticketType);
      return {
        agentId: fallback.predicted_agent_id,
        agentName: fallback.predicted_agent,
        confidence: 1.0,
      };
    }
  }

  /**
   * Fallback rule-based classification when neural network is unavailable
   */
  private fallbackClassification(
    priority: string,
    ticketType: string,
  ): ClassificationResult {
    const typeToAgent: Record<string, string> = {
      software: 'Agent 1',
      hardware: 'Agent 2',
      network: 'Agent 3',
    };

    const predictedAgent = typeToAgent[ticketType.toLowerCase()] || 'Agent 1';

    return {
      priority: priority.toLowerCase(),
      type: ticketType.toLowerCase(),
      predicted_agent: predictedAgent,
      predicted_agent_id: this.agentIds[predictedAgent],
      confidence: 1.0,
      probabilities: {
        'Agent 1': predictedAgent === 'Agent 1' ? 1.0 : 0.0,
        'Agent 2': predictedAgent === 'Agent 2' ? 1.0 : 0.0,
        'Agent 3': predictedAgent === 'Agent 3' ? 1.0 : 0.0,
      },
      specialization: this.agentSpecializations[predictedAgent],
    };
  }

  /**
   * Get agent ID by name
   */
  getAgentId(agentName: string): string | null {
    return this.agentIds[agentName] || null;
  }

  /**
   * Get agent name by ID
   */
  getAgentName(agentId: string): string | null {
    for (const [name, id] of Object.entries(this.agentIds)) {
      if (id === agentId) return name;
    }
    return null;
  }

  /**
   * Get all agent IDs
   */
  getAllAgentIds(): Record<string, string> {
    return { ...this.agentIds };
  }

  /**
   * Get agent specialization
   */
  getAgentSpecialization(agentName: string): string | null {
    return this.agentSpecializations[agentName] || null;
  }
  
  /**
   * Check if model is loaded
   */
  isModelLoaded(): boolean {
    return this.modelLoaded;
  }
}
