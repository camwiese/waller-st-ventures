import { TAB_LABELS } from "../constants/tabs";
import { getAdminEmails } from "./admin";
import { COLORS } from "../constants/theme";
import { isValidEmail, normalizeEmail } from "./email";
import { normalizeAppUrl } from "./url";

const BRAND_NAME = "Waller Street Ventures";
const BRAND_SHORT = "WSV Data Room";
const DEFAULT_SENDER_EMAIL = process.env.AUTH_SENDER_EMAIL || "hello@wallerstreetventures.com";
const FROM_HEADER = `${BRAND_SHORT} <${DEFAULT_SENDER_EMAIL}>`;

// WSV email styles — matches app theme
const EMAIL = {
  headerBg: COLORS.green900,
  headerText: COLORS.white,
  bodyText: COLORS.text900,
  bodyMuted: COLORS.text500,
  buttonBg: COLORS.gold500,
  buttonText: COLORS.green900,
  linkColor: COLORS.fern,
  footerBg: COLORS.cream100,
  footerText: COLORS.text500,
  border: COLORS.border,
  denyBg: COLORS.error,
};

function escapeHtml(str) {
  if (!str || typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendWithRetry(url, options, maxAttempts = 2) {
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      const errBody = await res.text();
      const isRetryable = res.status === 429 || res.status >= 500;
      if (attempt < maxAttempts && isRetryable) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
        continue;
      }
      console.error(`[notifications] Resend API error ${res.status}: ${errBody}`);
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }
  throw lastErr;
}

function formatPacificTime(date) {
  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Los_Angeles",
  });
}

export async function notifyNewSession(
  investorEmail,
  isFirstVisit = false,
  tabId = null
) {
  const apiKey = process.env.RESEND_API_KEY;
  const recipients = getAdminEmails();
  if (!apiKey || recipients.length === 0) return;
  const tabLabel = tabId ? TAB_LABELS[tabId] || tabId : null;
  const timeStr = formatPacificTime(new Date());

  const subject = isFirstVisit
    ? `New investor: ${investorEmail} opened the deal room`
    : `${investorEmail} is back in the deal room`;

  const contextParts = [];
  if (tabLabel) contextParts.push(`Viewed: ${tabLabel}`);
  contextParts.push(timeStr);
  const contextLine = contextParts.join(" · ");

  const safeEmail = escapeHtml(investorEmail);
  const adminUrl = escapeHtml(
    normalizeAppUrl(process.env.NEXT_PUBLIC_APP_URL, "https://waller-street-ventures.vercel.app")
  );

  try {
    const res = await sendWithRetry("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_HEADER,
        to: recipients,
        subject,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; background: #ffffff;">
            <div style="padding: 24px 28px; background: ${EMAIL.headerBg};">
              <span style="font-size: 14px; font-weight: 600; color: ${EMAIL.headerText}; letter-spacing: 0.06em; text-transform: uppercase;">${BRAND_SHORT}</span>
            </div>
            <div style="padding: 28px; border-left: 1px solid ${EMAIL.border}; border-right: 1px solid ${EMAIL.border};">
              <p style="font-size: 16px; color: ${EMAIL.bodyText}; line-height: 1.5; margin: 0 0 12px 0;">
                <strong>${safeEmail}</strong> ${isFirstVisit ? "just opened" : "is back in"} the ${BRAND_NAME} deal room.
              </p>
              ${contextLine ? `<p style="font-size: 14px; color: ${EMAIL.bodyMuted}; margin: 0 0 24px 0;">${escapeHtml(contextLine)}</p>` : ""}
              <div style="margin-top: 24px;">
                <a href="${adminUrl}/admin" style="display: inline-block; background: ${EMAIL.buttonBg}; color: ${EMAIL.buttonText}; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600;">View Analytics</a>
              </div>
            </div>
            <div style="padding: 16px 28px; background: ${EMAIL.footerBg}; border: 1px solid ${EMAIL.border}; border-top: none;">
              <p style="font-size: 12px; color: ${EMAIL.footerText}; margin: 0;">${BRAND_NAME} · <a href="${adminUrl}/admin" style="color: ${EMAIL.linkColor}; text-decoration: none;">Admin</a></p>
            </div>
          </div>
        `,
      }),
    });
    if (!res?.ok) {
      console.error(`[notifyNewSession] Failed after retries for ${investorEmail}`);
    }
  } catch (err) {
    console.error("[notifyNewSession] Failed to send:", err?.message || err);
  }
}

export async function notifyHighIntent(investorEmail, intentScore) {
  const apiKey = process.env.RESEND_API_KEY;
  const recipients = getAdminEmails();
  if (!apiKey || recipients.length === 0) return;

  const safeEmail = escapeHtml(investorEmail);
  const adminUrl = escapeHtml(
    normalizeAppUrl(process.env.NEXT_PUBLIC_APP_URL, "https://waller-street-ventures.vercel.app")
  );

  const subject = `High intent: ${investorEmail} (score ${intentScore}) — schedule a call`;

  try {
    const res = await sendWithRetry("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_HEADER,
        to: recipients,
        subject,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; background: #ffffff;">
            <div style="padding: 24px 28px; background: ${EMAIL.headerBg};">
              <span style="font-size: 14px; font-weight: 600; color: ${EMAIL.headerText}; letter-spacing: 0.06em; text-transform: uppercase;">${BRAND_SHORT}</span>
            </div>
            <div style="padding: 28px; border-left: 1px solid ${EMAIL.border}; border-right: 1px solid ${EMAIL.border};">
              <p style="font-size: 16px; color: ${EMAIL.bodyText}; line-height: 1.5; margin: 0 0 12px 0;">
                <strong>${safeEmail}</strong> crossed the high-intent threshold (score: ${intentScore}).
              </p>
              <p style="font-size: 14px; color: ${EMAIL.bodyMuted}; margin: 0 0 24px 0;">Suggested next step: Schedule a call.</p>
              <a href="${adminUrl}/admin" style="display: inline-block; background: ${EMAIL.buttonBg}; color: ${EMAIL.buttonText}; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600;">View Analytics</a>
            </div>
            <div style="padding: 16px 28px; background: ${EMAIL.footerBg}; border: 1px solid ${EMAIL.border}; border-top: none;">
              <p style="font-size: 12px; color: ${EMAIL.footerText}; margin: 0;">${BRAND_NAME} · <a href="${adminUrl}/admin" style="color: ${EMAIL.linkColor}; text-decoration: none;">Admin</a></p>
            </div>
          </div>
        `,
      }),
    });
    if (!res?.ok) {
      console.error(`[notifyHighIntent] Failed after retries for ${investorEmail}`);
    }
  } catch (err) {
    console.error("[notifyHighIntent] Failed to send:", err?.message || err);
  }
}

export async function notifyPdfDownload(investorEmail, dealSlug = "pst") {
  const apiKey = process.env.RESEND_API_KEY;
  const recipients = getAdminEmails();
  if (!apiKey || recipients.length === 0) return;

  const safeEmail = escapeHtml(investorEmail);
  const adminUrl = escapeHtml(
    normalizeAppUrl(process.env.NEXT_PUBLIC_APP_URL, "https://waller-street-ventures.vercel.app")
  );
  const timeStr = formatPacificTime(new Date());
  const safeDeal = escapeHtml(dealSlug);

  const subject = `PDF download: ${investorEmail} exported the data room packet`;

  try {
    const res = await sendWithRetry("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_HEADER,
        to: recipients,
        subject,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; background: #ffffff;">
            <div style="padding: 24px 28px; background: ${EMAIL.headerBg};">
              <span style="font-size: 14px; font-weight: 600; color: ${EMAIL.headerText}; letter-spacing: 0.06em; text-transform: uppercase;">${BRAND_SHORT}</span>
            </div>
            <div style="padding: 28px; border-left: 1px solid ${EMAIL.border}; border-right: 1px solid ${EMAIL.border};">
              <p style="font-size: 16px; color: ${EMAIL.bodyText}; line-height: 1.5; margin: 0 0 12px 0;">
                <strong>${safeEmail}</strong> exported the PDF data room packet.
              </p>
              <p style="font-size: 14px; color: ${EMAIL.bodyMuted}; margin: 0 0 24px 0;">
                Deal: ${safeDeal}<br/>
                ${escapeHtml(timeStr)}
              </p>
              <div style="margin-top: 24px;">
                <a href="${adminUrl}/admin" style="display: inline-block; background: ${EMAIL.buttonBg}; color: ${EMAIL.buttonText}; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600;">View Analytics</a>
              </div>
            </div>
            <div style="padding: 16px 28px; background: ${EMAIL.footerBg}; border: 1px solid ${EMAIL.border}; border-top: none;">
              <p style="font-size: 12px; color: ${EMAIL.footerText}; margin: 0;">${BRAND_NAME} · <a href="${adminUrl}/admin" style="color: ${EMAIL.linkColor}; text-decoration: none;">Admin</a></p>
            </div>
          </div>
        `,
      }),
    });
    if (!res?.ok) {
      console.error(`[notifyPdfDownload] Failed after retries for ${investorEmail}`);
    }
  } catch (err) {
    console.error("[notifyPdfDownload] Failed to send:", err?.message || err);
  }
}

export async function notifyAccessRequest(requestEmail, approveUrl, denyUrl, recipientEmails = null) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[notifyAccessRequest] RESEND_API_KEY not set — skipping");
    return;
  }

  const recipients = Array.isArray(recipientEmails) && recipientEmails.length > 0
    ? recipientEmails.map((e) => (typeof e === "string" ? e : e?.email)?.trim().toLowerCase()).filter(Boolean)
    : getAdminEmails();
  if (recipients.length === 0) return;

  const safeEmail = escapeHtml(requestEmail);
  const baseUrl = normalizeAppUrl(
    process.env.NEXT_PUBLIC_APP_URL,
    "https://waller-street-ventures.vercel.app"
  );

  const subject = `Access request: ${requestEmail} wants to view the WSV Data Room`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; background: #ffffff;">
      <div style="padding: 24px 28px; background: ${EMAIL.headerBg};">
        <span style="font-size: 14px; font-weight: 600; color: ${EMAIL.headerText}; letter-spacing: 0.06em; text-transform: uppercase;">${BRAND_SHORT}</span>
      </div>
      <div style="padding: 28px; border-left: 1px solid ${EMAIL.border}; border-right: 1px solid ${EMAIL.border};">
        <p style="font-size: 16px; color: ${EMAIL.bodyText}; line-height: 1.5; margin: 0 0 12px 0;">
          <strong>${safeEmail}</strong> requested access to the ${BRAND_NAME} data room.
        </p>
        <p style="font-size: 14px; color: ${EMAIL.bodyMuted}; margin: 0 0 24px 0;">Approve or deny:</p>
        <div style="display: flex; gap: 12px;">
          <a href="${approveUrl}" style="display: inline-block; background: ${EMAIL.buttonBg}; color: ${EMAIL.buttonText}; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600;">Approve</a>
          <a href="${denyUrl}" style="display: inline-block; background: ${EMAIL.denyBg}; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600;">Deny</a>
        </div>
        <p style="font-size: 12px; color: ${EMAIL.footerText}; margin-top: 20px;">
          <a href="${baseUrl}/admin" style="color: ${EMAIL.linkColor}; text-decoration: none;">View in Admin</a>
        </p>
      </div>
      <div style="padding: 16px 28px; background: ${EMAIL.footerBg}; border: 1px solid ${EMAIL.border}; border-top: none;">
        <p style="font-size: 12px; color: ${EMAIL.footerText}; margin: 0;">${BRAND_NAME} access requests</p>
      </div>
    </div>
  `;

  for (const to of recipients) {
    try {
      const res = await sendWithRetry("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM_HEADER,
          to,
          subject,
          html,
        }),
      });
      if (res?.ok) {
        const data = await res.json().catch(() => ({}));
        console.log(`[notifyAccessRequest] Sent to ${to} id=${data?.id || "—"}`);
      } else {
        console.error(`[notifyAccessRequest] Resend ${res.status} for ${to} (body logged above)`);
      }
    } catch (err) {
      console.error(`[notifyAccessRequest] Failed to send to ${to}:`, err?.message || err);
    }
  }
}

export async function notifyLoginEvent(investorEmail, ip, userAgent, isFirstLogin, serviceClient) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const adminEmails = getAdminEmails();
  const excludeEmails = (process.env.NOTIFICATION_EXCLUDE_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const emailLower = investorEmail.toLowerCase();

  if (adminEmails.includes(emailLower) || excludeEmails.includes(emailLower)) {
    return;
  }

  let recipients = [];
  if (adminEmails.length > 0) {
    recipients = adminEmails;
  } else if (serviceClient) {
    try {
      const { data: rows } = await serviceClient
        .from("access_request_notification_emails")
        .select("email")
        .order("created_at", { ascending: true });
      recipients = (rows || []).map((r) => r.email);
    } catch (err) {
      console.error("[notifyLoginEvent] Failed to fetch notification recipients:", err?.message);
    }
  }
  if (recipients.length === 0) return;

  const safeEmail = escapeHtml(investorEmail);
  const adminUrl = escapeHtml(process.env.NEXT_PUBLIC_APP_URL || "https://waller-street-ventures.vercel.app");
  const timeStr = formatPacificTime(new Date());
  const deviceSummary = userAgent
    ? escapeHtml(userAgent.length > 80 ? userAgent.slice(0, 80) + "…" : userAgent)
    : "Unknown";

  const subject = isFirstLogin
    ? `New investor: ${investorEmail} opened the deal room`
    : `${investorEmail} is back in the deal room`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; background: #ffffff;">
      <div style="padding: 24px 28px; background: ${EMAIL.headerBg};">
        <span style="font-size: 14px; font-weight: 600; color: ${EMAIL.headerText}; letter-spacing: 0.06em; text-transform: uppercase;">${BRAND_SHORT}</span>
      </div>
      <div style="padding: 28px; border-left: 1px solid ${EMAIL.border}; border-right: 1px solid ${EMAIL.border};">
        <p style="font-size: 16px; color: ${EMAIL.bodyText}; line-height: 1.5; margin: 0 0 12px 0;">
          <strong>${safeEmail}</strong> ${isFirstLogin ? "just opened" : "is back in"} the ${BRAND_NAME} deal room.
        </p>
        <p style="font-size: 14px; color: ${EMAIL.bodyMuted}; margin: 0 0 24px 0;">
          ${escapeHtml(timeStr)}<br/>
          IP: ${escapeHtml(ip || "unknown")}<br/>
          Device: ${deviceSummary}
        </p>
        <div style="margin-top: 24px;">
          <a href="${adminUrl}/admin" style="display: inline-block; background: ${EMAIL.buttonBg}; color: ${EMAIL.buttonText}; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600;">View Analytics</a>
        </div>
      </div>
      <div style="padding: 16px 28px; background: ${EMAIL.footerBg}; border: 1px solid ${EMAIL.border}; border-top: none;">
        <p style="font-size: 12px; color: ${EMAIL.footerText}; margin: 0;">${BRAND_NAME} · <a href="${adminUrl}/admin" style="color: ${EMAIL.linkColor}; text-decoration: none;">Admin</a></p>
      </div>
    </div>
  `;

  for (const to of recipients) {
    try {
      const res = await sendWithRetry("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM_HEADER,
          to,
          subject,
          html,
        }),
      });
      if (!res?.ok) {
        console.error(`[notifyLoginEvent] Failed for ${investorEmail} to ${to}`);
      }
    } catch (err) {
      console.error(`[notifyLoginEvent] Failed to send to ${to}:`, err?.message || err);
    }
  }
}

export async function sendInviteEmail(email, type = "invite", options = {}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const { invitedByName, invitedByEmail } = options;
  const targetEmail = normalizeEmail(email);
  if (!isValidEmail(targetEmail)) {
    throw new Error(`Invalid invite email: ${targetEmail || "missing"}`);
  }

  const baseUrl = normalizeAppUrl(
    process.env.NEXT_PUBLIC_APP_URL,
    "https://waller-street-ventures.vercel.app"
  ).replace(/\/+$/, "");
  const loginQuery = new URLSearchParams({
    email: targetEmail,
    utm_source: "invite",
    utm_medium: "email",
  });

  const isApproval = type === "approved";
  if (isApproval) {
    loginQuery.set("step", "code");
  }
  const loginUrl = `${baseUrl}/login?${loginQuery.toString()}`;

  let subject;
  let bodyCopy;
  if (isApproval) {
    subject = "You've been approved to access the WSV Data Room";
    bodyCopy = "You're approved. Click below to go directly to the code entry page and continue to the data room.";
  } else if (invitedByName && invitedByName.trim()) {
    const safeName = escapeHtml(invitedByName.trim());
    subject = `${safeName} confirmed your access to the ${BRAND_NAME} data room`;
    bodyCopy = `${safeName} confirmed your access to the ${BRAND_NAME} data room. Click below to log in and view.`;
  } else {
    subject = "You've been given access to the WSV Data Room";
    bodyCopy = "Thanks, you've been given access to the WSV Data Room. Click below to log in and view.";
  }

  const payload = {
    from: FROM_HEADER,
    to: targetEmail,
    subject,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; background: #ffffff;">
        <div style="padding: 24px 28px; background: ${EMAIL.headerBg};">
          <span style="font-size: 14px; font-weight: 600; color: ${EMAIL.headerText}; letter-spacing: 0.06em; text-transform: uppercase;">${BRAND_SHORT}</span>
        </div>
        <div style="padding: 28px; border-left: 1px solid ${EMAIL.border}; border-right: 1px solid ${EMAIL.border};">
          <p style="font-size: 16px; color: ${EMAIL.bodyText}; line-height: 1.5; margin: 0 0 24px 0;">
            ${bodyCopy}
          </p>
          <a href="${loginUrl}" style="display: inline-block; background: ${EMAIL.buttonBg}; color: ${EMAIL.buttonText}; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600;">${isApproval ? "Go to code entry" : "Log in to view"}</a>
          <p style="font-size: 13px; line-height: 1.7; color: ${EMAIL.bodyMuted}; margin: 24px 0 0 0;">If you have any trouble getting in, reply to this email or text/call Cameron at 360-318-4480.</p>
        </div>
        <div style="padding: 16px 28px; background: ${EMAIL.footerBg}; border: 1px solid ${EMAIL.border}; border-top: none;">
          <p style="font-size: 12px; color: ${EMAIL.footerText}; margin: 0;">${BRAND_SHORT} · ${BRAND_NAME}</p>
        </div>
      </div>
        `,
  };
  if (isValidEmail(invitedByEmail)) {
    payload.cc = [normalizeEmail(invitedByEmail)];
  }

  try {
    const res = await sendWithRetry("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res?.ok) {
      console.error(`[sendInviteEmail] Failed for ${targetEmail}`);
    }
  } catch (err) {
    console.error("[sendInviteEmail] Failed to send:", err?.message || err);
  }
}
