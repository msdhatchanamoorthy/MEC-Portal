const nodemailer = require('nodemailer');

const sendResetEmail = async (email, resetToken) => {
    // 1. Create a transporter
    // For production, use real SMTP. For dev, you can use Mailtrap or Ethereal
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER || 'mec.attendance.sys@gmail.com',
            pass: process.env.EMAIL_PASS || 'vuby fzjp xyzk abcd' // App Password
        }
    });

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;

    const mailOptions = {
        from: '"MEC Portal Support" <mec.attendance.sys@gmail.com>',
        to: email,
        subject: 'Password Reset Request - MEC Portal',
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #1E3A8A; text-align: center;">MEC Portal</h2>
                <p>Hello,</p>
                <p>You requested to reset your password for the MEC Attendance System. Please click the button below to set a new password:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetUrl}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; borderRadius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
                </div>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request this, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;">
                <p style="font-size: 12px; color: #666; text-align: center;">MEC Attendance System &copy; 2024</p>
            </div>
        `
    };

    try {
        if (process.env.OFFLINE_MODE === 'true') {
            console.log('\n--- OFFLINE MODE: EMAIL SENT ---');
            console.log(`To: ${email}`);
            console.log(`Reset URL: ${resetUrl}`);
            console.log('-------------------------------\n');
            return true;
        }
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Email send failed:', error);
        return false;
    }
};

module.exports = { sendResetEmail };
