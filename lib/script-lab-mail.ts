import "server-only";

function mailConfig() {
  const testUrl = process.env.NODE_ENV === "development" && process.env.SCRIPT_LAB_TEST_MAIL_URL;
  if (testUrl && /^http:\/\/127\.0\.0\.1:\d+\/emails$/.test(testUrl)) {
    return { endpoint: testUrl, from: "Script Lab Test <script-lab@example.invalid>", key: "" };
  }
  const from = process.env.SCRIPT_LAB_EMAIL_FROM?.trim();
  const key = process.env.SCRIPT_LAB_RESEND_API_KEY?.trim();
  return from && key ? { endpoint: "https://api.resend.com/emails", from, key } : null;
}

export async function sendScriptLabVerification(email: string, link: string) {
  const config = mailConfig();
  if (!config) throw new Error("Script Lab email delivery is not configured");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (config.key) headers.Authorization = `Bearer ${config.key}`;

  const response = await fetch(config.endpoint, {
    method: "POST",
    headers,
    signal: AbortSignal.timeout(8000),
    body: JSON.stringify({
      from: config.from,
      to: [email],
      subject: "Verify your AI Script Lab email",
      text: `Open this link and confirm your registration password to verify your AI Script Lab account. It expires in 30 minutes.\n\n${link}\n\nIf you did not request this, you can ignore this email.`,
    }),
  });
  if (!response.ok) throw new Error("Script Lab verification email could not be sent");
}
