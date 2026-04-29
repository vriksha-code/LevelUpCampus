/**
 * Validates that the email domain is one of the allowed college domains.
 * ALLOWED_EMAIL_DOMAINS env var is a comma-separated list.
 */
const validateCollegeEmail = (req, res, next) => {
  const email = req.body.email || req.body.collegeEmail;

  if (!email) {
    return res.status(400).json({ success: false, message: "Email is required." });
  }

  const allowedDomains = (process.env.ALLOWED_EMAIL_DOMAINS || "heritageit.edu.in")
    .split(",")
    .map((d) => d.trim().toLowerCase());

  const emailLower  = email.toLowerCase().trim();
  const emailDomain = emailLower.split("@")[1];

  if (!emailDomain) {
    return res.status(400).json({ success: false, message: "Invalid email format." });
  }

  const isAllowed = allowedDomains.some((domain) => emailDomain === domain);

  if (!isAllowed) {
    return res.status(400).json({
      success: false,
      message: `Only college email addresses are allowed. Accepted domains: ${allowedDomains.join(", ")}`,
    });
  }

  req.body.email = emailLower;
  if (req.body.collegeEmail) req.body.collegeEmail = emailLower;

  next();
};

module.exports = { validateCollegeEmail };
