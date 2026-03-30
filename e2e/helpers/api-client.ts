import type { APIRequestContext } from "@playwright/test";

export class TestApiClient {
  constructor(private request: APIRequestContext, private baseURL: string) {}

  async createStory(projectId: string, data: Record<string, unknown>) {
    const resp = await this.request.post(
      `${this.baseURL}/api/projects/${projectId}/stories`,
      { data }
    );
    return resp.json();
  }

  async updateStory(projectId: string, storyId: string, data: Record<string, unknown>) {
    const resp = await this.request.patch(
      `${this.baseURL}/api/projects/${projectId}/stories/${storyId}`,
      { data }
    );
    return resp.json();
  }

  async deleteStory(projectId: string, storyId: string) {
    await this.request.delete(
      `${this.baseURL}/api/projects/${projectId}/stories/${storyId}`
    );
  }

  async confirmReview(projectId: string, storyId: string) {
    const resp = await this.request.post(
      `${this.baseURL}/api/projects/${projectId}/stories/${storyId}/confirm-review`
    );
    return resp.json();
  }

  async createProject(data: Record<string, unknown>) {
    const resp = await this.request.post(
      `${this.baseURL}/api/projects`,
      { data }
    );
    return resp.json();
  }

  async inviteMember(orgId: string, email: string, role: string) {
    const resp = await this.request.post(
      `${this.baseURL}/api/orgs/${orgId}/invites`,
      { data: { email, role } }
    );
    return resp.json();
  }
}
