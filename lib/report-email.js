import nodemailer from "nodemailer";
import { REPORT_REASONS } from "@/lib/constants";
import { absoluteUrl, CONTACT_EMAIL, SITE_NAME } from "@/lib/site";

function reasonLabel(value) {
  return REPORT_REASONS.find((reason) => reason.value === value)?.label ?? value;
}

function recipients() {
  return (process.env.REPORT_EMAIL_TO || CONTACT_EMAIL)
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

function missingConfig() {
  const missing = [];
  if (!process.env.GMAIL_SMTP_USER) missing.push("GMAIL_SMTP_USER");
  if (!process.env.GMAIL_APP_PASSWORD) missing.push("GMAIL_APP_PASSWORD");
  if (recipients().length === 0) missing.push("REPORT_EMAIL_TO");
  return missing;
}

export async function sendChallengeReportNotification({ challenge, report, reporter }) {
  const missing = missingConfig();
  if (missing.length > 0) {
    return { sent: false, reason: "not_configured", missing };
  }

  const challengeUrl = absoluteUrl(`/challenges/${report.bug_challenge_id}`);
  const reporterLabel = reporter ? "Signed-in user" : "Anonymous visitor";
  const details = report.details || "(none)";
  const from =
    process.env.REPORT_EMAIL_FROM || `${SITE_NAME} <${process.env.GMAIL_SMTP_USER}>`;

  const text = [
    "A reader reported a problem with a BugHunt challenge.",
    "",
    `Challenge: ${challenge?.title ?? report.bug_challenge_id}`,
    `Challenge URL: ${challengeUrl}`,
    `Reason: ${reasonLabel(report.reason)}`,
    `Reporter: ${reporterLabel}`,
    "",
    "Details:",
    details,
    "",
    `Review open reports: ${absoluteUrl("/admin")}`,
  ].join("\n");

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_SMTP_USER,
      pass: process.env.GMAIL_APP_PASSWORD.replace(/\s+/g, ""),
    },
  });

  try {
    await transporter.sendMail({
      from,
      to: recipients(),
      subject: `${SITE_NAME} report: ${reasonLabel(report.reason)}`,
      text,
    });
  } catch (error) {
    console.error("Failed to send challenge report email", {
      message: error?.message,
      code: error?.code,
      command: error?.command,
    });
    return { sent: false, reason: "send_failed" };
  }

  return { sent: true };
}
