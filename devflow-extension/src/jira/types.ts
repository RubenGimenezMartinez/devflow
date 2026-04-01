/** Interfaces para la integración con Jira REST API */

export interface JiraIssue {
  key: string;
  id: string;
  self: string;
  fields: JiraIssueFields;
}

export interface JiraIssueFields {
  summary: string;
  description: string | null;
  issuetype: JiraIssueType;
  priority: JiraPriority;
  status: JiraStatus;
  components: JiraComponent[];
  labels: string[];
  reporter: JiraUser;
  assignee: JiraUser | null;
  versions: JiraVersion[];
  fixVersions: JiraVersion[];
  created: string;
  updated: string;
  [key: string]: unknown; // custom fields
}

export interface JiraIssueType {
  id: string;
  name: string;
  description: string;
  subtask: boolean;
}

export interface JiraPriority {
  id: string;
  name: string;
}

export interface JiraStatus {
  id: string;
  name: string;
  statusCategory: {
    key: string;
    name: string;
  };
}

export interface JiraComponent {
  id: string;
  name: string;
}

export interface JiraVersion {
  id: string;
  name: string;
  released: boolean;
  releaseDate?: string;
}

export interface JiraUser {
  accountId: string;
  displayName: string;
  emailAddress?: string;
}

export interface JiraComment {
  body: string;
  visibility?: {
    type: string;
    value: string;
  };
}
