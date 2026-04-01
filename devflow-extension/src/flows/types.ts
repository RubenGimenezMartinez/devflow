/** Interfaces del Flow Engine */

export interface FlowDefinition {
  name: string;
  description: string;
  triggerTypes: string[];
  variables: {
    jira: string[];
    derived: string[];
  };
  steps: FlowStep[];
}

export interface FlowStep {
  id: string;
  name: string;
  agent: string;
  enabled: boolean;
  instructions: string;
  inputs: string[];
  outputs: string[];
  conditions: StepConditions;
}

export interface StepConditions {
  next?: string;
  back?: string;
  skipIf?: string;
}

export interface FlowExecution {
  id: string;
  flowName: string;
  issueKey: string;
  currentStepId: string;
  status: "running" | "paused" | "completed" | "error";
  variables: Record<string, unknown>;
  history: StepResult[];
  startedAt: string;
  updatedAt: string;
}

export interface StepResult {
  stepId: string;
  status: "success" | "error" | "skipped";
  outputs: Record<string, unknown>;
  timestamp: string;
}
