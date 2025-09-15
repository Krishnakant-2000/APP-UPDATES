import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import ThemeToggle from '../../components/common/ui/ThemeToggle';
import LanguageSelector from '../../components/common/forms/LanguageSelector';
import userService from '../../services/api/userService';
import { resetPageStyles, bustCSSCache } from '../../utils/cssCleanup';
import './Auth.css';

// Import SVG assets
import googleLogo from "../../assets/images/icons/google-logo.svg";
import appleLogo from "../../assets/images/icons/apple-logo.svg";

export default function EnhancedSignup() {
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup, googleLogin, appleLogin, currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Step 1: Basic account info
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  // Step 2: Account type selection
  const [accountType, setAccountType] = useState('');

  // Step 3: Profile information based on account type
  const [profileData, setProfileData] = useState({
    age: '',
    location: '',
    bio: '',
    // Athlete specific
    sports: [],
    achievements: '',
    experience: '',
    height: '',
    weight: '',
    // Coach specific
    coachingProfile: {
      organization: '',
      position: '',
      primarySport: '',
      experience: '',
      licenseLevel: '',
      specializations: [],
      ageGroups: [],
      coachingPhilosophy: ''
    },
    // Organization specific
    orgProfile: {
      orgName: '',
      orgType: '',
      location: '',
      description: '',
      website: '',
      establishedYear: ''
    }
  });

  // Check if there's a type parameter in URL (for coach registration)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const typeParam = params.get('type');
    if (typeParam) {
      setAccountType(typeParam);
      setCurrentStep(2); // Skip account type selection
    }
  }, [location]);

  useEffect(() => {
    resetPageStyles('signup');
    bustCSSCache();
    document.title = 'AmaPlayer - Sign Up';
  }, []);

  const accountTypes = [
    {
      id: 'athlete',
      title: 'Athlete',
      icon: '🏃‍♂️',
      description: 'Individual sports person, player, or fitness enthusiast',
      features: ['Showcase talent videos', 'Connect with coaches', 'Join competitions', 'Track performance']
    },
    {
      id: 'coach',
      title: 'Coach',
      icon: '👨‍🏫',
      description: 'Sports coach, trainer, or mentor',
      features: ['Share coaching techniques', 'Recruit athletes', 'Build coaching portfolio', 'Offer training programs']
    },
    {
      id: 'organisation',
      title: 'Organization',
      icon: '🏢',
      description: 'Sports club, academy, school, or sports organization',
      features: ['Promote facilities', 'Organize events', 'Recruit members', 'Showcase programs']
    }
  ];

  const sportsOptions = [
    'Football', 'Basketball', 'Cricket', 'Tennis', 'Badminton', 'Swimming',
    'Athletics', 'Volleyball', 'Hockey', 'Table Tennis', 'Boxing', 'Wrestling',
    'Gymnastics', 'Cycling', 'Running', 'Fitness', 'Yoga', 'Other'
  ];

  // Handle basic signup form submission
  async function handleBasicSignup(e) {
    e.preventDefault();

    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }

    if (password.length < 6) {
      return setError('Password must be at least 6 characters');
    }

    try {
      setError('');
      setLoading(true);

      // Create user account
      await signup(email, password, displayName);

      // Move to account type selection
      setCurrentStep(2);
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        setError('Account already exists with this email. Please use the login page.');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError('Failed to create account: ' + error.message);
      }
    }
    setLoading(false);
  }

  // Handle Google signup
  async function handleGoogleSignup() {
    try {
      setError('');
      setLoading(true);

      // Try to sign in first to check if user exists
      const result = await googleLogin();

      // Check if user already exists in Firestore
      const existingProfile = await userService.getUserProfile(result.user.uid);

      if (existingProfile) {
        // User already has a profile, redirect directly to home
        navigate('/home');
      } else {
        // New user, continue with account type selection
        setDisplayName(result.user.displayName || '');
        setEmail(result.user.email || '');
        setCurrentStep(2);
      }
    } catch (error) {
      if (error.code === 'auth/account-exists-with-different-credential') {
        // Redirect to login immediately
        navigate('/login');
      } else {
        setError('Failed to sign up with Google');
      }
      console.error('Google signup error:', error);
    }
    setLoading(false);
  }

  // Handle Apple signup
  async function handleAppleSignup() {
    try {
      setError('');
      setLoading(true);

      // Try to sign in first to check if user exists
      const result = await appleLogin();

      // Check if user already exists in Firestore
      const existingProfile = await userService.getUserProfile(result.user.uid);

      if (existingProfile) {
        // User already has a profile, redirect directly to home
        navigate('/home');
      } else {
        // New user, continue with account type selection
        setDisplayName(result.user.displayName || '');
        setEmail(result.user.email || '');
        setCurrentStep(2);
      }
    } catch (error) {
      if (error.code === 'auth/account-exists-with-different-credential') {
        // Redirect to login immediately
        navigate('/login');
      } else {
        setError('Failed to sign up with Apple');
      }
      console.error('Apple signup error:', error);
    }
    setLoading(false);
  }

  // Handle account type selection
  function handleAccountTypeSelection(type) {
    setAccountType(type);
    setCurrentStep(3);
  }

  // Handle profile data update
  function updateProfileField(field, value) {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setProfileData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setProfileData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  }

  // Complete registration and create profile
  async function completeRegistration() {
    try {
      setError('');
      setLoading(true);

      if (!currentUser) {
        throw new Error('No authenticated user found');
      }

      // Prepare profile data based on account type
      const finalProfileData = {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName || displayName,
        role: accountType,
        photoURL: currentUser.photoURL || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...profileData,
        // Add account type specific data
        ...(accountType === 'athlete' && {
          sports: profileData.sports,
          achievements: profileData.achievements,
          experience: profileData.experience,
          height: profileData.height ? `${profileData.height} cm` : '',
          weight: profileData.weight ? `${profileData.weight} kg` : '',
        }),
        ...(accountType === 'coach' && {
          coachingProfile: profileData.coachingProfile
        }),
        ...(accountType === 'organisation' && {
          orgProfile: profileData.orgProfile
        })
      };

      // Create user profile in Firestore
      await userService.createUserProfile(finalProfileData);

      console.log('✅ User registration completed successfully');
      navigate('/home');
    } catch (error) {
      setError('Failed to complete registration: ' + error.message);
      console.error('Registration completion error:', error);
    }
    setLoading(false);
  }

  // Render Step 1: Basic account information
  function renderStep1() {
    return (
      <div className="signup-step">
        <h2>Create New Account</h2>
        <p className="step-description">New users only - Existing users should use the login page</p>
        <form onSubmit={handleBasicSignup}>
          {error && <div className="error">{error}</div>}

          <div className="form-group">
            <input
              type="text"
              placeholder="Full Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>

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
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button disabled={loading} type="submit" className="auth-btn primary">
            {loading ? 'Creating Account...' : 'Continue'}
          </button>
        </form>

        <div className="divider">OR</div>

        <div className="social-login">
          <button
            disabled={loading}
            className="auth-btn google-btn"
            onClick={handleGoogleSignup}
          >
            <img src={googleLogo} alt="Google" className="social-icon" />
            Sign up with Google
          </button>

          <button
            disabled={loading}
            className="auth-btn apple-btn"
            onClick={handleAppleSignup}
          >
            <img src={appleLogo} alt="Apple" className="social-icon" />
            Sign up with Apple
          </button>
        </div>

        <div className="auth-link-section">
          <p><strong>Already have an account?</strong></p>
          <button
            className="auth-link-btn"
            onClick={() => navigate('/login')}
          >
            ← Back to Login
          </button>
          <p className="existing-user-note">
            This signup form is for <strong>NEW USERS ONLY</strong>. Existing users should go back to the login page.
          </p>
        </div>
      </div>
    );
  }

  // Render Step 2: Account type selection
  function renderStep2() {
    return (
      <div className="signup-step account-type-selection">
        <h2>Choose Your Account Type</h2>
        <p className="step-description">Select the option that best describes you</p>

        {error && <div className="error">{error}</div>}

        <div className="account-types-grid">
          {accountTypes.map((type) => (
            <div
              key={type.id}
              className={`account-type-card ${accountType === type.id ? 'selected' : ''}`}
              onClick={() => handleAccountTypeSelection(type.id)}
            >
              <div className="account-type-icon">{type.icon}</div>
              <h3>{type.title}</h3>
              <p className="account-type-description">{type.description}</p>
              <ul className="account-type-features">
                {type.features.map((feature, index) => (
                  <li key={index}>✓ {feature}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="step-navigation">
          <button
            className="auth-btn secondary"
            onClick={() => setCurrentStep(1)}
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  // Render Step 3: Profile information
  function renderStep3() {
    return (
      <div className="signup-step profile-information">
        <h2>Complete Your Profile</h2>
        <p className="step-description">
          Help others discover you by completing your {accountTypes.find(t => t.id === accountType)?.title.toLowerCase()} profile
        </p>

        {error && <div className="error">{error}</div>}

        {/* Common fields for all account types */}
        <div className="form-section">
          <h3>Basic Information</h3>

          <div className="form-group">
            <input
              type="number"
              placeholder="Age"
              value={profileData.age}
              onChange={(e) => updateProfileField('age', e.target.value)}
            />
          </div>

          <div className="form-group">
            <input
              type="text"
              placeholder="Location (City, State)"
              value={profileData.location}
              onChange={(e) => updateProfileField('location', e.target.value)}
            />
          </div>

          <div className="form-group">
            <textarea
              placeholder="Bio (Tell us about yourself)"
              value={profileData.bio}
              onChange={(e) => updateProfileField('bio', e.target.value)}
              rows="3"
            />
          </div>
        </div>

        {/* Athlete specific fields */}
        {accountType === 'athlete' && (
          <div className="form-section">
            <h3>Athletic Information</h3>

            <div className="form-group">
              <label>Sports/Games (Select up to 5)</label>
              <div className="sports-selection">
                {sportsOptions.map((sport) => (
                  <label key={sport} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={profileData.sports.includes(sport)}
                      onChange={(e) => {
                        if (e.target.checked && profileData.sports.length < 5) {
                          updateProfileField('sports', [...profileData.sports, sport]);
                        } else if (!e.target.checked) {
                          updateProfileField('sports', profileData.sports.filter(s => s !== sport));
                        }
                      }}
                    />
                    {sport}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <input
                  type="number"
                  placeholder="Height (cm)"
                  value={profileData.height}
                  onChange={(e) => updateProfileField('height', e.target.value)}
                />
              </div>
              <div className="form-group">
                <input
                  type="number"
                  placeholder="Weight (kg)"
                  value={profileData.weight}
                  onChange={(e) => updateProfileField('weight', e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <textarea
                placeholder="Achievements & Awards"
                value={profileData.achievements}
                onChange={(e) => updateProfileField('achievements', e.target.value)}
                rows="3"
              />
            </div>

            <div className="form-group">
              <select
                value={profileData.experience}
                onChange={(e) => updateProfileField('experience', e.target.value)}
              >
                <option value="">Select Experience Level</option>
                <option value="beginner">Beginner (0-2 years)</option>
                <option value="intermediate">Intermediate (2-5 years)</option>
                <option value="advanced">Advanced (5-10 years)</option>
                <option value="professional">Professional (10+ years)</option>
              </select>
            </div>
          </div>
        )}

        {/* Coach specific fields */}
        {accountType === 'coach' && (
          <div className="form-section">
            <h3>Coaching Information</h3>

            <div className="form-group">
              <input
                type="text"
                placeholder="Organization/Club"
                value={profileData.coachingProfile.organization}
                onChange={(e) => updateProfileField('coachingProfile.organization', e.target.value)}
              />
            </div>

            <div className="form-group">
              <input
                type="text"
                placeholder="Position/Title"
                value={profileData.coachingProfile.position}
                onChange={(e) => updateProfileField('coachingProfile.position', e.target.value)}
              />
            </div>

            <div className="form-group">
              <select
                value={profileData.coachingProfile.primarySport}
                onChange={(e) => updateProfileField('coachingProfile.primarySport', e.target.value)}
              >
                <option value="">Select Primary Sport</option>
                {sportsOptions.map(sport => (
                  <option key={sport} value={sport}>{sport}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <select
                value={profileData.coachingProfile.experience}
                onChange={(e) => updateProfileField('coachingProfile.experience', e.target.value)}
              >
                <option value="">Coaching Experience</option>
                <option value="1-3 years">1-3 years</option>
                <option value="3-5 years">3-5 years</option>
                <option value="5-10 years">5-10 years</option>
                <option value="10+ years">10+ years</option>
              </select>
            </div>

            <div className="form-group">
              <textarea
                placeholder="Coaching Philosophy"
                value={profileData.coachingProfile.coachingPhilosophy}
                onChange={(e) => updateProfileField('coachingProfile.coachingPhilosophy', e.target.value)}
                rows="3"
              />
            </div>
          </div>
        )}

        {/* Organization specific fields */}
        {accountType === 'organisation' && (
          <div className="form-section">
            <h3>Organization Information</h3>

            <div className="form-group">
              <input
                type="text"
                placeholder="Organization Name"
                value={profileData.orgProfile.orgName}
                onChange={(e) => updateProfileField('orgProfile.orgName', e.target.value)}
              />
            </div>

            <div className="form-group">
              <select
                value={profileData.orgProfile.orgType}
                onChange={(e) => updateProfileField('orgProfile.orgType', e.target.value)}
              >
                <option value="">Organization Type</option>
                <option value="Sports Club">Sports Club</option>
                <option value="Academy">Academy</option>
                <option value="School">School</option>
                <option value="University">University</option>
                <option value="Training Center">Training Center</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <input
                type="text"
                placeholder="Website (optional)"
                value={profileData.orgProfile.website}
                onChange={(e) => updateProfileField('orgProfile.website', e.target.value)}
              />
            </div>

            <div className="form-group">
              <input
                type="number"
                placeholder="Established Year"
                value={profileData.orgProfile.establishedYear}
                onChange={(e) => updateProfileField('orgProfile.establishedYear', e.target.value)}
              />
            </div>

            <div className="form-group">
              <textarea
                placeholder="Organization Description"
                value={profileData.orgProfile.description}
                onChange={(e) => updateProfileField('orgProfile.description', e.target.value)}
                rows="4"
              />
            </div>
          </div>
        )}

        <div className="step-navigation">
          <button
            className="auth-btn secondary"
            onClick={() => setCurrentStep(2)}
          >
            Back
          </button>
          <button
            className="auth-btn primary"
            onClick={completeRegistration}
            disabled={loading}
          >
            {loading ? 'Creating Profile...' : 'Complete Registration'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container enhanced-signup">
      <div className="auth-header">
        <button
          className="homepage-btn"
          onClick={() => navigate('/login')}
          title="Back to Login"
        >
          ← <span>Back to Login</span>
        </button>
        <div className="auth-controls">
          <LanguageSelector />
          <ThemeToggle />
        </div>
      </div>

      <div className="auth-card enhanced">
        <div className="step-indicator">
          <div className={`step ${currentStep >= 1 ? 'active' : ''}`}>1</div>
          <div className={`step ${currentStep >= 2 ? 'active' : ''}`}>2</div>
          <div className={`step ${currentStep >= 3 ? 'active' : ''}`}>3</div>
        </div>

        <h1>AmaPlayer</h1>

        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
      </div>
    </div>
  );
}