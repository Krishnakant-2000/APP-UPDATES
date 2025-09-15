import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { db, storage } from '../../lib/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, setDoc, addDoc, serverTimestamp, onSnapshot, deleteDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { uploadVideoFile, generateVideoMetadata } from '../../services/api/videoService';
import { filterContent, getViolationMessage } from '../../utils/content/contentFilter';
import { filterChatMessage, getChatViolationMessage, logChatViolation } from '../../utils/content/chatFilter';
import { SPORTS_CATEGORIES, searchSports } from '../../data/sportsData';
import { 
  COACHING_LEVELS, ORGANIZATION_TYPES, 
  AGE_GROUPS, EMPLOYMENT_TYPES,
  getSpecializationsBySport, getAllCertifications
} from '../../data/coachingData';
import { Edit2, Camera, Plus, X, Save, Users, UserPlus, Check, Video, Trash2, Play, MoreVertical, Heart, MessageCircle, Send } from 'lucide-react';
import FooterNav from '../../components/layout/FooterNav';
import AppHeader from '../../components/layout/AppHeader';
import VerificationBadge from '../../components/common/ui/VerificationBadge';
import VerificationRequestModal from '../../components/common/modals/VerificationRequestModal';
import StoryViewer from '../../features/stories/StoryViewer';
import { StoriesService } from '../../services/api/storiesService';
import notificationService from '../../services/notificationService';
import './Profile.css';

export default function Profile({ profileUserId = null }) {
  // Profile component loading - development debug removed for production
  
  const { userId: urlUserId } = useParams();
  const navigate = useNavigate();
  const { currentUser, isGuest, updateUserProfile, refreshAuth } = useAuth();
  
  // Profile IDs debugging - development debug removed for production
  const { t } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState({});
  const [certificates, setCertificates] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [showCertificateForm, setShowCertificateForm] = useState(false);
  const [showAchievementForm, setShowAchievementForm] = useState(false);
  const [newCertificate, setNewCertificate] = useState({ name: '', date: '', description: '', fileUrl: '', fileName: '' });
  const [newAchievement, setNewAchievement] = useState({ title: '', date: '', description: '' });
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [followingUser, setFollowingUser] = useState(false);
  const [sentRequests, setSentRequests] = useState([]);
  const [friendships, setFriendships] = useState([]);
  const [talentVideos, setTalentVideos] = useState([]);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [uploadTask, setUploadTask] = useState(null);
  const [playingVideo, setPlayingVideo] = useState(null);
  const [followedUsers, setFollowedUsers] = useState([]);
  const [isFollowingProfile, setIsFollowingProfile] = useState(false);
  const [showProfileImageMenu, setShowProfileImageMenu] = useState(false);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [userStories, setUserStories] = useState({ user: null, stories: [] });
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [showPostMenus, setShowPostMenus] = useState({});
  const [videoComment, setVideoComment] = useState('');
  const [isLikingVideo, setIsLikingVideo] = useState(false);
  const [isCommentingVideo, setIsCommentingVideo] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  
  // Sports selection state
  const [selectedSports, setSelectedSports] = useState([]);
  const [showSportsDropdown, setShowSportsDropdown] = useState(false);
  const [sportsSearchTerm, setSportsSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  
  // Coaching profile state
  const [showCoachingForm, setShowCoachingForm] = useState(false);
  const [coachingProfile, setCoachingProfile] = useState({
    organization: '',
    organizationType: '',
    position: '',
    employmentType: '',
    yearsAtOrganization: '',
    primarySport: '',
    secondarySports: [],
    specializations: [],
    ageGroups: [],
    licenseLevel: '',
    certifications: [],
    totalExperience: '',
    achievements: [],
    philosophyStatement: ''
  });
  
  // Determine which user's profile we're viewing
  const targetUserId = urlUserId || profileUserId || currentUser?.uid;
  const isOwnProfile = targetUserId === currentUser?.uid;

  useEffect(() => {
    // Profile useEffect triggered - development debug removed for production
    
    if (currentUser) {
      // CurrentUser exists, calling functions...
      fetchProfile();
      fetchUserPosts();
      fetchTalentVideos();
      if (!isGuest()) {
        fetchFollowedUsers();
        fetchSentRequests();
        fetchFriendships();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, targetUserId]);

  // Close profile image menu and post menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProfileImageMenu && !event.target.closest('.profile-image-container')) {
        setShowProfileImageMenu(false);
      }
      
      // Close post menus when clicking outside
      if (!event.target.closest('.post-menu-container')) {
        setShowPostMenus({});
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileImageMenu]);

  // Helper function to get video section configuration based on role
  const getVideoSectionConfig = (userRole) => {
    switch(userRole) {
      case 'athlete':
        return {
          title: t('talentShowcase'),
          description: t('showAthleticSkills'),
          uploadLabel: t('uploadVideo'),
          emptyMessage: t('noPerformanceVideos'),
          icon: '🏆' // Trophy for athletes
        };
      case 'coach':
        return {
          title: t('coachingPortfolio'),
          description: t('shareCoachingTechniques'),
          uploadLabel: t('uploadVideo'),
          emptyMessage: t('noCoachingVideos'),
          icon: '👨‍🏫' // Coach/teacher icon
        };
      case 'organisation':
        return {
          title: t('facilityShowcase'),
          description: t('highlightFacilities'),
          uploadLabel: t('uploadVideo'),
          emptyMessage: t('noFacilityVideos'),
          icon: '🏢' // Building for organizations
        };
      default:
        return {
          title: t('videoShowcase'),
          description: t('shareYourVideos'),
          uploadLabel: t('uploadVideo'),
          emptyMessage: t('noVideosUploaded'),
          icon: '🎥' // Camera for general
        };
    }
  };

  const fetchProfile = async () => {
    try {
      const docRef = doc(db, 'users', targetUserId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const profileData = docSnap.data();

        // Calculate actual follower/following counts from follows collection
        const followersCount = await getFollowersCount(targetUserId);
        const followingCount = await getFollowingCount(targetUserId);

        // Update profile with correct counts
        const updatedProfileData = {
          ...profileData,
          followers: followersCount,
          following: followingCount
        };

        setProfile(updatedProfileData);
        setCertificates(profileData.certificates || []);
        setAchievements(profileData.achievements || []);
        setSelectedSports(profileData.sports || []);
        setCoachingProfile(profileData.coachingProfile || {
          organization: '',
          organizationType: '',
          position: '',
          employmentType: '',
          yearsAtOrganization: '',
          primarySport: '',
          secondarySports: [],
          specializations: [],
          ageGroups: [],
          licenseLevel: '',
          certifications: [],
          totalExperience: '',
          achievements: [],
          philosophyStatement: ''
        });
      } else if (isOwnProfile) {
        // Create default profile data only for own profile
        const defaultProfile = {
          displayName: currentUser.displayName || 'User',
          email: currentUser.email,
          bio: '',
          followers: 0,
          following: 0,
          photoURL: currentUser.photoURL || '',
          name: '',
          age: '',
          height: '',
          weight: '',
          sex: '',
          role: 'athlete',
          certificates: [],
          achievements: [],
          sports: [],
          coachingProfile: {
            organization: '',
            organizationType: '',
            position: '',
            employmentType: '',
            yearsAtOrganization: '',
            primarySport: '',
            secondarySports: [],
            specializations: [],
            ageGroups: [],
            licenseLevel: '',
            certifications: [],
            totalExperience: '',
            achievements: [],
            philosophyStatement: ''
          }
        };
        
        setProfile(defaultProfile);
        
        // Save default profile to Firestore so user is searchable
        try {
          await setDoc(docRef, defaultProfile, { merge: true });
        } catch (error) {
          // Error creating default profile - logged in production
        }
      } else {
        // Profile not found for other user
        setProfile(null);
      }
    } catch (error) {
      // Error fetching profile - logged in production
    }
    setLoading(false);
  };

  // Helper function to get followers count
  const getFollowersCount = async (userId) => {
    try {
      const q = query(
        collection(db, 'follows'),
        where('followingId', '==', userId)
      );
      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      return 0;
    }
  };

  // Helper function to get following count
  const getFollowingCount = async (userId) => {
    try {
      const q = query(
        collection(db, 'follows'),
        where('followerId', '==', userId)
      );
      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      return 0;
    }
  };

  const fetchUserPosts = async () => {
    try {
      const q = query(
        collection(db, 'posts'),
        where('userId', '==', targetUserId)
      );
      const querySnapshot = await getDocs(q);
      const userPosts = [];
      querySnapshot.forEach((doc) => {
        userPosts.push({ id: doc.id, ...doc.data() });
      });
      setPosts(userPosts);
    } catch (error) {
      // Error fetching posts - logged in production
    }
  };

  const fetchTalentVideos = async () => {
    // FETCHTALENTVIDEOS CALLED - development debug removed for production
    
    try {
      let videos = [];
      
      // Only fetch user videos if we have a valid targetUserId and user is authenticated
      if (targetUserId && currentUser) {
        // Conditions met - fetching videos...
        try {
          const q = query(
            collection(db, 'talentVideos'),
            where('userId', '==', targetUserId)
          );
          const querySnapshot = await getDocs(q);
          
          // Found videos for user - development debug removed for production
          
          querySnapshot.forEach((doc) => {
            const videoData = { id: doc.id, ...doc.data() };
            
            const isOwnProfile = targetUserId === currentUser?.uid;
            
            // Processing video - development debug removed for production
            
            // ABSOLUTE RULE: For other people's profiles, ONLY show approved videos
            if (isOwnProfile) {
              // Own profile - show ALL videos (user can see their own pending/rejected videos)
              // SHOWING (Own Profile) - development debug removed for production
              videos.push(videoData);
            } else {
              // Other person's profile - STRICT filtering
              // MUST be both 'approved' status AND isVerified = true
              if (videoData.verificationStatus === 'approved' && videoData.isVerified === true) {
                // SHOWING (Approved & Verified) - development debug removed for production
                videos.push(videoData);
              } else {
                // HIDDEN (Not approved) - development debug removed for production
              }
            }
          });
        } catch (firestoreError) {
          // Could not fetch talent videos from Firestore - logged in production
          // Continue without user videos - not a critical error
        }
      }
      
      // Sort videos by upload date (newest first)
      videos.sort((a, b) => {
        const aTime = a.uploadedAt?.toDate ? a.uploadedAt.toDate().getTime() : 0;
        const bTime = b.uploadedAt?.toDate ? b.uploadedAt.toDate().getTime() : 0;
        return bTime - aTime;
      });
      
      // FINAL RESULT: Setting videos - development debug removed for production
      setTalentVideos(videos);
    } catch (error) {
      // Error in fetchTalentVideos - logged in production
      setTalentVideos([]);
    }
  };

  const handleVideoUpload = async (e) => {
    if (isGuest()) {
      if (window.confirm(`Please sign up or log in to upload videos. Guest accounts have read-only access.\n\nWould you like to go to the login page?`)) {
        navigate('/login');
      }
      return;
    }

    const file = e.target.files[0];
    if (!file) return;

    // Check if user already has 7 videos
    if (talentVideos.length >= 7) {
      const videoConfig = getVideoSectionConfig(profile?.role || 'athlete');
      alert(`You can only upload a maximum of 7 videos in your ${videoConfig.title.toLowerCase()}. Please delete some videos to upload new ones.`);
      return;
    }

    setUploadingVideo(true);
    setVideoUploadProgress(0);
    setUploadTask(null);

    try {
      // Upload video using the video service
      const videoUrl = await uploadVideoFile(
        file,
        currentUser.uid,
        'talent-videos',
        (progress) => {
          setVideoUploadProgress(progress);
        },
        (task) => {
          setUploadTask(task);
        }
      );

      // Generate metadata
      const videoMetadata = await generateVideoMetadata(file, videoUrl, currentUser.uid);

      // Save to talentVideos collection
      const videoData = {
        userId: currentUser.uid,
        userDisplayName: currentUser.displayName || 'Anonymous User',
        videoUrl,
        metadata: videoMetadata,
        fileName: file.name,
        uploadedAt: serverTimestamp(),
        likes: 0,
        views: 0,
        // Admin verification fields
        isVerified: false,
        verificationStatus: 'pending',
        reviewedAt: null,
        verifiedAt: null,
        verifiedBy: null,
        reviewedBy: null,
        rejectionReason: null,
        adminNotes: null,
        flags: []
      };

      await addDoc(collection(db, 'talentVideos'), videoData);
      
      // Refresh the videos list
      fetchTalentVideos();
      
      const videoConfig = getVideoSectionConfig(profile?.role || 'athlete');
      alert(`Video uploaded successfully to your ${videoConfig.title.toLowerCase()}! Your video will be reviewed by our admin team before it appears on your public profile. You can still view it in your own profile.`);
    } catch (error) {
      // Error uploading video - logged in production
      alert('Failed to upload video. Please try again.');
    }

    setUploadingVideo(false);
    setVideoUploadProgress(0);
    setUploadTask(null);
  };

  const handleCancelUpload = () => {
    if (uploadTask) {
      uploadTask.cancel();
      setUploadingVideo(false);
      setVideoUploadProgress(0);
      setUploadTask(null);
      alert('Upload cancelled');
    }
  };

  const handleVideoPlay = (video) => {
    setPlayingVideo(video);
  };

  const handleCloseVideoPlayer = () => {
    setPlayingVideo(null);
    setVideoComment(''); // Clear comment when closing
  };

  // Handle liking talent videos
  const handleVideoLike = async () => {
    if (!currentUser || !playingVideo || isLikingVideo) return;

    // Prevent guests from liking
    if (isGuest()) {
      if (window.confirm('Please sign up or log in to like videos.\n\nWould you like to go to the login page?')) {
        navigate('/login');
      }
      return;
    }

    setIsLikingVideo(true);
    const videoRef = doc(db, 'talentVideos', playingVideo.id);
    const currentLikes = playingVideo.likes || [];
    const userLiked = currentLikes.includes(currentUser.uid);

    try {
      if (userLiked) {
        // Remove like
        await updateDoc(videoRef, {
          likes: arrayRemove(currentUser.uid)
        });
        setPlayingVideo(prev => ({
          ...prev,
          likes: prev.likes.filter(uid => uid !== currentUser.uid)
        }));
        // Update the video in talentVideos state as well
        setTalentVideos(prev => prev.map(video => 
          video.id === playingVideo.id 
            ? { ...video, likes: video.likes.filter(uid => uid !== currentUser.uid) }
            : video
        ));
      } else {
        // Add like
        await updateDoc(videoRef, {
          likes: arrayUnion(currentUser.uid)
        });
        setPlayingVideo(prev => ({
          ...prev,
          likes: [...(prev.likes || []), currentUser.uid]
        }));
        // Update the video in talentVideos state as well
        setTalentVideos(prev => prev.map(video => 
          video.id === playingVideo.id 
            ? { ...video, likes: [...(video.likes || []), currentUser.uid] }
            : video
        ));
      }
    } catch (error) {
      // Error updating video like - logged in production
      alert('Failed to update like. Please try again.');
    } finally {
      setIsLikingVideo(false);
    }
  };

  // Handle commenting on talent videos
  const handleVideoComment = async (e) => {
    e.preventDefault();
    const commentText = videoComment.trim();
    
    // Video comment attempt - development debug removed for production
    
    if (!commentText || !currentUser || isCommentingVideo) {
      // Comment blocked - development debug removed for production
      return;
    }

    setIsCommentingVideo(true);

    // Prevent guests from commenting
    if (isGuest()) {
      setIsCommentingVideo(false);
      if (window.confirm('Please sign up or log in to comment on videos.\n\nWould you like to go to the login page?')) {
        navigate('/login');
      }
      return;
    }

    // Content filtering for video comments
    const filterResult = filterChatMessage(commentText);
    
    if (!filterResult.isClean) {
      const violationMessage = getChatViolationMessage(filterResult.violations, filterResult.categories);
      
      // Log the violation
      await logChatViolation(currentUser.uid, commentText, filterResult.violations, 'video_comment');
      
      // Show user-friendly error message
      alert(`You can't post this comment.\n\n${violationMessage}\n\nTip: Share positive feedback about the talent showcase!`);
      setIsCommentingVideo(false);
      return;
    }

    try {
      // Starting comment submission...
      const commentData = {
        text: commentText,
        userId: currentUser.uid,
        userDisplayName: currentUser.displayName || 'Anonymous User',
        userPhotoURL: currentUser.photoURL || '',
        timestamp: new Date(),
        videoId: playingVideo.id
      };

      // Comment data prepared - development debug removed for production

      // Update video's comment array
      const videoRef = doc(db, 'talentVideos', playingVideo.id);
      // Updating Firestore with comment...
      await updateDoc(videoRef, {
        comments: arrayUnion(commentData)
      });
      // Firestore updated successfully

      // Update local state
      setPlayingVideo(prev => ({
        ...prev,
        comments: [...(prev.comments || []), commentData]
      }));

      // Update the video in talentVideos state as well
      setTalentVideos(prev => prev.map(video => 
        video.id === playingVideo.id 
          ? { ...video, comments: [...(video.comments || []), commentData] }
          : video
      ));

      // Clear input
      setVideoComment('');
      // Comment added successfully and UI updated!

    } catch (error) {
      // Error adding video comment - logged in production
      alert('Failed to add comment. Please try again.');
    } finally {
      setIsCommentingVideo(false);
    }
  };

  const handleDeleteVideo = async (videoId) => {
    if (isGuest()) {
      alert('Please sign up or log in to delete videos.');
      return;
    }

    if (window.confirm('Are you sure you want to delete this video?')) {
      try {
        await deleteDoc(doc(db, 'talentVideos', videoId));
        fetchTalentVideos();
        alert('Video deleted successfully!');
      } catch (error) {
        // Error deleting video - logged in production
        alert('Failed to delete video. Please try again.');
      }
    }
  };

  const handleImageUpload = async (e) => {
    if (isGuest()) {
      alert('Please sign up or log in to upload profile photos. Guest accounts have read-only access.');
      return;
    }

    if (!isOwnProfile) {
      alert('You can only upload profile photos for your own account.');
      return;
    }

    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const storageRef = ref(storage, `profile-images/${currentUser.uid}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      // Update Firebase Auth profile using context function (includes refresh)
      await updateUserProfile({ photoURL: downloadURL });
      
      // Update Firestore user document
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, { photoURL: downloadURL });
      
      setProfile(prev => ({ ...prev, photoURL: downloadURL }));
      
      // Force refresh auth context to update all components
      setTimeout(() => {
        refreshAuth();
      }, 500);
    } catch (error) {
      // Error uploading image - logged in production
    }
    setUploading(false);
  };

  const handleDeleteProfileImage = async () => {
    if (isGuest()) {
      alert('Please sign up or log in to delete profile photos.');
      return;
    }

    if (!isOwnProfile) {
      alert('You can only delete your own profile photo.');
      return;
    }

    if (!profile?.photoURL) {
      alert('No profile photo to delete.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete your profile photo?')) {
      return;
    }

    setUploading(true);
    try {
      // Delete from Firebase Storage if it's a custom uploaded image (not default)
      if (profile.photoURL && !profile.photoURL.includes('placeholder') && !profile.photoURL.includes('googleapis.com')) {
        try {
          const imageRef = ref(storage, `profile-images/${currentUser.uid}`);
          await deleteObject(imageRef);
        } catch (storageError) {
          // Storage delete error (image may not exist) - logged in production
          // Continue with profile update even if storage delete fails
        }
      }
      
      // Update Firebase Auth profile
      await updateUserProfile({ photoURL: null });
      
      // Update Firestore user document
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, { photoURL: null });
      
      setProfile(prev => ({ ...prev, photoURL: null }));
      setShowProfileImageMenu(false);
      
      // Force refresh auth context
      setTimeout(() => {
        refreshAuth();
      }, 500);
      
      alert('Profile photo deleted successfully!');
    } catch (error) {
      // Error deleting profile image - logged in production
      alert('Failed to delete profile photo. Please try again.');
    }
    setUploading(false);
  };

  // Generic function to open stories for any user
  const openStoriesForUser = async (userId, userDisplayName, userPhotoURL) => {
    try {
      // Fetching stories for user - development debug removed for production
      // User info - development debug removed for production
      // Known active user IDs - development debug removed for production
      // - Known user 1 - development debug removed for production
      // - Known user 2 - development debug removed for production
      // Searching for user ID - development debug removed for production
      
      // First try to get real stories from Firebase
      let stories = await StoriesService.getUserStories(userId);
      // Firebase stories data - development debug removed for production
      // Firebase stories count - development debug removed for production
      
      // If we found Firebase stories, use them
      if (stories.length > 0) {
        // Using Firebase stories for user
      } else {
        // No Firebase stories found for this user
        
        // DEBUG: Check if this is one of our known active users
        if (userId === 'jVBTgUSK7DbEJctFrVtJX80V7WE2' || userId === 'SiuIzG3GPhaBOb02aZRhFYzxojI3') {
          // ERROR: This user SHOULD have active stories but none were found!
          // This indicates a problem with the story fetching logic.
          alert(`Debug Error: User ${userDisplayName} should have stories but none found. Check console for details.`);
        } else {
          // User has no active stories (this is expected)
          alert(`${userDisplayName || 'This user'} has no active stories to view. Stories expire after 24 hours.`);
        }
        return;
      }
      
      // Total stories found - development debug removed for production
      // Stories data - development debug removed for production
      
      // Set up user stories data for StoryViewer
      const userStoriesData = {
        user: {
          userId: userId,
          displayName: userDisplayName || 'User',
          photoURL: userPhotoURL || 'https://via.placeholder.com/150/2d3748/00ff88?text=Profile'
        },
        stories: stories
      };

      // Opening story viewer with data - development debug removed for production
      setUserStories(userStoriesData);
      setCurrentStoryIndex(0);
      setShowStoryViewer(true);
    } catch (error) {
      // Error fetching user stories - logged in production
      // Error details - logged in production
      alert(`Failed to load stories: ${error.message}. Please try again.`);
    }
  };

  // Function to open user stories (for main profile image)
  const openUserStories = async () => {
    const displayName = profile?.displayName || profile?.name || 'User';
    const photoURL = profile?.photoURL || 'https://via.placeholder.com/150/2d3748/00ff88?text=Profile';
    await openStoriesForUser(targetUserId, displayName, photoURL);
  };

  const handleProfileImageClick = async () => {
    if (isGuest()) {
      alert('Please sign up or log in to manage profile photos.');
      return;
    }

    if (!isOwnProfile) {
      // For other users' profiles, try to open their stories
      await openUserStories();
      return;
    }

    // For own profile, show the menu
    setShowProfileImageMenu(!showProfileImageMenu);
  };

  const handleUpdateProfileImage = () => {
    setShowProfileImageMenu(false);
    document.getElementById('profile-image-upload').click();
  };

  // Story viewer navigation functions
  const handleStoryClose = () => {
    setShowStoryViewer(false);
    setUserStories({ user: null, stories: [] });
    setCurrentStoryIndex(0);
  };

  const handleStoryNavigate = (direction) => {
    if (direction === 'next') {
      if (currentStoryIndex < userStories.stories.length - 1) {
        setCurrentStoryIndex(currentStoryIndex + 1);
      } else {
        handleStoryClose();
      }
    } else if (direction === 'prev') {
      if (currentStoryIndex > 0) {
        setCurrentStoryIndex(currentStoryIndex - 1);
      }
    }
  };


  // Toggle post menu visibility
  const togglePostMenu = (postId) => {
    setShowPostMenus(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  // Delete post function
  const handleDeletePost = async (postId) => {
    if (!currentUser) {
      alert('You must be logged in to delete posts');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    try {
      // Delete from Firebase
      await deleteDoc(doc(db, 'posts', postId));
      
      // Close the menu
      setShowPostMenus(prev => ({
        ...prev,
        [postId]: false
      }));

      // Refresh posts from Firebase to get updated list
      await fetchUserPosts();

      alert('Post deleted successfully!');
    } catch (error) {
      // Error deleting post - logged in production
      alert('Failed to delete post. Please try again.');
    }
  };

  // Handle verification request
  const handleVerificationRequest = () => {
    setShowVerificationModal(true);
  };

  const handleEditProfile = () => {
    if (isGuest()) {
      alert('Please sign up or log in to edit your profile. Guest accounts have read-only access.');
      return;
    }
    setIsEditing(true);
    setEditedProfile({ ...profile });
    // Initialize dropdown states based on role
    if (profile?.role === 'athlete') {
      setShowSportsDropdown(true);
    } else if (profile?.role === 'coach') {
      setShowCoachingForm(true);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const updatedProfile = {
        ...editedProfile,
        certificates,
        achievements,
        sports: selectedSports,
        coachingProfile: coachingProfile
      };
      await setDoc(userRef, updatedProfile, { merge: true });
      setProfile(updatedProfile);
      setIsEditing(false);
      setShowSportsDropdown(false);
      setShowCoachingForm(false);
      setSportsSearchTerm('');
      setSelectedCategory('');
    } catch (error) {
      // Error saving profile - logged in production
    }
  };

  const handleInputChange = (field, value) => {
    setEditedProfile(prev => ({ ...prev, [field]: value }));
  };

  // Sports selection handlers
  const handleRoleChange = (role) => {
    handleInputChange('role', role);
    if (role === 'athlete') {
      setShowSportsDropdown(true);
      setShowCoachingForm(false);
    } else if (role === 'coach') {
      setShowCoachingForm(true);
      setShowSportsDropdown(false);
      setSelectedSports([]);
      handleInputChange('sports', []);
    } else {
      setShowSportsDropdown(false);
      setShowCoachingForm(false);
      setSelectedSports([]);
      handleInputChange('sports', []);
    }
  };

  const handleSportAdd = (sport) => {
    if (!selectedSports.includes(sport) && selectedSports.length < 5) {
      const newSports = [...selectedSports, sport];
      setSelectedSports(newSports);
      handleInputChange('sports', newSports);
    }
    setSportsSearchTerm('');
  };

  const handleSportRemove = (sportToRemove) => {
    const newSports = selectedSports.filter(sport => sport !== sportToRemove);
    setSelectedSports(newSports);
    handleInputChange('sports', newSports);
  };

  const getFilteredSports = () => {
    if (selectedCategory === '') {
      return searchSports(sportsSearchTerm);
    }
    
    const categoryData = SPORTS_CATEGORIES[selectedCategory];
    if (!categoryData) return [];
    
    let categorysSports = [];
    if (typeof categoryData === 'object' && !Array.isArray(categoryData)) {
      Object.values(categoryData).forEach(subcategory => {
        categorysSports.push(...subcategory);
      });
    } else {
      categorysSports = [...categoryData];
    }
    
    if (sportsSearchTerm) {
      categorysSports = categorysSports.filter(sport => 
        sport.toLowerCase().includes(sportsSearchTerm.toLowerCase())
      );
    }
    
    return categorysSports.sort();
  };

  // Coaching profile handlers
  const handleCoachingInputChange = (field, value) => {
    setCoachingProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleCoachingArrayAdd = (field, item) => {
    if (!coachingProfile[field].includes(item)) {
      const newArray = [...coachingProfile[field], item];
      setCoachingProfile(prev => ({ ...prev, [field]: newArray }));
    }
  };

  const handleCoachingArrayRemove = (field, itemToRemove) => {
    const newArray = coachingProfile[field].filter(item => item !== itemToRemove);
    setCoachingProfile(prev => ({ ...prev, [field]: newArray }));
  };

  const handleCertificateUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert('File size should be less than 5MB');
      return;
    }

    try {
      const storageRef = ref(storage, `certificates/${currentUser.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      setNewCertificate(prev => ({ 
        ...prev, 
        fileUrl: downloadURL, 
        fileName: file.name 
      }));
    } catch (error) {
      // Error uploading certificate - logged in production
      alert('Failed to upload certificate');
    }
  };

  const addCertificate = () => {
    if (newCertificate.name.trim()) {
      // Content filtering for certificate name and description with sports context
      const nameFilter = filterContent(newCertificate.name, {
        strictMode: false,
        context: 'sports_post',
        languages: ['english', 'hindi']
      });
      
      const descFilter = filterContent(newCertificate.description, {
        strictMode: false,
        context: 'sports_post', 
        languages: ['english', 'hindi']
      });
      
      if (!nameFilter.isClean && (nameFilter.shouldBlock || nameFilter.shouldWarn)) {
        const violationMsg = getViolationMessage(nameFilter.violations, nameFilter.categories);
        alert(`❌ You can't add this certificate: ${violationMsg}\n\nPlease focus on sports achievements and certifications.`);
        return;
      }
      
      if (!descFilter.isClean && (descFilter.shouldBlock || descFilter.shouldWarn)) {
        const violationMsg = getViolationMessage(descFilter.violations, descFilter.categories);
        alert(`❌ You can't add this description: ${violationMsg}\n\nPlease focus on sports-related content.`);
        return;
      }

      setCertificates([...certificates, { ...newCertificate, id: Date.now().toString() }]);
      setNewCertificate({ name: '', date: '', description: '', fileUrl: '', fileName: '' });
      setShowCertificateForm(false);
    }
  };

  const addAchievement = () => {
    if (newAchievement.title.trim()) {
      // Content filtering for achievement title and description with sports context
      const titleFilter = filterContent(newAchievement.title, {
        strictMode: false,
        context: 'sports_post',
        languages: ['english', 'hindi']
      });
      
      const descFilter = filterContent(newAchievement.description, {
        strictMode: false,
        context: 'sports_post', 
        languages: ['english', 'hindi']
      });
      
      if (!titleFilter.isClean && (titleFilter.shouldBlock || titleFilter.shouldWarn)) {
        const violationMsg = getViolationMessage(titleFilter.violations, titleFilter.categories);
        alert(`❌ You can't add this achievement: ${violationMsg}\n\nPlease focus on sports achievements and accomplishments.`);
        return;
      }
      
      if (!descFilter.isClean && (descFilter.shouldBlock || descFilter.shouldWarn)) {
        const violationMsg = getViolationMessage(descFilter.violations, descFilter.categories);
        alert(`❌ You can't add this description: ${violationMsg}\n\nPlease focus on sports-related content.`);
        return;
      }

      setAchievements([...achievements, { ...newAchievement, id: Date.now().toString() }]);
      setNewAchievement({ title: '', date: '', description: '' });
      setShowAchievementForm(false);
    }
  };

  const removeCertificate = (id) => {
    setCertificates(certificates.filter(cert => cert.id !== id));
  };

  const removeAchievement = (id) => {
    setAchievements(achievements.filter(ach => ach.id !== id));
  };

  // Fetch users that current user is following
  const fetchFollowedUsers = () => {
    if (!currentUser) return;
    
    const q = query(
      collection(db, 'follows'),
      where('followerId', '==', currentUser.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const followedList = [];
      snapshot.forEach((doc) => {
        followedList.push(doc.data().followingId);
      });
      setFollowedUsers(followedList);
      setIsFollowingProfile(followedList.includes(targetUserId));
    });

    return unsubscribe;
  };

  // Fetch sent friend requests
  const fetchSentRequests = () => {
    const q = query(
      collection(db, 'friendRequests'),
      where('senderId', '==', currentUser.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requests = [];
      snapshot.forEach((doc) => {
        requests.push({ id: doc.id, ...doc.data() });
      });
      setSentRequests(requests);
    });

    return unsubscribe;
  };

  // Fetch friendships
  const fetchFriendships = () => {
    
    const q1 = query(
      collection(db, 'friendships'),
      where('user1', '==', currentUser.uid)
    );
    const q2 = query(
      collection(db, 'friendships'),
      where('user2', '==', currentUser.uid)
    );
    
    const updateFriendships = async () => {
      try {
        const friendshipsList = [];
        
        const snapshot1 = await getDocs(q1);
        snapshot1.forEach((doc) => {
          friendshipsList.push({ id: doc.id, ...doc.data() });
        });
        
        const snapshot2 = await getDocs(q2);
        snapshot2.forEach((doc) => {
          friendshipsList.push({ id: doc.id, ...doc.data() });
        });
        
        setFriendships(friendshipsList);
      } catch (error) {
        // Error fetching friendships - logged in production
      }
    };
    
    // Set up real-time listeners
    const unsubscribe1 = onSnapshot(q1, () => {
      updateFriendships();
    });
    const unsubscribe2 = onSnapshot(q2, () => {
      updateFriendships();
    });
    
    // Initial load
    updateFriendships();
    
    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  };

  // Helper functions for friend request status
  const getRequestStatus = (userId) => {
    const request = sentRequests.find(req => req.receiverId === userId);
    if (!request) return null;
    return request.status;
  };

  const isAlreadyFriend = (userId) => {
    return friendships.some(friendship => 
      friendship.user1 === userId || friendship.user2 === userId
    );
  };

  // Handle follow/unfollow functionality
  const handleFollowUnfollow = async () => {
    if (isGuest()) {
      alert('Please sign up or log in to follow users');
      return;
    }

    if (followingUser || isOwnProfile) return;

    try {
      setFollowingUser(true);
      
      const isFollowing = followedUsers.includes(targetUserId);
      
      if (isFollowing) {
        // Unfollow: remove from follows collection
        const q = query(
          collection(db, 'follows'),
          where('followerId', '==', currentUser.uid),
          where('followingId', '==', targetUserId)
        );
        
        const snapshot = await getDocs(q);
        snapshot.forEach(async (docSnapshot) => {
          await deleteDoc(doc(db, 'follows', docSnapshot.id));
        });
        
        // Unfollowed user - development debug removed for production
      } else {
        // Follow: add to follows collection
        await addDoc(collection(db, 'follows'), {
          followerId: currentUser.uid,
          followingId: targetUserId,
          followerName: currentUser.displayName || 'Anonymous User',
          followingName: profile?.displayName || 'Anonymous User',
          timestamp: serverTimestamp()
        });

        // Send follow notification to the user being followed
        try {
          await notificationService.sendFollowNotification(
            currentUser.uid,
            currentUser.displayName || 'Someone',
            currentUser.photoURL || '',
            targetUserId
          );
        } catch (notificationError) {
          console.error('Error sending follow notification:', notificationError);
          // Don't fail the follow action if notification fails
        }

        // Now following user - development debug removed for production
      }
    } catch (error) {
      // Error updating follow status - logged in production
      alert('Failed to update follow status: ' + error.message);
    }
    
    setFollowingUser(false);
  };

  // Handle friend request (send or cancel)
  const handleFollowProfile = async () => {
    if (isGuest()) {
      alert('Please sign up or log in to send friend requests');
      return;
    }

    if (followingUser || isOwnProfile) return;

    try {
      setFollowingUser(true);
      
      const requestStatus = getRequestStatus(targetUserId);
      const isFriend = isAlreadyFriend(targetUserId);
      
      if (requestStatus === 'pending') {
        // Cancel friend request
        const request = sentRequests.find(req => req.receiverId === targetUserId);
        if (request) {
          await deleteDoc(doc(db, 'friendRequests', request.id));
          alert('Friend request cancelled');
          // Refresh data after canceling request
          fetchSentRequests();
          
          // Trigger manual refresh of other components
          window.dispatchEvent(new CustomEvent('friendshipChanged', { 
            detail: { action: 'friend_request_cancelled', userId: targetUserId } 
          }));
        }
      } else if (isFriend) {
        // Unfriend - Remove from friendships collection
        const friendship = friendships.find(f => 
          (f.user1 === currentUser.uid && f.user2 === targetUserId) ||
          (f.user1 === targetUserId && f.user2 === currentUser.uid)
        );
        if (friendship) {
          
          // Delete the friendship document
          await deleteDoc(doc(db, 'friendships', friendship.id));
          
          // Immediately update local state
          setFriendships(prev => prev.filter(f => f.id !== friendship.id));
          
          // Trigger cross-component updates
          window.dispatchEvent(new CustomEvent('friendshipChanged', { 
            detail: { action: 'unfriend', userId: targetUserId } 
          }));
          
          alert(`Unfriended ${profile?.displayName || 'user'}`);
        } else {
        }
      } else {
        // Send friend request (default case: not friends and no pending request)
        await addDoc(collection(db, 'friendRequests'), {
          senderId: currentUser.uid,
          receiverId: targetUserId,
          senderName: currentUser.displayName || 'Anonymous User',
          senderPhoto: currentUser.photoURL || '',
          receiverName: profile?.displayName || 'Anonymous User',
          receiverPhoto: profile?.photoURL || '',
          status: 'pending',
          timestamp: serverTimestamp()
        });

        // Send friend request notification
        try {
          await notificationService.sendFriendRequestNotification(
            currentUser.uid,
            currentUser.displayName || 'Someone',
            currentUser.photoURL || '',
            targetUserId
          );
        } catch (notificationError) {
          console.error('Error sending friend request notification:', notificationError);
          // Don't fail the friend request if notification fails
        }

        alert('Friend request sent!');
        // Refresh data after sending friend request
        fetchSentRequests();

        // Trigger manual refresh of other components
        window.dispatchEvent(new CustomEvent('friendshipChanged', {
          detail: { action: 'friend_request_sent', userId: targetUserId }
        }));
      }
      
    } catch (error) {
      // Error with friend request - logged in production
      alert('Error updating friend request status');
    }
    
    setFollowingUser(false);
  };

  // Fetch followers list
  const fetchFollowers = async () => {
    try {
      const q = query(
        collection(db, 'follows'),
        where('followingId', '==', targetUserId)
      );
      
      const snapshot = await getDocs(q);
      const followersList = [];
      
      for (const docSnap of snapshot.docs) {
        const followData = docSnap.data();
        const followerDoc = await getDoc(doc(db, 'users', followData.followerId));
        if (followerDoc.exists()) {
          followersList.push({
            id: followData.followerId,
            ...followerDoc.data()
          });
        }
      }
      
      setFollowers(followersList);
      setShowFollowersModal(true);
    } catch (error) {
      // Error fetching followers - logged in production
    }
  };

  // Fetch following list
  const fetchFollowing = async () => {
    try {
      const q = query(
        collection(db, 'follows'),
        where('followerId', '==', targetUserId)
      );
      
      const snapshot = await getDocs(q);
      const followingList = [];
      
      for (const docSnap of snapshot.docs) {
        const followData = docSnap.data();
        const followingDoc = await getDoc(doc(db, 'users', followData.followingId));
        if (followingDoc.exists()) {
          followingList.push({
            id: followData.followingId,
            ...followingDoc.data()
          });
        }
      }
      
      setFollowing(followingList);
      setShowFollowingModal(true);
    } catch (error) {
      // Error fetching following - logged in production
    }
  };

  // Function to navigate to profile and close modal
  const navigateToProfile = (userId) => {
    setShowFollowersModal(false);
    setShowFollowingModal(false);
    navigate(`/profile/${userId}`);
  };

  if (loading) {
    return <div className="loading">{t('loadingProfile')}</div>;
  }

  // Guest profile view - minimal display with only guest ID
  if (isGuest()) {
    return (
      <div className="profile">
        <AppHeader title={t('profile')} showThemeToggle={true} />

        <div className="main-content profile-container">
          <div className="guest-profile">
            <div className="guest-profile-header">
              <div className="guest-avatar">
                <img
                  src="https://via.placeholder.com/120/f39c12/ffffff?text=GUEST"
                  alt="Guest Profile"
                  className="profile-image"
                />
              </div>
              <div className="guest-info">
                <h1>{t('guestUser')}</h1>
                <div className="guest-limitation">
                  <p>🔒 Guest Account - Read Only Access</p>
                  <p>{t('signUpToUnlock')}</p>
                  <button 
                    className="sign-up-btn"
                    onClick={() => navigate('/login')}
                  >
                    Sign Up / Sign In
                  </button>
                </div>
              </div>
            </div>
            
            <div className="guest-features">
              <div className="feature-card">
                <h3>{t('whatYouCanDo')}</h3>
                <ul>
                  <li>✅ View all posts</li>
                  <li>✅ Like posts</li>
                  <li>✅ View comments</li>
                </ul>
              </div>
              
              <div className="feature-card">
                <h3>{t('signUpUnlock')}</h3>
                <ul>
                  <li>📝 Create posts</li>
                  <li>💬 Comment on posts</li>
                  <li>👤 Edit profile</li>
                  <li>🏆 Add achievements</li>
                  <li>📜 Add certificates</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        <FooterNav />
      </div>
    );
  }

  return (
    <div className="profile">
      <AppHeader title={t('profile')} showThemeToggle={true} />

      <div className="main-content profile-container">
        <div className="profile-header">
          <div className="profile-image-container">
            <div 
              className={`profile-image-wrapper ${(isOwnProfile && !isGuest()) || (!isOwnProfile && !isGuest()) ? 'clickable' : ''}`} 
              onClick={handleProfileImageClick}
            >
              <img
                src={profile?.photoURL || 'https://via.placeholder.com/150/2d3748/00ff88?text=Profile'}
                alt={t('profile')}
                className="profile-image"
              />
              {!isGuest() && (
                <div className="profile-image-overlay">
                  {isOwnProfile ? (
                    <>
                      <Camera size={24} />
                      <span>{uploading ? t('uploading') : t('updatePhoto')}</span>
                    </>
                  ) : (
                    <>
                      <Play size={24} />
                      <span>{t('viewStories')}</span>
                    </>
                  )}
                </div>
              )}
            </div>
            
            {/* Verification Badge */}
            <VerificationBadge 
              profile={profile}
              isOwnProfile={isOwnProfile}
              onVerificationRequest={handleVerificationRequest}
            />
            
            {/* Hidden file input */}
            {isOwnProfile && !isGuest() && (
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
                id="profile-image-upload"
              />
            )}
            
            {/* Profile Image Menu */}
            {showProfileImageMenu && isOwnProfile && !isGuest() && (
              <div className="profile-image-menu">
                <button className="menu-item" onClick={handleUpdateProfileImage}>
                  <Camera size={16} />
                  {t('updatePhoto')}
                </button>
                {profile?.photoURL && (
                  <button className="menu-item delete" onClick={handleDeleteProfileImage}>
                    <Trash2 size={16} />
                    Delete Photo
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="profile-info">
            <div className="profile-title-section">
              <h1>{profile?.displayName}</h1>
              {isOwnProfile && !isGuest() && (
                <button 
                  className="edit-profile-btn" 
                  onClick={isEditing ? handleSaveProfile : handleEditProfile}
                >
                  {isEditing ? <Save size={20} /> : <Edit2 size={20} />}
                  {isEditing ? t('saveProfile') : t('editProfile')}
                </button>
              )}
              {!isOwnProfile && !isGuest() && (
                <div className="profile-action-buttons">
                  <button 
                    className={`follow-btn ${isFollowingProfile ? 'following' : ''}`}
                    onClick={handleFollowUnfollow}
                    disabled={followingUser}
                  >
                    {followingUser ? (
                      'Loading...'
                    ) : isFollowingProfile ? (
                      'Unfollow'
                    ) : (
                      'Follow'
                    )}
                  </button>
                  <button 
                    className="edit-profile-btn" 
                    onClick={handleFollowProfile}
                    disabled={followingUser}
                  >
                    {followingUser ? (
                      'Loading...'
                    ) : (() => {
                      const requestStatus = getRequestStatus(targetUserId);
                      const isFriend = isAlreadyFriend(targetUserId);
                      
                      
                      if (isFriend) {
                        return <><X size={20} /> {t('unfriend')}</>;
                      } else if (requestStatus === 'pending') {
                        return <><X size={20} /> {t('cancelRequest')}</>;
                      } else {
                        // Default case: not friends and no pending request = show Add Friend
                        return <><UserPlus size={20} /> {t('addFriend')}</>;
                      }
                    })()}
                  </button>
                </div>
              )}
            </div>
            <div className="profile-stats">
              <span><strong>{posts.length}</strong> posts</span>
              <span className="clickable-stat" onClick={fetchFollowers}>
                <strong>{profile?.followers || 0}</strong> followers
              </span>
              {isOwnProfile && (
                <span className="clickable-stat" onClick={fetchFollowing}>
                  <strong>{profile?.following || 0}</strong> following
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Personal Details Section */}
        <div className="profile-section">
          <h2>{t('personalDetails')}</h2>
          <div className="details-grid">
            <div className="detail-item">
              <label>{t('name')}</label>
              {isEditing ? (
                <input 
                  type="text" 
                  value={editedProfile.name || ''} 
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder={t('name')}
                />
              ) : (
                <span>{profile?.name || 'Not specified'}</span>
              )}
            </div>
            <div className="detail-item">
              <label>{t('age')}</label>
              {isEditing ? (
                <input 
                  type="number" 
                  value={editedProfile.age || ''} 
                  onChange={(e) => handleInputChange('age', e.target.value)}
                  placeholder={t('age')}
                />
              ) : (
                <span>{profile?.age || 'Not specified'}</span>
              )}
            </div>
            <div className="detail-item">
              <label>{t('heightCm')}</label>
              {isEditing ? (
                <input 
                  type="number" 
                  value={editedProfile.height || ''} 
                  onChange={(e) => handleInputChange('height', e.target.value)}
                  placeholder={t('heightCm')}
                />
              ) : (
                <span>{profile?.height ? `${profile.height} cm` : 'Not specified'}</span>
              )}
            </div>
            <div className="detail-item">
              <label>{t('weightKg')}</label>
              {isEditing ? (
                <input 
                  type="number" 
                  value={editedProfile.weight || ''} 
                  onChange={(e) => handleInputChange('weight', e.target.value)}
                  placeholder={t('weightKg')}
                />
              ) : (
                <span>{profile?.weight ? `${profile.weight} kg` : 'Not specified'}</span>
              )}
            </div>
            <div className="detail-item">
              <label>{t('sex')}</label>
              {isEditing ? (
                <select 
                  value={editedProfile.sex || ''} 
                  onChange={(e) => handleInputChange('sex', e.target.value)}
                >
                  <option value="">{t('sex')}</option>
                  <option value="male">{t('male')}</option>
                  <option value="female">{t('female')}</option>
                  <option value="other">{t('other')}</option>
                </select>
              ) : (
                <span>{profile?.sex ? t(profile.sex) : 'Not specified'}</span>
              )}
            </div>
            <div className="detail-item">
              <label>{t('role')}</label>
              {isEditing ? (
                <div className="role-selection-container">
                  <select 
                    value={editedProfile.role || 'athlete'} 
                    onChange={(e) => handleRoleChange(e.target.value)}
                    className="role-select"
                  >
                    <option value="athlete">{t('athlete')}</option>
                    <option value="coach">{t('coach')}</option>
                    <option value="organisation">{t('organisation')}</option>
                  </select>
                  
                  {/* Cascading Sports Selection for Athletes */}
                  {(showSportsDropdown || editedProfile.role === 'athlete') && (
                    <div className="sports-selection-container">
                      <div className="sports-header">
                        <label>{t('sportsGames')}</label>
                        <span className="sports-help-text">{t('selectSports')}</span>
                      </div>
                      
                      {/* Selected Sports Display */}
                      {selectedSports.length > 0 && (
                        <div className="selected-sports">
                          {selectedSports.map((sport, index) => (
                            <div key={index} className="sport-tag selected">
                              <span>{sport}</span>
                              <button 
                                type="button"
                                className="remove-sport"
                                onClick={() => handleSportRemove(sport)}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Sports Search */}
                      <div className="sports-search">
                        <input
                          type="text"
                          placeholder="Search for your sport..."
                          value={sportsSearchTerm}
                          onChange={(e) => setSportsSearchTerm(e.target.value)}
                          className="sports-search-input"
                        />
                      </div>
                      
                      {/* Sports Categories */}
                      <div className="sports-categories">
                        <div className="category-tabs">
                          <button 
                            className={`category-tab ${selectedCategory === '' ? 'active' : ''}`}
                            onClick={() => setSelectedCategory('')}
                          >
                            All Sports
                          </button>
                          {Object.keys(SPORTS_CATEGORIES).map(category => (
                            <button 
                              key={category}
                              className={`category-tab ${selectedCategory === category ? 'active' : ''}`}
                              onClick={() => setSelectedCategory(category)}
                            >
                              {category}
                            </button>
                          ))}
                        </div>
                        
                        {/* Sports List */}
                        <div className="sports-list">
                          {selectedCategory === '' ? (
                            // All sports filtered by search
                            getFilteredSports().map(sport => (
                              <button
                                key={sport}
                                type="button"
                                className={`sport-option ${selectedSports.includes(sport) ? 'selected' : ''}`}
                                onClick={() => handleSportAdd(sport)}
                                disabled={selectedSports.includes(sport) || selectedSports.length >= 5}
                              >
                                {sport}
                                {selectedSports.includes(sport) && <Check size={16} />}
                              </button>
                            ))
                          ) : (
                            // Category-specific sports
                            (() => {
                              const categoryData = SPORTS_CATEGORIES[selectedCategory];
                              if (typeof categoryData === 'object' && !Array.isArray(categoryData)) {
                                return Object.entries(categoryData).map(([subcategory, sports]) => (
                                  <div key={subcategory} className="sports-subcategory">
                                    <h4 className="subcategory-title">{subcategory}</h4>
                                    <div className="sports-grid">
                                      {sports.filter(sport => 
                                        sport.toLowerCase().includes(sportsSearchTerm.toLowerCase())
                                      ).map(sport => (
                                        <button
                                          key={sport}
                                          type="button"
                                          className={`sport-option ${selectedSports.includes(sport) ? 'selected' : ''}`}
                                          onClick={() => handleSportAdd(sport)}
                                          disabled={selectedSports.includes(sport) || selectedSports.length >= 5}
                                        >
                                          {sport}
                                          {selectedSports.includes(sport) && <Check size={16} />}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                ));
                              } else {
                                return (
                                  <div className="sports-grid">
                                    {categoryData.filter(sport => 
                                      sport.toLowerCase().includes(sportsSearchTerm.toLowerCase())
                                    ).map(sport => (
                                      <button
                                        key={sport}
                                        type="button"
                                        className={`sport-option ${selectedSports.includes(sport) ? 'selected' : ''}`}
                                        onClick={() => handleSportAdd(sport)}
                                        disabled={selectedSports.includes(sport) || selectedSports.length >= 5}
                                      >
                                        {sport}
                                        {selectedSports.includes(sport) && <Check size={16} />}
                                      </button>
                                    ))}
                                  </div>
                                );
                              }
                            })()
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Comprehensive Coaching Profile Form */}
                  {(showCoachingForm || editedProfile.role === 'coach') && (
                    <div className="coaching-form-container">
                      <div className="coaching-header">
                        <label>{t('coachingProfile')}</label>
                        <span className="coaching-help-text">{t('completeCoaching')}</span>
                      </div>

                      {/* Organization Details */}
                      <div className="coaching-section">
                        <h4>{t('organizationPosition')}</h4>
                        <div className="coaching-fields">
                          <input
                            type="text"
                            placeholder="Organization/Club/Academy name"
                            value={coachingProfile.organization}
                            onChange={(e) => handleCoachingInputChange('organization', e.target.value)}
                            className="coaching-input"
                          />
                          <select
                            value={coachingProfile.organizationType}
                            onChange={(e) => handleCoachingInputChange('organizationType', e.target.value)}
                            className="coaching-select"
                          >
                            <option value="">{t('selectOrganizationType')}</option>
                            {ORGANIZATION_TYPES.map((type, index) => (
                              <option key={index} value={type}>{type}</option>
                            ))}
                          </select>
                          <select
                            value={coachingProfile.position}
                            onChange={(e) => handleCoachingInputChange('position', e.target.value)}
                            className="coaching-select"
                          >
                            <option value="">{t('selectPosition')}</option>
                            {COACHING_LEVELS["Coaching Positions"].map((pos, index) => (
                              <option key={index} value={pos}>{pos}</option>
                            ))}
                          </select>
                          <select
                            value={coachingProfile.employmentType}
                            onChange={(e) => handleCoachingInputChange('employmentType', e.target.value)}
                            className="coaching-select"
                          >
                            <option value="">{t('employmentType')}</option>
                            {EMPLOYMENT_TYPES.map((type, index) => (
                              <option key={index} value={type}>{type}</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            placeholder="Years at current organization"
                            value={coachingProfile.yearsAtOrganization}
                            onChange={(e) => handleCoachingInputChange('yearsAtOrganization', e.target.value)}
                            className="coaching-input"
                            min="0"
                            max="50"
                          />
                        </div>
                      </div>

                      {/* Sports & Specializations */}
                      <div className="coaching-section">
                        <h4>{t('sportsSpecializations')}</h4>
                        <div className="coaching-fields">
                          <select
                            value={coachingProfile.primarySport}
                            onChange={(e) => handleCoachingInputChange('primarySport', e.target.value)}
                            className="coaching-select"
                          >
                            <option value="">{t('selectPrimarySport')}</option>
                            {searchSports('').map((sport, index) => (
                              <option key={index} value={sport}>{sport}</option>
                            ))}
                          </select>
                          
                          {/* Specializations based on selected sport */}
                          {coachingProfile.primarySport && (
                            <div className="specializations-section">
                              <label>{t('specializations')}</label>
                              <div className="specializations-grid">
                                {getSpecializationsBySport(coachingProfile.primarySport).map((spec, index) => (
                                  <button
                                    key={index}
                                    type="button"
                                    className={`specialization-option ${coachingProfile.specializations.includes(spec) ? 'selected' : ''}`}
                                    onClick={() => 
                                      coachingProfile.specializations.includes(spec)
                                        ? handleCoachingArrayRemove('specializations', spec)
                                        : handleCoachingArrayAdd('specializations', spec)
                                    }
                                  >
                                    {spec}
                                    {coachingProfile.specializations.includes(spec) && <Check size={14} />}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Age Groups */}
                          <div className="age-groups-section">
                            <label>{t('ageGroupsCoached')}</label>
                            {coachingProfile.ageGroups.length > 0 && (
                              <div className="selected-age-groups">
                                {coachingProfile.ageGroups.map((ageGroup, index) => (
                                  <div key={index} className="age-group-tag">
                                    <span>{ageGroup}</span>
                                    <button 
                                      type="button"
                                      className="remove-age-group"
                                      onClick={() => handleCoachingArrayRemove('ageGroups', ageGroup)}
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                            <select
                              onChange={(e) => {
                                if (e.target.value && !coachingProfile.ageGroups.includes(e.target.value)) {
                                  handleCoachingArrayAdd('ageGroups', e.target.value);
                                  e.target.value = '';
                                }
                              }}
                              className="coaching-select"
                            >
                              <option value="">{t('addAgeGroup')}</option>
                              {AGE_GROUPS.map((ageGroup, index) => (
                                <option key={index} value={ageGroup}>{ageGroup}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Credentials & Experience */}
                      <div className="coaching-section">
                        <h4>{t('credentialsExperience')}</h4>
                        <div className="coaching-fields">
                          <select
                            value={coachingProfile.licenseLevel}
                            onChange={(e) => handleCoachingInputChange('licenseLevel', e.target.value)}
                            className="coaching-select"
                          >
                            <option value="">{t('selectLicenseLevel')}</option>
                            {COACHING_LEVELS["License Levels"].map((license, index) => (
                              <option key={index} value={license}>{license}</option>
                            ))}
                          </select>
                          
                          <input
                            type="number"
                            placeholder="Total years of coaching experience"
                            value={coachingProfile.totalExperience}
                            onChange={(e) => handleCoachingInputChange('totalExperience', e.target.value)}
                            className="coaching-input"
                            min="0"
                            max="50"
                          />

                          {/* Certifications */}
                          <div className="certifications-section">
                            <label>{t('certifications')}</label>
                            <div className="certifications-list">
                              {coachingProfile.certifications.length > 0 && (
                                <div className="selected-certifications">
                                  {coachingProfile.certifications.map((cert, index) => (
                                    <div key={index} className="certification-tag">
                                      <span>{cert}</span>
                                      <button 
                                        type="button"
                                        className="remove-certification"
                                        onClick={() => handleCoachingArrayRemove('certifications', cert)}
                                      >
                                        <X size={12} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <select
                                onChange={(e) => {
                                  if (e.target.value && !coachingProfile.certifications.includes(e.target.value)) {
                                    handleCoachingArrayAdd('certifications', e.target.value);
                                    e.target.value = '';
                                  }
                                }}
                                className="coaching-select"
                              >
                                <option value="">{t('addCertification')}</option>
                                {getAllCertifications().map((cert, index) => (
                                  <option key={index} value={cert}>{cert}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Philosophy Statement */}
                      <div className="coaching-section">
                        <h4>{t('coachingPhilosophy')}</h4>
                        <textarea
                          placeholder="Describe your coaching philosophy and approach..."
                          value={coachingProfile.philosophyStatement}
                          onChange={(e) => handleCoachingInputChange('philosophyStatement', e.target.value)}
                          className="coaching-textarea"
                          rows="4"
                          maxLength="500"
                        />
                        <span className="character-count">{coachingProfile.philosophyStatement.length}/500</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="role-display">
                  <span className="role-text">{t(profile?.role || 'athlete')}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Role & Sports Information Section */}
        {!isEditing && (
          <div className="profile-section">
            <div className="section-header">
              <h2>{t('roleAndSports')}</h2>
            </div>
            
            <div className="role-sports-content">
              <div className="detail-item">
                <label>{t('role')}</label>
                <span className="role-text">{t(profile?.role || 'athlete')}</span>
              </div>
              
              {profile?.sports && profile.sports.length > 0 && (
                <div className="detail-item">
                  <label>{t('sports')}</label>
                  <div className="profile-sports-display">
                    {profile.sports.map((sport, index) => (
                      <span key={index} className="sport-tag display">{sport}</span>
                    ))}
                  </div>
                </div>
              )}
              
              {profile?.role === 'coach' && profile.coachingProfile && (
                <div className="coaching-profile-display">
                  {profile.coachingProfile.organization && (
                    <div className="detail-item">
                      <label>{t('organization')}</label>
                      <div className="coaching-info-item">
                        <span className="coaching-value">{profile.coachingProfile.organization}</span>
                        {profile.coachingProfile.position && (
                          <span className="coaching-position"> - {profile.coachingProfile.position}</span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {profile.coachingProfile.primarySport && (
                    <div className="detail-item">
                      <label>{t('primarySport')}</label>
                      <span className="coaching-value">{profile.coachingProfile.primarySport}</span>
                    </div>
                  )}
                  
                  {profile.coachingProfile.totalExperience && (
                    <div className="detail-item">
                      <label>{t('experience')}</label>
                      <span className="coaching-value">{profile.coachingProfile.totalExperience} years</span>
                    </div>
                  )}
                  
                  {profile.coachingProfile.licenseLevel && (
                    <div className="detail-item">
                      <label>{t('licenseLevel')}</label>
                      <span className="coaching-license">{profile.coachingProfile.licenseLevel}</span>
                    </div>
                  )}
                  
                  {profile.coachingProfile.specializations && profile.coachingProfile.specializations.length > 0 && (
                    <div className="detail-item">
                      <label>{t('specializations')}</label>
                      <div className="specializations-tags">
                        {profile.coachingProfile.specializations.map((spec, index) => (
                          <span key={index} className="specialization-tag">{spec}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {profile.coachingProfile.organizationType && (
                    <div className="detail-item">
                      <label>{t('organizationType')}</label>
                      <span className="coaching-value">{profile.coachingProfile.organizationType}</span>
                    </div>
                  )}
                  
                  {profile.coachingProfile.employmentType && (
                    <div className="detail-item">
                      <label>{t('employmentType')}</label>
                      <span className="coaching-value">{profile.coachingProfile.employmentType}</span>
                    </div>
                  )}
                  
                  {profile.coachingProfile.ageGroups && profile.coachingProfile.ageGroups.length > 0 && (
                    <div className="detail-item">
                      <label>{t('ageGroups')}</label>
                      <div className="age-groups-tags">
                        {profile.coachingProfile.ageGroups.map((ageGroup, index) => (
                          <span key={index} className="age-group-tag">{ageGroup}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {profile.coachingProfile.philosophyStatement && (
                    <div className="detail-item">
                      <label>{t('coachingPhilosophy')}</label>
                      <p className="coaching-philosophy">{profile.coachingProfile.philosophyStatement}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Certificates Section */}
        <div className="profile-section">
          <div className="section-header">
            <h2>{t('certificates')}</h2>
            {isEditing && (
              <button 
                className="add-btn" 
                onClick={() => setShowCertificateForm(true)}
              >
                <Plus size={20} />
                {t('add_certificate')}
              </button>
            )}
          </div>
          
          {showCertificateForm && (
            <div className="form-overlay active" onClick={() => setShowCertificateForm(false)}>
              <div className="form-modal active" onClick={(e) => e.stopPropagation()}>
                <div className="form-header">
                  <h3>{t('add_certificate')}</h3>
                  <button onClick={() => setShowCertificateForm(false)}>
                    <X size={20} />
                  </button>
                </div>
                <div className="form-content">
                  <input 
                    type="text" 
                    placeholder={t('certificate_name')} 
                    value={newCertificate.name}
                    onChange={(e) => setNewCertificate({...newCertificate, name: e.target.value})}
                  />
                  <input 
                    type="date" 
                    placeholder={t('date_received')} 
                    value={newCertificate.date}
                    onChange={(e) => setNewCertificate({...newCertificate, date: e.target.value})}
                  />
                  <textarea 
                    placeholder={t('description')} 
                    value={newCertificate.description}
                    onChange={(e) => setNewCertificate({...newCertificate, description: e.target.value})}
                  />
                  <div className="file-upload-section">
                    <label htmlFor="certificate-upload" className="upload-btn">
                      <Plus size={16} />
                      Upload Certificate File
                    </label>
                    <input 
                      id="certificate-upload"
                      type="file" 
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={handleCertificateUpload}
                      style={{ display: 'none' }}
                    />
                    {newCertificate.fileName && (
                      <span className="file-name">📎 {newCertificate.fileName}</span>
                    )}
                  </div>
                  <button onClick={addCertificate} className="save-btn">
                    {t('add_certificate')}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          <div className="items-list">
            {certificates.map((cert) => (
              <div key={cert.id} className="item-card certificate-card">
                {cert.fileUrl && (
                  <div className="certificate-preview">
                    {cert.fileName?.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                      <img 
                        src={cert.fileUrl} 
                        alt={cert.name}
                        className="cert-thumbnail"
                        onClick={() => window.open(cert.fileUrl, '_blank')}
                      />
                    ) : (
                      <div 
                        className="cert-file-icon"
                        onClick={() => window.open(cert.fileUrl, '_blank')}
                      >
                        📄
                        <span className="file-type">
                          {cert.fileName?.split('.').pop()?.toUpperCase() || 'FILE'}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                <div className="item-content">
                  <h4>{cert.name}</h4>
                  <p className="item-date">{cert.date}</p>
                  <p className="item-description">{cert.description}</p>
                  {cert.fileName && (
                    <p className="file-info">📎 {cert.fileName}</p>
                  )}
                </div>
                {isEditing && (
                  <button 
                    className="remove-btn" 
                    onClick={() => removeCertificate(cert.id)}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
            {certificates.length === 0 && (
              <p className="empty-state">{t('noCertificates')}</p>
            )}
          </div>
        </div>

        {/* Achievements Section */}
        <div className="profile-section">
          <div className="section-header">
            <h2>{t('achievements')}</h2>
            {isEditing && (
              <button 
                className="add-btn" 
                onClick={() => setShowAchievementForm(true)}
              >
                <Plus size={20} />
                {t('add_achievement')}
              </button>
            )}
          </div>
          
          {showAchievementForm && (
            <div className="form-overlay active" onClick={() => setShowAchievementForm(false)}>
              <div className="form-modal active" onClick={(e) => e.stopPropagation()}>
                <div className="form-header">
                  <h3>{t('add_achievement')}</h3>
                  <button onClick={() => setShowAchievementForm(false)}>
                    <X size={20} />
                  </button>
                </div>
                <div className="form-content">
                  <input 
                    type="text" 
                    placeholder={t('achievement_title')} 
                    value={newAchievement.title}
                    onChange={(e) => setNewAchievement({...newAchievement, title: e.target.value})}
                  />
                  <input 
                    type="date" 
                    placeholder={t('date_received')} 
                    value={newAchievement.date}
                    onChange={(e) => setNewAchievement({...newAchievement, date: e.target.value})}
                  />
                  <textarea 
                    placeholder={t('description')} 
                    value={newAchievement.description}
                    onChange={(e) => setNewAchievement({...newAchievement, description: e.target.value})}
                  />
                  <button onClick={addAchievement} className="save-btn">
                    {t('add_achievement')}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          <div className="items-list">
            {achievements.map((ach) => (
              <div key={ach.id} className="item-card">
                <div className="item-content">
                  <h4>{ach.title}</h4>
                  <p className="item-date">{ach.date}</p>
                  <p className="item-description">{ach.description}</p>
                </div>
                {isEditing && (
                  <button 
                    className="remove-btn" 
                    onClick={() => removeAchievement(ach.id)}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
            {achievements.length === 0 && (
              <p className="empty-state">{t('noAchievements')}</p>
            )}
          </div>
        </div>
        
        {/* Dynamic Video Section Based on Role */}
        <div className="profile-section">
          <div className="section-header">
            <h2>
              <Video size={24} /> 
              <span style={{marginLeft: '8px', marginRight: '4px'}}>
                {getVideoSectionConfig(profile?.role || 'athlete').icon}
              </span>
              {getVideoSectionConfig(profile?.role || 'athlete').title} ({talentVideos.length}/7)
            </h2>
            <p style={{
              margin: '8px 0 0 0', 
              fontSize: '14px', 
              color: 'var(--text-muted)', 
              fontStyle: 'italic'
            }}>
              {getVideoSectionConfig(profile?.role || 'athlete').description}
            </p>
            {isOwnProfile && !isGuest() && (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {talentVideos.length < 7 && (
                  <div className="upload-video-container">
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleVideoUpload}
                      id="talent-video-upload"
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="talent-video-upload" className="upload-video-btn">
                      <Plus size={16} />
                      {uploadingVideo ? 'Uploading...' : getVideoSectionConfig(profile?.role || 'athlete').uploadLabel}
                    </label>
                  </div>
                )}
                
              </div>
            )}
          </div>
          
          {uploadingVideo && (
            <div className="upload-progress">
              <div className="progress-bar">
              </div>
              <div className="progress-info">
                <span>{Math.round(videoUploadProgress)}% uploaded</span>
                <button 
                  className="cancel-upload-btn"
                  onClick={handleCancelUpload}
                  disabled={!uploadTask}
                >
                  <X size={16} />
                  Cancel
                </button>
              </div>
            </div>
          )}
          
          <div className="videos-grid">
            {talentVideos.map((video) => (
              <div key={video.id} className="video-thumbnail">
                <video 
                  src={video.videoUrl} 
                  poster={video.metadata?.thumbnail}
                  className="video-preview"
                  controls={false}
                  muted
                  preload="metadata"
                  onClick={() => handleVideoPlay(video)}
                />
                <div className="video-overlay">
                  <button 
                    className="play-btn"
                    onClick={() => handleVideoPlay(video)}
                  >
                    <Play size={24} />
                  </button>
                  <div className="video-info">
                    <span>👁️ {video.views || 0}</span>
                    <span>❤️ {video.likes?.length || 0}</span>
                  </div>
                  
                  {/* Verification Status Badge (for own profile) */}
                  {isOwnProfile && !isGuest() && (
                    <div className="video-status-badge">
                      {video.verificationStatus === 'approved' && video.isVerified ? (
                        <span className="status-badge approved" title="Video approved and visible to everyone">
                          ✅ Approved & Public
                        </span>
                      ) : video.verificationStatus === 'rejected' ? (
                        <div className="status-badge rejected-container" title={`Rejected: ${video.rejectionReason || 'No reason provided'}`}>
                          <span className="rejected-badge">❌ REJECTED</span>
                          <div className="rejection-details">
                            <p><strong>{t('reason')}</strong> {video.rejectionReason || t('noReasonProvided')}</p>
                            <p className="action-hint">💡 Delete and re-upload with corrections</p>
                          </div>
                        </div>
                      ) : (
                        <span className="status-badge pending" title="Video under admin review - will be public once approved">
                          ⏳ Under Review
                        </span>
                      )}
                    </div>
                  )}
                  
                  {isOwnProfile && !isGuest() && (
                    <div className="video-actions">
                      <button 
                        className={`delete-video-btn ${video.verificationStatus === 'rejected' ? 'delete-rejected' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (video.verificationStatus === 'rejected') {
                            if (window.confirm(`This video was rejected. Reason: ${video.rejectionReason || 'No reason provided'}\n\nDelete and try uploading again?`)) {
                              handleDeleteVideo(video.id);
                            }
                          } else {
                            handleDeleteVideo(video.id);
                          }
                        }}
                        title={video.verificationStatus === 'rejected' ? 'Delete rejected video and try again' : 'Delete video'}
                      >
                        <Trash2 size={16} />
                        {video.verificationStatus === 'rejected' ? ' Delete & Retry' : ''}
                      </button>
                    </div>
                  )}
                </div>
                <div className="video-duration">
                  {video.metadata?.durationFormatted || '0:00'}
                </div>
              </div>
            ))}
            {talentVideos.length === 0 && (
              <div className="empty-state">
                <Video size={48} />
                <p>{getVideoSectionConfig(profile?.role || 'athlete').emptyMessage}</p>
                {isOwnProfile && !isGuest() && (
                  <span>{getVideoSectionConfig(profile?.role || 'athlete').description}</span>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Posts Grid */}
        <div className="profile-section">
          <h2>{t('posts')} ({posts.filter(post => post.imageUrl || post.mediaUrl).length})</h2>
          <div className="posts-grid">
            {posts.filter(post => post.imageUrl || post.mediaUrl).map((post) => (
              <div 
                key={post.id} 
                className="post-thumbnail clickable-post"
                onClick={() => navigate(`/post/${post.id}`)}
              >
                <img src={post.imageUrl || post.mediaUrl} alt={post.caption} />
                
                {/* Three dots menu for own posts */}
                {isOwnProfile && !isGuest() && (
                  <div className="post-menu-container">
                    <button 
                      className="post-menu-btn profile-post-menu"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePostMenu(post.id);
                      }}
                    >
                      <MoreVertical size={18} />
                    </button>
                    
                    {showPostMenus[post.id] && (
                      <div className="post-menu-dropdown">
                        <button 
                          className="menu-item delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePost(post.id);
                          }}
                        >
                          <Trash2 size={14} />
                          Delete Post
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="post-overlay">
                  <span>❤️ {post.likes?.length || 0}</span>
                  <span>💬 {post.comments?.length || 0}</span>
                </div>
              </div>
            ))}
            {posts.length === 0 && (
              <p className="empty-state">{t('noPostsYet')}</p>
            )}
          </div>
        </div>
      </div>

      {/* Followers Modal */}
      {showFollowersModal && (
        <div className="modal-overlay" onClick={() => setShowFollowersModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Users size={20} /> {t('followers')} ({followers.length})</h3>
              <button onClick={() => setShowFollowersModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              {followers.length === 0 ? (
                <div className="empty-modal">
                  <Users size={48} />
                  <p>{t('noFollowersYet')}</p>
                </div>
              ) : (
                <div className="users-list">
                  {followers.map((follower) => (
                    <div key={follower.id} className="user-item">
                      <div 
                        className="user-avatar"
                        onClick={(e) => {
                          e.stopPropagation();
                          openStoriesForUser(follower.id, follower.displayName, follower.photoURL);
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <img src={follower.photoURL || 'https://via.placeholder.com/40'} alt="Avatar" />
                      </div>
                      <div className="user-info" onClick={() => navigateToProfile(follower.id)}>
                        <strong>{follower.displayName || 'Anonymous User'}</strong>
                        <p>{follower.bio || 'No bio available'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Following Modal - Only show for own profile */}
      {showFollowingModal && isOwnProfile && (
        <div className="modal-overlay" onClick={() => setShowFollowingModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><UserPlus size={20} /> {t('following')} ({following.length})</h3>
              <button onClick={() => setShowFollowingModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              {following.length === 0 ? (
                <div className="empty-modal">
                  <UserPlus size={48} />
                  <p>{t('notFollowingAnyone')}</p>
                </div>
              ) : (
                <div className="users-list">
                  {following.map((user) => (
                    <div key={user.id} className="user-item">
                      <div 
                        className="user-avatar"
                        onClick={(e) => {
                          e.stopPropagation();
                          openStoriesForUser(user.id, user.displayName, user.photoURL);
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <img src={user.photoURL || 'https://via.placeholder.com/40'} alt="Avatar" />
                      </div>
                      <div className="user-info" onClick={() => navigateToProfile(user.id)}>
                        <strong>{user.displayName || 'Anonymous User'}</strong>
                        <p>{user.bio || 'No bio available'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Video Player Modal */}
      {playingVideo && (
        <div className="video-modal-overlay" onClick={handleCloseVideoPlayer}>
          <div className="video-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="video-modal-header">
              <h3>{playingVideo.fileName || 'Talent Video'}</h3>
              <button className="close-video-btn" onClick={handleCloseVideoPlayer}>
                <X size={24} />
              </button>
            </div>
            <div className="video-modal-body">
              <video 
                src={playingVideo.videoUrl}
                controls
                autoPlay
                className="modal-video-player"
                poster={playingVideo.metadata?.thumbnail}
              />
              
              {/* Video Info and Actions */}
              <div className="video-modal-info">
                <div className="video-description">
                  <strong>{t('uploadedBy')}</strong> {playingVideo.userDisplayName || t('unknownUser')}
                  {playingVideo.isSample && (
                    <span className="sample-badge">{t('sampleVideo')}</span>
                  )}
                </div>
                
                {/* Interactive Actions */}
                <div className="video-actions-section">
                  <button 
                    className={`video-like-btn ${(playingVideo.likes || []).includes(currentUser?.uid) ? 'liked' : ''}`}
                    onClick={handleVideoLike}
                    disabled={!currentUser || isLikingVideo}
                  >
                    <Heart 
                      size={20} 
                      fill={(playingVideo.likes || []).includes(currentUser?.uid) ? '#e74c3c' : 'none'}
                      color={(playingVideo.likes || []).includes(currentUser?.uid) ? '#e74c3c' : 'currentColor'}
                      className={(playingVideo.likes || []).includes(currentUser?.uid) ? 'heart-liked' : ''}
                    />
                    <span>{(playingVideo.likes || []).length}</span>
                    {isLikingVideo && <span style={{marginLeft: '5px'}}>...</span>}
                  </button>
                  <button 
                    className="video-comment-btn"
                    onClick={() => {
                      // Scroll to comment input field
                      const commentForm = document.querySelector('.video-comment-form .video-comment-input');
                      if (commentForm) {
                        commentForm.focus();
                        commentForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }}
                  >
                    <MessageCircle size={20} />
                    <span>{(playingVideo.comments || []).length}</span>
                  </button>
                  <div className="video-stats">
                    <span>👁️ {playingVideo.views || 0} views</span>
                    <span>📅 {playingVideo.uploadedAt ? (() => {
                      try {
                        if (playingVideo.uploadedAt.seconds) {
                          // Firestore Timestamp
                          return new Date(playingVideo.uploadedAt.seconds * 1000).toLocaleDateString();
                        } else if (playingVideo.uploadedAt.toDate) {
                          // Firestore Timestamp with toDate method
                          return playingVideo.uploadedAt.toDate().toLocaleDateString();
                        } else if (playingVideo.uploadedAt instanceof Date) {
                          // JavaScript Date object
                          return playingVideo.uploadedAt.toLocaleDateString();
                        } else {
                          // String or other format
                          return new Date(playingVideo.uploadedAt).toLocaleDateString();
                        }
                      } catch (error) {
                        // Error formatting date - logged in production
                        return 'Unknown date';
                      }
                    })() : 'Unknown date'}</span>
                  </div>
                </div>
                
                {/* Comments Section */}
                <div className="video-comments-section">
                  <h4>{t('comments')} ({(playingVideo.comments || []).length})</h4>
                  <div className="video-comments-list">
                    {(playingVideo.comments || []).length === 0 ? (
                      <p className="no-comments">{t('noCommentsYet')}</p>
                    ) : (
                      (playingVideo.comments || []).map((comment, index) => (
                        <div key={index} className="video-comment">
                          <img 
                            src={comment.userPhotoURL || 'https://via.placeholder.com/32/2d3748/00ff88?text=👤'} 
                            alt="User avatar"
                            className="comment-avatar"
                          />
                          <div className="comment-content">
                            <div className="comment-header">
                              <strong>{comment.userDisplayName || 'Anonymous User'}</strong>
                              <span className="comment-time">
                                {comment.timestamp ? (
                                  comment.timestamp instanceof Date ? 
                                    comment.timestamp.toLocaleDateString() :
                                    new Date(comment.timestamp).toLocaleDateString()
                                ) : 'now'}
                              </span>
                            </div>
                            <p className="comment-text">{comment.text}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {/* Add Comment Form */}
                  {!isGuest() ? (
                    <form 
                      className="video-comment-form"
                      onSubmit={handleVideoComment}
                    >
                      <img 
                        src={currentUser?.photoURL || 'https://via.placeholder.com/32/2d3748/00ff88?text=👤'} 
                        alt="Your avatar"
                        className="comment-avatar"
                      />
                      <input
                        type="text"
                        placeholder="Add a comment..."
                        value={videoComment}
                        onChange={(e) => setVideoComment(e.target.value)}
                        className="video-comment-input"
                        disabled={isCommentingVideo}
                      />
                      <button 
                        type="submit"
                        className="video-comment-submit-btn"
                        disabled={!videoComment.trim() || isCommentingVideo}
                      >
                        <Send size={16} />
                      </button>
                    </form>
                  ) : (
                    <div className="guest-comment-message">
                      <span>{t('signInToComment')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Verification Request Modal */}
      <VerificationRequestModal 
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        userProfile={profile}
      />
      
      {/* Story Viewer */}
      {showStoryViewer && userStories.stories.length > 0 && (
        <StoryViewer
          userStories={userStories}
          currentStoryIndex={currentStoryIndex}
          onClose={handleStoryClose}
          onNavigate={handleStoryNavigate}
        />
      )}
      
      <FooterNav />
    </div>
  );
}