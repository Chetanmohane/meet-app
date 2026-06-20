import React, { useState } from 'react';
import { Video, Mail, Key, ShieldCheck, ArrowRight, UserPlus, Globe } from 'lucide-react';

interface AuthScreenProps {
  onLogin: (user: { name: string; email: string; avatar: string }) => void;
}

export default function AuthScreen({ onLogin }: AuthScreenProps) {
  const [method, setMethod] = useState<'selection' | 'google' | 'email' | 'otp'>('selection');
  const [emailInput, setEmailInput] = useState<string>('');
  const [otpInput, setOtpInput] = useState<string>('');
  const [customName, setCustomName] = useState<string>('');
  const [customEmail, setCustomEmail] = useState<string>('');
  const [isAddingAccount, setIsAddingAccount] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const mockGoogleAccounts = [
    { name: 'Chetan Mohane', email: 'chetan.mohane@gmail.com', avatar: 'C' },
    { name: 'Guest User', email: 'guest.meet@gmail.com', avatar: 'G' },
    { name: 'Developer Mode', email: 'dev.test@meet.org', avatar: 'D' }
  ];

  const handleGoogleSelect = (acc: { name: string; email: string; avatar: string }) => {
    setLoading(true);
    setTimeout(() => {
      onLogin(acc);
      setLoading(false);
    }, 1200);
  };

  const handleCustomGoogleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customEmail.trim()) return;
    setLoading(true);
    setTimeout(() => {
      onLogin({
        name: customName.trim(),
        email: customEmail.trim(),
        avatar: customName.trim().charAt(0).toUpperCase()
      });
      setLoading(false);
    }, 1200);
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setLoading(true);
    setTimeout(() => {
      setMethod('otp');
      setLoading(false);
    }, 1000);
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpInput.length !== 6) return;
    setLoading(true);
    setTimeout(() => {
      const extractedName = emailInput.split('@')[0];
      const displayName = extractedName.charAt(0).toUpperCase() + extractedName.slice(1);
      onLogin({
        name: displayName,
        email: emailInput,
        avatar: displayName.charAt(0).toUpperCase()
      });
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="auth-outer-container">
      <div className="auth-left-banner">
        <div className="banner-badge">
          <Globe size={16} /> <span>Trusted by millions globally</span>
        </div>
        <h1>Connect, collaborate, and celebrate from anywhere.</h1>
        <p>Experience premium video meetings with anyone, on any device, completely free of charge.</p>
        <div className="banner-features">
          <div className="banner-feat-item">
            <div className="banner-feat-icon">🔒</div>
            <div>
              <h3>Secure by design</h3>
              <p>All data is encrypted in transit and protected by security standards.</p>
            </div>
          </div>
          <div className="banner-feat-item">
            <div className="banner-feat-icon">✨</div>
            <div>
              <h3>High definition video</h3>
              <p>Stunning quality video with active noise cancellation and layout controls.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-right-panel">
        <div className="auth-card">
          <div className="auth-logo-row">
            <Video size={36} className="auth-logo-icon" />
            <h2>Google <span>Meet</span></h2>
          </div>

          {loading ? (
            <div className="auth-loading-spinner">
              <div className="spinner"></div>
              <p>Verifying your session...</p>
            </div>
          ) : (
            <>
              {method === 'selection' && (
                <div className="auth-step-container">
                  <h3>Sign in to continue</h3>
                  <p className="auth-subtitle">Select your preferred method to join the meeting room</p>

                  <button className="auth-btn-google" onClick={() => setMethod('google')}>
                    <svg className="google-icon-svg" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Sign in with Google</span>
                  </button>

                  <div className="auth-separator">
                    <span>or</span>
                  </div>

                  <button className="auth-btn-email" onClick={() => setMethod('email')}>
                    <Mail size={18} />
                    <span>Sign in with Email ID</span>
                  </button>

                  <div className="auth-footer-note">
                    <ShieldCheck size={14} style={{ color: 'var(--brand-green)' }} />
                    <span>Secure end-to-end encryption authenticated</span>
                  </div>
                </div>
              )}

              {method === 'google' && (
                <div className="auth-step-container">
                  <button className="auth-btn-back" onClick={() => { setMethod('selection'); setIsAddingAccount(false); }}>
                    ← Back to choices
                  </button>
                  
                  {!isAddingAccount ? (
                    <>
                      <h3>Choose an account</h3>
                      <p className="auth-subtitle">to continue to Google Meet</p>

                      <div className="google-accounts-list">
                        {mockGoogleAccounts.map((acc, index) => (
                          <div 
                            key={index} 
                            className="google-account-item"
                            onClick={() => handleGoogleSelect(acc)}
                          >
                            <div className="google-avatar-badge">{acc.avatar}</div>
                            <div className="google-acc-details">
                              <span className="acc-name">{acc.name}</span>
                              <span className="acc-email">{acc.email}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <button className="google-add-btn" onClick={() => setIsAddingAccount(true)}>
                        <UserPlus size={16} />
                        <span>Use another account</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <h3>Use another account</h3>
                      <p className="auth-subtitle">Enter your profile information</p>

                      <form onSubmit={handleCustomGoogleSubmit} className="auth-form">
                        <div className="form-group">
                          <label>Full Name</label>
                          <input 
                            type="text" 
                            placeholder="John Doe" 
                            value={customName}
                            onChange={(e) => setCustomName(e.target.value)}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label>Email Address</label>
                          <input 
                            type="email" 
                            placeholder="john.doe@gmail.com" 
                            value={customEmail}
                            onChange={(e) => setCustomEmail(e.target.value)}
                            required
                          />
                        </div>
                        <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '16px' }}>
                          <span>Continue</span> <ArrowRight size={16} />
                        </button>
                      </form>
                    </>
                  )}
                </div>
              )}

              {method === 'email' && (
                <div className="auth-step-container">
                  <button className="auth-btn-back" onClick={() => setMethod('selection')}>
                    ← Back to choices
                  </button>
                  
                  <h3>Enter your Email ID</h3>
                  <p className="auth-subtitle">We will send a one-time OTP code to verify your account</p>

                  <form onSubmit={handleEmailSubmit} className="auth-form">
                    <div className="form-group">
                      <label>Email ID</label>
                      <input 
                        type="email" 
                        placeholder="name@example.com" 
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>
                    <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '16px' }}>
                      <span>Send OTP</span> <ArrowRight size={16} />
                    </button>
                  </form>
                </div>
              )}

              {method === 'otp' && (
                <div className="auth-step-container">
                  <button className="auth-btn-back" onClick={() => setMethod('email')}>
                    ← Change Email
                  </button>
                  
                  <h3>Verification Code</h3>
                  <p className="auth-subtitle">Please enter the 6-digit code sent to <strong style={{ color: 'white' }}>{emailInput}</strong></p>

                  <form onSubmit={handleOtpSubmit} className="auth-form">
                    <div className="form-group">
                      <label>6-Digit OTP Code</label>
                      <div className="otp-input-wrapper">
                        <Key size={18} className="otp-icon" />
                        <input 
                          type="text" 
                          placeholder="123456" 
                          maxLength={6}
                          pattern="[0-9]{6}"
                          value={otpInput}
                          onChange={(e) => setOtpInput(e.target.value.replace(/[^0-9]/g, ''))}
                          required
                          autoFocus
                          style={{ paddingLeft: '40px', letterSpacing: '8px', fontSize: '18px', fontWeight: 'bold' }}
                        />
                      </div>
                    </div>
                    <button 
                      type="submit" 
                      className="btn-primary" 
                      style={{ width: '100%', marginTop: '16px' }}
                      disabled={otpInput.length !== 6}
                    >
                      <span>Verify & Login</span> <ArrowRight size={16} />
                    </button>
                  </form>
                  <p className="resend-text">Didn't receive code? <span onClick={() => setOtpInput('')} style={{ color: 'var(--brand-blue)', cursor: 'pointer' }}>Resend code</span></p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
