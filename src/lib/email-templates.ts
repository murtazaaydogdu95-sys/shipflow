
/** Escape user-controlled strings before interpolating into HTML */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function layout(content: string, unsubscribeUrl?: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;color:#111827;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
    <div style="background:white;border-radius:8px;padding:32px;border:1px solid #e5e7eb;">
      ${content}
    </div>
    <div style="text-align:center;margin-top:24px;font-size:12px;color:#9ca3af;">
      <p>Sent by Codepylot</p>
      ${unsubscribeUrl ? `<p><a href="${unsubscribeUrl}" style="color:#6b7280;text-decoration:underline;">Unsubscribe from email notifications</a></p>` : ""}
    </div>
  </div>
</body>
</html>`;
}

export function storyAssignedEmail({
  storyTitle,
  projectName,
  assignerName,
  storyUrl,
  unsubscribeUrl,
}: {
  storyTitle: string;
  projectName: string;
  assignerName: string;
  storyUrl: string;
  unsubscribeUrl?: string;
}) {
  return {
    subject: `You've been assigned to: ${storyTitle}`,
    html: layout(
      `
      <h2 style="margin:0 0 16px;font-size:18px;">Story Assigned</h2>
      <p style="margin:0 0 8px;color:#374151;"><strong>${esc(assignerName)}</strong> assigned you to a story in <strong>${esc(projectName)}</strong>:</p>
      <p style="margin:0 0 24px;font-size:16px;font-weight:600;">${esc(storyTitle)}</p>
      <a href="${storyUrl}" style="display:inline-block;background:#111827;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;">View Story</a>
      `,
      unsubscribeUrl
    ),
  };
}

export function commentAddedEmail({
  storyTitle,
  commenterName,
  commentPreview,
  storyUrl,
  unsubscribeUrl,
}: {
  storyTitle: string;
  commenterName: string;
  commentPreview: string;
  storyUrl: string;
  unsubscribeUrl?: string;
}) {
  return {
    subject: `New comment on: ${storyTitle}`,
    html: layout(
      `
      <h2 style="margin:0 0 16px;font-size:18px;">New Comment</h2>
      <p style="margin:0 0 8px;color:#374151;"><strong>${esc(commenterName)}</strong> commented on <strong>${esc(storyTitle)}</strong>:</p>
      <div style="margin:0 0 24px;padding:12px;background:#f3f4f6;border-radius:6px;color:#374151;font-size:14px;">${esc(commentPreview)}</div>
      <a href="${storyUrl}" style="display:inline-block;background:#111827;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;">View Story</a>
      `,
      unsubscribeUrl
    ),
  };
}

export function inviteEmail({
  orgName,
  inviterName,
  inviteUrl,
}: {
  orgName: string;
  inviterName: string;
  inviteUrl: string;
}) {
  return {
    subject: `You're invited to join ${orgName} on Codepylot`,
    html: layout(
      `
      <h2 style="margin:0 0 16px;font-size:18px;">Organization Invite</h2>
      <p style="margin:0 0 24px;color:#374151;"><strong>${esc(inviterName)}</strong> has invited you to join <strong>${esc(orgName)}</strong> on Codepylot.</p>
      <a href="${inviteUrl}" style="display:inline-block;background:#111827;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;">Accept Invite</a>
      <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">This invite expires in 7 days.</p>
      `
    ),
  };
}

export function passwordResetEmail({ resetUrl }: { resetUrl: string }) {
  return {
    subject: "Reset your Codepylot password",
    html: layout(
      `
      <h2 style="margin:0 0 16px;font-size:18px;">Password Reset</h2>
      <p style="margin:0 0 24px;color:#374151;">Click the link below to reset your password. This link expires in 1 hour.</p>
      <a href="${resetUrl}" style="display:inline-block;background:#111827;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;">Reset Password</a>
      <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">If you didn&apos;t request this, you can safely ignore this email.</p>
      `
    ),
  };
}

export function dailyDigestEmail({
  userName,
  notifications,
  dashboardUrl,
}: {
  userName: string;
  notifications: { title: string; message: string }[];
  dashboardUrl: string;
}) {
  const items = notifications
    .map((n) => `<li style="margin:4px 0;color:#374151;">${esc(n.title)}: ${esc(n.message)}</li>`)
    .join("");
  return {
    subject: `Your Codepylot daily digest (${notifications.length} updates)`,
    html: layout(
      `
      <h2 style="margin:0 0 16px;font-size:18px;">Daily Digest</h2>
      <p style="margin:0 0 16px;color:#374151;">Hi ${esc(userName)}, here's what happened in the last 24 hours:</p>
      <ul style="margin:0 0 24px;padding-left:20px;">${items}</ul>
      <a href="${dashboardUrl}" style="display:inline-block;background:#111827;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;">Open Dashboard</a>
      `
    ),
  };
}

export function launchDateUpdatedEmail({
  orgName,
  updaterName,
  launchDate,
}: {
  orgName: string;
  updaterName: string;
  launchDate: string;
}) {
  return {
    subject: `Launch date updated for ${orgName}`,
    html: layout(
      `
      <h2 style="margin:0 0 16px;font-size:18px;">Launch Date Updated</h2>
      <p style="margin:0 0 8px;color:#374151;"><strong>${esc(updaterName)}</strong> updated the launch date for <strong>${esc(orgName)}</strong>:</p>
      <div style="margin:0 0 24px;padding:16px;background:#f3f4f6;border-radius:8px;text-align:center;">
        <p style="margin:0;font-size:20px;font-weight:700;color:#111827;">${esc(launchDate)}</p>
      </div>
      <p style="margin:0;color:#6b7280;font-size:14px;">Make sure your team is prepared for launch. All scheduled notifications will use this updated date.</p>
      `
    ),
  };
}

export function agentCompletedEmail({
  storyTitle,
  projectName,
  storyUrl,
  unsubscribeUrl,
}: {
  storyTitle: string;
  projectName: string;
  storyUrl: string;
  unsubscribeUrl?: string;
}) {
  return {
    subject: `Agent completed: ${storyTitle}`,
    html: layout(
      `
      <h2 style="margin:0 0 16px;font-size:18px;">Agent Completed Story</h2>
      <p style="margin:0 0 8px;color:#374151;">An agent has completed a story in <strong>${esc(projectName)}</strong>:</p>
      <p style="margin:0 0 24px;font-size:16px;font-weight:600;">${esc(storyTitle)}</p>
      <a href="${storyUrl}" style="display:inline-block;background:#111827;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;">Review Story</a>
      `,
      unsubscribeUrl
    ),
  };
}
