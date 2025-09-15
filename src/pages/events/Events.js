import React from "react";
import { useNavigate } from 'react-router-dom';
import FooterNav from '../../components/layout/FooterNav';
import AppHeader from '../../components/layout/AppHeader';
import "./Events.css";
import "./styleguide.css";

// Import icons
import pumaLogo from './icons/simple-icons_puma.svg';
import nikeLogo from './icons/hugeicons_nike.svg';
import calendarIcon from './icons/clarity_date-line.svg';
import locationIcon from './icons/mdi_location.svg';
import targetIcon from './icons/game-icons_target-prize.svg';

// Import images
import rectangle88 from './images/Rectangle 88.png';
import eventMain from './images/event_main.png';
import rectangle95 from './images/Rectangle 95.png';
import rectangle96 from './images/Rectangle 96.png';
import rectangle97 from './images/Rectangle 97.png';
import rectangle101 from './images/Rectangle 101.png';
import rectangle102 from './images/Rectangle 102.png';
import rectangle103 from './images/Rectangle 103.png';
import rectangle104 from './images/Rectangle 104.png';
import rectangle105 from './images/Rectangle 105.png';

export default function Events() {
    const navigate = useNavigate();
    const [activeFilter, setActiveFilter] = React.useState('ALL');

    // Handle About Us click
    const handleAboutUsClick = () => {
        navigate('/about');
    };

    // Handle Register Now click
    const handleRegisterClick = (eventName) => {
        // For now, just show alert - you can modify this later
        alert(`Registration for ${eventName} will be available soon!`);
    };

    // Handle filter button click
    const handleFilterClick = (filterName) => {
        setActiveFilter(filterName);
        console.log(`Filter changed to: ${filterName}`);
        // You can add filtering logic here later
    };

    return (
        <div className="event-page">
            <AppHeader title="Events" showThemeToggle={true} />
            
            <div className="div">
                <div className="overlap">
                    <div className="rectangle rectangle-color" />

                    <div className="text-wrapper">AmaPlayer</div>

                    <div className="rectangle-2" />

                    <div className="text-wrapper-2">Sports Event</div>

                    <div className="frame">
                        <div className="text-wrapper-3 clickable" onClick={handleAboutUsClick}>
                            About us
                        </div>
                    </div>

                </div>

                <img className="rectangle-3" alt="Rectangle" src={rectangle88} />

                <div className="text-wrapper-4">Upcoming Events</div>

                <p className="choose-your-sport">
                    Choose your sport and participate to win prize, popularity &amp; to
                    catch the eye of selecting scout.
                </p>

                <div className="frame-2">
                    <div className={`div-wrapper filter-btn ${activeFilter === 'ALL' ? 'active' : ''}`} onClick={() => handleFilterClick('ALL')}>
                        <div className="text-wrapper-5">ALL</div>
                    </div>

                    <div className={`frame-3 filter-btn ${activeFilter === 'Cricket' ? 'active' : ''}`} onClick={() => handleFilterClick('Cricket')}>
                        <div className="text-wrapper-6">Cricket</div>
                    </div>

                    <div className={`frame-3 filter-btn ${activeFilter === 'Athlete' ? 'active' : ''}`} onClick={() => handleFilterClick('Athlete')}>
                        <div className="text-wrapper-7">Athlete</div>
                    </div>

                    <div className={`frame-4 filter-btn ${activeFilter === 'Badminton' ? 'active' : ''}`} onClick={() => handleFilterClick('Badminton')}>
                        <div className="text-wrapper-8">Badminton</div>
                    </div>

                    <div className={`frame-5 filter-btn ${activeFilter === 'More' ? 'active' : ''}`} onClick={() => handleFilterClick('More')}>
                        <div className="text-wrapper-9">More</div>
                    </div>
                </div>

                <div className="overlap-2">
                    <div className="overlap-3">
                        <div className="text-wrapper-10">PUMA</div>

                        <div className="simple-icons-puma">
                            <img className="vector-9" alt="Puma Logo" src={pumaLogo} />
                        </div>
                    </div>

                    <p className="september-sunday">
                        September 9, Sunday
                        <br />
                        Morning 10:00 AM
                    </p>

                    <p className="MPL-cricket-ground">
                        MPL Cricket ground
                        <br />
                        Nangla Tashi, Kankerkheda
                        <br />
                        Meerut, Uttar Pradesh
                    </p>

                    <img className="rectangle-4" alt="Cricket Event" src={rectangle95} />

                    <div className="frame-6">
                        <div className="text-wrapper-11">Weekend Cricket Championship</div>
                    </div>

                    <img
                        className="clarity-date-line"
                        alt="Calendar Icon"
                        src={calendarIcon}
                    />

                    <div className="mdi-location">
                        <img className="vector-10" alt="Location Icon" src={locationIcon} />
                    </div>

                    <div className="overlap-4">
                        <div className="text-wrapper-12">Sponsored by</div>
                    </div>

                    <div className="frame-7">
                        <div className="frame-8">
                            <div className="game-icons-target">
                                <img className="vector-11" alt="Target Icon" src={targetIcon} />
                            </div>

                            <div className="text-wrapper-13">1st Prize</div>
                        </div>

                        <div className="frame-8">
                            <div className="game-icons-target">
                                <img className="vector-11" alt="Target Icon" src={targetIcon} />
                            </div>

                            <div className="text-wrapper-13">2nd Prize</div>
                        </div>

                        <div className="frame-8">
                            <div className="game-icons-target">
                                <img className="vector-11" alt="Target Icon" src={targetIcon} />
                            </div>

                            <div className="text-wrapper-13">3rd Prize</div>
                        </div>
                    </div>

                    <img className="rectangle-5" alt="1st Prize" src={rectangle101} />

                    <img className="rectangle-6" alt="2nd Prize" src={rectangle102} />

                    <img className="rectangle-7" alt="3rd Prize" src={rectangle103} />

                    <div className="frame-9 clickable" onClick={() => handleRegisterClick('Weekend Cricket Championship')}>
                        <div className="text-wrapper-14">Register Now</div>
                    </div>
                </div>

                <div className="overlap-5">
                    <div className="rectangle-8" />

                    <div className="text-wrapper-15">NIKE</div>

                    <p className="p">
                        September 15, Sunday
                        <br />
                        Morning 10:00 AM
                    </p>

                    <div className="bhagat-singh-ground">
                        Bhagat Singh Ground
                        <br />
                        Modipuram,Meerut
                        <br />
                        Uttar Pradesh
                    </div>

                    <img className="rectangle-9" alt="Running Event" src={rectangle96} />

                    <div className="frame-10">
                        <div className="text-wrapper-11">100 Meter Running Challenge</div>
                    </div>

                    <img
                        className="clarity-date-line-2"
                        alt="Calendar Icon"
                        src={calendarIcon}
                    />

                    <div className="vector-wrapper">
                        <img className="vector-10" alt="Location Icon" src={locationIcon} />
                    </div>

                    <div className="rectangle-10" />

                    <div className="text-wrapper-16">Sponsored by</div>

                    <div className="frame-11">
                        <div className="frame-8">
                            <div className="game-icons-target">
                                <img className="vector-11" alt="Target Icon" src={targetIcon} />
                            </div>

                            <div className="text-wrapper-13">1st Prize</div>
                        </div>

                        <div className="frame-8">
                            <div className="game-icons-target">
                                <img className="vector-11" alt="Target Icon" src={targetIcon} />
                            </div>

                            <div className="text-wrapper-13">2nd Prize</div>
                        </div>

                        <div className="frame-8">
                            <div className="game-icons-target">
                                <img className="vector-11" alt="Target Icon" src={targetIcon} />
                            </div>

                            <div className="text-wrapper-13">3rd Prize</div>
                        </div>
                    </div>

                    <img className="rectangle-11" alt="1st Prize" src={rectangle101} />

                    <img className="rectangle-12" alt="2nd Prize" src={rectangle102} />

                    <img className="rectangle-13" alt="3rd Prize" src={rectangle103} />

                    <div className="frame-12 clickable" onClick={() => handleRegisterClick('100 Meter Running Challenge')}>
                        <div className="text-wrapper-14">Register Now</div>
                    </div>

                    <div className="hugeicons-nike">
                        <img className="vector-12" alt="Nike Logo" src={nikeLogo} />
                    </div>
                </div>

                <div className="overlap-6">
                    <div className="rectangle-14-container">
                        <img className="rectangle-14-flag" alt="Background" src={rectangle104} />
                        <img className="rectangle-14" alt="Join AmaPlayer" src={rectangle105} />
                    </div>

                    <div className="text-wrapper-17">Participate</div>

                    <div className="text-wrapper-18">with AmaPlayer</div>

                    <div className="text-wrapper-19">&amp;</div>

                    <div className="text-wrapper-20">Win</div>
                </div>
            </div>
            
            <FooterNav />
        </div>
    );
}