import React, { useState, useEffect } from 'react';
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import "./style.css";
import "./styleguide.css";
import "./UserTypeSelection.css";
import "./NewLoginFlow.css";
import vector5 from "./vector-5.svg";

// User Type Selection Component
const UserTypeSelection = ({ onSelectType }) => {
  const userTypes = [
    {
      id: 'athlete',
      title: 'Athlete',
      description: 'Join as a player to showcase your skills and connect with coaches',
      icon: '🏆',
      color: '#4CAF50'
    },
    {
      id: 'coach',
      title: 'Coach',
      description: 'Join as a coach to train and mentor athletes',
      icon: '👨‍🏫',
      color: '#2196F3'
    },
    {
      id: 'organization',
      title: 'Organization',
      description: 'Join as an organization to manage teams and events',
      icon: '🏢',
      color: '#9C27B0'
    }
  ];

  return (
    <div className="user-type-selection">
      <h2>Join as</h2>
      <div className="user-type-cards">
        {userTypes.map((type) => (
          <div 
            key={type.id}
            className="user-type-card"
            onClick={() => onSelectType(type.id)}
            style={{ '--card-color': type.color }}
          >
            <div className="card-icon">{type.icon}</div>
            <h3>{type.title}</h3>
            <p>{type.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// Athlete Form Component
const AthleteForm = () => (
  <div className="user-type-form">
    <h3>Athlete Information</h3>
    <div className="form-group">
      <label>Sport/Game</label>
      <select name="sport" required>
        <option value="">Select your sport</option>
        <option value="cricket">Cricket</option>
        <option value="football">Football</option>
        <option value="basketball">Basketball</option>
        <option value="tennis">Tennis</option>
        <option value="badminton">Badminton</option>
        <option value="other">Other</option>
      </select>
    </div>
    <div className="form-group">
      <label>Experience Level</label>
      <select name="experience" required>
        <option value="">Select experience level</option>
        <option value="beginner">Beginner</option>
        <option value="amateur">Amateur</option>
        <option value="semi-pro">Semi-Professional</option>
        <option value="professional">Professional</option>
      </select>
    </div>
  </div>
);

// Coach Form Component
const CoachForm = () => (
  <div className="user-type-form">
    <h3>Coach Information</h3>
    <div className="form-group">
      <label>Sports/Games You Coach</label>
      <select multiple name="sports" required>
        <option value="cricket">Cricket</option>
        <option value="football">Football</option>
        <option value="basketball">Basketball</option>
        <option value="tennis">Tennis</option>
        <option value="badminton">Badminton</option>
        <option value="other">Other</option>
      </select>
      <small>Hold Ctrl/Cmd to select multiple</small>
    </div>
    <div className="form-group">
      <label>Certification Level</label>
      <input type="text" name="certification" required placeholder="E.g., BCCI Level 2" />
    </div>
    <div className="form-group">
      <label>Years of Experience</label>
      <input type="number" name="experience" min="0" required />
    </div>
  </div>
);

// Organization Form Component
const OrganizationForm = () => (
  <div className="user-type-form">
    <h3>Organization Information</h3>
    <div className="form-group">
      <label>Organization Type</label>
      <select name="orgType" required>
        <option value="">Select organization type</option>
        <option value="academy">Sports Academy</option>
        <option value="club">Sports Club</option>
        <option value="school">School/College</option>
        <option value="university">University</option>
        <option value="other">Other</option>
      </select>
    </div>
    <div className="form-group">
      <label>Sports/Games Offered</label>
      <select multiple name="sportsOffered" required>
        <option value="cricket">Cricket</option>
        <option value="football">Football</option>
        <option value="basketball">Basketball</option>
        <option value="tennis">Tennis</option>
        <option value="badminton">Badminton</option>
      </select>
      <small>Hold Ctrl/Cmd to select multiple</small>
    </div>
    <div className="form-group">
      <label>Organization Size</label>
      <select name="orgSize" required>
        <option value="">Select size</option>
        <option value="small">1-10 members</option>
        <option value="medium">11-50 members</option>
        <option value="large">51-200 members</option>
        <option value="xlarge">200+ members</option>
      </select>
    </div>
  </div>
);

// Main Login Component
const NewLoginFlow = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('type'); // 'type', 'details', 'login'
  const [logoutMessage, setLogoutMessage] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [userType, setUserType] = useState(null);
  const [searchParams] = useSearchParams();
  const { login, guestLogin, googleLogin, facebookLogin, appleLogin } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Load saved credentials if "Remember Me" was used
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    const savedRememberMe = localStorage.getItem('rememberMe') === 'true';

    if (savedEmail && savedRememberMe) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  // Check for user type in URL params and logout parameter
  useEffect(() => {
    const type = searchParams.get('type');
    const isLogout = searchParams.get('logout') === 'yes';

    // If user just logged out, show login form directly with smooth transition
    if (isLogout) {
      setError('');
      setLogoutMessage('✅ Successfully logged out! Please sign in again.');

      // Set state immediately for smooth transition
      setStep('login');
      setUserType('returning-user');
      console.log('✅ User successfully logged out - showing login form');

      // Clear the logout parameter from URL after a smooth delay
      setTimeout(() => {
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('logout');
        const newUrl = newSearchParams.toString() ? `/login?${newSearchParams.toString()}` : '/login';
        window.history.replaceState({}, '', newUrl);

        // Clear the logout message after 4 seconds (longer for better UX)
        setTimeout(() => setLogoutMessage(''), 4000);
      }, 100); // Reduced delay for smoother transition
    }

    if (type && ['athlete', 'coach', 'organization'].includes(type)) {
      setUserType(type);
      const fromExplore = searchParams.get('fromExplore') === 'true';
      setStep(fromExplore ? 'login' : 'details');
    }
  }, [searchParams, navigate]);

  const handleSelectUserType = (type, fromExplore = false) => {
    setUserType(type);
    setStep(fromExplore ? 'login' : 'details');
    navigate(`/login?type=${type}${fromExplore ? '&fromExplore=true' : ''}`, { replace: true });
  };

  const redirectUser = async (user) => {
    if (!user) {
      navigate('/home'); // Fallback for safety
      return;
    }
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists() && userDoc.data().profileComplete) {
        navigate('/home');
      } else {
        navigate('/profile/complete');
      }
    } catch (err) {
      console.error("Redirection check failed: ", err);
      navigate('/home'); // Fallback on error
    }
  };

  const handleEmailLogin = async (e) => {
    if (e) e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const userCredential = await login(email, password);

      // Handle Remember Me functionality
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
        localStorage.setItem('rememberMe', 'true');
      } else {
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberMe');
      }

      await redirectUser(userCredential.user);
    } catch (error) {
      setError('Failed to log in. Please check your credentials.');
      console.error('Login error:', error);
    }
    setLoading(false);
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await guestLogin();
      navigate('/home'); // Guests go directly to home
    } catch (error) {
      setError('Failed to log in as guest');
      console.error('Guest login error:', error);
    }
    setLoading(false);
  };

  const handleSocialLogin = async (provider) => {
    setLoading(true);
    setError('');
    try {
      let userCredential;
      if (provider === 'google') {
        userCredential = await googleLogin();
      } else if (provider === 'facebook') {
        userCredential = await facebookLogin();
      } else if (provider === 'apple') {
        userCredential = await appleLogin();
      }
      await redirectUser(userCredential.user);
    } catch (error) {
      setError(`Failed to log in with ${provider}`);
      console.error(`${provider} login error:`, error);
    }
    setLoading(false);
  };

  // Render the login form
  const renderLoginForm = () => (
    <>
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleEmailLogin}>
        <div className="form-group">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={loading} className="login-button">
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <div className="divider">or</div>

      <div className="social-login">
        <button 
          type="button"
          className="social-button google"
          onClick={() => handleSocialLogin('google')}
          disabled={loading}
        >
          Continue with Google
        </button>
        <button 
          type="button"
          className="social-button facebook"
          onClick={() => handleSocialLogin('facebook')}
          disabled={loading}
        >
          Continue with Facebook
        </button>
        <button 
          type="button"
          className="social-button apple"
          onClick={() => handleSocialLogin('apple')}
          disabled={loading}
        >
          Continue with Apple
        </button>
      </div>

      <div className="login-footer">
        <p>
          Don't have an account?{' '}
          <a href="/signup" onClick={(e) => {
            e.preventDefault();
            navigate(`/signup?type=${userType}`);
          }}>
            Sign up as {userType}
          </a>
        </p>
        <p>
          <a href="/forgot-password" onClick={(e) => {
            e.preventDefault();
            // Handle forgot password
          }}>
            Forgot password?
          </a>
        </p>
      </div>
    </>
  );

  // Render the appropriate step
  const renderStep = () => {
    const fromExplore = searchParams.get('fromExplore') === 'true';
    
    // If coming from explore page, show only the selected type's login
    if (fromExplore && step === 'login') {
      return (
        <div className="login-page">
          <div className="login-container">
            <div className="login-form">
              <h2>{userType.charAt(0).toUpperCase() + userType.slice(1)} Login</h2>
              {renderLoginForm()}
            </div>
          </div>
        </div>
      );
    }

    switch (step) {
      case 'type':
        return <UserTypeSelection onSelectType={handleSelectUserType} />;
      
      case 'details':
        return (
          <div className="login-page">
            <div className="login-container">
              <div className="login-form">
                <h2>Complete Your {userType.charAt(0).toUpperCase() + userType.slice(1)} Profile</h2>
                
                {userType === 'athlete' && <AthleteForm />}
                {userType === 'coach' && <CoachForm />}
                {userType === 'organization' && <OrganizationForm />}
                
                <div className="form-navigation">
                  <button 
                    type="button" 
                    className="btn-secondary"
                    onClick={() => setStep('type')}
                  >
                    Back
                  </button>
                  <button 
                    type="button" 
                    className="btn-primary"
                    onClick={() => setStep('login')}
                  >
                    Continue to Login
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'login':
      default:
        return (
          <div className="login-page">
            <div className="login-container">
              <div className="login-form">
                <h2>Login to AmaPlayer</h2>
                {userType !== 'returning-user' && (
                  <p className="user-type-badge">
                    Joining as: <span>{userType}</span>
                    <button
                      onClick={() => setStep('type')}
                      className="change-type-btn"
                      type="button"
                    >
                      Change
                    </button>
                  </p>
                )}
                {userType === 'returning-user' && (
                  <p className="welcome-back-text" style={{textAlign: 'center', color: '#666', marginBottom: '20px'}}>
                    Welcome back! Please sign in with your credentials.
                  </p>
                )}
                
                {logoutMessage && <div className="success-message" style={{color: '#4CAF50', backgroundColor: 'rgba(76, 175, 80, 0.1)', padding: '10px', borderRadius: '5px', marginBottom: '15px', textAlign: 'center'}}>{logoutMessage}</div>}
                {error && <div className="error-message">{error}</div>}
                
                <form onSubmit={handleEmailLogin}>
                  <div className="form-group">
                    <input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>

                  {/* Remember Me Checkbox */}
                  <div className="form-group remember-me-group" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '20px'
                  }}>
                    <input
                      type="checkbox"
                      id="rememberMe"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      style={{
                        width: '16px',
                        height: '16px',
                        accentColor: '#4CAF50'
                      }}
                    />
                    <label
                      htmlFor="rememberMe"
                      style={{
                        color: '#333',
                        fontSize: '14px',
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}
                    >
                      Remember me
                    </label>
                  </div>

                  <button type="submit" disabled={loading}>
                    {loading ? 'Logging in...' : 'Login'}
                  </button>
                </form>

                <div className="divider">or</div>

                <div className="social-login">
                  <button 
                    className="google-btn" 
                    onClick={() => handleSocialLogin('google')} 
                    disabled={loading}
                  >
                    Continue with Google
                  </button>
                  <button 
                    className="facebook-btn" 
                    onClick={() => handleSocialLogin('facebook')} 
                    disabled={loading}
                  >
                    Continue with Facebook
                  </button>
                  <button 
                    className="apple-btn" 
                    onClick={() => handleSocialLogin('apple')} 
                    disabled={loading}
                  >
                    Continue with Apple
                  </button>
                </div>

                <div className="login-footer">
                  <p>
                    Don't have an account?{' '}
                    <a href="/signup" onClick={(e) => {
                      e.preventDefault();
                      if (userType === 'returning-user') {
                        // For returning users, go to profile selection first
                        navigate('/signup');
                      } else {
                        navigate(`/signup?type=${userType}`);
                      }
                    }}>
                      {userType === 'returning-user' ? 'Sign up' : `Sign up as ${userType}`}
                    </a>
                  </p>
                  <p>
                    <a href="/forgot-password" onClick={(e) => {
                      e.preventDefault();
                      // Handle forgot password
                    }}>
                      Forgot password?
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return renderStep();
};

export default NewLoginFlow;
