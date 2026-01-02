import React, { useState, useEffect } from 'react';
import GuideSideNav from '../../components/SideNavguide';
import GuideTopNav from '../../components/TopNavGuide';
import Swal from 'sweetalert2';

export default function GuideSettings() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        bio: '',
        location: '',
        experience: '',
    });
    const [notifications, setNotifications] = useState({
        email: true,
        push: false,
    });
    const [isSaving, setIsSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [userUid, setUserUid] = useState<string | null>(null);

    useEffect(() => {
        // Get uid from localStorage
        const uid = localStorage.getItem('userUid');
        setUserUid(uid);
    }, []);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!userUid) {
                setLoading(false);
                return;
            }

            try {
                const response = await fetch(`/api/guide/profile?guideId=${userUid}`);
                if (!response.ok) throw new Error('Failed to fetch profile');
                const data = await response.json();
                
                if (data.success && data.data) {
                    setFormData({
                        firstName: data.data.firstName || '',
                        lastName: data.data.lastName || '',
                        email: data.data.email || '',
                        phone: data.data.phone || '',
                        bio: data.data.bio || '',
                        location: data.data.location || '',
                        experience: data.data.experience || '',
                    });
                    setNotifications(data.data.notificationSettings || {
                        email: true,
                        push: false,
                    });
                }
            } catch (error) {
                console.error('Error fetching profile:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [userUid]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleNotificationToggle = (type: 'email' | 'push') => {
        setNotifications(prev => ({
            ...prev,
            [type]: !prev[type]
        }));
    };

    const handleSaveChanges = async () => {
        if (!userUid) return;

        setIsSaving(true);
        try {
            const response = await fetch(`/api/guide/profile?guideId=${userUid}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    phone: formData.phone,
                    bio: formData.bio,
                    location: formData.location,
                    experience: formData.experience,
                    notificationSettings: notifications,
                }),
            });

            if (!response.ok) throw new Error('Failed to save settings');

            await Swal.fire({
                title: 'Success!',
                text: 'Settings saved successfully!',
                icon: 'success',
                confirmButtonColor: '#3085d6',
            });
        } catch (error) {
            console.error('Error saving settings:', error);
            await Swal.fire({
                title: 'Error!',
                text: 'Failed to save settings. Please try again.',
                icon: 'error',
                confirmButtonColor: '#3085d6',
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handlePasswordChange = () => {
        alert('Password change functionality would be implemented here');
    };

    const handle2FAEnable = () => {
        alert('Two-factor authentication setup would be implemented here');
    };

    return (
        <div className="flex min-h-screen bg-gray-50">
            <GuideSideNav />

            <div className="flex-1 flex flex-col lg:ml-64">
                <GuideTopNav
                    title="Settings"
                    subtitle="Manage your account settings and preferences."
                />

                <main className="flex-1 p-4 lg:p-6 pt-20 lg:pt-24">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
                                <p className="text-gray-600 mt-2">Manage your account settings and preferences.</p>
                            </div>
                            <button
                                onClick={handleSaveChanges}
                                disabled={isSaving}
                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                            >
                                {isSaving ? (
                                    <>
                                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Saving...
                                    </>
                                ) : (
                                    'Save All Changes'
                                )}
                            </button>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-6">Personal Information</h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                                        First Name
                                    </label>
                                    <input
                                        type="text"
                                        id="firstName"
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                                        Last Name
                                    </label>
                                    <input
                                        type="text"
                                        id="lastName"
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        value={formData.email}
                                        disabled
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                                        Phone Number
                                    </label>
                                    <input
                                        type="tel"
                                        id="phone"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                                        Bio
                                    </label>
                                    <textarea
                                        id="bio"
                                        name="bio"
                                        value={formData.bio}
                                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                                        Location
                                    </label>
                                    <input
                                        type="text"
                                        id="location"
                                        name="location"
                                        value={formData.location}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="experience" className="block text-sm font-medium text-gray-700 mb-2">
                                        Experience
                                    </label>
                                    <textarea
                                        id="experience"
                                        name="experience"
                                        value={formData.experience}
                                        onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Profile Picture
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <img
                                            src="/api/placeholder/60/60"
                                            alt="Profile"
                                            className="w-15 h-15 rounded-full bg-gray-300 object-cover"
                                        />
                                        <button className="text-blue-600 hover:text-blue-700 font-medium">
                                            Change
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-6">Notification Settings</h2>

                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-900">Email Notifications</h3>
                                        <p className="text-sm text-gray-500">Receive booking updates and reminders via email.</p>
                                    </div>
                                    <button
                                        onClick={() => handleNotificationToggle('email')}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${notifications.email ? 'bg-blue-600' : 'bg-gray-200'
                                            }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifications.email ? 'translate-x-6' : 'translate-x-1'
                                                }`}
                                        />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-900">Push Notifications</h3>
                                        <p className="text-sm text-gray-500">Get instant alerts for new messages and bookings.</p>
                                    </div>
                                    <button
                                        onClick={() => handleNotificationToggle('push')}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${notifications.push ? 'bg-blue-600' : 'bg-gray-200'
                                            }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifications.push ? 'translate-x-6' : 'translate-x-1'
                                                }`}
                                        />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-6">Security Settings</h2>

                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-900">Password</h3>
                                        <p className="text-sm text-gray-500">Last changed 2 months ago</p>
                                    </div>
                                    <button
                                        onClick={handlePasswordChange}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Change Password
                                    </button>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-900">Two-Factor Authentication</h3>
                                        <p className="text-sm text-gray-500">Enhance your account's security</p>
                                    </div>
                                    <button
                                        onClick={handle2FAEnable}
                                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Enable
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
