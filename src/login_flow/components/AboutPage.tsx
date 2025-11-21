import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useTranslation from '../hooks/useTranslation';
import ThemeToggle from '../../components/common/ui/ThemeToggle';
import LanguageSelector from '../../components/common/forms/LanguageSelector';
import { SPORTS_CONFIG } from '../../features/athlete-onboarding/data/sportsConfig';
import videoSource from '../assets/video/sport.mp4';
import './AboutPage.css';

// Indian States and Cities Data
const INDIAN_STATES_CITIES: Record<string, string[]> = {
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Rajahmundry', 'Tirupati', 'Kadapa', 'Kakinada', 'Anantapur', 'Vizianagaram', 'Eluru', 'Ongole', 'Nandyal', 'Machilipatnam', 'Adoni', 'Tenali', 'Proddatur', 'Chittoor', 'Hindupur', 'Bhimavaram', 'Madanapalle', 'Guntakal', 'Dharmavaram', 'Gudivada', 'Srikakulam', 'Narasaraopet', 'Rajamahendravaram', 'Tadpatri', 'Tadepalligudem'],
  'Arunachal Pradesh': ['Itanagar', 'Naharlagun', 'Pasighat', 'Tawang', 'Ziro', 'Bomdila', 'Tezu', 'Aalo', 'Roing', 'Changlang', 'Khonsa', 'Anini', 'Daporijo', 'Seppa', 'Yingkiong'],
  'Assam': ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tinsukia', 'Tezpur', 'Bongaigaon', 'Dhubri', 'Diphu', 'North Lakhimpur', 'Karimganj', 'Sivasagar', 'Goalpara', 'Barpeta', 'Mangaldoi', 'Lumding', 'Haflong', 'Hojai', 'Golaghat'],
  'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia', 'Darbhanga', 'Bihar Sharif', 'Arrah', 'Begusarai', 'Katihar', 'Munger', 'Chhapra', 'Samastipur', 'Hajipur', 'Sasaram', 'Dehri', 'Siwan', 'Motihari', 'Nawada', 'Bagaha', 'Buxar', 'Kishanganj', 'Sitamarhi', 'Jamalpur', 'Jehanabad', 'Aurangabad', 'Bettiah', 'Saharsa', 'Madhubani', 'Gopalganj'],
  'Chhattisgarh': ['Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Durg', 'Rajnandgaon', 'Raigarh', 'Jagdalpur', 'Ambikapur', 'Dhamtari', 'Mahasamund', 'Chirmiri', 'Kanker', 'Kawardha', 'Dalli-Rajhara', 'Naila Janjgir', 'Tilda Newra', 'Mungeli', 'Kondagaon', 'Bhatapara'],
  'Goa': ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda', 'Bicholim', 'Curchorem', 'Sanquelim', 'Cuncolim', 'Quepem', 'Canacona', 'Sanguem', 'Pernem', 'Cortalim', 'Cansaulim'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Junagadh', 'Gandhinagar', 'Anand', 'Nadiad', 'Morbi', 'Mehsana', 'Bharuch', 'Vapi', 'Navsari', 'Veraval', 'Porbandar', 'Godhra', 'Bhuj', 'Palanpur', 'Valsad', 'Patan', 'Deesa', 'Amreli', 'Dahod', 'Botad', 'Gandhidham', 'Surendranagar', 'Gondal', 'Jetpur'],
  'Haryana': ['Faridabad', 'Gurgaon', 'Panipat', 'Ambala', 'Yamunanagar', 'Rohtak', 'Hisar', 'Karnal', 'Sonipat', 'Panchkula', 'Bhiwani', 'Sirsa', 'Bahadurgarh', 'Jind', 'Thanesar', 'Kaithal', 'Rewari', 'Palwal', 'Hansi', 'Narnaul', 'Fatehabad', 'Gohana', 'Tohana', 'Narwana', 'Mandi Dabwali', 'Charkhi Dadri', 'Shahabad', 'Pehowa', 'Samalkha', 'Pinjore'],
  'Himachal Pradesh': ['Shimla', 'Mandi', 'Dharamshala', 'Solan', 'Nahan', 'Bilaspur', 'Chamba', 'Una', 'Kullu', 'Hamirpur', 'Kangra', 'Palampur', 'Baddi', 'Sundernagar', 'Paonta Sahib', 'Nurpur', 'Manali', 'Parwanoo', 'Rampur', 'Nalagarh'],
  'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Deoghar', 'Phusro', 'Hazaribagh', 'Giridih', 'Ramgarh', 'Medininagar', 'Chirkunda', 'Chaibasa', 'Dumka', 'Sahebganj', 'Pakur', 'Godda', 'Koderma', 'Jamtara', 'Khunti', 'Lohardaga', 'Gumla', 'Simdega', 'Chatra', 'Latehar', 'Palamu'],
  'Karnataka': ['Bengaluru', 'Mysuru', 'Hubli', 'Mangaluru', 'Belgaum', 'Gulbarga', 'Davanagere', 'Bellary', 'Shimoga', 'Tumkur', 'Raichur', 'Bijapur', 'Hospet', 'Gadag', 'Udupi', 'Robertson Pet', 'Bhadravati', 'Chitradurga', 'Kolar', 'Mandya', 'Hassan', 'Chikmagalur', 'Gangavati', 'Bagalkot', 'Ranebennur', 'Bidar', 'Karwar', 'Haveri', 'Chintamani', 'Gokak'],
  'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Palakkad', 'Alappuzha', 'Kannur', 'Kottayam', 'Malappuram', 'Thalassery', 'Kasaragod', 'Kayamkulam', 'Manjeri', 'Attingal', 'Changanassery', 'Punalur', 'Nilambur', 'Cherthala', 'Perinthalmanna', 'Mattannur', 'Shoranur', 'Vatakara', 'Tirur', 'Koyilandy'],
  'Madhya Pradesh': ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Dewas', 'Satna', 'Ratlam', 'Rewa', 'Murwara', 'Singrauli', 'Burhanpur', 'Khandwa', 'Bhind', 'Chhindwara', 'Guna', 'Shivpuri', 'Vidisha', 'Chhatarpur', 'Damoh', 'Mandsaur', 'Khargone', 'Neemuch', 'Pithampur', 'Hoshangabad', 'Itarsi', 'Sehore', 'Betul', 'Seoni', 'Datia', 'Nagda'],
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Aurangabad', 'Solapur', 'Kolhapur', 'Amravati', 'Navi Mumbai', 'Sangli', 'Malegaon', 'Jalgaon', 'Akola', 'Latur', 'Dhule', 'Ahmednagar', 'Chandrapur', 'Parbhani', 'Ichalkaranji', 'Jalna', 'Ambarnath', 'Bhiwandi', 'Panvel', 'Badlapur', 'Beed', 'Gondia', 'Satara', 'Barshi', 'Yavatmal', 'Achalpur', 'Osmanabad', 'Nandurbar', 'Wardha', 'Udgir', 'Hinganghat'],
  'Manipur': ['Imphal', 'Thoubal', 'Bishnupur', 'Churachandpur', 'Kakching', 'Senapati', 'Ukhrul', 'Tamenglong', 'Chandel', 'Jiribam', 'Moreh', 'Moirang', 'Nambol', 'Lilong', 'Mayang Imphal'],
  'Meghalaya': ['Shillong', 'Tura', 'Jowai', 'Nongstoin', 'Williamnagar', 'Baghmara', 'Resubelpara', 'Mairang', 'Nongpoh', 'Khliehriat', 'Mawkyrwat', 'Ampati', 'Dadengiri', 'Sohra', 'Ranikor'],
  'Mizoram': ['Aizawl', 'Lunglei', 'Champhai', 'Serchhip', 'Kolasib', 'Lawngtlai', 'Mamit', 'Saiha', 'Saitual', 'Khawzawl', 'Hnahthial', 'Thenzawl', 'Bairabi', 'Tlabung', 'North Vanlaiphai'],
  'Nagaland': ['Kohima', 'Dimapur', 'Mokokchung', 'Tuensang', 'Wokha', 'Zunheboto', 'Mon', 'Phek', 'Kiphire', 'Longleng', 'Peren', 'Chumukedima', 'Pfutsero', 'Shamator', 'Noklak'],
  'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur', 'Puri', 'Balasore', 'Bhadrak', 'Baripada', 'Jharsuguda', 'Jeypore', 'Bargarh', 'Brahmapur', 'Balangir', 'Rayagada', 'Angul', 'Dhenkanal', 'Keonjhar', 'Paradip', 'Bhawanipatna', 'Barbil', 'Kendrapara', 'Sundargarh', 'Nabarangpur', 'Koraput'],
  'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Pathankot', 'Hoshiarpur', 'Batala', 'Moga', 'Malerkotla', 'Khanna', 'Phagwara', 'Muktsar', 'Barnala', 'Rajpura', 'Firozpur', 'Kapurthala', 'Mansa', 'Sangrur', 'Faridkot', 'Fazilka', 'Gurdaspur', 'Abohar', 'Zirakpur', 'Nabha', 'Tarn Taran', 'Jagraon', 'Sunam', 'Nakodar'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Kota', 'Bikaner', 'Ajmer', 'Udaipur', 'Bhilwara', 'Alwar', 'Bharatpur', 'Sikar', 'Pali', 'Sri Ganganagar', 'Kishangarh', 'Baran', 'Dhaulpur', 'Tonk', 'Beawar', 'Hanumangarh', 'Gangapur City', 'Sawai Madhopur', 'Barmer', 'Churu', 'Jhunjhunu', 'Chittorgarh', 'Nagaur', 'Bundi', 'Banswara', 'Jhalawar', 'Makrana', 'Sujangarh', 'Sardarshahar', 'Ladnu', 'Nokha', 'Suratgarh', 'Ratangarh'],
  'Sikkim': ['Gangtok', 'Namchi', 'Mangan', 'Gyalshing', 'Rangpo', 'Singtam', 'Jorethang', 'Nayabazar', 'Ravangla', 'Pelling', 'Yuksom', 'Lachung', 'Lachen', 'Chungthang', 'Pakyong'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Tiruppur', 'Vellore', 'Erode', 'Thoothukkudi', 'Dindigul', 'Thanjavur', 'Ranipet', 'Sivakasi', 'Karur', 'Udhagamandalam', 'Hosur', 'Nagercoil', 'Kanchipuram', 'Kumarapalayam', 'Karaikkudi', 'Neyveli', 'Cuddalore', 'Kumbakonam', 'Tiruvannamalai', 'Pollachi', 'Rajapalayam', 'Gudiyatham', 'Pudukkottai', 'Vaniyambadi', 'Ambur', 'Nagapattinam'],
  'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Ramagundam', 'Khammam', 'Mahbubnagar', 'Nalgonda', 'Adilabad', 'Suryapet', 'Miryalaguda', 'Siddipet', 'Jagtial', 'Mancherial', 'Nirmal', 'Kamareddy', 'Kothagudem', 'Bodhan', 'Sangareddy', 'Metpalli', 'Zahirabad', 'Tandur', 'Vikarabad', 'Koratla', 'Sircilla', 'Bellampalli', 'Bhongir', 'Jangaon', 'Wanaparthy', 'Gadwal'],
  'Tripura': ['Agartala', 'Udaipur', 'Dharmanagar', 'Kailasahar', 'Belonia', 'Khowai', 'Ambassa', 'Sonamura', 'Kamalpur', 'Sabroom', 'Kumarghat', 'Teliamura', 'Melaghar', 'Bishalgarh', 'Amarpur'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Ghaziabad', 'Agra', 'Varanasi', 'Meerut', 'Prayagraj', 'Bareilly', 'Aligarh', 'Moradabad', 'Saharanpur', 'Gorakhpur', 'Noida', 'Firozabad', 'Jhansi', 'Muzaffarnagar', 'Mathura', 'Budaun', 'Rampur', 'Shahjahanpur', 'Farrukhabad', 'Ayodhya', 'Mau', 'Hapur', 'Etawah', 'Mirzapur', 'Bulandshahr', 'Sambhal', 'Amroha', 'Hardoi', 'Fatehpur', 'Raebareli', 'Orai', 'Sitapur', 'Bahraich', 'Modinagar', 'Unnao', 'Jaunpur', 'Lakhimpur', 'Hathras', 'Banda', 'Pilibhit', 'Barabanki', 'Khurja', 'Gonda', 'Mainpuri', 'Lalitpur', 'Etah', 'Deoria', 'Ghazipur', 'Sultanpur', 'Azamgarh', 'Bijnor', 'Ballia', 'Loni', 'Shikohabad', 'Tanda', 'Kasganj', 'Auraiya', 'Chandausi'],
  'Uttarakhand': ['Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rudrapur', 'Kashipur', 'Rishikesh', 'Pithoragarh', 'Ramnagar', 'Kotdwar', 'Jaspur', 'Khatima', 'Manglaur', 'Laksar', 'Pauri', 'Srinagar', 'Tehri', 'Almora', 'Bageshwar', 'Champawat', 'Uttarkashi', 'Nainital', 'Mussoorie', 'Tanakpur', 'Vikasnagar'],
  'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Bardhaman', 'Malda', 'Baharampur', 'Habra', 'Kharagpur', 'Shantipur', 'Dankuni', 'Dhulian', 'Ranaghat', 'Haldia', 'Raiganj', 'Krishnanagar', 'Nabadwip', 'Medinipur', 'Jalpaiguri', 'Balurghat', 'Basirhat', 'Bankura', 'Chakdaha', 'Darjeeling', 'Alipurduar', 'Purulia', 'Jangipur', 'Bolpur', 'Bangaon'],
  'Delhi': ['New Delhi', 'Delhi', 'Dwarka', 'Rohini', 'Pitampura', 'Janakpuri', 'Lajpat Nagar', 'Karol Bagh', 'Saket', 'Vasant Kunj', 'Shahdara', 'Nehru Place', 'Connaught Place', 'Chandni Chowk', 'Greater Kailash', 'Hauz Khas', 'Mayur Vihar', 'Preet Vihar', 'Rajouri Garden', 'Tilak Nagar'],
  'Chandigarh': ['Chandigarh', 'Manimajra', 'Mohali', 'Panchkula', 'Zirakpur'],
  'Puducherry': ['Puducherry', 'Karaikal', 'Mahe', 'Yanam', 'Ozhukarai', 'Villianur', 'Bahour', 'Ariyankuppam'],
  'Jammu and Kashmir': ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Kathua', 'Udhampur', 'Sopore', 'Pulwama', 'Kupwara', 'Poonch', 'Rajouri', 'Doda', 'Kishtwar', 'Kulgam', 'Ganderbal', 'Shopian', 'Bandipore', 'Ramban', 'Reasi', 'Samba'],
  'Ladakh': ['Leh', 'Kargil', 'Diskit', 'Nyoma', 'Tangtse', 'Zanskar', 'Drass', 'Sankoo', 'Padum', 'Khaltse'],
  'Andaman and Nicobar Islands': ['Port Blair', 'Bamboo Flat', 'Garacharma', 'Prothrapur', 'Rangat', 'Mayabunder', 'Diglipur', 'Car Nicobar', 'Campbell Bay', 'Hut Bay'],
  'Dadra and Nagar Haveli and Daman and Diu': ['Daman', 'Diu', 'Silvassa', 'Amli', 'Naroli', 'Vapi', 'Kadaiya', 'Dunetha', 'Samarvarni', 'Khadoli'],
  'Lakshadweep': ['Kavaratti', 'Agatti', 'Amini', 'Andrott', 'Minicoy', 'Kalpeni', 'Kadmat', 'Kiltan', 'Chetlat', 'Bitra']
};

const INDIAN_STATES = Object.keys(INDIAN_STATES_CITIES).sort();

interface RoleInfo {
  title: string;
  image: string;
}

interface RoleInfoMap {
  [key: string]: RoleInfo;
}

const AboutPage: React.FC = () => {
  const navigate = useNavigate();
  const { role } = useParams<{ role: string }>();
  const { t } = useTranslation();

  // Coach professional details form state
  const [coachDetails, setCoachDetails] = useState({
    fullName: '',
    sport: '',
    yearsOfExperience: '',
    coachingLevel: '',
    certifications: '',
    bio: '',
    phone: '',
    email: ''
  });

  // Organization registration form state
  const [orgDetails, setOrgDetails] = useState({
    // Basic Information
    organizationName: '',
    organizationType: '',
    establishedYear: '',
    registrationNumber: '',
    // Contact Details
    contactPersonName: '',
    designation: '',
    phone: '',
    alternatePhone: '',
    email: '',
    website: '',
    // Address Details
    street: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    // Sports & Players
    sportsOffered: [] as string[],
    numberOfPlayers: '',
    ageGroups: [] as string[],
    // Facilities
    hasTrainingGrounds: false,
    hasGym: false,
    hasCoachingStaff: false,
    hasHostel: false,
    // Additional Info
    achievements: '',
    specialNotes: '',
    // Declaration
    declarationAccepted: false
  });

  // Parent registration form state
  const [parentDetails, setParentDetails] = useState({
    // Parent Information
    parentFullName: '',
    relationshipToChild: '',
    parentMobile: '',
    parentEmail: '',
    // Child Information
    childFullName: '',
    childDOB: '',
    childGender: '',
    childCity: '',
    childState: '',
    childCountry: 'India',
    // School Information
    schoolName: '',
    schoolBoard: '',
    schoolClass: '',
    schoolCity: '',
    schoolCoachName: '',
    schoolTeamParticipation: '',
    // Sports Details
    primarySport: '',
    secondarySport: '',
    skillLevel: '',
    playingCategory: '',
    // Additional Details
    achievements: '',
    aspirations: '',
    // Consent
    consentAccepted: false
  });

  const roleInfo: RoleInfoMap = {
    athlete: { 
      title: 'athlete', 
      image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80'
    },
    coach: { 
      title: 'coach', 
      image: 'https://images.unsplash.com/photo-1544717297-fa95b6ee9643?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80'
    },
    organization: { 
      title: 'organization', 
      image: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80'
    },
    spouse: { 
      title: 'spouse', 
      image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80'
    },
    parent: { 
      title: 'parent', 
      image: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80'
    }
  };

  const currentRole = role ? roleInfo[role] : undefined;

  const handleCoachDetailsChange = (field: string, value: string): void => {
    setCoachDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleOrgDetailsChange = (field: string, value: string | boolean | string[]): void => {
    setOrgDetails(prev => {
      const newState = {
        ...prev,
        [field]: value
      };
      // Clear city when state changes
      if (field === 'state') {
        newState.city = '';
      }
      return newState;
    });
  };

  const handleSportsChange = (sport: string): void => {
    setOrgDetails(prev => ({
      ...prev,
      sportsOffered: prev.sportsOffered.includes(sport)
        ? prev.sportsOffered.filter(s => s !== sport)
        : [...prev.sportsOffered, sport]
    }));
  };

  const handleAgeGroupChange = (ageGroup: string): void => {
    setOrgDetails(prev => ({
      ...prev,
      ageGroups: prev.ageGroups.includes(ageGroup)
        ? prev.ageGroups.filter(a => a !== ageGroup)
        : [...prev.ageGroups, ageGroup]
    }));
  };

  const handleParentDetailsChange = (field: string, value: string | boolean): void => {
    setParentDetails(prev => {
      const newState = {
        ...prev,
        [field]: value
      };
      // Clear city when state changes
      if (field === 'childState') {
        newState.childCity = '';
      }
      return newState;
    });
  };

  const handleContinue = (): void => {
    // For coaches, validate and store their professional details
    if (role === 'coach') {
      // Store coach details in localStorage for later use during registration
      localStorage.setItem('coachProfessionalDetails', JSON.stringify(coachDetails));
      // Store the role for signup page
      localStorage.setItem('selectedUserRole', role);
      // Navigate to signup page instead of login
      navigate('/signup');
    } else if (role === 'organization') {
      // Validate organization form
      if (!orgDetails.organizationName || !orgDetails.organizationType || !orgDetails.contactPersonName ||
          !orgDetails.email || !orgDetails.phone || !orgDetails.city || !orgDetails.state || !orgDetails.pincode ||
          orgDetails.sportsOffered.length === 0 || !orgDetails.declarationAccepted) {
        alert('Please fill in all required fields and accept the declaration.');
        return;
      }
      // Store organization details in localStorage for later use during registration
      localStorage.setItem('organizationDetails', JSON.stringify(orgDetails));
      // Store the role for signup page
      localStorage.setItem('selectedUserRole', role);
      // Navigate to signup page
      navigate('/signup');
    } else if (role === 'parent') {
      // Validate parent form
      if (!parentDetails.parentFullName || !parentDetails.relationshipToChild || !parentDetails.parentMobile ||
          !parentDetails.parentEmail || !parentDetails.childFullName || !parentDetails.childDOB ||
          !parentDetails.childGender || !parentDetails.childCity || !parentDetails.childState ||
          !parentDetails.primarySport || !parentDetails.skillLevel || !parentDetails.playingCategory ||
          !parentDetails.consentAccepted) {
        alert('Please fill in all required fields and accept the consent.');
        return;
      }
      // Store parent details in localStorage for later use during registration
      localStorage.setItem('parentDetails', JSON.stringify(parentDetails));
      // Store the role for signup page
      localStorage.setItem('selectedUserRole', role);
      // Navigate to signup page
      navigate('/signup');
    } else {
      // Other roles go to login
      navigate(`/login/${role}`);
    }
  };

  const handleBack = (): void => {
    navigate('/');
  };

  return (
    <div className="about-container">
      <div className="about-page-header">
        <div className="about-page-controls">
          <LanguageSelector />
          <ThemeToggle />
        </div>
      </div>
      
      <div className="about-content">
        <div className="about-header">
          <div className="role-badge">
            <img
              src={currentRole?.image}
              alt={t(currentRole?.title || '')}
              className="role-badge-image"
            />
            <span className="role-badge-text">
              {t('joiningAs', 'Joining as')} {t(currentRole?.title || '')}
            </span>
          </div>
          <h1 className="about-title">{t('welcomeToAmaplayer')}</h1>
          <p className="about-subtitle">
            {role === 'coach' ? t('coachDetailsSubtitle', 'Please provide your professional details') :
             role === 'organization' ? 'Please complete the registration form below' :
             role === 'parent' ? 'Please provide your details and your child\'s information' :
             t('yourJourney')}
          </p>
        </div>

        {role === 'organization' ? (
          // Organization Registration Form
          <div className="org-registration-form">
            {/* Section 1: Basic Information */}
            <h2 className="form-section-title">1. Basic Information</h2>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="organizationName" className="form-label">
                  Organisation Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="organizationName"
                  className="form-input"
                  value={orgDetails.organizationName}
                  onChange={(e) => handleOrgDetailsChange('organizationName', e.target.value)}
                  placeholder="Enter organisation name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="organizationType" className="form-label">
                  Type of Organisation <span className="required">*</span>
                </label>
                <select
                  id="organizationType"
                  className="form-input"
                  value={orgDetails.organizationType}
                  onChange={(e) => handleOrgDetailsChange('organizationType', e.target.value)}
                >
                  <option value="">Select type</option>
                  <option value="academy">Academy</option>
                  <option value="club">Club</option>
                  <option value="school">School</option>
                  <option value="college">College</option>
                  <option value="private">Private</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="establishedYear" className="form-label">
                  Established Year
                </label>
                <input
                  type="number"
                  id="establishedYear"
                  className="form-input"
                  value={orgDetails.establishedYear}
                  onChange={(e) => handleOrgDetailsChange('establishedYear', e.target.value)}
                  placeholder="e.g., 2010"
                  min="1900"
                  max={new Date().getFullYear()}
                />
              </div>

              <div className="form-group">
                <label htmlFor="registrationNumber" className="form-label">
                  Registration Number (Optional)
                </label>
                <input
                  type="text"
                  id="registrationNumber"
                  className="form-input"
                  value={orgDetails.registrationNumber}
                  onChange={(e) => handleOrgDetailsChange('registrationNumber', e.target.value)}
                  placeholder="Enter registration number"
                />
              </div>
            </div>

            {/* Section 2: Contact Details */}
            <h2 className="form-section-title">2. Contact Details</h2>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="contactPersonName" className="form-label">
                  Contact Person Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="contactPersonName"
                  className="form-input"
                  value={orgDetails.contactPersonName}
                  onChange={(e) => handleOrgDetailsChange('contactPersonName', e.target.value)}
                  placeholder="Enter contact person name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="designation" className="form-label">
                  Designation/Role
                </label>
                <input
                  type="text"
                  id="designation"
                  className="form-input"
                  value={orgDetails.designation}
                  onChange={(e) => handleOrgDetailsChange('designation', e.target.value)}
                  placeholder="e.g., Manager, Director"
                />
              </div>

              <div className="form-group">
                <label htmlFor="orgPhone" className="form-label">
                  Phone Number <span className="required">*</span>
                </label>
                <input
                  type="tel"
                  id="orgPhone"
                  className="form-input"
                  value={orgDetails.phone}
                  onChange={(e) => handleOrgDetailsChange('phone', e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>

              <div className="form-group">
                <label htmlFor="alternatePhone" className="form-label">
                  Alternate Phone (Optional)
                </label>
                <input
                  type="tel"
                  id="alternatePhone"
                  className="form-input"
                  value={orgDetails.alternatePhone}
                  onChange={(e) => handleOrgDetailsChange('alternatePhone', e.target.value)}
                  placeholder="Enter alternate phone"
                />
              </div>

              <div className="form-group">
                <label htmlFor="orgEmail" className="form-label">
                  Email Address <span className="required">*</span>
                </label>
                <input
                  type="email"
                  id="orgEmail"
                  className="form-input"
                  value={orgDetails.email}
                  onChange={(e) => handleOrgDetailsChange('email', e.target.value)}
                  placeholder="Enter email address"
                />
              </div>

              <div className="form-group">
                <label htmlFor="website" className="form-label">
                  Website / Social Media Link
                </label>
                <input
                  type="url"
                  id="website"
                  className="form-input"
                  value={orgDetails.website}
                  onChange={(e) => handleOrgDetailsChange('website', e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* Section 3: Address Details */}
            <h2 className="form-section-title">3. Address Details</h2>
            <div className="form-grid">
              <div className="form-group full-width">
                <label htmlFor="street" className="form-label">
                  Street / Area
                </label>
                <input
                  type="text"
                  id="street"
                  className="form-input"
                  value={orgDetails.street}
                  onChange={(e) => handleOrgDetailsChange('street', e.target.value)}
                  placeholder="Enter street/area"
                />
              </div>

              <div className="form-group">
                <label htmlFor="state" className="form-label">
                  State <span className="required">*</span>
                </label>
                <select
                  id="state"
                  className="form-input"
                  value={orgDetails.state}
                  onChange={(e) => handleOrgDetailsChange('state', e.target.value)}
                >
                  <option value="">Select state</option>
                  {INDIAN_STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="city" className="form-label">
                  City <span className="required">*</span>
                </label>
                <select
                  id="city"
                  className="form-input"
                  value={orgDetails.city}
                  onChange={(e) => handleOrgDetailsChange('city', e.target.value)}
                  disabled={!orgDetails.state}
                >
                  <option value="">{orgDetails.state ? 'Select city' : 'Select state first'}</option>
                  {orgDetails.state && INDIAN_STATES_CITIES[orgDetails.state]?.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="pincode" className="form-label">
                  Pincode <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="pincode"
                  className="form-input"
                  value={orgDetails.pincode}
                  onChange={(e) => handleOrgDetailsChange('pincode', e.target.value)}
                  placeholder="Enter pincode"
                />
              </div>

              <div className="form-group">
                <label htmlFor="country" className="form-label">
                  Country
                </label>
                <input
                  type="text"
                  id="country"
                  className="form-input country-readonly"
                  value={orgDetails.country}
                  readOnly
                  disabled
                />
              </div>
            </div>

            {/* Section 4: Sports & Players */}
            <h2 className="form-section-title">4. Sports & Players</h2>
            <div className="form-grid">
              <div className="form-group full-width">
                <label className="form-label">
                  Sports Offered <span className="required">*</span>
                </label>
                <div className="checkbox-grid">
                  {SPORTS_CONFIG.map((sport) => (
                    <label key={sport.id} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={orgDetails.sportsOffered.includes(sport.name)}
                        onChange={() => handleSportsChange(sport.name)}
                      />
                      <span>{sport.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="numberOfPlayers" className="form-label">
                  Number of Players Currently Enrolled
                </label>
                <input
                  type="number"
                  id="numberOfPlayers"
                  className="form-input"
                  value={orgDetails.numberOfPlayers}
                  onChange={(e) => handleOrgDetailsChange('numberOfPlayers', e.target.value)}
                  placeholder="Enter number"
                  min="0"
                />
              </div>

              <div className="form-group full-width">
                <label className="form-label">Age Groups</label>
                <div className="checkbox-grid">
                  {['U-10', 'U-12', 'U-14', 'U-16', 'U-18', 'Adults'].map((ageGroup) => (
                    <label key={ageGroup} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={orgDetails.ageGroups.includes(ageGroup)}
                        onChange={() => handleAgeGroupChange(ageGroup)}
                      />
                      <span>{ageGroup}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 5: Facilities Available */}
            <h2 className="form-section-title">5. Facilities Available</h2>
            <div className="form-grid">
              <div className="form-group facility-toggle">
                <label className="toggle-label">
                  <span>Training Grounds</span>
                  <input
                    type="checkbox"
                    checked={orgDetails.hasTrainingGrounds}
                    onChange={(e) => handleOrgDetailsChange('hasTrainingGrounds', e.target.checked)}
                  />
                  <span className="toggle-switch"></span>
                </label>
              </div>

              <div className="form-group facility-toggle">
                <label className="toggle-label">
                  <span>Gym / Fitness Area</span>
                  <input
                    type="checkbox"
                    checked={orgDetails.hasGym}
                    onChange={(e) => handleOrgDetailsChange('hasGym', e.target.checked)}
                  />
                  <span className="toggle-switch"></span>
                </label>
              </div>

              <div className="form-group facility-toggle">
                <label className="toggle-label">
                  <span>Coaching Staff</span>
                  <input
                    type="checkbox"
                    checked={orgDetails.hasCoachingStaff}
                    onChange={(e) => handleOrgDetailsChange('hasCoachingStaff', e.target.checked)}
                  />
                  <span className="toggle-switch"></span>
                </label>
              </div>

              <div className="form-group facility-toggle">
                <label className="toggle-label">
                  <span>Hostel / Accommodation</span>
                  <input
                    type="checkbox"
                    checked={orgDetails.hasHostel}
                    onChange={(e) => handleOrgDetailsChange('hasHostel', e.target.checked)}
                  />
                  <span className="toggle-switch"></span>
                </label>
              </div>
            </div>

            {/* Section 6: Additional Info */}
            <h2 className="form-section-title">6. Additional Info (Optional)</h2>
            <div className="form-grid">
              <div className="form-group full-width">
                <label htmlFor="achievements" className="form-label">
                  Achievements / Awards
                </label>
                <textarea
                  id="achievements"
                  className="form-input form-textarea"
                  value={orgDetails.achievements}
                  onChange={(e) => handleOrgDetailsChange('achievements', e.target.value)}
                  placeholder="List any notable achievements or awards"
                  rows={3}
                />
              </div>

              <div className="form-group full-width">
                <label htmlFor="specialNotes" className="form-label">
                  Special Notes
                </label>
                <textarea
                  id="specialNotes"
                  className="form-input form-textarea"
                  value={orgDetails.specialNotes}
                  onChange={(e) => handleOrgDetailsChange('specialNotes', e.target.value)}
                  placeholder="Any additional information"
                  rows={3}
                />
              </div>
            </div>

            {/* Section 7: Declaration */}
            <h2 className="form-section-title">7. Declaration</h2>
            <div className="form-group declaration-group">
              <label className="checkbox-label declaration-checkbox">
                <input
                  type="checkbox"
                  checked={orgDetails.declarationAccepted}
                  onChange={(e) => handleOrgDetailsChange('declarationAccepted', e.target.checked)}
                />
                <span>I hereby confirm that all the information provided is true and correct. <span className="required">*</span></span>
              </label>
            </div>
          </div>
        ) : role === 'coach' ? (
          // Coach Professional Details Form
          <div className="coach-details-form">
            <h2 className="form-section-title">{t('professionalDetails', 'Professional Details')}</h2>

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="fullName" className="form-label">
                  {t('fullName', 'Full Name')} <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="fullName"
                  className="form-input"
                  value={coachDetails.fullName}
                  onChange={(e) => handleCoachDetailsChange('fullName', e.target.value)}
                  placeholder={t('enterFullName', 'Enter your full name')}
                />
              </div>

              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  {t('email', 'Email')} <span className="required">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  className="form-input"
                  value={coachDetails.email}
                  onChange={(e) => handleCoachDetailsChange('email', e.target.value)}
                  placeholder={t('enterEmail', 'Enter your email')}
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone" className="form-label">
                  {t('phone', 'Phone Number')}
                </label>
                <input
                  type="tel"
                  id="phone"
                  className="form-input"
                  value={coachDetails.phone}
                  onChange={(e) => handleCoachDetailsChange('phone', e.target.value)}
                  placeholder={t('enterPhone', 'Enter your phone number')}
                />
              </div>

              <div className="form-group">
                <label htmlFor="sport" className="form-label">
                  {t('sport', 'Sport')} <span className="required">*</span>
                </label>
                <select
                  id="sport"
                  className="form-input"
                  value={coachDetails.sport}
                  onChange={(e) => handleCoachDetailsChange('sport', e.target.value)}
                >
                  <option value="">{t('selectSport', 'Select sport')}</option>
                  {SPORTS_CONFIG.map((sport) => (
                    <option key={sport.id} value={sport.name}>
                      {sport.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="yearsOfExperience" className="form-label">
                  {t('yearsOfExperience', 'Years of Experience')} <span className="required">*</span>
                </label>
                <input
                  type="number"
                  id="yearsOfExperience"
                  className="form-input"
                  value={coachDetails.yearsOfExperience}
                  onChange={(e) => handleCoachDetailsChange('yearsOfExperience', e.target.value)}
                  placeholder={t('enterYears', 'Enter years')}
                  min="0"
                />
              </div>

              <div className="form-group">
                <label htmlFor="coachingLevel" className="form-label">
                  {t('coachingLevel', 'Coaching Level')} <span className="required">*</span>
                </label>
                <select
                  id="coachingLevel"
                  className="form-input"
                  value={coachDetails.coachingLevel}
                  onChange={(e) => handleCoachDetailsChange('coachingLevel', e.target.value)}
                >
                  <option value="">{t('selectLevel', 'Select level')}</option>
                  <option value="beginner">{t('beginner', 'Beginner')}</option>
                  <option value="intermediate">{t('intermediate', 'Intermediate')}</option>
                  <option value="advanced">{t('advanced', 'Advanced')}</option>
                  <option value="professional">{t('professional', 'Professional')}</option>
                  <option value="elite">{t('elite', 'Elite/Olympic')}</option>
                </select>
              </div>

              <div className="form-group full-width">
                <label htmlFor="certifications" className="form-label">
                  {t('certifications', 'Certifications')}
                </label>
                <input
                  type="text"
                  id="certifications"
                  className="form-input"
                  value={coachDetails.certifications}
                  onChange={(e) => handleCoachDetailsChange('certifications', e.target.value)}
                  placeholder={t('enterCertifications', 'e.g., UEFA A License, NASM-CPT')}
                />
              </div>

              <div className="form-group full-width">
                <label htmlFor="bio" className="form-label">
                  {t('bio', 'Professional Bio')}
                </label>
                <textarea
                  id="bio"
                  className="form-input form-textarea"
                  value={coachDetails.bio}
                  onChange={(e) => handleCoachDetailsChange('bio', e.target.value)}
                  placeholder={t('enterBio', 'Tell us about your coaching experience and philosophy')}
                  rows={4}
                />
              </div>
            </div>
          </div>
        ) : role === 'parent' ? (
          // Parent Registration Form
          <div className="parent-registration-form">
            {/* Section 1: Parent/Guardian Information */}
            <h2 className="form-section-title">1. Parent/Guardian Information</h2>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="parentFullName" className="form-label">
                  Parent Full Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="parentFullName"
                  className="form-input"
                  value={parentDetails.parentFullName}
                  onChange={(e) => handleParentDetailsChange('parentFullName', e.target.value)}
                  placeholder="Enter parent's full name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="relationshipToChild" className="form-label">
                  Relationship to Child <span className="required">*</span>
                </label>
                <select
                  id="relationshipToChild"
                  className="form-input"
                  value={parentDetails.relationshipToChild}
                  onChange={(e) => handleParentDetailsChange('relationshipToChild', e.target.value)}
                >
                  <option value="">Select relationship</option>
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Guardian">Guardian</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="parentMobile" className="form-label">
                  Mobile Number <span className="required">*</span>
                </label>
                <input
                  type="tel"
                  id="parentMobile"
                  className="form-input"
                  value={parentDetails.parentMobile}
                  onChange={(e) => handleParentDetailsChange('parentMobile', e.target.value)}
                  placeholder="Enter mobile number"
                />
              </div>

              <div className="form-group">
                <label htmlFor="parentEmail" className="form-label">
                  Email Address <span className="required">*</span>
                </label>
                <input
                  type="email"
                  id="parentEmail"
                  className="form-input"
                  value={parentDetails.parentEmail}
                  onChange={(e) => handleParentDetailsChange('parentEmail', e.target.value)}
                  placeholder="Enter email address"
                />
              </div>
            </div>

            {/* Section 2: Child (Player) Information */}
            <h2 className="form-section-title">2. Child (Player) Information</h2>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="childFullName" className="form-label">
                  Child's Full Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="childFullName"
                  className="form-input"
                  value={parentDetails.childFullName}
                  onChange={(e) => handleParentDetailsChange('childFullName', e.target.value)}
                  placeholder="Enter child's full name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="childDOB" className="form-label">
                  Date of Birth <span className="required">*</span>
                </label>
                <input
                  type="date"
                  id="childDOB"
                  className="form-input"
                  value={parentDetails.childDOB}
                  onChange={(e) => handleParentDetailsChange('childDOB', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="childGender" className="form-label">
                  Gender <span className="required">*</span>
                </label>
                <select
                  id="childGender"
                  className="form-input"
                  value={parentDetails.childGender}
                  onChange={(e) => handleParentDetailsChange('childGender', e.target.value)}
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="childState" className="form-label">
                  State <span className="required">*</span>
                </label>
                <select
                  id="childState"
                  className="form-input"
                  value={parentDetails.childState}
                  onChange={(e) => handleParentDetailsChange('childState', e.target.value)}
                >
                  <option value="">Select state</option>
                  {INDIAN_STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="childCity" className="form-label">
                  City <span className="required">*</span>
                </label>
                <select
                  id="childCity"
                  className="form-input"
                  value={parentDetails.childCity}
                  onChange={(e) => handleParentDetailsChange('childCity', e.target.value)}
                  disabled={!parentDetails.childState}
                >
                  <option value="">{parentDetails.childState ? 'Select city' : 'Select state first'}</option>
                  {parentDetails.childState && INDIAN_STATES_CITIES[parentDetails.childState]?.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="childCountry" className="form-label">
                  Country <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="childCountry"
                  className="form-input country-readonly"
                  value={parentDetails.childCountry}
                  readOnly
                  disabled
                />
              </div>
            </div>

            {/* Section 3: Child's School Information */}
            <h2 className="form-section-title">3. Child's School Information (Optional)</h2>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="schoolName" className="form-label">
                  School Name
                </label>
                <input
                  type="text"
                  id="schoolName"
                  className="form-input"
                  value={parentDetails.schoolName}
                  onChange={(e) => handleParentDetailsChange('schoolName', e.target.value)}
                  placeholder="Enter school name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="schoolBoard" className="form-label">
                  Board
                </label>
                <select
                  id="schoolBoard"
                  className="form-input"
                  value={parentDetails.schoolBoard}
                  onChange={(e) => handleParentDetailsChange('schoolBoard', e.target.value)}
                >
                  <option value="">Select board</option>
                  <option value="CBSE">CBSE</option>
                  <option value="ICSE">ICSE</option>
                  <option value="State Board">State Board</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="schoolClass" className="form-label">
                  School Class
                </label>
                <input
                  type="text"
                  id="schoolClass"
                  className="form-input"
                  value={parentDetails.schoolClass}
                  onChange={(e) => handleParentDetailsChange('schoolClass', e.target.value)}
                  placeholder="e.g., 4th, 7th, 10th"
                />
              </div>

              <div className="form-group">
                <label htmlFor="schoolCity" className="form-label">
                  School City
                </label>
                <input
                  type="text"
                  id="schoolCity"
                  className="form-input"
                  value={parentDetails.schoolCity}
                  onChange={(e) => handleParentDetailsChange('schoolCity', e.target.value)}
                  placeholder="Enter school city"
                />
              </div>

              <div className="form-group">
                <label htmlFor="schoolCoachName" className="form-label">
                  School Coach Name (Optional)
                </label>
                <input
                  type="text"
                  id="schoolCoachName"
                  className="form-input"
                  value={parentDetails.schoolCoachName}
                  onChange={(e) => handleParentDetailsChange('schoolCoachName', e.target.value)}
                  placeholder="Enter coach name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="schoolTeamParticipation" className="form-label">
                  School Team Participation
                </label>
                <select
                  id="schoolTeamParticipation"
                  className="form-input"
                  value={parentDetails.schoolTeamParticipation}
                  onChange={(e) => handleParentDetailsChange('schoolTeamParticipation', e.target.value)}
                >
                  <option value="">Select option</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
            </div>

            {/* Section 4: Child's Sports Details */}
            <h2 className="form-section-title">4. Child's Sports Details</h2>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="primarySport" className="form-label">
                  Primary Sport <span className="required">*</span>
                </label>
                <select
                  id="primarySport"
                  className="form-input"
                  value={parentDetails.primarySport}
                  onChange={(e) => handleParentDetailsChange('primarySport', e.target.value)}
                >
                  <option value="">Select primary sport</option>
                  {SPORTS_CONFIG.map((sport) => (
                    <option key={sport.id} value={sport.name}>
                      {sport.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="secondarySport" className="form-label">
                  Secondary Sport (Optional)
                </label>
                <select
                  id="secondarySport"
                  className="form-input"
                  value={parentDetails.secondarySport}
                  onChange={(e) => handleParentDetailsChange('secondarySport', e.target.value)}
                >
                  <option value="">Select secondary sport</option>
                  {SPORTS_CONFIG.map((sport) => (
                    <option key={sport.id} value={sport.name}>
                      {sport.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="skillLevel" className="form-label">
                  Skill Level <span className="required">*</span>
                </label>
                <select
                  id="skillLevel"
                  className="form-input"
                  value={parentDetails.skillLevel}
                  onChange={(e) => handleParentDetailsChange('skillLevel', e.target.value)}
                >
                  <option value="">Select skill level</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="playingCategory" className="form-label">
                  Playing Category <span className="required">*</span>
                </label>
                <select
                  id="playingCategory"
                  className="form-input"
                  value={parentDetails.playingCategory}
                  onChange={(e) => handleParentDetailsChange('playingCategory', e.target.value)}
                >
                  <option value="">Select category</option>
                  <option value="U-10">U-10</option>
                  <option value="U-12">U-12</option>
                  <option value="U-14">U-14</option>
                  <option value="U-16">U-16</option>
                  <option value="U-19">U-19</option>
                  <option value="Open">Open</option>
                </select>
              </div>
            </div>

            {/* Section 5: Additional Details */}
            <h2 className="form-section-title">5. Additional Details</h2>
            <div className="form-grid">
              <div className="form-group full-width">
                <label htmlFor="achievements" className="form-label">
                  Achievements / Trophies
                </label>
                <textarea
                  id="achievements"
                  className="form-input form-textarea"
                  value={parentDetails.achievements}
                  onChange={(e) => handleParentDetailsChange('achievements', e.target.value)}
                  placeholder="List any achievements or trophies"
                  rows={3}
                />
              </div>

              <div className="form-group full-width">
                <label htmlFor="aspirations" className="form-label">
                  Aspirations
                </label>
                <textarea
                  id="aspirations"
                  className="form-input form-textarea"
                  value={parentDetails.aspirations}
                  onChange={(e) => handleParentDetailsChange('aspirations', e.target.value)}
                  placeholder="What are your child's sports aspirations?"
                  rows={3}
                />
              </div>
            </div>

            {/* Section 6: Parent Consent */}
            <h2 className="form-section-title">6. Parent Consent</h2>
            <div className="form-group declaration-group">
              <label className="checkbox-label declaration-checkbox">
                <input
                  type="checkbox"
                  checked={parentDetails.consentAccepted}
                  onChange={(e) => handleParentDetailsChange('consentAccepted', e.target.checked)}
                />
                <span>I allow AmaPlayer to use my child's content. <span className="required">*</span></span>
              </label>
            </div>
          </div>
        ) : (
          // Original vision/mission and video for other roles
          <>
            <div className="mission-vision-grid">
              <div className="mission-card">
                <div className="card-icon mission-icon">🎯</div>
                <h3 className="card-title">{t('ourMission')}</h3>
                <p className="card-description">
                  {t('missionDescription', "To create the world's most comprehensive platform that connects athletes, coaches, and organizations, fostering talent development and creating opportunities for athletic excellence across all sports disciplines.")}
                </p>
              </div>

              <div className="vision-card">
                <div className="card-icon vision-icon">🌟</div>
                <h3 className="card-title">{t('ourVision')}</h3>
                <p className="card-description">
                  {t('visionDescription', 'To revolutionize the sports industry by building a global ecosystem where every athlete has access to world-class coaching, every coach can discover exceptional talent, and every organization can build championship-winning teams.')}
                </p>
              </div>
            </div>

            <div className="video-section">
              <h2 className="video-title">{t('watchOurStory')}</h2>
              <div className="video-container">
                <video
                  width="100%"
                  height="auto"
                  controls
                  controlsList="nodownload"
                  poster=""
                  className="about-video"
                >
                  <source src={videoSource} type="video/mp4" />
                  <p>{t('videoLoadError', "If you're seeing this, the video failed to load. Please check the console for errors.")}</p>
                  {t('videoNotSupported', 'Your browser does not support the video tag.')}
                </video>
              </div>
            </div>
          </>
        )}

        <div className="about-actions">
          <button className="continue-btn" onClick={handleContinue}>
            {role === 'coach' ? t('continue', 'Continue') :
             role === 'organization' ? 'Register Organisation' :
             role === 'parent' ? 'Register as Parent' :
             t('continueToLogin')}
          </button>
          <button className="back-btn" onClick={handleBack}>
            ← {t('chooseDifferentRole')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
