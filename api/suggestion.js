import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fullName, schoolId, grade, suggestionType, suggestionText } = req.body;

    // Validate
    if (!fullName || !schoolId || !grade || !suggestionType || !suggestionText) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields. Please fill in all fields.' 
      });
    }

    console.log('💡 NJROTC Suggestion Received:', { 
      fullName, 
      schoolId, 
      grade, 
      suggestionType,
      suggestionLength: suggestionText.length,
      timestamp: new Date().toISOString()
    });

    // Check test mode
    const isTestMode = process.env.NODE_ENV === 'development' || 
                      process.env.SEND_REAL_EMAILS === 'false';

    if (isTestMode) {
      console.log('🧪 Test Mode: Suggestion logged (no email sent)');
      return res.status(200).json({ 
        success: true, 
        message: 'Test mode: Suggestion received (no email sent)',
        test_mode: true,
        data: { 
          fullName, 
          schoolId, 
          grade, 
          suggestionType,
          suggestionText: suggestionText.substring(0, 100) + '...'
        }
      });
    }

    // Check credentials
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error('❌ Missing SMTP credentials');
      return res.status(500).json({ 
        success: false,
        error: 'Suggestion service not available. Please contact administrator.',
        debug: 'Missing email configuration'
      });
    }

    // Configure transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 465,
      secure: process.env.SMTP_SECURE !== 'false',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Verify connection
    await transporter.verify();
    console.log('✅ SMTP Connection verified for suggestion');

    // Prepare recipients
    const adminEmail = process.env.SUGGESTION_ADMIN_EMAIL || process.env.ADMIN_EMAIL || process.env.SMTP_USER;
    
    // Email to NJROTC staff
    const mailOptions = {
      from: `"${process.env.FROM_NAME || 'NJROTC Suggestion Box'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
      to: adminEmail,
      subject: `💡 NJROTC Suggestion: ${suggestionType} - From ${fullName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #2c3e50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f8f9fa; padding: 25px; border-radius: 0 0 8px 8px; border: 1px solid #ddd; }
                .info-box { background: white; padding: 20px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #3498db; }
                .suggestion-box { background: #fffde7; padding: 20px; border-radius: 6px; margin: 20px 0; border: 1px solid #ffd54f; }
                .label { font-weight: bold; color: #2c3e50; }
                .type-badge { display: inline-block; padding: 4px 12px; background: #e3f2fd; color: #1565c0; border-radius: 20px; font-size: 0.9em; }
                .priority { display: inline-block; padding: 4px 12px; background: #ffebee; color: #c62828; border-radius: 20px; font-size: 0.8em; margin-left: 10px; font-weight: bold; }
                .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="margin: 0; font-size: 24px;">NJROTC Suggestion Received</h1>
                    <p style="margin: 5px 0 0; opacity: 0.9;">Cadet Feedback & Improvement Ideas</p>
                </div>
                
                <div class="content">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <span class="type-badge">${suggestionType}</span>
                        ${suggestionType.toLowerCase().includes('safety') ? '<span class="priority">HIGH PRIORITY</span>' : ''}
                    </div>
                    
                    <div class="info-box">
                        <h3 style="color: #333; margin-top: 0;">👤 Submitted By</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td class="label" style="padding: 8px 0; width: 30%;">Cadet Name:</td>
                                <td style="padding: 8px 0;">${fullName}</td>
                            </tr>
                            <tr>
                                <td class="label" style="padding: 8px 0;">School ID:</td>
                                <td style="padding: 8px 0;">${schoolId}</td>
                            </tr>
                            <tr>
                                <td class="label" style="padding: 8px 0;">Grade:</td>
                                <td style="padding: 8px 0;">${grade}th Grade</td>
                            </tr>
                            <tr>
                                <td class="label" style="padding: 8px 0;">Submitted:</td>
                                <td style="padding: 8px 0;">${new Date().toLocaleString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <div class="suggestion-box">
                        <h3 style="color: #333; margin-top: 0;">💭 Suggestion Details</h3>
                        <div style="white-space: pre-wrap; background: white; padding: 15px; border-radius: 4px; border: 1px solid #e0e0e0; margin-top: 10px; line-height: 1.8;">
                            ${suggestionText.replace(/\n/g, '<br>')}
                        </div>
                    </div>
                    
                    <div style="background: #e8f5e9; padding: 15px; border-radius: 6px; margin-top: 20px;">
                        <p style="margin: 0; color: #2e7d32;">
                            <strong>📋 Action Recommended:</strong> 
                            ${suggestionType === 'Safety Concern' ? 'Review within 24 hours and take appropriate action.' : 
                              suggestionType === 'School Improvement' ? 'Discuss in next staff meeting for consideration.' :
                              'Acknowledge receipt to cadet and provide timeline for review.'}
                        </p>
                    </div>
                </div>
                
                <div class="footer">
                    <p>This suggestion was submitted via the NJROTC Cadet Portal suggestion system.</p>
                    <p>📍 Parlier High School NJROTC - Continuous Improvement Program</p>
                </div>
            </div>
        </body>
        </html>
      `,
      text: `
NJROTC SUGGESTION SUBMISSION
=============================

SUBMITTED BY:
-------------
Cadet Name: ${fullName}
School ID: ${schoolId}
Grade: ${grade}th Grade
Suggestion Type: ${suggestionType}
Submitted: ${new Date().toLocaleString()}

SUGGESTION DETAILS:
-------------------
${suggestionText}

ACTION RECOMMENDED:
-------------------
${suggestionType === 'Safety Concern' ? 'Review within 24 hours and take appropriate action.' : 
  suggestionType === 'School Improvement' ? 'Discuss in next staff meeting for consideration.' :
  'Acknowledge receipt to cadet and provide timeline for review.'}

This suggestion was submitted via the NJROTC Cadet Portal suggestion system.
      `
    };

    // Send email
    console.log('📤 Sending suggestion email...');
    await transporter.sendMail(mailOptions);
    console.log('✅ Suggestion email sent');

    return res.status(200).json({ 
      success: true, 
      message: 'Thank you for your suggestion! It has been submitted to NJROTC staff.',
      data: {
        submitted_by: fullName,
        suggestion_type: suggestionType,
        character_count: suggestionText.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Suggestion submission error:', error);
    
    let errorMessage = 'Failed to submit suggestion';
    if (error.code === 'EAUTH') {
      errorMessage = 'Email service authentication failed.';
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Cannot connect to suggestion service.';
    }

    return res.status(500).json({ 
      success: false,
      error: errorMessage,
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}