export async function authorizeWithOpa(relationship: any, opaUrl: string): Promise<{ allow: boolean; reason?: string }> {
  try {
    const response = await fetch(`${opaUrl}/v1/data/twgt/${relationship.kind}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: relationship }),
      signal: AbortSignal.timeout(500) // 500ms timeout
    });

    if (!response.ok) {
      throw new Error(`OPA returned HTTP ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.result) {
      return { allow: false, reason: "OPA response missing result block" };
    }

    return {
      allow: result.result.allow === true,
      reason: result.result.deny_reason
    };
  } catch (error: any) {
    // CRITICAL: Fail closed on network error or timeout
    throw new Error(`OPA_UNAVAILABLE: ${error.message}`);
  }
}
