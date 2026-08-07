export const sendVerificationEmail = async (email, name, rawToken) => {
    const verificationUrl = `http://localhost:3000/api/auth/verify-email?token=${rawToken}`;
    
    const emailHtml = `
=========================================================
📩 NEW EMAIL DISPATCHED
=========================================================
To: ${email}
Subject: Verify Your Email Address - CogniPath

Hi ${name},

Welcome to CogniPath! Before you can sign in and start learning, we need to verify your email address. 
This is a required security step to protect your account.

Please click the secure link below to verify your email:
👉 ${verificationUrl}

Or copy and paste this fallback link into your browser:
${verificationUrl}

* This verification link will expire in 24 hours.
* If you did not create this account, please ignore this email.

Need help? Contact our support team at support@cognipath.com.
=========================================================
    `;
    
    // Simulate email delivery by logging the email securely to the server console
    console.log(emailHtml);
    
    return true;
};
