import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fullName, schoolId, grade, email, program } = req.body;

    // Validate required fields
    if (!fullName || !schoolId || !grade || !email) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields: fullName, schoolId, grade, and email are required' 
      });
    }

    console.log('📋 NJROTC Signup Received:', { 
      fullName, 
      schoolId, 
      grade, 
      email, 
      program,
      timestamp: new Date().toISOString()
    });

    // Check if we should send real emails
    const isTestMode = process.env.NODE_ENV === 'development' || 
                      process.env.SEND_REAL_EMAILS === 'false';

    if (isTestMode) {
      console.log('🧪 Test Mode: No emails sent');
      return res.status(200).json({ 
        success: true, 
        message: 'Test mode: Signup received (no email sent)',
        test_mode: true,
        data: { fullName, schoolId, grade, email, program }
      });
    }

    // Check for required email credentials
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error('❌ Missing SMTP credentials');
      return res.status(500).json({ 
        success: false,
        error: 'Email service not configured. Please contact administrator.',
        debug: 'Missing SMTP_USER or SMTP_PASS environment variables'
      });
    }

    // Configure email transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 465,
      secure: process.env.SMTP_SECURE !== 'false',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false // For development/testing only
      }
    });

    // Verify SMTP connection
    await transporter.verify();
    console.log('✅ SMTP Connection verified');

    // Prepare recipients
    const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
    const studentEmail = email;
    
    // For NJROTC: Also send to skyn21prime if specified
    const additionalRecipients = [];
    if (process.env.NJROTC_ADDITIONAL_EMAILS) {
      additionalRecipients.push(...process.env.NJROTC_ADDITIONAL_EMAILS.split(','));
    }

    // Email to admin/NJROTC staff
    const adminMailOptions = {
      from: `"${process.env.FROM_NAME || 'NJROTC Parlier'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
      to: [adminEmail, ...additionalRecipients].filter(Boolean).join(', '),
      subject: `📋 NJROTC Program Signup: ${fullName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #023c71; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f8f9fa; padding: 25px; border-radius: 0 0 8px 8px; border: 1px solid #ddd; }
                .info-box { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #e6b220; }
                .label { font-weight: bold; color: #023c71; }
                .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
                .badge { display: inline-block; background: #e6b220; color: #000; padding: 4px 12px; border-radius: 20px; font-size: 0.8em; font-weight: bold; margin-left: 10px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="margin: 0; font-size: 24px;">NJROTC Program Signup</h1>
                    <p style="margin: 5px 0 0; opacity: 0.9;">Parlier High School</p>
                </div>
                
                <div class="content">
                    <h2 style="color: #023c71; margin-top: 0;">New Cadet Registration</h2>
                    
                    <div class="info-box">
                        <h3 style="color: #333; margin-top: 0;">📝 Cadet Information</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td class="label" style="padding: 8px 0; width: 35%;">Full Name:</td>
                                <td style="padding: 8px 0;">${fullName}</td>
                            </tr>
                            <tr>
                                <td class="label" style="padding: 8px 0;">School ID:</td>
                                <td style="padding: 8px 0;">${schoolId}</td>
                            </tr>
                            <tr>
                                <td class="label" style="padding: 8px 0;">Grade Level:</td>
                                <td style="padding: 8px 0;">${grade}th Grade</td>
                            </tr>
                            <tr>
                                <td class="label" style="padding: 8px 0;">Email:</td>
                                <td style="padding: 8px 0;">${email}</td>
                            </tr>
                            <tr>
                                <td class="label" style="padding: 8px 0;">Program Interest:</td>
                                <td style="padding: 8px 0;">
                                    ${program || 'General NJROTC'}
                                    ${!program ? '<span class="badge">Default</span>' : ''}
                                </td>
                            </tr>
                            <tr>
                                <td class="label" style="padding: 8px 0;">Submission Time:</td>
                                <td style="padding: 8px 0;">${new Date().toLocaleString('en-US', { 
                                    weekday: 'long', 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <div style="background: #e8f4f8; padding: 15px; border-radius: 6px; margin-top: 20px;">
                        <p style="margin: 0; color: #023c71;">
                            <strong>Action Required:</strong> Please follow up with this cadet within 24 hours to welcome them to the program.
                        </p>
                    </div>
                </div>
                
                <div class="footer">
                    <p>This is an automated message from the NJROTC Parlier Cadet Portal.</p>
                    <p>📍 Parlier High School NJROTC</p>
                </div>
            </div>
        </body>
        </html>
      `,
      text: `
NJROTC PROGRAM SIGNUP - New Cadet Registration

CADET INFORMATION:
------------------
Full Name: ${fullName}
School ID: ${schoolId}
Grade Level: ${grade}th Grade
Email: ${email}
Program Interest: ${program || 'General NJROTC'}
Submission Time: ${new Date().toLocaleString()}

Please follow up with this cadet within 24 hours to welcome them to the program.

This is an automated message from the NJROTC Parlier Cadet Portal.
      `
    };

    // Confirmation email to student
    const studentMailOptions = {
      from: `"${process.env.FROM_NAME || 'NJROTC Parlier'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
      to: studentEmail,
      subject: '✅ NJROTC Signup Confirmation - Welcome Cadet!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #023c71, #022a55); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; }
                .confirmation-box { background: #f0f9ff; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #e6b220; }
                .label { font-weight: bold; color: #023c71; }
                .cta-button { display: inline-block; background: #e6b220; color: #000; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
                .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; border-top: 1px solid #eee; padding-top: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="margin: 0; font-size: 28px;">Welcome to NJROTC!</h1>
                    <p style="margin: 10px 0 0; font-size: 18px; opacity: 0.9;">Parlier High School Naval Junior Reserve Officers' Training Corps</p>
                </div>
                
                <div class="content">
                    <h2 style="color: #023c71;">Dear ${fullName},</h2>
                    
                    <p>Thank you for signing up for the NJROTC program at Parlier High School! We have received your registration and are excited to welcome you to our cadet family.</p>
                    
                    <div class="confirmation-box">
                        <h3 style="color: #333; margin-top: 0;">📋 Your Registration Details</h3>
                        <p><span class="label">School ID:</span> ${schoolId}</p>
                        <p><span class="label">Grade Level:</span> ${grade}th Grade</p>
                        <p><span class="label">Program:</span> ${program || 'General NJROTC Program'}</p>
                        <p><span class="label">Registration Date:</span> ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                    
                    <h3 style="color: #023c71;">What's Next?</h3>
                    <ul>
                        <li>Our NJROTC instructors will contact you within 24-48 hours</li>
                        <li>You'll receive information about uniform fitting and orientation</li>
                        <li>Prepare for your first leadership training session</li>
                    </ul>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="#" class="cta-button">View Cadet Handbook</a>
                    </div>
                    
                    <p><strong>Remember:</strong> NJROTC develops citizenship, character, leadership, and self-discipline. We're excited to help you grow as a leader!</p>
                </div>
                
                <div class="footer">
                    <p><strong>NJROTC Parlier</strong><br>
                    Parlier High School<br>
                    📞 Contact: Your NJROTC Instructors<br>
                    📍 "Developing Leaders with Character"</p>
                    <p style="font-size: 0.8em; color: #999;">This is an automated confirmation email. Please do not reply directly.</p>
                </div>
            </div>
        </body>
        </html>
      `,
      text: `
WELCOME TO NJROTC - Signup Confirmation

Dear ${fullName},

Thank you for signing up for the NJROTC program at Parlier High School! We have received your registration and are excited to welcome you to our cadet family.

YOUR REGIGSTRATION DETAILS:
---------------------------
School ID: ${schoolId}
Grade Level: ${grade}th Grade
Program: ${program || 'General NJROTC Program'}
Registration Date: ${new Date().toLocaleDateString()}

WHAT'S NEXT?
------------
1. Our NJROTC instructors will contact you within 24-48 hours
2. You'll receive information about uniform fitting and orientation
3. Prepare for your first leadership training session

Remember: NJROTC develops citizenship, character, leadership, and self-discipline. We're excited to help you grow as a leader!

NJROTC Parlier
Parlier High School
"Developing Leaders with Character"

This is an automated confirmation email. Please do not reply directly.
      `
    };

    // Send emails
    console.log('📤 Sending emails...');
    await transporter.sendMail(adminMailOptions);
    console.log('✅ Admin email sent');
    
    await transporter.sendMail(studentMailOptions);
    console.log('✅ Student confirmation email sent');

    return res.status(200).json({ 
      success: true, 
      message: 'NJROTC signup submitted successfully! Welcome email sent to cadet.',
      data: {
        cadet: fullName,
        email_sent_to: studentEmail,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Email sending error:', error);
    
    // Provide helpful error messages
    let errorMessage = 'Failed to process signup';
    if (error.code === 'EAUTH') {
      errorMessage = 'Email authentication failed. Please check SMTP credentials.';
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Cannot connect to email server. Check network or SMTP settings.';
    } else if (error.responseCode === 550) {
      errorMessage = 'Recipient email address may be invalid or rejected.';
    }

    return res.status(500).json({ 
      success: false,
      error: errorMessage,
      debug: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        code: error.code,
        responseCode: error.responseCode
      } : undefined
    });
  }
}